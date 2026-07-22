package com.umai.backend.restaurant.dto;

import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;

import com.umai.backend.area.AreaDto;
import com.umai.backend.category.CategoryDto;
import com.umai.backend.restaurant.PriceRange;
import com.umai.backend.restaurant.VegetarianType;

/**
 * Restaurant as shown in lists, cards and map previews.
 *
 * <p>Fields the data source does not provide stay null. Clients must render the
 * absence rather than substitute a placeholder value.
 *
 * @param averageRating mean of all reviews; null when there are none
 * @param reviewCount   number of reviews behind {@code averageRating}
 */
@Schema(description = "一覧・カード表示用のレストラン情報")
public record RestaurantSummaryDto(
		Long id,
		String name,
		String description,
		String address,
		double latitude,
		double longitude,
		VegetarianType vegetarianType,
		@Schema(nullable = true) PriceRange priceRange,
		@Schema(nullable = true) String imageUrl,
		@Schema(nullable = true) AreaDto area,
		List<CategoryDto> categories,
		@Schema(nullable = true, description = "レビューがない場合は null") Double averageRating,
		long reviewCount) {
}
