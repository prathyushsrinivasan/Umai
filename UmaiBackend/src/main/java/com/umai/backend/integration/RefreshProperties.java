package com.umai.backend.integration;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;
import com.umai.backend.restaurant.MapBounds;

@ConfigurationProperties(prefix = "umai.refresh")
public record RefreshProperties(boolean enabled, double minLat, double minLon, double maxLat, double maxLon,
        int gridSize, int maxRequests, Duration pause) {
    public RefreshProperties {
        if (gridSize < 1 || gridSize > 10) throw new IllegalArgumentException("Refresh grid-size must be 1..10");
        if (maxRequests < 1 || maxRequests > 1000) throw new IllegalArgumentException("Refresh max-requests must be 1..1000");
        if (pause == null || pause.compareTo(Duration.ofSeconds(1)) < 0) pause = Duration.ofSeconds(1);
        new MapBounds(minLat, minLon, maxLat, maxLon);
    }
}
