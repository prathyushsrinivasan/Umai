package com.umai.backend.integration.google;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

/**
 * Runs the Google enrichment once on startup when {@code umai.google.enrich-on-start=true}.
 *
 * <p>A no-auth convenience for local or one-off use: set the flag, restart, watch the logs
 * — no admin account or token, unlike {@link GoogleEnrichmentController}. Safe to leave on,
 * since once everything is matched a restart finds nothing to do and stops immediately.
 *
 * <p>Runs on a background daemon thread so it never blocks application startup (enriching
 * hundreds of restaurants is minutes of external calls, which would otherwise delay the
 * server becoming healthy).
 */
@Component
public class GoogleEnrichmentBootstrap implements ApplicationRunner {

	private static final Logger log = LoggerFactory.getLogger(GoogleEnrichmentBootstrap.class);

	/** Restaurants processed per batch; each is logged so progress is visible. */
	private static final int BATCH_SIZE = 50;

	private final GoogleProperties properties;

	private final GoogleEnrichmentService enrichmentService;

	public GoogleEnrichmentBootstrap(GoogleProperties properties, GoogleEnrichmentService enrichmentService) {
		this.properties = properties;
		this.enrichmentService = enrichmentService;
	}

	@Override
	public void run(ApplicationArguments args) {
		if (!properties.enrichOnStart()) {
			return;
		}
		if (!enrichmentService.isAvailable()) {
			log.warn("umai.google.enrich-on-start is set but no Google API key is configured; skipping");
			return;
		}
		Thread worker = new Thread(this::enrichAll, "google-enrich-bootstrap");
		worker.setDaemon(true);
		worker.start();
	}

	private void enrichAll() {
		log.info("Google enrichment on startup: {} restaurant(s) not yet matched", enrichmentService.remaining());
		try {
			while (true) {
				GoogleEnrichmentResult result = enrichmentService.enrich(BATCH_SIZE);
				log.info("Google enrichment batch: {} (remaining {})", result, enrichmentService.remaining());
				// Stop on an empty batch or a provider/budget failure; failures have a retry time.
				if (result.processed() == 0 || result.matched() + result.noMatch() < result.processed()) {
					break;
				}
			}
			log.info("Google enrichment on startup complete; {} restaurant(s) remain unmatched",
				enrichmentService.remaining());
		}
		catch (RuntimeException ex) {
			log.error("Google enrichment on startup failed", ex);
		}
	}

}
