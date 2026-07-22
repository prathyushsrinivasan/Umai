package com.umai.backend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import com.umai.backend.restaurant.RestaurantStatus;

/**
 * How user-submitted restaurants are handled, bound from {@code umai.submissions.*}.
 *
 * @param autoPublish true to publish submissions immediately; false to hold them as
 *                    {@link RestaurantStatus#PENDING} for moderation
 */
@ConfigurationProperties(prefix = "umai.submissions")
public record SubmissionProperties(boolean autoPublish) {

	/**
	 * The status a new submission receives.
	 *
	 * <p>Defaults to publishing immediately: there is no moderation queue yet, so
	 * PENDING submissions would be invisible to everyone including their author.
	 * The switch exists so enabling moderation later is a config change, not a
	 * migration.
	 */
	public RestaurantStatus statusForNewSubmission() {
		return autoPublish ? RestaurantStatus.PUBLISHED : RestaurantStatus.PENDING;
	}

}
