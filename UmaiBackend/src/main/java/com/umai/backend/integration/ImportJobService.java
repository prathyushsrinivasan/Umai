package com.umai.backend.integration;

import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import com.umai.backend.restaurant.MapBounds;

/**
 * Runs imports in the background and tracks their progress.
 *
 * <p>An import over a city-sized area can take a minute or more. Running it inside the
 * request would hold an HTTP connection and a database transaction open for that long,
 * and any proxy timeout would abandon the run halfway.
 *
 * <p>Job state is in memory, so it is lost on restart and not shared between
 * instances. That is acceptable for an operator-triggered task whose real output is
 * the imported rows; a durable queue would be the next step if imports became
 * scheduled or user-facing.
 */
@Service
public class ImportJobService {

	private static final Logger log = LoggerFactory.getLogger(ImportJobService.class);

	/** Bounded so a long-lived process cannot accumulate job records indefinitely. */
	private static final int MAX_TRACKED_JOBS = 50;

	private final Map<String, ImportJob> jobs = new ConcurrentHashMap<>();

	private final RestaurantImportService importService;

	public ImportJobService(RestaurantImportService importService) {
		this.importService = importService;
	}

	/** Registers a job and starts it; returns immediately with the job's initial state. */
	public ImportJob start(String source, MapBounds bounds, int limit) {
		String id = UUID.randomUUID().toString();
		ImportJob job = ImportJob.running(id, source);

		evictOldestIfFull();
		jobs.put(id, job);

		runAsync(id, source, bounds, limit);
		return job;
	}

	public Optional<ImportJob> find(String id) {
		return Optional.ofNullable(jobs.get(id));
	}

	@Async
	void runAsync(String id, String source, MapBounds bounds, int limit) {
		try {
			ImportResult result = importService.importFrom(source, bounds, limit);
			jobs.computeIfPresent(id, (ignored, job) -> job.succeeded(result));
		}
		catch (RuntimeException ex) {
			// Logged in full; the client sees only a safe summary.
			log.error("Import job {} from {} failed", id, source, ex);
			jobs.computeIfPresent(id, (ignored, job) -> job.failed(describe(ex)));
		}
	}

	/** Client-safe description: the kind of failure, never internal detail. */
	private String describe(RuntimeException ex) {
		if (ex instanceof ExternalDataException) {
			return "外部データソースへの接続に失敗しました";
		}
		if (ex instanceof IllegalArgumentException) {
			return ex.getMessage();
		}
		return "取り込み中にエラーが発生しました";
	}

	private void evictOldestIfFull() {
		if (jobs.size() < MAX_TRACKED_JOBS) {
			return;
		}

		jobs.entrySet().stream()
			.filter(entry -> entry.getValue().status() != ImportJob.Status.RUNNING)
			.min((a, b) -> a.getValue().startedAt().compareTo(b.getValue().startedAt()))
			.ifPresent(oldest -> jobs.remove(oldest.getKey()));
	}

}
