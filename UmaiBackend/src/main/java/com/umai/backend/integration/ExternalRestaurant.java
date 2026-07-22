package com.umai.backend.integration;

import java.util.List;

import com.umai.backend.restaurant.PriceRange;
import com.umai.backend.restaurant.RestaurantSource;
import com.umai.backend.restaurant.VegetarianType;

/**
 * A restaurant as reported by an external data source, already normalised into our
 * vocabulary but not yet persisted.
 *
 * <p>This is the boundary type every provider produces, so the import pipeline never
 * sees source-specific shapes such as OpenStreetMap tags.
 *
 * <p>Everything except identity, name and coordinates is nullable: external sources
 * are patchy, and an absent field must stay absent rather than become a guess.
 *
 * @param source           which provider supplied this record
 * @param externalId       the provider's own identifier, stable across imports
 * @param name             display name
 * @param latitude         WGS84 latitude
 * @param longitude        WGS84 longitude
 * @param vegetarianType   normalised diet classification; UNKNOWN when unclear
 * @param categorySlugs    cuisine genres matched to our category table
 */
public record ExternalRestaurant(
		RestaurantSource source,
		String externalId,
		String name,
		double latitude,
		double longitude,
		VegetarianType vegetarianType,
		String description,
		String address,
		String websiteUrl,
		String phone,
		String openingHours,
		PriceRange priceRange,
		List<String> categorySlugs) {

	public ExternalRestaurant {
		categorySlugs = categorySlugs == null ? List.of() : List.copyOf(categorySlugs);
	}

}
