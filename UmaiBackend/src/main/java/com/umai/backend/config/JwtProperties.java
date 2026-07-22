package com.umai.backend.config;

import java.nio.charset.StandardCharsets;
import java.time.Duration;

import jakarta.annotation.PostConstruct;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * JWT signing configuration, bound from {@code umai.security.jwt.*}.
 *
 * @param secret    HMAC signing key; must come from the environment
 * @param expiresIn how long an issued token stays valid
 */
@ConfigurationProperties(prefix = "umai.security.jwt")
public record JwtProperties(String secret, Duration expiresIn) {

	/** HS256 requires a key of at least 256 bits. */
	private static final int MIN_SECRET_BYTES = 32;

	public JwtProperties {
		expiresIn = expiresIn == null ? Duration.ofHours(12) : expiresIn;
	}

	/**
	 * Fails startup with an actionable message rather than allowing the application to
	 * run with a missing or weak signing key. A defaulted secret would mean every
	 * deployment shared a key that is also published in the repository.
	 */
	@PostConstruct
	void validate() {
		if (secret == null || secret.isBlank()) {
			throw new IllegalStateException("""
					JWT_SECRET is not set. Generate one and add it to your .env:
					  openssl rand -base64 48
					There is deliberately no default: a built-in signing key would be public.
					""");
		}

		int length = secret.getBytes(StandardCharsets.UTF_8).length;
		if (length < MIN_SECRET_BYTES) {
			throw new IllegalStateException(
				"JWT_SECRET must be at least %d bytes for HS256, but was %d. Generate one with: openssl rand -base64 48"
					.formatted(MIN_SECRET_BYTES, length));
		}
	}

}
