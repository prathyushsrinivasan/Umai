package com.umai.backend.security.ratelimit;

import java.io.IOException;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.core.annotation.Order;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import tools.jackson.databind.ObjectMapper;

import com.umai.backend.common.exception.ApiError;

/**
 * Caps how often a single client may call authentication and write endpoints.
 *
 * <p>Without this, login is brute-forceable and submissions are spammable by anyone
 * willing to create one account.
 *
 * <p>Buckets are held in memory, which is correct for a single instance and the right
 * scope for this MVP. Running several instances would need a shared store (Redis) or
 * limiting at the gateway, since each instance would otherwise grant its own
 * allowance.
 *
 * <p>Runs before authentication so that repeated failed logins are throttled — a
 * limiter placed after auth would never see them.
 */
@Component
@Order(-200)
public class RateLimitFilter extends OncePerRequestFilter {

	/** Buckets are dropped once idle, so the map cannot grow without bound. */
	private static final int CLEANUP_THRESHOLD = 10_000;

	private final Map<String, TokenBucket> buckets = new ConcurrentHashMap<>();

	private final RateLimitProperties properties;

	private final ObjectMapper objectMapper;

	public RateLimitFilter(RateLimitProperties properties, ObjectMapper objectMapper) {
		this.properties = properties;
		this.objectMapper = objectMapper;
	}

	@Override
	protected boolean shouldNotFilter(HttpServletRequest request) {
		if (!properties.enabled()) {
			return true;
		}
		// Reads are cheap and public; limiting them would harm ordinary browsing.
		return !isRateLimited(request);
	}

	@Override
	protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
			FilterChain filterChain) throws ServletException, IOException {

		long now = Instant.now().toEpochMilli();
		boolean authEndpoint = isAuthEndpoint(request);

		String key = (authEndpoint ? "auth:" : "write:") + clientIdentifier(request);
		int capacity = authEndpoint ? properties.authAttempts() : properties.writeRequests();

		TokenBucket bucket = buckets.computeIfAbsent(key,
			ignored -> new TokenBucket(capacity, properties.period().toMillis(), now));

		if (!bucket.tryConsume(now)) {
			writeTooManyRequests(request, response, bucket.secondsUntilRefill(now));
			return;
		}

		if (buckets.size() > CLEANUP_THRESHOLD) {
			evictIdleBuckets(now);
		}

		filterChain.doFilter(request, response);
	}

	private boolean isRateLimited(HttpServletRequest request) {
		if (isAuthEndpoint(request)) {
			return true;
		}
		String method = request.getMethod();
		return HttpMethod.POST.matches(method)
			|| HttpMethod.PUT.matches(method)
			|| HttpMethod.DELETE.matches(method)
			|| HttpMethod.PATCH.matches(method);
	}

	private boolean isAuthEndpoint(HttpServletRequest request) {
		String path = request.getRequestURI();
		return path.startsWith("/api/v1/auth/login") || path.startsWith("/api/v1/auth/register");
	}

	/**
	 * Identifies the caller by remote address.
	 *
	 * <p>Deliberately ignores {@code X-Forwarded-For}: that header is client-supplied
	 * and trivially spoofed, so trusting it here would let an attacker mint a fresh
	 * allowance per request. Behind a proxy, configure
	 * {@code server.forward-headers-strategy} so the container populates the remote
	 * address from a trusted source instead.
	 */
	private String clientIdentifier(HttpServletRequest request) {
		String address = request.getRemoteAddr();
		return address == null ? "unknown" : address;
	}

	private void evictIdleBuckets(long now) {
		buckets.entrySet().removeIf(entry -> entry.getValue().isFull(now));
	}

	private void writeTooManyRequests(HttpServletRequest request, HttpServletResponse response,
			long retryAfterSeconds) throws IOException {

		response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
		response.setContentType(MediaType.APPLICATION_JSON_VALUE);
		response.setCharacterEncoding("UTF-8");
		response.setHeader("Retry-After", String.valueOf(retryAfterSeconds));

		ApiError body = ApiError.of(
			HttpStatus.TOO_MANY_REQUESTS.value(),
			HttpStatus.TOO_MANY_REQUESTS.getReasonPhrase(),
			"リクエストが多すぎます。%d秒後にもう一度お試しください。".formatted(retryAfterSeconds),
			request.getRequestURI());

		objectMapper.writeValue(response.getOutputStream(), body);
	}

}
