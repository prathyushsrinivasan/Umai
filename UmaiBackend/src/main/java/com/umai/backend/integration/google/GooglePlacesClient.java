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
 *   <li>{@link #fetchPhoto} — request photo metadata only when a visitor asks.</li>
 *   <li>{@link #resolvePhotoUri} — get a short-lived, Google-hosted image URL to redirect
 *       a browser to, so photos are served live rather than stored.</li>
 * </ol>
 *
 * <p>Empty results mean no match; operational failures are distinct so callers can back off.
 */
@Component
public class GooglePlacesClient {

	private static final Logger log = LoggerFactory.getLogger(GooglePlacesClient.class);

	private final GoogleProperties properties;
    private final ExternalRequestBudget budget;
    private volatile long unavailableUntil;

	private final RestClient restClient;

	public GooglePlacesClient(RestClient.Builder restClientBuilder, GoogleProperties properties, ExternalRequestBudget budget) {
        this.budget = budget;
		this.properties = properties;
		// The API key authenticates via a header; a field mask is required per request and
		// is set on each call because it differs (search vs details vs photo).
		this.restClient = restClientBuilder
			.requestFactory(new org.springframework.http.client.JdkClientHttpRequestFactory(
                java.net.http.HttpClient.newBuilder().connectTimeout(properties.timeout()).build()) {{ setReadTimeout(properties.timeout()); }})
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
		reserve();
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
			unavailableUntil = System.currentTimeMillis() + 60_000;
            log.warn("Google place search failed; backing off for one minute");
            throw new GoogleUnavailableException();
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
		reserve();
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
			unavailableUntil = System.currentTimeMillis() + 60_000;
            throw new GoogleUnavailableException();
		}
	}

    private void reserve() {
        if (System.currentTimeMillis() < unavailableUntil || !budget.acquire()) throw new GoogleUnavailableException();
    }

    /** Photo metadata is an IDs-only request; it never asks for billable descriptive fields. */
    public Optional<PhotoReference> fetchPhoto(String placeId) {
        if (!isEnabled()) return Optional.empty();
        reserve();
        try {
            PhotoResponse response = restClient.get().uri("/places/{id}", placeId)
                .header("X-Goog-FieldMask", "photos,attributions").retrieve().body(PhotoResponse.class);
            return response == null || response.photos() == null || response.photos().isEmpty()
                ? Optional.empty() : Optional.of(response.photos().get(0));
        } catch (RestClientException ex) {
            unavailableUntil = System.currentTimeMillis() + 60_000;
            throw new GoogleUnavailableException();
        }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Author(String displayName, String uri) {}
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record PhotoReference(String name, java.util.List<Author> authorAttributions, String googleMapsUri) {}
    @JsonIgnoreProperties(ignoreUnknown = true)
    private record PhotoResponse(java.util.List<PhotoReference> photos) {}

	@JsonIgnoreProperties(ignoreUnknown = true)
	private record SearchResponse(List<PlaceRef> places) {
	}

	@JsonIgnoreProperties(ignoreUnknown = true)
	private record PlaceRef(String id) {
	}

	@JsonIgnoreProperties(ignoreUnknown = true)
	private record PhotoMedia(String photoUri) {
	}

}
