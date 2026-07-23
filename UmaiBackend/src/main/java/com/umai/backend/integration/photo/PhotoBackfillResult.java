package com.umai.backend.integration.photo;

/**
 * Outcome of one photo-backfill run.
 *
 * @param processed how many photo-less restaurants were looked up
 * @param updated   how many got a photo
 * @param noMatch   how many had no confident match / no photo available
 */
public record PhotoBackfillResult(int processed, int updated, int noMatch) {
}
