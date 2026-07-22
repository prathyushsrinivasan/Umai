package com.umai.backend.integration.overpass;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import com.umai.backend.integration.ExternalDataException;
import com.umai.backend.integration.ExternalRestaurant;
import com.umai.backend.integration.RestaurantDataProvider;
import com.umai.backend.restaurant.MapBounds;
import com.umai.backend.restaurant.RestaurantSource;

/**
 * Fetches vegetarian- and vegan-relevant venues from OpenStreetMap via the Overpass
 * API.
 *
 * <p>Only ever called by an explicit import; the application's own screens are served
 * entirely from our database, so a slow or unavailable Overpass instance can never
 * affect ordinary browsing.
 */
@Component
public class OverpassRestaurantProvider implements RestaurantDataProvider {

	private static final Logger log = LoggerFactory.getLogger(OverpassRestaurantProvider.class);

	private final RestClient restClient;

	private final OverpassProperties properties;

	private final OsmTagMapper tagMapper;

	public OverpassRestaurantProvider(RestClient.Builder restClientBuilder, OverpassProperties properties,
			OsmTagMapper tagMapper) {
		this.properties = properties;
		this.tagMapper = tagMapper;
		this.restClient = restClientBuilder
			.baseUrl(properties.endpoint())
			// Overpass asks clients to identify themselves so abusive traffic can be
			// traced; an anonymous client risks being blocked.
			.defaultHeader("User-Agent", properties.userAgent())
			.build();
	}

	@Override
	public RestaurantSource source() {
		return RestaurantSource.OPENSTREETMAP;
	}

	@Override
	public List<ExternalRestaurant> fetchWithin(MapBounds bounds, int limit) {
		int effectiveLimit = Math.min(limit, properties.maxElements());
		String query = buildQuery(bounds, effectiveLimit);

		OverpassResponse response;
		try {
			response = restClient.post()
				.contentType(MediaType.APPLICATION_FORM_URLENCODED)
				.body("data=" + query)
				.retrieve()
				.body(OverpassResponse.class);
		}
		catch (RestClientException ex) {
			throw new ExternalDataException("Overpass API request failed", ex);
		}

		if (response == null) {
			throw new ExternalDataException("Overpass API returned an empty response");
		}

		return normalise(response, effectiveLimit);
	}

	/**
	 * Converts raw elements, skipping any we cannot use.
	 *
	 * <p>Skips are logged but never fail the import: one malformed contribution should
	 * not discard an otherwise good batch.
	 */
	private List<ExternalRestaurant> normalise(OverpassResponse response, int limit) {
		List<ExternalRestaurant> restaurants = new ArrayList<>();
		int skipped = 0;

		for (OverpassResponse.Element element : response.elements()) {
			if (restaurants.size() >= limit) {
				break;
			}

			var mapped = tagMapper.toExternalRestaurant(
				element.externalId(), element.latitude(), element.longitude(), element.tags());

			if (mapped.isPresent()) {
				restaurants.add(mapped.get());
			}
			else {
				skipped++;
			}
		}

		if (skipped > 0) {
			log.info("Skipped {} OpenStreetMap elements lacking an id, name or coordinates", skipped);
		}

		return deduplicateByExternalId(restaurants);
	}

	/**
	 * A venue can appear as both a node and a building way. Keeping the first occurrence
	 * avoids inserting the same restaurant twice under different ids.
	 */
	private List<ExternalRestaurant> deduplicateByExternalId(List<ExternalRestaurant> restaurants) {
		Map<String, ExternalRestaurant> byId = new LinkedHashMap<>();
		for (ExternalRestaurant restaurant : restaurants) {
			byId.putIfAbsent(restaurant.externalId(), restaurant);
		}
		return List.copyOf(byId.values());
	}

	/**
	 * Builds an Overpass QL query for venues with an explicit vegan or vegetarian diet
	 * tag inside the bounding box.
	 *
	 * <p>Filtering on {@code diet:*} at the source keeps the response small and avoids
	 * importing thousands of venues we would immediately classify as UNKNOWN.
	 *
	 * <p>{@code out center} makes ways and relations report a representative point, so
	 * building-mapped restaurants still yield coordinates.
	 */
	private String buildQuery(MapBounds bounds, int limit) {
		String box = "%f,%f,%f,%f".formatted(
			bounds.minLat(), bounds.minLon(), bounds.maxLat(), bounds.maxLon());

		return """
				[out:json][timeout:%d];
				(
				  nwr["amenity"~"^(restaurant|cafe|fast_food)$"]["diet:vegan"](%s);
				  nwr["amenity"~"^(restaurant|cafe|fast_food)$"]["diet:vegetarian"](%s);
				);
				out center %d;
				""".formatted(properties.timeout().toSeconds(), box, box, limit);
	}

}
