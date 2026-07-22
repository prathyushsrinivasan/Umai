package com.umai.backend.tag;

import io.swagger.v3.oas.annotations.media.Schema;

/** A descriptive label as exposed by the API. */
@Schema(description = "タグ")
public record TagDto(
		@Schema(example = "1") Long id,
		@Schema(example = "gluten-free") String slug,
		@Schema(example = "グルテンフリー対応") String nameJa) {

	public static TagDto from(Tag tag) {
		return new TagDto(tag.getId(), tag.getSlug(), tag.getNameJa());
	}

}
