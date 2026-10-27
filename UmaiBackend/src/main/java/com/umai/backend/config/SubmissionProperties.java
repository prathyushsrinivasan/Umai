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
	 * <p>Production defaults to PENDING. The moderation queue publishes reviewed
	 * submissions; immediate publication remains an explicit configuration option.
	 */
	public RestaurantStatus statusForNewSubmission() {
		return autoPublish ? RestaurantStatus.PUBLISHED : RestaurantStatus.PENDING;
	}

}
