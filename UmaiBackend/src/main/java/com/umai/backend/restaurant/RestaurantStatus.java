package com.umai.backend.restaurant;

/**
 * Publication state of a restaurant listing.
 *
 * <p>Only {@link #PUBLISHED} entries are visible to the public. The remaining values
 * exist so moderation can be switched on later without a schema change: user
 * submissions can be routed to {@link #PENDING} by changing a default rather than
 * migrating data.
 */
public enum RestaurantStatus {

	/** Incomplete, not yet submitted. */
	DRAFT,

	/** Awaiting moderation. */
	PENDING,

	/** Publicly visible. */
	PUBLISHED,

	/** Rejected by a moderator. */
	REJECTED

}
