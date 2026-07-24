package com.umai.backend.integration.wikipedia;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.web.client.RestClient;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Wikimedia Commons photo provider — the parts that need no network: always enabled,
 * and reuses {@link WikipediaPhotoProvider#titlesOverlap} correctly against a realistic
 * Commons file title (which carries extra decoration a plain article title doesn't).
 */
class WikimediaCommonsPhotoProviderTests {

	private WikimediaCommonsPhotoProvider provider() {
		return new WikimediaCommonsPhotoProvider(RestClient.builder());
	}

	@Test
	@DisplayName("needs no API key, so it's always enabled")
	void alwaysEnabled() {
		assertThat(provider().isEnabled()).isTrue();
	}

	@Test
	@DisplayName("a blank place name yields no lookup")
	void blankNameYieldsEmpty() {
		assertThat(provider().findPhotoUrl("  ", 35.65, 139.70)).isEmpty();
		assertThat(provider().findPhotoUrl(null, 35.65, 139.70)).isEmpty();
	}

	@Test
	@DisplayName("a restaurant name overlaps a realistic Commons file title")
	void matchesRealisticFileTitle() {
		assertThat(WikipediaPhotoProvider.titlesOverlap("AFURI 新宿", "File:AFURI 新宿 (39573231501).jpg")).isTrue();
	}

	@Test
	@DisplayName("an unrelated file title is rejected")
	void unrelatedFileTitleIsRejected() {
		assertThat(WikipediaPhotoProvider.titlesOverlap("なぎ食堂", "File:Tokyo Tower at night.jpg")).isFalse();
	}

}
