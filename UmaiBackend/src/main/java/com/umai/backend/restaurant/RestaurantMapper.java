package com.umai.backend.restaurant;

import java.util.Comparator;
import java.util.List;

import org.springframework.stereotype.Component;

import com.umai.backend.area.AreaDto;
import com.umai.backend.category.CategoryDto;
import com.umai.backend.restaurant.dto.RestaurantDetailDto;
import com.umai.backend.restaurant.dto.RestaurantSummaryDto;
import com.umai.backend.review.RatingSummary;
import com.umai.backend.tag.TagDto;

/**
 * Converts restaurant entities into API DTOs.
 *
 * <p>Rating figures are passed in rather than read from the entity: they are derived
 * from reviews and loaded in bulk by the service to avoid a query per row.
 */
@Component
public class RestaurantMapper {

	public RestaurantSummaryDto toSummary(Restaurant restaurant, RatingSummary rating) {
		return new RestaurantSummaryDto(
			restaurant.getId(),
			restaurant.getName(),
			restaurant.getDescription(),
			restaurant.getAddress(),
			restaurant.getLatitude(),
			restaurant.getLongitude(),
			restaurant.getVegetarianType(),
			restaurant.getPriceRange(),
			restaurant.getImageUrl(),
			restaurant.getArea() == null ? null : AreaDto.from(restaurant.getArea()),
			toCategoryDtos(restaurant),
			rating.averageRating(),
			rating.reviewCount());
	}

	public RestaurantDetailDto toDetail(Restaurant restaurant, RatingSummary rating) {
		List<TagDto> tags = restaurant.getTags().stream()
			.sorted(Comparator.comparing(tag -> tag.getNameJa()))
			.map(TagDto::from)
			.toList();

		return new RestaurantDetailDto(
			restaurant.getId(),
			restaurant.getName(),
			restaurant.getDescription(),
			restaurant.getAddress(),
			restaurant.getLatitude(),
			restaurant.getLongitude(),
			restaurant.getVegetarianType(),
			restaurant.getPriceRange(),
			restaurant.getWebsiteUrl(),
			restaurant.getPhone(),
			restaurant.getOpeningHours(),
			restaurant.getImageUrl(),
			restaurant.getArea() == null ? null : AreaDto.from(restaurant.getArea()),
			toCategoryDtos(restaurant),
			tags,
			rating.averageRating(),
			rating.reviewCount(),
			restaurant.getSource(),
			restaurant.getCreatedAt(),
			restaurant.getUpdatedAt());
	}

	private List<CategoryDto> toCategoryDtos(Restaurant restaurant) {
		return restaurant.getCategories().stream()
			.sorted(Comparator.comparingInt(category -> category.getDisplayOrder()))
			.map(CategoryDto::from)
			.toList();
	}

}
