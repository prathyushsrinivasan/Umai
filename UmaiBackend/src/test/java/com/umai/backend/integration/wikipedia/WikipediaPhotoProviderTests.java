package com.umai.backend.integration.wikipedia;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.web.client.RestClient;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Wikipedia photo provider — the parts that need no network: it's always enabled (no key
 * required), and title matching accepts real overlaps while rejecting unrelated hits.
 */
class WikipediaPhotoProviderTests {

	private WikipediaPhotoProvider provider() {
		return new WikipediaPhotoProvider(RestClient.builder());
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
	@DisplayName("a branch name overlaps its chain's article title")
	void branchNameOverlapsChainTitle() {
		assertThat(WikipediaPhotoProvider.titlesOverlap("マクドナルド 新宿東口店", "マクドナルド")).isTrue();
		assertThat(WikipediaPhotoProvider.titlesOverlap("無敵家", "無敵家")).isTrue();
	}

	@Test
	@DisplayName("middle dots and spacing differences don't block a real match")
	void punctuationIsIgnored() {
		assertThat(WikipediaPhotoProvider.titlesOverlap(
			"日本ケンタッキー・フライド・チキン 渋谷店", "日本ケンタッキーフライドチキン")).isTrue();
	}

	@Test
	@DisplayName("an unrelated article title is rejected")
	void unrelatedTitleIsRejected() {
		assertThat(WikipediaPhotoProvider.titlesOverlap("なぎ食堂", "東京都")).isFalse();
	}

	@Test
	@DisplayName("a purely numeric name is rejected even when it's a literal substring")
	void bareNumberIsRejected() {
		// Real bug: restaurant named "202" matched a counting-rod numeral diagram whose
		// filename happened to contain "202".
		assertThat(WikipediaPhotoProvider.titlesOverlap("202", "Counting rod 202 diagram")).isFalse();
	}

	@Test
	@DisplayName("a name shorter than 3 characters is rejected even on an exact match")
	void tooShortNameIsRejected() {
		// Real bug: restaurant named "頭" ("head") exactly matched Wikipedia's own
		// generic anatomy article of the same title.
		assertThat(WikipediaPhotoProvider.titlesOverlap("頭", "頭")).isFalse();
		assertThat(WikipediaPhotoProvider.titlesOverlap("穂高", "山川穂高")).isFalse();
	}

}
