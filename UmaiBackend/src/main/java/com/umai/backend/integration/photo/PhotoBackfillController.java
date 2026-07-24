package com.umai.backend.integration.photo;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Administrative photo backfill: attaches real cover photos to restaurants that have
 * none, from the configured {@link PlacePhotoProvider}.
 *
 * <p>ADMIN-only — it writes to the public dataset and calls a rate-limited third party.
 * Synchronous and bounded: each call processes at most {@code limit} restaurants, so an
 * operator runs it repeatedly (or on a schedule) rather than in one huge request.
 */
@RestController
@RequestMapping("/api/v1/admin/photos")
@Validated
@PreAuthorize("hasRole('ADMIN')")
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Admin", description = "写真の取り込み（管理者のみ）")
public class PhotoBackfillController {

	private final PhotoBackfillService backfillService;

	public PhotoBackfillController(PhotoBackfillService backfillService) {
		this.backfillService = backfillService;
	}

	@GetMapping("/status")
	@Operation(summary = "写真取り込みの状態", description = "プロバイダーの有効状態と、写真のない店舗数を返します。")
	public PhotoStatus status() {
		return new PhotoStatus(
			backfillService.isAvailable(), backfillService.providerName(), backfillService.remaining());
	}

	@PostMapping("/backfill")
	@Operation(
		summary = "写真の取り込みを実行",
		description = "写真のない公開店舗に、外部プロバイダーからカバー写真を付与します。1 回につき最大 limit 件を処理します。")
	public ResponseEntity<?> backfill(@RequestParam(defaultValue = "25") @Min(1) @Max(100) int limit) {
		if (!backfillService.isAvailable()) {
			// 409: unreachable in practice (Wikipedia needs no key and is always enabled),
			// kept as a guard in case every provider is ever disabled.
			return ResponseEntity.status(HttpStatus.CONFLICT).body(new Message(
				"写真プロバイダーが利用できません。"));
		}
		return ResponseEntity.ok(backfillService.backfill(limit));
	}

	/** Whether photo backfill can run, and how much work is left. */
	public record PhotoStatus(boolean enabled, String provider, long remaining) {
	}

	private record Message(String message) {
	}

}
