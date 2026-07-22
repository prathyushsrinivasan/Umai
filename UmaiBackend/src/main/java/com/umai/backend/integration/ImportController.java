package com.umai.backend.integration;

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
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.umai.backend.common.exception.ResourceNotFoundException;
import com.umai.backend.restaurant.MapBounds;

/**
 * Administrative trigger for external data imports.
 *
 * <p>Restricted to administrators: an import writes to the public dataset and puts
 * load on a free third-party API, so it must not be something any visitor can start.
 *
 * <p>Imports run in the background and return 202 with a job id, because a
 * city-sized area takes far longer than a request should be held open.
 */
@RestController
@RequestMapping("/api/v1/admin/imports")
@Validated
@PreAuthorize("hasRole('ADMIN')")
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Admin", description = "外部データの取り込み（管理者のみ）")
public class ImportController {

	private final ImportJobService importJobService;

	public ImportController(ImportJobService importJobService) {
		this.importJobService = importJobService;
	}

	@PostMapping("/{source}")
	@Operation(
		summary = "外部データの取り込みを開始",
		description = """
				指定した範囲のレストランを外部データソースから取り込みます。
				処理はバックグラウンドで実行され、202 とジョブ ID を返します。
				既存のレコードは (source, sourceExternalId) で照合し、重複ではなく更新されます。
				""")
	public ResponseEntity<ImportJob> startImport(
			@PathVariable String source,
			@RequestParam double minLat,
			@RequestParam double minLon,
			@RequestParam double maxLat,
			@RequestParam double maxLon,
			@RequestParam(defaultValue = "200") @Min(1) @Max(500) int limit) {

		ImportJob job = importJobService.start(
			source, new MapBounds(minLat, minLon, maxLat, maxLon), limit);

		return ResponseEntity.status(HttpStatus.ACCEPTED).body(job);
	}

	@GetMapping("/jobs/{jobId}")
	@Operation(summary = "取り込みジョブの状態", description = "開始した取り込みの進行状況を返します。")
	public ImportJob jobStatus(@PathVariable String jobId) {
		return importJobService.find(jobId)
			.orElseThrow(() -> ResourceNotFoundException.of("Import job", jobId));
	}

}
