package com.umai.backend.security.ratelimit;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Rate-limiting behaviour.
 *
 * <p>Time is injected, so refill is verified deterministically rather than by
 * sleeping — a test that sleeps is both slow and flaky.
 */
class TokenBucketTests {

	private static final long MINUTE = 60_000L;

	@Test
	@DisplayName("a fresh bucket allows up to its capacity, then refuses")
	void allowsUpToCapacity() {
		TokenBucket bucket = new TokenBucket(3, MINUTE, 0);

		assertThat(bucket.tryConsume(0)).isTrue();
		assertThat(bucket.tryConsume(0)).isTrue();
		assertThat(bucket.tryConsume(0)).isTrue();
		assertThat(bucket.tryConsume(0)).isFalse();
	}

	@Test
	@DisplayName("tokens return gradually rather than all at once")
	void refillsGradually() {
		TokenBucket bucket = new TokenBucket(10, MINUTE, 0);

		for (int i = 0; i < 10; i++) {
			bucket.tryConsume(0);
		}
		assertThat(bucket.tryConsume(0)).isFalse();

		// A tenth of the period restores roughly one token.
		assertThat(bucket.tryConsume(MINUTE / 10)).isTrue();
		assertThat(bucket.tryConsume(MINUTE / 10)).isFalse();
	}

	@Test
	@DisplayName("a full period restores the whole allowance")
	void refillsFullyAfterOnePeriod() {
		TokenBucket bucket = new TokenBucket(5, MINUTE, 0);

		for (int i = 0; i < 5; i++) {
			bucket.tryConsume(0);
		}

		assertThat(bucket.tryConsume(MINUTE)).isTrue();
	}

	@Test
	@DisplayName("tokens never accumulate beyond capacity")
	void doesNotOverfill() {
		TokenBucket bucket = new TokenBucket(3, MINUTE, 0);

		// Idle for ten periods; the bucket must still only hold three.
		assertThat(bucket.tryConsume(MINUTE * 10)).isTrue();
		assertThat(bucket.tryConsume(MINUTE * 10)).isTrue();
		assertThat(bucket.tryConsume(MINUTE * 10)).isTrue();
		assertThat(bucket.tryConsume(MINUTE * 10)).isFalse();
	}

	@Test
	@DisplayName("a burst is allowed but the long-run average holds to the rate")
	void limitsLongRunAverage() {
		TokenBucket bucket = new TokenBucket(10, MINUTE, 0);
		int allowed = 0;

		// Attempt once per second for five minutes: 300 attempts against a rate of
		// 10/min. Expect roughly 10 burst + 50 refilled.
		for (int second = 0; second < 300; second++) {
			if (bucket.tryConsume(second * 1_000L)) {
				allowed++;
			}
		}

		assertThat(allowed).isBetween(55, 65);
	}

	@Test
	@DisplayName("reports how long to wait when exhausted")
	void reportsRetryDelay() {
		TokenBucket bucket = new TokenBucket(2, MINUTE, 0);

		assertThat(bucket.secondsUntilRefill(0)).isZero();

		bucket.tryConsume(0);
		bucket.tryConsume(0);

		// Capacity 2 per minute means one token every 30 seconds.
		assertThat(bucket.secondsUntilRefill(0)).isEqualTo(30);
	}

	@Test
	@DisplayName("a clock that moves backwards does not grant tokens")
	void ignoresBackwardsClock() {
		TokenBucket bucket = new TokenBucket(1, MINUTE, 10_000);

		assertThat(bucket.tryConsume(10_000)).isTrue();
		assertThat(bucket.tryConsume(0)).isFalse();
	}

	@Test
	@DisplayName("an untouched bucket reports itself idle, so it can be evicted")
	void reportsWhenIdle() {
		TokenBucket bucket = new TokenBucket(5, MINUTE, 0);
		assertThat(bucket.isFull(0)).isTrue();

		bucket.tryConsume(0);
		assertThat(bucket.isFull(0)).isFalse();

		// Fully refilled after a period, so it holds no useful state.
		assertThat(bucket.isFull(MINUTE)).isTrue();
	}

	@Test
	@DisplayName("invalid configuration is rejected at construction")
	void rejectsInvalidConfiguration() {
		assertThatThrownBy(() -> new TokenBucket(0, MINUTE, 0))
			.isInstanceOf(IllegalArgumentException.class);
		assertThatThrownBy(() -> new TokenBucket(5, 0, 0))
			.isInstanceOf(IllegalArgumentException.class);
	}

}
