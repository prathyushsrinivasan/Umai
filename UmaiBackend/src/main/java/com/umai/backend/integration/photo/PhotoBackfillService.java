package com.umai.backend.integration.photo;

import java.util.Optional;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import com.umai.backend.restaurant.Restaurant;
import com.umai.backend.restaurant.RestaurantRepository;
import com.umai.backend.restaurant.RestaurantStatus;

/**
 * Fills in missing restaurant photos from a {@link PlacePhotoProvider}.
 *
 * <p>Runs over published restaurants that have no {@code imageUrl} and asks the provider
 * for one. Deliberately <strong>not</strong> wrapped in a single transaction: each
 * lookup is a slow external call, so rows are saved individually and a failure part-way
 * through still keeps the photos already found.
 */
@Service
public class PhotoBackfillService {

	private static final Logger log = LoggerFactory.getLogger(PhotoBackfillService.class);

	/** Gentle pacing between provider calls, to stay within free-tier rate limits. */
	private static final long PAUSE_MILLIS = 120;

	private final RestaurantRepository restaurantRepository;

	private final PlacePhotoProvider photoProvider;

	public PhotoBackfillService(RestaurantRepository restaurantRepository, PlacePhotoProvider photoProvider) {
		this.restaurantRepository = restaurantRepository;
		this.photoProvider = photoProvider;
	}

	public boolean isAvailable() {
		return photoProvider.isEnabled();
	}

	public String providerName() {
		return photoProvider.name();
	}

	/** How many published restaurants still lack a photo. */
	public long remaining() {
		return restaurantRepository.countByStatusAndImageUrlIsNull(RestaurantStatus.PUBLISHED);
	}

	/**
	 * Attempts to attach photos to up to {@code limit} photo-less restaurants.
	 *
	 * @throws IllegalStateException if no photo provider is configured
	 */
	public PhotoBackfillResult backfill(int limit) {
		if (!isAvailable()) {
			throw new IllegalStateException("No photo provider is configured");
		}

		var targets = restaurantRepository.findByStatusAndImageUrlIsNull(
			RestaurantStatus.PUBLISHED, PageRequest.of(0, limit));

		int updated = 0;
		int noMatch = 0;

		for (Restaurant restaurant : targets) {
			Optional<String> url = photoProvider.findPhotoUrl(
				restaurant.getName(), restaurant.getLatitude(), restaurant.getLongitude());

			if (url.isPresent()) {
				restaurant.setImageUrl(url.get());
				restaurantRepository.save(restaurant);
				updated++;
			}
			else {
				noMatch++;
			}
			pause();
		}

		PhotoBackfillResult result = new PhotoBackfillResult(targets.getNumberOfElements(), updated, noMatch);
		log.info("Photo backfill via {} finished: {}", photoProvider.name(), result);
		return result;
	}

	private void pause() {
		try {
			Thread.sleep(PAUSE_MILLIS);
		}
		catch (InterruptedException ex) {
			Thread.currentThread().interrupt();
		}
	}

}
