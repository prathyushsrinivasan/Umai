package com.umai.backend.integration.google;

import java.time.Instant;
import java.time.Duration;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import com.umai.backend.restaurant.*;

/** Matches identifiers only. Google descriptive content is never copied into our dataset. */
@Service
public class GoogleEnrichmentService {
    private final RestaurantRepository restaurants;
    private final GooglePlacesClient google;
    public GoogleEnrichmentService(RestaurantRepository restaurants, GooglePlacesClient google) {
        this.restaurants = restaurants; this.google = google;
    }
    public boolean isAvailable() { return google.isEnabled(); }
    public long remaining() { return restaurants.countByStatusAndGoogleEnrichedFalse(RestaurantStatus.PUBLISHED); }
    public synchronized GoogleEnrichmentResult enrich(int limit) {
        if (!isAvailable()) throw new IllegalStateException("Google Places is not configured");
        int processed = 0, matched = 0, noMatch = 0;
        for (Restaurant restaurant : restaurants.findGoogleTargets(Instant.now(), PageRequest.of(0, Math.min(limit, 100)))) {
            Instant now = Instant.now();
            restaurant.setGoogleAttemptedAt(now);
            processed++;
            boolean unavailable = false;
            try {
                var id = restaurant.getGooglePlaceId() == null
                    ? google.findPlaceId(restaurant.getName(), restaurant.getLatitude(), restaurant.getLongitude())
                    : java.util.Optional.of(restaurant.getGooglePlaceId());
                if (id.isPresent()) {
                    restaurant.setGooglePlaceId(id.get());
                    restaurant.setGoogleEnriched(true);
                    restaurant.setGoogleFailures(0);
                    restaurant.setGoogleRetryAfter(null);
                    matched++;
                } else {
                    restaurant.setGoogleRetryAfter(now.plus(Duration.ofDays(30)));
                    noMatch++;
                }
            } catch (GoogleUnavailableException ex) {
                int failures = Math.min(restaurant.getGoogleFailures() + 1, 10);
                restaurant.setGoogleFailures(failures);
                restaurant.setGoogleRetryAfter(now.plus(Duration.ofMinutes(Math.min(1440, 5L << failures))));
                unavailable = true;
            }
            restaurants.save(restaurant);
            if (unavailable) break;
        }
        return new GoogleEnrichmentResult(processed, matched, 0, 0, noMatch);
    }
}
