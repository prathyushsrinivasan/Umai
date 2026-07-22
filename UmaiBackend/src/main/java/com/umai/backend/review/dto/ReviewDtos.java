package com.umai.backend.review.dto;

import java.time.Instant;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import com.umai.backend.review.Review;

/** Request and response payloads for reviews. */
public final class ReviewDtos {

	private ReviewDtos() {
	}

	/**
	 * A submitted rating and optional comment.
	 *
	 * <p>The restaurant comes from the path and the author from the token, so neither
	 * is accepted from the body — a client must not be able to review as someone else.
	 */
	@Schema(description = "レビューの投稿・更新")
	public record ReviewRequest(
			@NotNull
			@Min(value = Review.MIN_RATING, message = "評価は1〜5で入力してください")
			@Max(value = Review.MAX_RATING, message = "評価は1〜5で入力してください")
			@Schema(example = "4", minimum = "1", maximum = "5") Short rating,

			@Size(max = 2000, message = "コメントは2000文字以内で入力してください")
			@Schema(nullable = true) String comment) {
	}

	@Schema(description = "レビュー")
	public record ReviewDto(
			Long id,
			Long restaurantId,
			Long userId,
			@Schema(description = "投稿者の表示名") String username,
			short rating,
			@Schema(nullable = true) String comment,
			Instant createdAt,
			Instant updatedAt,
			@Schema(description = "リクエスト元のユーザーが投稿したレビューかどうか") boolean ownedByCurrentUser) {
	}

	/** A restaurant's reviews plus its derived aggregate. */
	@Schema(description = "レビュー一覧と集計")
	public record ReviewSummaryDto(
			@Schema(nullable = true, description = "レビューがない場合は null") Double averageRating,
			long reviewCount) {
	}

}
