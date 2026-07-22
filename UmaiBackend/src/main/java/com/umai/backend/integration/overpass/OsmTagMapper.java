package com.umai.backend.integration.overpass;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.stereotype.Component;

import com.umai.backend.integration.ExternalRestaurant;
import com.umai.backend.restaurant.RestaurantSource;
import com.umai.backend.restaurant.VegetarianType;

/**
 * Translates OpenStreetMap tags into our domain vocabulary.
 *
 * <p>Deliberately free of I/O so the mapping rules — the part most likely to be wrong
 * — can be unit tested without a network or a database.
 *
 * <p>OSM data is contributed by volunteers and is inconsistent: tags are missing,
 * misspelled, or carry values outside the documented set. Every rule here fails
 * closed, producing {@code null} or {@link VegetarianType#UNKNOWN} rather than a
 * guess, because a wrong vegan classification is worse than no classification.
 */
@Component
public class OsmTagMapper {

	/**
	 * Maps OSM {@code cuisine} values to our category slugs.
	 *
	 * <p>Only unambiguous mappings are listed. Anything unrecognised falls through to
	 * {@code other} rather than being forced into a nearby genre.
	 */
	private static final Map<String, String> CUISINE_TO_CATEGORY = Map.ofEntries(
		Map.entry("japanese", "washoku"),
		Map.entry("sushi", "washoku"),
		Map.entry("soba", "washoku"),
		Map.entry("udon", "washoku"),
		Map.entry("ramen", "ramen"),
		Map.entry("noodle", "ramen"),
		Map.entry("indian", "indian"),
		Map.entry("curry", "indian"),
		Map.entry("chinese", "chuka"),
		Map.entry("italian", "yoshoku"),
		Map.entry("french", "yoshoku"),
		Map.entry("pizza", "yoshoku"),
		Map.entry("burger", "yoshoku"),
		Map.entry("american", "yoshoku"),
		Map.entry("sandwich", "yoshoku"),
		Map.entry("coffee_shop", "cafe"),
		Map.entry("cafe", "cafe"));

	private static final String FALLBACK_CATEGORY = "other";

	/**
	 * Builds a restaurant from an OSM element's tags.
	 *
	 * @return empty when the element lacks the minimum we need — an id, a name and
	 *         coordinates. Such records are skipped rather than imported as blanks.
	 */
	public Optional<ExternalRestaurant> toExternalRestaurant(
			String externalId, Double latitude, Double longitude, Map<String, String> tags) {

		if (externalId == null || latitude == null || longitude == null || tags == null) {
			return Optional.empty();
		}

		String name = resolveName(tags);
		if (name == null) {
			// An unnamed venue is not useful to show, and has nothing to match on later.
			return Optional.empty();
		}

		return Optional.of(new ExternalRestaurant(
			RestaurantSource.OPENSTREETMAP,
			externalId,
			name,
			latitude,
			longitude,
			resolveVegetarianType(tags),
			null, // OSM has no free-text description we can trust as one.
			resolveAddress(tags),
			resolveWebsite(tags),
			trimToNull(firstPresent(tags, "phone", "contact:phone")),
			trimToNull(tags.get("opening_hours")),
			null, // OSM price tags are too inconsistent to map to a band.
			resolveCategorySlugs(tags)));
	}

	/**
	 * Prefers the Japanese name, since the whole UI is Japanese, then the generic
	 * name, then the romanised one.
	 */
	private String resolveName(Map<String, String> tags) {
		return trimToNull(firstPresent(tags, "name:ja", "name", "name:en"));
	}

	/**
	 * Maps {@code diet:vegan} and {@code diet:vegetarian} to our classification.
	 *
	 * <p>OSM uses {@code only} for exclusively vegan/vegetarian venues and {@code yes}
	 * for those with dependable options. Vegan wins over vegetarian when both are
	 * present, because it is the stricter claim. Any other value — including
	 * {@code limited} and {@code no} — yields UNKNOWN: we will not imply a venue
	 * caters to a diet on ambiguous evidence.
	 */
	private VegetarianType resolveVegetarianType(Map<String, String> tags) {
		String vegan = normalise(tags.get("diet:vegan"));
		String vegetarian = normalise(tags.get("diet:vegetarian"));

		if ("only".equals(vegan)) {
			return VegetarianType.VEGAN_ONLY;
		}
		if ("only".equals(vegetarian)) {
			return VegetarianType.VEGETARIAN_ONLY;
		}
		if ("yes".equals(vegan)) {
			return VegetarianType.VEGAN_FRIENDLY;
		}
		if ("yes".equals(vegetarian)) {
			return VegetarianType.VEGETARIAN_FRIENDLY;
		}
		return VegetarianType.UNKNOWN;
	}

	/**
	 * Assembles a Japanese-order address from OSM's {@code addr:*} tags.
	 *
	 * <p>Japanese addresses run largest unit first, the opposite of the Western order
	 * OSM examples usually show.
	 */
	private String resolveAddress(Map<String, String> tags) {
		String full = trimToNull(tags.get("addr:full"));
		if (full != null) {
			return full;
		}

		List<String> parts = new ArrayList<>();
		for (String key : List.of("addr:province", "addr:city", "addr:suburb",
				"addr:quarter", "addr:neighbourhood", "addr:block_number", "addr:housenumber")) {
			String value = trimToNull(tags.get(key));
			if (value != null) {
				parts.add(value);
			}
		}

		return parts.isEmpty() ? null : String.join("", parts);
	}

	/**
	 * Accepts only http(s) URLs, so a malformed or hostile tag value cannot become a
	 * link the frontend renders.
	 */
	private String resolveWebsite(Map<String, String> tags) {
		String website = trimToNull(firstPresent(tags, "website", "contact:website", "url"));
		if (website == null) {
			return null;
		}

		String lower = website.toLowerCase();
		if (!lower.startsWith("http://") && !lower.startsWith("https://")) {
			return null;
		}

		return website.length() > 500 ? null : website;
	}

	/**
	 * Maps the {@code cuisine} tag, which may hold several {@code ;}-separated values,
	 * onto our category slugs. Falls back to the amenity type, then to {@code other}.
	 */
	private List<String> resolveCategorySlugs(Map<String, String> tags) {
		List<String> slugs = new ArrayList<>();

		String cuisine = normalise(tags.get("cuisine"));
		if (cuisine != null) {
			for (String value : cuisine.split(";")) {
				String slug = CUISINE_TO_CATEGORY.get(value.trim());
				if (slug != null && !slugs.contains(slug)) {
					slugs.add(slug);
				}
			}
		}

		// amenity=cafe is itself a genre, even with no cuisine tag.
		if ("cafe".equals(normalise(tags.get("amenity"))) && !slugs.contains("cafe")) {
			slugs.add("cafe");
		}

		if (slugs.isEmpty()) {
			slugs.add(FALLBACK_CATEGORY);
		}

		return slugs;
	}

	private String firstPresent(Map<String, String> tags, String... keys) {
		for (String key : keys) {
			String value = tags.get(key);
			if (value != null && !value.isBlank()) {
				return value;
			}
		}
		return null;
	}

	private String normalise(String value) {
		return value == null ? null : value.trim().toLowerCase();
	}

	private String trimToNull(String value) {
		if (value == null) {
			return null;
		}
		String trimmed = value.trim();
		return trimmed.isEmpty() ? null : trimmed;
	}

}
