package com.umai.backend.integration.foursquare;

import java.time.Duration;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Foursquare Places API settings, bound from {@code umai.foursquare.*}.
 *
 * <p>The integration is <strong>disabled unless an API key is supplied</strong>
 * ({@code FOURSQUARE_API_KEY}). With no key the whole photo-backfill feature simply
 * reports that it is unavailable, so the application runs fine without it.
 *
 * @param apiKey            Foursquare API key; empty disables the provider
 * @param endpoint          Places API base URL
 * @param matchRadiusMeters how close a Foursquare place must be to be accepted as the
 *                          same venue — small, because a wrong match yields a wrong photo
 * @param timeout           per-request timeout
 */
@ConfigurationProperties(prefix = "umai.foursquare")
public record FoursquareProperties(
		String apiKey,
		String endpoint,
		int matchRadiusMeters,
		Duration timeout) {

	public FoursquareProperties {
		apiKey = apiKey == null ? "" : apiKey.trim();
		endpoint = (endpoint == null || endpoint.isBlank()) ? "https://api.foursquare.com/v3" : endpoint;
		matchRadiusMeters = matchRadiusMeters <= 0 ? 150 : matchRadiusMeters;
		timeout = timeout == null ? Duration.ofSeconds(10) : timeout;
	}

	/** Usable only when an API key has been provided. */
	public boolean enabled() {
		return !apiKey.isBlank();
	}

}
