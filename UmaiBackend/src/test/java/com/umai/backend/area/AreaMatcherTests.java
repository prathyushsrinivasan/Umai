package com.umai.backend.area;

import java.util.List;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class AreaMatcherTests {

	private static final List<Area> AREAS = List.of(
		new Area("shinjuku", "新宿", 1),
		new Area("shibuya", "渋谷", 2),
		new Area("marunouchi", "東京・丸の内", 3),
		new Area("akihabara", "秋葉原", 4));

	private final AreaMatcher matcher = new AreaMatcher();

	@Test
	@DisplayName("matches a ward-level address to its neighbourhood area")
	void matchesWardAddress() {
		assertThat(matcher.match("東京都渋谷区道玄坂2-3-3", AREAS)).contains(AREAS.get(1));
	}

	@Test
	@DisplayName("Marunouchi matches on the plain neighbourhood name, not its full display name with the middle dot")
	void marunouchiMatchesWithoutDisplayNamePunctuation() {
		assertThat(matcher.match("東京都千代田区丸の内1-6-6", AREAS)).contains(AREAS.get(2));
	}

	@Test
	@DisplayName("Akihabara matches its real chome name even though the area's display name differs")
	void akihabaraMatchesChomeAlias() {
		assertThat(matcher.match("東京都千代田区外神田3-10-10", AREAS)).contains(AREAS.get(3));
	}

	@Test
	@DisplayName("an address matching no known area yields empty rather than a guess")
	void noMatchYieldsEmpty() {
		assertThat(matcher.match("神奈川県川崎市川崎区1-1-1", AREAS)).isEmpty();
	}

	@Test
	@DisplayName("a null or blank address yields empty")
	void blankAddressYieldsEmpty() {
		assertThat(matcher.match(null, AREAS)).isEmpty();
		assertThat(matcher.match("  ", AREAS)).isEmpty();
	}

}
