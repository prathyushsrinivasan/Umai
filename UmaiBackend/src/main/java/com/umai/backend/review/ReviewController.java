package com.umai.backend.review;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;

import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.umai.backend.common.web.PageResponse;
import com.umai.backend.review.dto.ReviewDtos.ReviewDto;
import com.umai.backend.review.dto.ReviewDtos.ReviewRequest;

/**
 * Reviews for a restaurant.
 *
 * <p>Reading is public; writing requires authentication. The author is always taken
 * from the token, never from the request.
 */
@RestController
@RequestMapping("/api/v1/restaurants/{restaurantId}/reviews")
@Tag(name = "Reviews", description = "レストランの評価・口コミ")
public class ReviewController {

	private final ReviewService reviewService;

	public ReviewController(ReviewService reviewService) {
		this.reviewService = reviewService;
	}

	@GetMapping
	@Operation(summary = "レビュー一覧", description = "新しい順にレビューを返します。")
	public PageResponse<ReviewDto> list(
			@PathVariable Long restaurantId,
			@PageableDefault(size = 10) Pageable pageable) {
		return reviewService.findForRestaurant(restaurantId, pageable);
	}

	@PostMapping
	@Operation(
		summary = "レビューを投稿",
		description = "1つのお店につき1件まで投稿できます。既に投稿済みの場合は 409 を返します。")
	@SecurityRequirement(name = "bearerAuth")
	public ResponseEntity<ReviewDto> create(
			@PathVariable Long restaurantId,
			@Valid @RequestBody ReviewRequest request) {
		return ResponseEntity.status(HttpStatus.CREATED).body(reviewService.create(restaurantId, request));
	}

	@PutMapping("/{reviewId}")
	@Operation(summary = "レビューを編集", description = "自分のレビューのみ編集できます。")
	@SecurityRequirement(name = "bearerAuth")
	public ReviewDto update(
			@PathVariable Long restaurantId,
			@PathVariable Long reviewId,
			@Valid @RequestBody ReviewRequest request) {
		return reviewService.update(restaurantId, reviewId, request);
	}

	@DeleteMapping("/{reviewId}")
	@Operation(summary = "レビューを削除", description = "自分のレビューのみ削除できます。")
	@SecurityRequirement(name = "bearerAuth")
	public ResponseEntity<Void> delete(@PathVariable Long restaurantId, @PathVariable Long reviewId) {
		reviewService.delete(restaurantId, reviewId);
		return ResponseEntity.noContent().build();
	}

}
