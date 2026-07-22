package com.umai.backend.integration.overpass;

import java.time.Duration;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Overpass API settings, bound from {@code umai.overpass.*}.
 *
 * @param endpoint    Overpass instance to query
 * @param timeout     how long to wait for a response
 * @param userAgent   identifies this application, as Overpass etiquette requires
 * @param maxElements cap on records requested in a single import
 */
@ConfigurationProperties(prefix = "umai.overpass")
public record OverpassProperties(
		String endpoint,
		Duration timeout,
		String userAgent,
		int maxElements) {

	public OverpassProperties {
		endpoint = (endpoint == null || endpoint.isBlank())
			? "https://overpass-api.de/api/interpreter"
			: endpoint;
		// Overpass queries over a city-sized area are slow; a short timeout would only
		// produce failures that look like outages.
		timeout = timeout == null ? Duration.ofSeconds(90) : timeout;
		userAgent = (userAgent == null || userAgent.isBlank())
			? "Umai/1.0 (Tokyo vegetarian restaurant finder)"
			: userAgent;
		maxElements = maxElements <= 0 ? 500 : maxElements;
	}

}
