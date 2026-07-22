package com.umai.backend.area;

import io.swagger.v3.oas.annotations.media.Schema;

/** A Tokyo district as exposed by the API. */
@Schema(description = "エリア")
public record AreaDto(
		@Schema(example = "1") Long id,
		@Schema(example = "shinjuku") String slug,
		@Schema(example = "新宿") String nameJa) {

	public static AreaDto from(Area area) {
		return new AreaDto(area.getId(), area.getSlug(), area.getNameJa());
	}

}
