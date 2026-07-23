package com.umai.backend.integration.foursquare;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.web.client.RestClient;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Foursquare photo provider — the parts that need no network: it stays disabled and
 * silent without an API key, and it assembles photo URLs correctly.
 */
class FoursquarePhotoProviderTests {

	private FoursquarePhotoProvider providerWithKey(String apiKey) {
		return new FoursquarePhotoProvider(
			RestClient.builder(),
			new FoursquareProperties(apiKey, null, 0, null));
	}

	@Test
	@DisplayName("with no API key the provider is disabled and never calls out")
	void disabledWithoutKey() {
		FoursquarePhotoProvider provider = providerWithKey("");

		assertThat(provider.isEnabled()).isFalse();
		// Returns empty without attempting any HTTP request (no key, so short-circuits).
		assertThat(provider.findPhotoUrl("なぎ食堂", 35.65, 139.70)).isEmpty();
	}

	@Test
	@DisplayName("a present API key enables the provider")
	void enabledWithKey() {
		assertThat(providerWithKey("test-key").isEnabled()).isTrue();
	}

	@Test
	@DisplayName("a blank place name yields no lookup even when enabled")
	void blankNameYieldsEmpty() {
		assertThat(providerWithKey("test-key").findPhotoUrl("  ", 35.65, 139.70)).isEmpty();
	}

	@Test
	@DisplayName("photo URL is assembled from prefix + size + suffix")
	void buildsPhotoUrl() {
		assertThat(FoursquarePhotoProvider.buildPhotoUrl("https://fastly.4sqi.net/img/general/", "/12345_abc.jpg"))
			.isEqualTo("https://fastly.4sqi.net/img/general/800x600/12345_abc.jpg");
	}

	@Test
	@DisplayName("a missing prefix or suffix yields no URL rather than a broken one")
	void nullPartsYieldNull() {
		assertThat(FoursquarePhotoProvider.buildPhotoUrl(null, "/x.jpg")).isNull();
		assertThat(FoursquarePhotoProvider.buildPhotoUrl("https://x/", null)).isNull();
		assertThat(FoursquarePhotoProvider.buildPhotoUrl("", "/x.jpg")).isNull();
	}

}
