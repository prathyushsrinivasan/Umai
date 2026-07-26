package com.umai.backend.integration.google;

/**
 * Outcome of one Google enrichment batch.
 *
 * @param processed     restaurants examined this run
 * @param matched       restaurants newly matched to a Google place id
 * @param photosLinked  restaurants whose cover photo was pointed at the live Google endpoint
 * @param detailsFilled restaurants that gained at least one descriptive field
 * @param noMatch       restaurants Google could not confidently match
 */
public record GoogleEnrichmentResult(int processed, int matched, int photosLinked, int detailsFilled, int noMatch) {
}
