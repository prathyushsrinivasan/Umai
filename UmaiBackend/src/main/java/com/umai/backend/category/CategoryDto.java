package com.umai.backend.category;

import io.swagger.v3.oas.annotations.media.Schema;

/** A cuisine genre as exposed by the API. */
@Schema(description = "料理ジャンル")
public record CategoryDto(
		@Schema(example = "1") Long id,
		@Schema(description = "Stable key used in filters and URLs", example = "washoku") String slug,
		@Schema(description = "Display name (Japanese)", example = "和食") String nameJa,
		String description) {

	public static CategoryDto from(Category category) {
		return new CategoryDto(
			category.getId(), category.getSlug(), category.getNameJa(), category.getDescription());
	}

}
