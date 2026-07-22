package com.umai.backend.restaurant.dto;

import java.time.Instant;
import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;

import com.umai.backend.area.AreaDto;
import com.umai.backend.category.CategoryDto;
import com.umai.backend.restaurant.PriceRange;
import com.umai.backend.restaurant.RestaurantSource;
import com.umai.backend.restaurant.VegetarianType;
import com.umai.backend.tag.TagDto;

/**
 * Full restaurant record for the detail screen.
 *
 * <p>Every optional field is nullable by design — external data is incomplete, and the
 * UI shows what exists instead of inventing the rest.
 */
@Schema(description = "店舗詳細のレストラン情報")
public record RestaurantDetailDto(
		Long id,
		String name,
		@Schema(nullable = true) String description,
		@Schema(nullable = true) String address,
		double latitude,
		double longitude,
		VegetarianType vegetarianType,
		@Schema(nullable = true) PriceRange priceRange,
		@Schema(nullable = true) String websiteUrl,
		@Schema(nullable = true) String phone,
		@Schema(nullable = true) String openingHours,
		@Schema(nullable = true) String imageUrl,
		@Schema(nullable = true) AreaDto area,
		List<CategoryDto> categories,
		List<TagDto> tags,
		@Schema(nullable = true, description = "レビューがない場合は null") Double averageRating,
		long reviewCount,
		@Schema(description = "データの出所。SEED は開発用のダミーデータ") RestaurantSource source,
		Instant createdAt,
		Instant updatedAt) {
}
