package com.umai.backend.integration.foursquare;

import java.util.List;
import java.util.Optional;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import com.umai.backend.integration.photo.PlacePhotoProvider;

/**
 * Fills in restaurant photos from the Foursquare Places API.
 *
 * <p>Two calls per venue: a name + location search to find the matching place, then its
 * photos. Matching is tight (a small radius, the closest single result) because a wrong
 * match would attach the wrong restaurant's photo.
 *
 * <p>Never throws to callers: any network or parsing failure is logged and yields no
 * photo, so a single bad lookup cannot abort a backfill run.
 *
 * <p>Runs last in the backfill order — this one needs an API key and counts against a
 * rate limit, so the free Wikimedia sources get first crack at every restaurant.
 */
@Component
@Order(3)
public class FoursquarePhotoProvider implements PlacePhotoProvider {

	private static final Logger log = LoggerFactory.getLogger(FoursquarePhotoProvider.class);

	private final FoursquareProperties properties;

	private final RestClient restClient;

	public FoursquarePhotoProvider(RestClient.Builder restClientBuilder, FoursquareProperties properties) {
		this.properties = properties;
		// Authorization is the API key verbatim (Foursquare v3). Built once; when no key
		// is configured the provider short-circuits in findPhotoUrl and never calls out.
		this.restClient = restClientBuilder
			.baseUrl(properties.endpoint())
			.defaultHeader("Authorization", properties.apiKey())
			.defaultHeader("Accept", "application/json")
			.build();
	}

	@Override
	public boolean isEnabled() {
		return properties.enabled();
	}

	@Override
	public String name() {
		return "Foursquare";
	}

	@Override
	public Optional<String> findPhotoUrl(String placeName, double latitude, double longitude) {
		if (!isEnabled() || placeName == null || placeName.isBlank()) {
			return Optional.empty();
		}

		try {
			String fsqId = searchPlaceId(placeName, latitude, longitude);
			if (fsqId == null) {
				return Optional.empty();
			}
			return firstPhotoUrl(fsqId);
		}
		catch (RestClientException ex) {
			// Rate limits, timeouts, auth problems — logged, not fatal to the batch.
			log.warn("Foursquare lookup failed for '{}': {}", placeName, ex.getMessage());
			return Optional.empty();
		}
	}

	private String searchPlaceId(String name, double latitude, double longitude) {
		SearchResponse response = restClient.get()
			.uri(uriBuilder -> uriBuilder
				.path("/places/search")
				.queryParam("query", name)
				.queryParam("ll", latitude + "," + longitude)
				.queryParam("radius", properties.matchRadiusMeters())
				.queryParam("limit", 1)
				.queryParam("fields", "fsq_id,name")
				.build())
			.retrieve()
			.body(SearchResponse.class);

		if (response == null || response.results() == null || response.results().isEmpty()) {
			return null;
		}
		return response.results().get(0).fsqId();
	}

	private Optional<String> firstPhotoUrl(String fsqId) {
		Photo[] photos = restClient.get()
			.uri(uriBuilder -> uriBuilder
				.path("/places/{id}/photos")
				.queryParam("limit", 1)
				.queryParam("sort", "POPULAR")
				.build(fsqId))
			.retrieve()
			.body(Photo[].class);

		if (photos == null || photos.length == 0) {
			return Optional.empty();
		}
		return Optional.ofNullable(buildPhotoUrl(photos[0].prefix(), photos[0].suffix()));
	}

	/**
	 * Foursquare returns a photo as a {@code prefix} and {@code suffix}; the caller
	 * inserts a size (or {@code original}) between them. We cap the width so a card never
	 * pulls a multi-megapixel original.
	 *
	 * <p>Package-private and static so the URL assembly is unit-testable without HTTP.
	 */
	static String buildPhotoUrl(String prefix, String suffix) {
		if (prefix == null || suffix == null || prefix.isBlank() || suffix.isBlank()) {
			return null;
		}
		String url = prefix + "800x600" + suffix;
		return url.length() <= 1000 ? url : null;
	}

	@JsonIgnoreProperties(ignoreUnknown = true)
	private record SearchResponse(List<Place> results) {
	}

	@JsonIgnoreProperties(ignoreUnknown = true)
	private record Place(@JsonProperty("fsq_id") String fsqId) {
	}

	@JsonIgnoreProperties(ignoreUnknown = true)
	private record Photo(String prefix, String suffix) {
	}

}
