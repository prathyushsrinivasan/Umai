package com.umai.backend.restaurant;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;

import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.umai.backend.common.web.PageResponse;
import com.umai.backend.restaurant.dto.RestaurantDetailDto;
import com.umai.backend.restaurant.dto.RestaurantSummaryDto;

/**
 * Moderation queue for submitted restaurants.
 *
 * <p>Exists so {@code SUBMISSIONS_AUTO_PUBLISH=false} is a usable setting: without a
 * way to review them, held submissions would be invisible to everyone including their
 * author.
 *
 * <p>Restricted to moderators and administrators.
 */
@RestController
@RequestMapping("/api/v1/admin/restaurants")
@PreAuthorize("hasAnyRole('MODERATOR', 'ADMIN')")
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Moderation", description = "投稿されたレストランの承認（管理者・モデレーター）")
public class ModerationController {

	private final ModerationService moderationService;

	public ModerationController(ModerationService moderationService) {
		this.moderationService = moderationService;
	}

	@GetMapping
	@Operation(
		summary = "モデレーション待ちの一覧",
		description = "指定した状態のレストランを新しい順に返します。既定は承認待ち（PENDING）です。")
	public PageResponse<RestaurantSummaryDto> list(
			@RequestParam(defaultValue = "PENDING") RestaurantStatus status,
			@PageableDefault(size = 20) Pageable pageable) {
		return moderationService.findByStatus(status, pageable);
	}

	@GetMapping("/count")
	@Operation(summary = "承認待ちの件数", description = "モデレーション待ちの件数を返します。")
	public long pendingCount() {
		return moderationService.countPending();
	}

	@PostMapping("/{id}/approve")
	@Operation(summary = "公開を承認", description = "レストランを公開状態にします。")
	public RestaurantDetailDto approve(@PathVariable Long id) {
		return moderationService.approve(id);
	}

	@PostMapping("/{id}/reject")
	@Operation(
		summary = "公開を却下",
		description = "レストランを却下します。却下された外部データは再取り込みで復活しません。")
	public RestaurantDetailDto reject(@PathVariable Long id) {
		return moderationService.reject(id);
	}

}
