package com.umai.backend.restaurant;

/**
 * Where a restaurant record came from.
 *
 * <p>Paired with {@code sourceExternalId}, this lets an external record be matched on
 * re-import so syncing updates rows instead of duplicating them, and lets seeded
 * development data be identified and removed cleanly.
 */
public enum RestaurantSource {

	/** Fictional development seed data. Never present in production. */
	SEED,

	/** Submitted through the application by a user. */
	USER_SUBMISSION,

	/** Imported from OpenStreetMap via the Overpass API. */
	OPENSTREETMAP

}
