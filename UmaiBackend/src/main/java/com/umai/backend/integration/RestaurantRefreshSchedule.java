package com.umai.backend.integration;

import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.jdbc.core.JdbcTemplate;

@Component
public class RestaurantRefreshSchedule {
    private final RestaurantRefreshService refresh;
    private final RefreshProperties settings;
    private final JdbcTemplate jdbc;
    public RestaurantRefreshSchedule(RestaurantRefreshService refresh, RefreshProperties settings, JdbcTemplate jdbc) {
        this.refresh = refresh; this.settings = settings; this.jdbc = jdbc;
    }
    @EventListener(ApplicationReadyEvent.class)
    public void initialize() {
        // Bootstrap an empty/stale database, but do not re-import on every deployment.
        if (settings.enabled() && Boolean.TRUE.equals(jdbc.queryForObject(
                "SELECT NOT EXISTS (SELECT 1 FROM data_refresh_runs WHERE status='SUCCEEDED' AND finished_at > now() - interval '7 days')", Boolean.class))) {
            refresh.refresh();
        }
    }
    @Scheduled(cron = "${umai.refresh.cron:0 0 4 * * MON}", zone = "Asia/Tokyo")
    public void scheduled() { if (settings.enabled()) refresh.refresh(); }
}
