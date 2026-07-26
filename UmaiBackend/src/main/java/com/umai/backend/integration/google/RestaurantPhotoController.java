package com.umai.backend.integration.google;

import java.net.URI;
import java.time.Duration;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.umai.backend.restaurant.Restaurant;
import com.umai.backend.restaurant.RestaurantRepository;
import com.umai.backend.restaurant.RestaurantStatus;

/**
 * Serves a restaurant's cover photo <strong>live</strong> from Google, without storing it.
 *
 * <p>Google's terms forbid caching or self-hosting Place photos, so this endpoint resolves
 * a fresh, short-lived Google-hosted image URL on demand and 302-redirects the browser to
 * it — the image bytes come straight from Google's CDN, never through or into us. A restaurant
 * whose {@code imageUrl} is set to {@link #pathFor(Long)} routes here.
 *
 * <p>Resolving a URL costs two Google calls (details + photo media), so results are held in
 * a small in-memory TTL cache — legitimate short-term performance caching, not storage of
 * the content itself. A cache miss for a restaurant with no Google match or no photo is a 404,
 * which the frontend already handles by showing its generated fallback cover.
 */
@RestController
@RequestMapping("/api/v1/restaurants/{id}/photo")
@Tag(name = "Photos", description = "店舗写真の配信（Google からライブ取得）")
public class RestaurantPhotoController {

	/** How long a resolved photo URL is reused before re-resolving. Google's URLs are
	 *  short-lived, so this stays well under their validity window. */
	private static final Duration CACHE_TTL = Duration.ofMinutes(15);

	private final RestaurantRepository restaurantRepository;

	private final GooglePlacesClient placesClient;

	private final ConcurrentHashMap<Long, CachedUri> cache = new ConcurrentHashMap<>();

	public RestaurantPhotoController(RestaurantRepository restaurantRepository, GooglePlacesClient placesClient) {
		this.restaurantRepository = restaurantRepository;
		this.placesClient = placesClient;
	}

	/** The stored {@code imageUrl} value that routes a restaurant's photo through this endpoint. */
	public static String pathFor(Long restaurantId) {
		return "/api/v1/restaurants/" + restaurantId + "/photo";
	}

	@GetMapping
	@Operation(summary = "店舗写真を取得", description = "Google から取得した写真へリダイレクトします。")
	public ResponseEntity<Void> photo(@PathVariable Long id) {
		return resolve(id)
			.map(uri -> ResponseEntity.status(HttpStatus.FOUND)
				.location(URI.create(uri))
				// Let the browser reuse the redirect briefly, cutting repeat resolves.
				.cacheControl(CacheControl.maxAge(CACHE_TTL).cachePublic())
				.<Void>build())
			.orElseGet(() -> ResponseEntity.notFound().build());
	}

	private Optional<String> resolve(Long id) {
		CachedUri cached = cache.get(id);
		if (cached != null && !cached.isExpired()) {
			return Optional.of(cached.uri());
		}

		Optional<String> uri = restaurantRepository.findByIdAndStatus(id, RestaurantStatus.PUBLISHED)
			.map(Restaurant::getGooglePlaceId)
			.filter(placeId -> placeId != null && !placeId.isBlank())
			.flatMap(placesClient::fetchDetails)
			.filter(PlaceDetails::hasPhoto)
			.flatMap(details -> placesClient.resolvePhotoUri(details.firstPhotoName()));

		uri.ifPresent(value -> cache.put(id, new CachedUri(value, System.currentTimeMillis() + CACHE_TTL.toMillis())));
		return uri;
	}

	private record CachedUri(String uri, long expiresAtMillis) {
		boolean isExpired() {
			return System.currentTimeMillis() >= expiresAtMillis;
		}
	}

}
