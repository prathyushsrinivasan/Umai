package com.umai.backend.security;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;

import com.umai.backend.user.UserRole;

/**
 * Reads the authenticated principal out of the security context.
 *
 * <p>Identity always comes from the verified token, never from a request parameter or
 * body field — otherwise a client could act as another user by changing an id.
 */
public final class CurrentUser {

	private CurrentUser() {
	}

	/** The authenticated user's id, or null when the request is anonymous. */
	public static Long idOrNull() {
		Jwt jwt = jwtOrNull();
		return jwt == null ? null : Long.valueOf(jwt.getSubject());
	}

	/** The authenticated user's id, failing loudly if called on an anonymous request. */
	public static Long requireId() {
		Long id = idOrNull();
		if (id == null) {
			throw new IllegalStateException("No authenticated user; this endpoint must be protected");
		}
		return id;
	}

	public static boolean hasRole(UserRole role) {
		Jwt jwt = jwtOrNull();
		return jwt != null && role.name().equals(jwt.getClaimAsString(TokenService.CLAIM_ROLE));
	}

	private static Jwt jwtOrNull() {
		Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
		if (authentication == null || !(authentication.getPrincipal() instanceof Jwt jwt)) {
			return null;
		}
		return jwt;
	}

}
