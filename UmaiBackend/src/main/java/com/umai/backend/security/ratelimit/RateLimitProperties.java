package com.umai.backend.security.ratelimit;

import java.time.Duration;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Rate limits, bound from {@code umai.rate-limit.*}.
 *
 * <p>Two tiers, because the endpoints differ in what abuse costs. Authentication is
 * brute-forceable, so it is limited tightly. Other writes are limited loosely enough
 * that a genuine contributor never notices.
 *
 * @param enabled       set false to disable limiting entirely, e.g. in tests
 * @param authAttempts  login/registration attempts allowed per {@code period}
 * @param writeRequests other write requests allowed per {@code period}
 * @param period        window over which the allowances refill
 */
@ConfigurationProperties(prefix = "umai.rate-limit")
public record RateLimitProperties(
		boolean enabled,
		int authAttempts,
		int writeRequests,
		Duration period) {

	public RateLimitProperties {
		authAttempts = authAttempts <= 0 ? 10 : authAttempts;
		writeRequests = writeRequests <= 0 ? 60 : writeRequests;
		period = period == null ? Duration.ofMinutes(1) : period;
	}

}
