package com.umai.backend.restaurant.dto;

import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * Restaurants visible in the current map viewport.
 *
 * @param restaurants  markers to draw, capped at the requested limit
 * @param totalInBounds how many actually match; larger than {@code restaurants.size()}
 *                      when the result was capped
 * @param truncated    true when some matches were omitted, so the UI can prompt the
 *                     user to zoom in rather than silently showing a partial map
 */
@Schema(description = "地図の表示範囲内のレストラン")
public record MapRestaurantsDto(
		List<RestaurantSummaryDto> restaurants,
		long totalInBounds,
		boolean truncated) {
}
