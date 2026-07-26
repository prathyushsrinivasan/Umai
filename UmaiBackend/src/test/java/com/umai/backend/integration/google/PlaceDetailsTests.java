package com.umai.backend.integration.google;

import java.util.List;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import com.umai.backend.restaurant.PriceRange;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Place-details normalisation — the parts that need no network: mapping Google's five
 * price levels onto our three bands, joining opening hours, and photo presence.
 */
class PlaceDetailsTests {

	@Test
	@DisplayName("maps Google's price levels onto our three bands")
	void priceLevelMapping() {
		assertThat(PlaceDetails.priceRangeFor("PRICE_LEVEL_FREE")).isEqualTo(PriceRange.BUDGET);
		assertThat(PlaceDetails.priceRangeFor("PRICE_LEVEL_INEXPENSIVE")).isEqualTo(PriceRange.BUDGET);
		assertThat(PlaceDetails.priceRangeFor("PRICE_LEVEL_MODERATE")).isEqualTo(PriceRange.MODERATE);
		assertThat(PlaceDetails.priceRangeFor("PRICE_LEVEL_EXPENSIVE")).isEqualTo(PriceRange.EXPENSIVE);
		assertThat(PlaceDetails.priceRangeFor("PRICE_LEVEL_VERY_EXPENSIVE")).isEqualTo(PriceRange.EXPENSIVE);
	}

	@Test
	@DisplayName("an unknown or missing price level maps to null, never a guess")
	void unknownPriceLevelIsNull() {
		assertThat(PlaceDetails.priceRangeFor("PRICE_LEVEL_UNSPECIFIED")).isNull();
		assertThat(PlaceDetails.priceRangeFor(null)).isNull();
	}

	@Test
	@DisplayName("opening hours join into one block, or null when absent")
	void openingHoursText() {
		PlaceDetails withHours = details(List.of("Monday: 11–15", "Tuesday: Closed"), null);
		assertThat(withHours.openingHoursText()).isEqualTo("Monday: 11–15\nTuesday: Closed");

		assertThat(details(null, null).openingHoursText()).isNull();
		assertThat(details(List.of(), null).openingHoursText()).isNull();
	}

	@Test
	@DisplayName("photo presence follows the first photo resource name")
	void hasPhoto() {
		assertThat(details(null, "places/x/photos/y").hasPhoto()).isTrue();
		assertThat(details(null, null).hasPhoto()).isFalse();
		assertThat(details(null, "  ").hasPhoto()).isFalse();
	}

	private PlaceDetails details(List<String> weekdayDescriptions, String firstPhotoName) {
		return new PlaceDetails(null, null, null, null, null, null, null, weekdayDescriptions, firstPhotoName);
	}

}
