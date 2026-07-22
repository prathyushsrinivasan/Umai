package com.umai.backend.integration;

import java.util.List;

import com.umai.backend.restaurant.MapBounds;
import com.umai.backend.restaurant.RestaurantSource;

/**
 * A source of restaurant data outside our own database.
 *
 * <p>The import pipeline depends only on this interface, so adding another source
 * (a different API, a bulk file) means writing one implementation rather than
 * touching the importer, the domain model or the API.
 *
 * <p>Implementations must not throw for partial data — a record they cannot fully
 * understand should be returned with the unknown fields null, or skipped entirely if
 * it lacks an identifier, name or coordinates.
 */
public interface RestaurantDataProvider {

	/** Which source this provider populates. Used to match records on re-import. */
	RestaurantSource source();

	/**
	 * Fetches restaurants within a geographic area.
	 *
	 * @param bounds area to search
	 * @param limit  maximum records to return
	 * @throws ExternalDataException if the source is unreachable or returns something
	 *                               unusable
	 */
	List<ExternalRestaurant> fetchWithin(MapBounds bounds, int limit);

}
