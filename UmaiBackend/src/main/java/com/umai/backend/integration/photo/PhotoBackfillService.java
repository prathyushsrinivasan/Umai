package com.umai.backend.integration.photo;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import com.umai.backend.restaurant.Restaurant;
import com.umai.backend.restaurant.RestaurantRepository;
import com.umai.backend.restaurant.RestaurantStatus;

/**
 * Fills in missing restaurant photos from the configured {@link PlacePhotoProvider}s.
 *
 * <p>Runs over published restaurants that have no {@code imageUrl} and asks each enabled
 * provider in turn (Spring injects the list ordered by {@code @Order} — the free,
 * keyless Wikipedia source before the rate-limited, keyed Foursquare one) until one finds
 * a photo. Deliberately <strong>not</strong> wrapped in a single transaction: each lookup
 * is a slow external call, so rows are saved individually and a failure part-way through
 * still keeps the photos already found.
 */
@Service
public class PhotoBackfillService {

	private static final Logger log = LoggerFactory.getLogger(PhotoBackfillService.class);

	/** Gentle pacing between provider calls, to stay within free-tier rate limits. */
	private static final long PAUSE_MILLIS = 120;

	private final RestaurantRepository restaurantRepository;

	private final List<PlacePhotoProvider> photoProviders;

	public PhotoBackfillService(RestaurantRepository restaurantRepository, List<PlacePhotoProvider> photoProviders) {
		this.restaurantRepository = restaurantRepository;
		this.photoProviders = photoProviders;
	}

	public boolean isAvailable() {
		return photoProviders.stream().anyMatch(PlacePhotoProvider::isEnabled);
	}

	public String providerName() {
		return photoProviders.stream()
			.filter(PlacePhotoProvider::isEnabled)
			.map(PlacePhotoProvider::name)
			.collect(Collectors.joining(", "));
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
			Optional<String> url = findPhotoFromAnyProvider(restaurant);

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
		log.info("Photo backfill via [{}] finished: {}", providerName(), result);
		return result;
	}

	private Optional<String> findPhotoFromAnyProvider(Restaurant restaurant) {
		for (PlacePhotoProvider provider : photoProviders) {
			if (!provider.isEnabled()) {
				continue;
			}
			Optional<String> url = provider.findPhotoUrl(
				restaurant.getName(), restaurant.getLatitude(), restaurant.getLongitude());
			if (url.isPresent()) {
				return url;
			}
		}
		return Optional.empty();
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
