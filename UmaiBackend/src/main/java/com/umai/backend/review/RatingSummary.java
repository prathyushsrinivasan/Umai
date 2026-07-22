package com.umai.backend.review;

/**
 * Aggregate rating for one restaurant, computed from its reviews.
 *
 * <p>Ratings are always derived rather than stored, so the displayed score cannot
 * drift away from the reviews behind it.
 *
 * @param restaurantId  the restaurant these figures describe
 * @param averageRating mean rating; null only if the restaurant has no reviews
 * @param reviewCount   number of reviews contributing to the average
 */
public record RatingSummary(Long restaurantId, Double averageRating, Long reviewCount) {

	/** An empty summary, for restaurants nobody has reviewed yet. */
	public static RatingSummary empty(Long restaurantId) {
		return new RatingSummary(restaurantId, null, 0L);
	}

}
