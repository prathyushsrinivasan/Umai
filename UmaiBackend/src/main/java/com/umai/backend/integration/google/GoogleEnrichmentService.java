package com.umai.backend.integration.google;

import java.util.Optional;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import com.umai.backend.restaurant.Restaurant;
import com.umai.backend.restaurant.RestaurantRepository;
import com.umai.backend.restaurant.RestaurantStatus;

/**
 * Enriches restaurants from Google Places: matches each to a Google place id, fills the
 * descriptive fields OpenStreetMap tends to leave blank, and points its cover photo at the
 * live Google photo endpoint.
 *
 * <p>Only the {@code google_place_id} is stored (Google permits that indefinitely). Photos
 * are served live via {@link RestaurantPhotoController}, never downloaded. Descriptive
 * fields are cached in our rows to populate the UI; treat them as a periodically-refreshed
 * cache of Google data, not a permanent copy.
 *
 * <p>Existing values are never overwritten — enrichment only fills gaps — so user
 * submissions and OSM data always win over Google. Deliberately not one transaction: each
 * restaurant is a few slow external calls, so rows are saved individually and a mid-batch
 * failure keeps the work already done.
 */
@Service
public class GoogleEnrichmentService {

	private static final Logger log = LoggerFactory.getLogger(GoogleEnrichmentService.class);

	/** Gentle pacing between restaurants, to stay comfortably within rate limits. */
	private static final long PAUSE_MILLIS = 120;

	private final RestaurantRepository restaurantRepository;

	private final GooglePlacesClient placesClient;

	public GoogleEnrichmentService(RestaurantRepository restaurantRepository, GooglePlacesClient placesClient) {
		this.restaurantRepository = restaurantRepository;
		this.placesClient = placesClient;
	}

	public boolean isAvailable() {
		return placesClient.isEnabled();
	}

	/** How many published restaurants the enrichment job has not processed yet. */
	public long remaining() {
		return restaurantRepository.countByStatusAndGoogleEnrichedFalse(RestaurantStatus.PUBLISHED);
	}

	/**
	 * Enriches up to {@code limit} not-yet-matched restaurants.
	 *
	 * @throws IllegalStateException if no Google API key is configured
	 */
	public GoogleEnrichmentResult enrich(int limit) {
		if (!isAvailable()) {
			throw new IllegalStateException("Google Places is not configured");
		}

		var targets = restaurantRepository.findByStatusAndGoogleEnrichedFalse(
			RestaurantStatus.PUBLISHED, PageRequest.of(0, limit));

		int matched = 0;
		int photosLinked = 0;
		int detailsFilled = 0;
		int noMatch = 0;

		for (Restaurant restaurant : targets) {
			// Match only if not already matched — a re-run just refreshes details and rating.
			if (restaurant.getGooglePlaceId() == null) {
				placesClient.findPlaceId(
						restaurant.getName(), restaurant.getLatitude(), restaurant.getLongitude())
					.ifPresent(restaurant::setGooglePlaceId);
			}

			String placeId = restaurant.getGooglePlaceId();
			if (placeId != null) {
				matched++;
				Enrichment applied = applyDetails(restaurant, placeId);
				if (applied.photoLinked()) {
					photosLinked++;
				}
				if (applied.fieldsFilled()) {
					detailsFilled++;
				}
			}
			else {
				noMatch++;
			}

			// Marked processed either way, so this row is never retried on a later run.
			restaurant.setGoogleEnriched(true);
			restaurantRepository.save(restaurant);
			pause();
		}

		GoogleEnrichmentResult result = new GoogleEnrichmentResult(
			targets.getNumberOfElements(), matched, photosLinked, detailsFilled, noMatch);
		log.info("Google enrichment finished: {}", result);
		return result;
	}

	/** Fills empty descriptive fields and links a photo. Returns what changed. */
	private Enrichment applyDetails(Restaurant restaurant, String placeId) {
		Optional<PlaceDetails> maybeDetails = placesClient.fetchDetails(placeId);
		if (maybeDetails.isEmpty()) {
			return new Enrichment(false, false);
		}
		PlaceDetails details = maybeDetails.get();

		boolean fieldsFilled = false;
		fieldsFilled |= fillIfBlank(restaurant::getPhone, restaurant::setPhone, details.phone());
		fieldsFilled |= fillIfBlank(restaurant::getWebsiteUrl, restaurant::setWebsiteUrl, details.websiteUri());
		fieldsFilled |= fillIfBlank(restaurant::getAddress, restaurant::setAddress, details.formattedAddress());
		fieldsFilled |= fillIfBlank(restaurant::getDescription, restaurant::setDescription, details.editorialSummary());
		fieldsFilled |= fillIfBlank(restaurant::getOpeningHours, restaurant::setOpeningHours, details.openingHoursText());
		if (restaurant.getPriceRange() == null && details.toPriceRange() != null) {
			restaurant.setPriceRange(details.toPriceRange());
			fieldsFilled = true;
		}
		if (details.rating() != null) {
			restaurant.setGoogleRating(details.rating());
			restaurant.setGoogleRatingCount(details.userRatingCount());
			fieldsFilled = true;
		}

		boolean photoLinked = false;
		if (details.hasPhoto() && isBlank(restaurant.getImageUrl())) {
			restaurant.setImageUrl(RestaurantPhotoController.pathFor(restaurant.getId()));
			photoLinked = true;
		}

		return new Enrichment(photoLinked, fieldsFilled);
	}

	private boolean fillIfBlank(java.util.function.Supplier<String> getter,
			java.util.function.Consumer<String> setter, String value) {
		if (isBlank(getter.get()) && !isBlank(value)) {
			setter.accept(value);
			return true;
		}
		return false;
	}

	private static boolean isBlank(String value) {
		return value == null || value.isBlank();
	}

	private void pause() {
		try {
			Thread.sleep(PAUSE_MILLIS);
		}
		catch (InterruptedException ex) {
			Thread.currentThread().interrupt();
		}
	}

	private record Enrichment(boolean photoLinked, boolean fieldsFilled) {
	}

}
