package com.umai.backend.security.ratelimit;

/**
 * A token bucket: {@code capacity} tokens that refill steadily over
 * {@code refillPeriodMillis}.
 *
 * <p>Allows a short burst up to the capacity while holding the long-run average to
 * the refill rate — a fixed window would instead let a caller spend a whole window's
 * allowance either side of the boundary, permitting double the intended rate.
 *
 * <p>Time is passed in rather than read from a clock, so the refill behaviour can be
 * tested deterministically without sleeping.
 */
public final class TokenBucket {

	private final int capacity;

	private final long refillPeriodMillis;

	private double tokens;

	private long lastRefillMillis;

	public TokenBucket(int capacity, long refillPeriodMillis, long nowMillis) {
		if (capacity <= 0) {
			throw new IllegalArgumentException("capacity must be positive");
		}
		if (refillPeriodMillis <= 0) {
			throw new IllegalArgumentException("refillPeriodMillis must be positive");
		}

		this.capacity = capacity;
		this.refillPeriodMillis = refillPeriodMillis;
		this.tokens = capacity;
		this.lastRefillMillis = nowMillis;
	}

	/**
	 * Takes one token if any remain.
	 *
	 * @return true when the request is allowed, false when the caller is over its rate
	 */
	public synchronized boolean tryConsume(long nowMillis) {
		refill(nowMillis);

		if (tokens >= 1.0) {
			tokens -= 1.0;
			return true;
		}
		return false;
	}

	/** Seconds until at least one token is available; 0 when one already is. */
	public synchronized long secondsUntilRefill(long nowMillis) {
		refill(nowMillis);

		if (tokens >= 1.0) {
			return 0;
		}

		double tokensNeeded = 1.0 - tokens;
		double millisPerToken = (double) refillPeriodMillis / capacity;
		return (long) Math.ceil(tokensNeeded * millisPerToken / 1000.0);
	}

	/** True when the bucket is full, i.e. the caller has no recent activity. */
	public synchronized boolean isFull(long nowMillis) {
		refill(nowMillis);
		return tokens >= capacity;
	}

	private void refill(long nowMillis) {
		long elapsed = nowMillis - lastRefillMillis;
		if (elapsed <= 0) {
			// A clock that went backwards must not grant tokens.
			return;
		}

		double refilled = (double) elapsed / refillPeriodMillis * capacity;
		tokens = Math.min(capacity, tokens + refilled);
		lastRefillMillis = nowMillis;
	}

}
