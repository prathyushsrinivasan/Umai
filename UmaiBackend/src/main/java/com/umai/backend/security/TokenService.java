package com.umai.backend.security;

import java.time.Instant;

import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.stereotype.Service;

import com.umai.backend.config.JwtProperties;
import com.umai.backend.user.User;

/**
 * Issues signed access tokens.
 *
 * <p>The token carries the user id as its subject plus the role, so authorisation
 * decisions need no database lookup per request. Nothing sensitive is included — a
 * JWT is signed, not encrypted, and its contents are readable by anyone holding it.
 */
@Service
public class TokenService {

	/** Claim holding the display name, so the UI can greet the user without a fetch. */
	public static final String CLAIM_USERNAME = "username";

	public static final String CLAIM_ROLE = "role";

	private final JwtEncoder encoder;

	private final JwtProperties properties;

	public TokenService(JwtEncoder encoder, JwtProperties properties) {
		this.encoder = encoder;
		this.properties = properties;
	}

	public IssuedToken issue(User user) {
		Instant issuedAt = Instant.now();
		Instant expiresAt = issuedAt.plus(properties.expiresIn());

		JwtClaimsSet claims = JwtClaimsSet.builder()
			.issuer("umai")
			.issuedAt(issuedAt)
			.expiresAt(expiresAt)
			.subject(String.valueOf(user.getId()))
			.claim(CLAIM_USERNAME, user.getUsername())
			.claim(CLAIM_ROLE, user.getRole().name())
			.build();

		JwsHeader header = JwsHeader.with(MacAlgorithm.HS256).build();
		String token = encoder.encode(JwtEncoderParameters.from(header, claims)).getTokenValue();

		return new IssuedToken(token, expiresAt);
	}

	/** A signed token and the moment it stops being valid. */
	public record IssuedToken(String value, Instant expiresAt) {
	}

}
