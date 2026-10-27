package com.umai.backend.integration;

import java.sql.Connection;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.ConnectionCallback;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import com.umai.backend.restaurant.MapBounds;

/** Persistent progress and a database lock prevent duplicate imports across replicas. */
@Service
public class RestaurantRefreshService {
    private static final Logger log = LoggerFactory.getLogger(RestaurantRefreshService.class);
    private final JdbcTemplate jdbc;
    private final RestaurantImportService imports;
    private final RefreshProperties settings;
    public RestaurantRefreshService(JdbcTemplate jdbc, RestaurantImportService imports, RefreshProperties settings) {
        this.jdbc = jdbc; this.imports = imports; this.settings = settings;
    }

    @Async("applicationTaskExecutor")
    public void refresh() {
        jdbc.execute((ConnectionCallback<Void>) connection -> {
            try (var statement = connection.createStatement(); var result = statement.executeQuery("SELECT pg_try_advisory_lock(19731, 1)")) {
                result.next();
                if (!result.getBoolean(1)) return null;
            }
            try { run(); }
            finally {
                try (var statement = connection.createStatement()) { statement.execute("SELECT pg_advisory_unlock(19731, 1)"); }
            }
            return null;
        });
    }

    private void run() {
        // A restart can leave a RUNNING row behind, but never a held advisory lock.
        jdbc.update("UPDATE data_refresh_runs SET status='FAILED', finished_at=now(), message='Interrupted by restart' WHERE status='RUNNING'");
        Long id = jdbc.queryForObject("INSERT INTO data_refresh_runs(status) VALUES ('RUNNING') RETURNING id", Long.class);
        var cells = new ArrayDeque<MapBounds>();
        int grid = settings.gridSize();
        double height = (settings.maxLat() - settings.minLat()) / grid;
        double width = (settings.maxLon() - settings.minLon()) / grid;
        for (int y = 0; y < grid; y++) for (int x = 0; x < grid; x++) {
            cells.add(new MapBounds(settings.minLat() + y * height, settings.minLon() + x * width,
                settings.minLat() + (y + 1) * height, settings.minLon() + (x + 1) * width));
        }
        int requests = 0, imported = 0, completed = 0;
        try {
            while (!cells.isEmpty() && requests < settings.maxRequests()) {
                if (Thread.currentThread().isInterrupted()) throw new InterruptedException();
                MapBounds cell = cells.removeFirst();
                ImportResult result = imports.importFrom("OPENSTREETMAP", cell, 500);
                requests++;
                imported += result.created() + result.updated();
                if (result.truncated()) {
                    double midLat = (cell.minLat() + cell.maxLat()) / 2;
                    double midLon = (cell.minLon() + cell.maxLon()) / 2;
                    cells.add(new MapBounds(cell.minLat(), cell.minLon(), midLat, midLon));
                    cells.add(new MapBounds(cell.minLat(), midLon, midLat, cell.maxLon()));
                    cells.add(new MapBounds(midLat, cell.minLon(), cell.maxLat(), midLon));
                    cells.add(new MapBounds(midLat, midLon, cell.maxLat(), cell.maxLon()));
                } else completed++;
                jdbc.update("UPDATE data_refresh_runs SET imported=?, cells_completed=? WHERE id=?", imported, completed, id);
                if (!cells.isEmpty() && requests < settings.maxRequests()) Thread.sleep(settings.pause().toMillis());
            }
            jdbc.update("UPDATE data_refresh_runs SET status=?, finished_at=now(), message=? WHERE id=?",
                cells.isEmpty() ? "SUCCEEDED" : "PARTIAL", cells.isEmpty() ? "Coverage refreshed" : "Request allowance reached; coverage is partial", id);
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            jdbc.update("UPDATE data_refresh_runs SET status='PARTIAL', finished_at=now(), message='Refresh interrupted' WHERE id=?", id);
        } catch (RuntimeException ex) {
            log.warn("Restaurant refresh {} stopped; imported rows are retained", id, ex);
            jdbc.update("UPDATE data_refresh_runs SET status='FAILED', finished_at=now(), message='Source unavailable; existing data retained' WHERE id=?", id);
        }
    }

    public Map<String, Object> coverage() {
        Long count = jdbc.queryForObject("SELECT count(*) FROM restaurants WHERE status='PUBLISHED' AND source <> 'SEED'", Long.class);
        List<Map<String, Object>> runs = jdbc.queryForList("SELECT id, started_at, finished_at, status, imported, cells_completed, message FROM data_refresh_runs ORDER BY id DESC LIMIT 1");
        return Map.of("restaurantCount", count, "lastRun", runs.isEmpty() ? Map.of() : runs.get(0),
            "scope", "Imported Tokyo listings with vegetarian or vegan tags; coverage is not exhaustive");
    }
}
