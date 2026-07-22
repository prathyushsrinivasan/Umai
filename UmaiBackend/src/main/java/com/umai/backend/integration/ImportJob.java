package com.umai.backend.integration;

import java.time.Instant;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * State of a background import.
 *
 * @param status  where the run has got to
 * @param result  populated once it succeeds
 * @param error   client-safe failure description, populated once it fails
 */
@Schema(description = "取り込みジョブの状態")
public record ImportJob(
		String id,
		Status status,
		String source,
		Instant startedAt,
		Instant finishedAt,
		ImportResult result,
		String error) {

	public enum Status {
		RUNNING, SUCCEEDED, FAILED
	}

	public static ImportJob running(String id, String source) {
		return new ImportJob(id, Status.RUNNING, source, Instant.now(), null, null, null);
	}

	public ImportJob succeeded(ImportResult result) {
		return new ImportJob(id, Status.SUCCEEDED, source, startedAt, Instant.now(), result, null);
	}

	public ImportJob failed(String error) {
		return new ImportJob(id, Status.FAILED, source, startedAt, Instant.now(), null, error);
	}

}
