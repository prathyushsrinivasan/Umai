package com.umai.backend.integration;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * Outcome of an import run.
 *
 * @param fetched  records returned by the provider
 * @param created  new restaurants inserted
 * @param updated  existing restaurants refreshed
 * @param skipped  records ignored, e.g. one already edited by a user
 */
@Schema(description = "外部データ取り込みの結果")
public record ImportResult(int fetched, int created, int updated, int skipped) {
}
