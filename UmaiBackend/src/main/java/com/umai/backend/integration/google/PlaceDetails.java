package com.umai.backend.integration.google;

import java.util.List;

import com.umai.backend.restaurant.PriceRange;

/**
 * Descriptive fields for a place, normalised out of the Google Places details response.
 *
 * <p>Every field is nullable: Google's coverage is uneven, and an absent field must stay
 * absent rather than overwrite existing data with a blank.
 *
 * @param phone               national-format phone number
 * @param websiteUri          official website
 * @param formattedAddress    single-line address
 * @param priceLevel          Google's price-level enum name, e.g. {@code PRICE_LEVEL_MODERATE}
 * @param rating              Google's average star rating, or null
 * @param userRatingCount     how many Google ratings back {@code rating}, or null
 * @param editorialSummary    Google's short editorial description
 * @param weekdayDescriptions one human-readable opening-hours line per weekday
 * @param firstPhotoName      resource name of the first photo, for {@link GooglePlacesClient#resolvePhotoUri}
 */
public record PlaceDetails(
		String phone,
		String websiteUri,
		String formattedAddress,
		String priceLevel,
		Double rating,
		Integer userRatingCount,
		String editorialSummary,
		List<String> weekdayDescriptions,
		String firstPhotoName) {

	public boolean hasPhoto() {
		return firstPhotoName != null && !firstPhotoName.isBlank();
	}

	/** Opening hours as a single newline-joined block, matching the free-text column, or null. */
	public String openingHoursText() {
		if (weekdayDescriptions == null || weekdayDescriptions.isEmpty()) {
			return null;
		}
		return String.join("\n", weekdayDescriptions);
	}

	/**
	 * Maps Google's five price levels onto our three bands, or null when unknown so we
	 * never invent a price we don't have. Package-visible and static for unit testing.
	 */
	public PriceRange toPriceRange() {
		return priceRangeFor(priceLevel);
	}

	static PriceRange priceRangeFor(String googlePriceLevel) {
		if (googlePriceLevel == null) {
			return null;
		}
		return switch (googlePriceLevel) {
			case "PRICE_LEVEL_FREE", "PRICE_LEVEL_INEXPENSIVE" -> PriceRange.BUDGET;
			case "PRICE_LEVEL_MODERATE" -> PriceRange.MODERATE;
			case "PRICE_LEVEL_EXPENSIVE", "PRICE_LEVEL_VERY_EXPENSIVE" -> PriceRange.EXPENSIVE;
			default -> null;
		};
	}

}
