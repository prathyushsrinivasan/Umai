package com.umai.backend.restaurant.dto;

import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Size;

import com.umai.backend.restaurant.PriceRange;
import com.umai.backend.restaurant.VegetarianType;

/**
 * Filters accepted by the restaurant search endpoint. Every field is optional and
 * combined with AND; list fields match any of their values (OR within the list).
 *
 * @param keyword          matched against name, description and address
 * @param vegetarianTypes  diet classifications to include
 * @param categorySlugs    cuisine genres to include
 * @param tagSlugs         tags the restaurant must carry (all of them)
 * @param areaSlugs        Tokyo districts to include
 * @param priceRanges      price bands to include
 * @param minRating        minimum average rating; excludes unreviewed restaurants
 */
@Schema(description = "レストラン検索の絞り込み条件")
public record RestaurantSearchCriteria(
		@Size(max = 100) String keyword,
		List<VegetarianType> vegetarianTypes,
		List<String> categorySlugs,
		List<String> tagSlugs,
		List<String> areaSlugs,
		List<PriceRange> priceRanges,
		@DecimalMin("1.0") @DecimalMax("5.0") Double minRating) {

	/** Normalises nulls to empty lists so callers do not have to null-check. */
	public RestaurantSearchCriteria {
		vegetarianTypes = vegetarianTypes == null ? List.of() : vegetarianTypes;
		categorySlugs = categorySlugs == null ? List.of() : categorySlugs;
		tagSlugs = tagSlugs == null ? List.of() : tagSlugs;
		areaSlugs = areaSlugs == null ? List.of() : areaSlugs;
		priceRanges = priceRanges == null ? List.of() : priceRanges;
		keyword = (keyword == null || keyword.isBlank()) ? null : keyword.trim();
	}

	public boolean hasKeyword() {
		return keyword != null;
	}

	/**
	 * Whether a rating filter is requested. Rating lives in an aggregate over reviews,
	 * so it cannot be applied by the same Specification as the column filters.
	 */
	public boolean hasRatingFilter() {
		return minRating != null;
	}

}
