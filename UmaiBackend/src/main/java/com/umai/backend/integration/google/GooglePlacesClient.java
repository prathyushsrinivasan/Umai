package com.umai.backend.integration.google;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

/**
 * Thin client over the Google Places API (New).
 *
 * <p>Three operations the rest of the integration composes:
 * <ol>
 *   <li>{@link #findPlaceId} — resolve a restaurant's name + coordinates to a Google
 *       {@code place_id} (the one field Google lets us store).</li>
 *   <li>{@link #fetchDetails} — pull the descriptive fields OpenStreetMap usually lacks.</li>
 *   <li>{@link #resolvePhotoUri} — get a short-lived, Google-hosted image URL to redirect
 *       a browser to, so photos are served live rather than stored.</li>
 * </ol>
 *
 * <p>Every method fails soft: any network, auth or parsing problem is logged and yields
 * an empty result, so one bad lookup never aborts a batch or errors a page load.
 */
@Component
public class GooglePlacesClient {

	private static final Logger log = LoggerFactory.getLogger(GooglePlacesClient.class);

	private final GoogleProperties properties;

	private final RestClient restClient;

	public GooglePlacesClient(RestClient.Builder restClientBuilder, GoogleProperties properties) {
		this.properties = properties;
		// The API key authenticates via a header; a field mask is required per request and
		// is set on each call because it differs (search vs details vs photo).
		this.restClient = restClientBuilder
			.baseUrl(properties.endpoint())
			.defaultHeader("X-Goog-Api-Key", properties.apiKey())
			.defaultHeader("Accept", "application/json")
			.build();
	}

	public boolean isEnabled() {
		return properties.enabled();
	}

	/** The best-matching Google place id for a restaurant, or empty if none is confident. */
	public Optional<String> findPlaceId(String name, double latitude, double longitude) {
		if (!isEnabled() || name == null || name.isBlank()) {
			return Optional.empty();
		}
		try {
			SearchResponse response = restClient.post()
				.uri("/places:searchText")
				.header("X-Goog-FieldMask", "places.id")
				.body(Map.of(
					"textQuery", name,
					"maxResultCount", 1,
					"locationBias", Map.of(
						"circle", Map.of(
							"center", Map.of("latitude", latitude, "longitude", longitude),
							"radius", (double) properties.matchRadiusMeters()))))
				.retrieve()
				.body(SearchResponse.class);

			if (response == null || response.places() == null || response.places().isEmpty()) {
				return Optional.empty();
			}
			return Optional.ofNullable(response.places().get(0).id());
		}
		catch (RestClientException ex) {
			log.warn("Google place search failed for '{}': {}", name, ex.getMessage());
			return Optional.empty();
		}
	}

	/** Descriptive details for a matched place, or empty on any failure. */
	public Optional<PlaceDetails> fetchDetails(String placeId) {
		if (!isEnabled() || placeId == null || placeId.isBlank()) {
			return Optional.empty();
		}
		try {
			DetailsResponse response = restClient.get()
				.uri("/places/{id}", placeId)
				.header("X-Goog-FieldMask", "id,nationalPhoneNumber,websiteUri,formattedAddress,"
					+ "priceLevel,rating,userRatingCount,editorialSummary,"
					+ "regularOpeningHours.weekdayDescriptions,photos.name")
				.retrieve()
				.body(DetailsResponse.class);

			if (response == null) {
				return Optional.empty();
			}
			return Optional.of(new PlaceDetails(
				response.nationalPhoneNumber(),
				response.websiteUri(),
				response.formattedAddress(),
				response.priceLevel(),
				response.rating(),
				response.userRatingCount(),
				response.editorialSummary() == null ? null : response.editorialSummary().text(),
				response.weekdayDescriptions(),
				response.firstPhotoName()));
		}
		catch (RestClientException ex) {
			log.warn("Google place details failed for '{}': {}", placeId, ex.getMessage());
			return Optional.empty();
		}
	}

	/**
	 * A short-lived, Google-hosted image URL for a photo resource name (from
	 * {@link PlaceDetails#firstPhotoName()}), suitable for a browser redirect. Empty on
	 * failure. {@code skipHttpRedirect} makes Google return the URL as JSON rather than
	 * 302-ing us straight to the bytes, so we hand the browser the final URL ourselves.
	 */
	public Optional<String> resolvePhotoUri(String photoResourceName) {
		if (!isEnabled() || photoResourceName == null || photoResourceName.isBlank()) {
			return Optional.empty();
		}
		try {
			PhotoMedia media = restClient.get()
				// The resource name already contains slashes ("places/.../photos/...") that
				// are real path separators, so it's built into the path literally. Passing it
				// as a URI template variable would encode the slashes to %2F and 404.
				.uri(uriBuilder -> uriBuilder
					.path("/" + photoResourceName + "/media")
					.queryParam("maxWidthPx", properties.photoMaxWidth())
					.queryParam("skipHttpRedirect", true)
					.build())
				.retrieve()
				.body(PhotoMedia.class);

			return media == null ? Optional.empty() : Optional.ofNullable(media.photoUri());
		}
		catch (RestClientException ex) {
			log.warn("Google photo media failed for '{}': {}", photoResourceName, ex.getMessage());
			return Optional.empty();
		}
	}

	@JsonIgnoreProperties(ignoreUnknown = true)
	private record SearchResponse(List<PlaceRef> places) {
	}

	@JsonIgnoreProperties(ignoreUnknown = true)
	private record PlaceRef(String id) {
	}

	@JsonIgnoreProperties(ignoreUnknown = true)
	private record DetailsResponse(
			String nationalPhoneNumber,
			String websiteUri,
			String formattedAddress,
			String priceLevel,
			Double rating,
			Integer userRatingCount,
			LocalizedText editorialSummary,
			OpeningHours regularOpeningHours,
			List<PhotoRef> photos) {

		List<String> weekdayDescriptions() {
			return regularOpeningHours == null ? null : regularOpeningHours.weekdayDescriptions();
		}

		String firstPhotoName() {
			return (photos == null || photos.isEmpty()) ? null : photos.get(0).name();
		}
	}

	@JsonIgnoreProperties(ignoreUnknown = true)
	private record LocalizedText(String text) {
	}

	@JsonIgnoreProperties(ignoreUnknown = true)
	private record OpeningHours(List<String> weekdayDescriptions) {
	}

	@JsonIgnoreProperties(ignoreUnknown = true)
	private record PhotoRef(String name) {
	}

	@JsonIgnoreProperties(ignoreUnknown = true)
	private record PhotoMedia(String photoUri) {
	}

}
