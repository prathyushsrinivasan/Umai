package com.umai.backend.integration.google;

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
 * Administrative matching to Google place identifiers. Descriptive Google fields
 * are not persisted; photos are requested separately by the visitor.
 *
 * <p>ADMIN-only — it writes to the public dataset and calls a rate-limited third party.
 * Synchronous and bounded: each call processes at most {@code limit} restaurants, so an
 * operator runs it repeatedly rather than in one huge request.
 */
@RestController
@RequestMapping("/api/v1/admin/google")
@Validated
@PreAuthorize("hasRole('ADMIN')")
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Admin", description = "Google による店舗情報の補完（管理者のみ）")
public class GoogleEnrichmentController {

	private final GoogleEnrichmentService enrichmentService;

	public GoogleEnrichmentController(GoogleEnrichmentService enrichmentService) {
		this.enrichmentService = enrichmentService;
	}

	@GetMapping("/status")
	@Operation(summary = "Google 補完の状態", description = "設定状態と、未マッチの店舗数を返します。")
	public EnrichmentStatus status() {
		return new EnrichmentStatus(enrichmentService.isAvailable(), enrichmentService.remaining());
	}

	@PostMapping("/enrich")
	@Operation(
		summary = "Google 補完を実行",
		description = "未マッチの公開店舗を Google と照合し、不足項目とカバー写真を補完します。1 回につき最大 limit 件。")
	public ResponseEntity<?> enrich(@RequestParam(defaultValue = "25") @Min(1) @Max(100) int limit) {
		if (!enrichmentService.isAvailable()) {
			return ResponseEntity.status(HttpStatus.CONFLICT).body(new Message(
				"Google API キーが設定されていません。"));
		}
		return ResponseEntity.ok(enrichmentService.enrich(limit));
	}

	/** Whether enrichment can run, and how many restaurants remain unmatched. */
	public record EnrichmentStatus(boolean enabled, long remaining) {
	}

	private record Message(String message) {
	}

}
