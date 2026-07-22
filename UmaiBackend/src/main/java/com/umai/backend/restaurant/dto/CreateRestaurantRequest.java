package com.umai.backend.restaurant.dto;

import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import com.umai.backend.restaurant.PriceRange;
import com.umai.backend.restaurant.VegetarianType;

/**
 * A user-submitted restaurant.
 *
 * <p>Only name, coordinates and diet classification are required. Everything else is
 * optional, because a contributor rarely knows every detail — and an empty field is
 * better than an invented one.
 *
 * <p>Status and source are not accepted from the client: a submission is always
 * recorded as {@code USER_SUBMISSION}, and its status is decided by the server.
 */
@Schema(description = "レストランの登録リクエスト")
public record CreateRestaurantRequest(
		@NotBlank(message = "店名を入力してください")
		@Size(max = 200)
		@Schema(example = "みどりの木キッチン") String name,

		@Size(max = 2000, message = "説明は2000文字以内で入力してください") String description,

		@Size(max = 500) String address,

		@NotNull(message = "緯度を入力してください")
		@DecimalMin(value = "-90.0") @DecimalMax(value = "90.0")
		@Schema(example = "35.6896") Double latitude,

		@NotNull(message = "経度を入力してください")
		@DecimalMin(value = "-180.0") @DecimalMax(value = "180.0")
		@Schema(example = "139.7006") Double longitude,

		@NotNull(message = "ヴィーガン・ベジタリアン対応を選択してください")
		VegetarianType vegetarianType,

		@Schema(nullable = true) PriceRange priceRange,

		// Restricted to http(s) so a submission cannot inject a javascript: or data:
		// URL that the frontend would render as a link.
		@Pattern(regexp = "^$|^https?://.{1,490}$", message = "URLは http:// または https:// で始めてください")
		@Size(max = 500) String websiteUrl,

		@Pattern(regexp = "^$|^[0-9+()\\-\\s]{6,32}$", message = "電話番号の形式が正しくありません")
		@Size(max = 32) String phone,

		@Size(max = 500) String openingHours,

		@Schema(description = "料理ジャンルの slug") List<String> categorySlugs,

		@Schema(description = "エリアの slug") String areaSlug) {

	public CreateRestaurantRequest {
		categorySlugs = categorySlugs == null ? List.of() : categorySlugs;
	}

}
