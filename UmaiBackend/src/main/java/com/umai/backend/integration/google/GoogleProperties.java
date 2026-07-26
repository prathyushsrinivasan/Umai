package com.umai.backend.integration.google;

import java.time.Duration;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Google Places API (New) settings, bound from {@code umai.google.*}.
 *
 * <p>The integration is <strong>disabled unless an API key is supplied</strong>
 * ({@code GOOGLE_MAPS_API_KEY}). With no key, enrichment reports itself unavailable and
 * the live photo endpoint returns nothing, so the application runs fine without it.
 *
 * @param apiKey            Google Maps Platform API key with Places API (New) enabled;
 *                          empty disables the integration
 * @param endpoint          Places API (New) base URL
 * @param matchRadiusMeters how close a Google place must be to the restaurant's
 *                          coordinates to be accepted as the same venue
 * @param photoMaxWidth     max width, in pixels, requested for served photos
 * @param timeout           per-request timeout
 * @param enrichOnStart     run the full enrichment once on startup — a no-auth convenience
 *                          for local/one-off use, instead of the admin HTTP endpoint
 */
@ConfigurationProperties(prefix = "umai.google")
public record GoogleProperties(
		String apiKey,
		String endpoint,
		int matchRadiusMeters,
		int photoMaxWidth,
		Duration timeout,
		boolean enrichOnStart) {

	public GoogleProperties {
		apiKey = apiKey == null ? "" : apiKey.trim();
		endpoint = (endpoint == null || endpoint.isBlank()) ? "https://places.googleapis.com/v1" : endpoint;
		matchRadiusMeters = matchRadiusMeters <= 0 ? 120 : matchRadiusMeters;
		photoMaxWidth = photoMaxWidth <= 0 ? 800 : photoMaxWidth;
		timeout = timeout == null ? Duration.ofSeconds(10) : timeout;
	}

	/** Usable only when an API key has been provided. */
	public boolean enabled() {
		return !apiKey.isBlank();
	}

}
