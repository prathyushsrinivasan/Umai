package com.umai.backend.integration.google;

import java.util.List;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.umai.backend.restaurant.*;

/** Live photo data for an explicit request on the separate, map-free photo page. */
@RestController
@RequestMapping("/api/v1/restaurants/{id}/photo")
public class RestaurantPhotoController {
    private final RestaurantRepository restaurants;
    private final GooglePlacesClient google;
    private final GoogleCostProperties limits;
    private final ConcurrentHashMap<Long, CompletableFuture<Optional<Photo>>> pending = new ConcurrentHashMap<>();
    // Operational cooldowns only; never cached Google content or image URLs.
    private final java.util.Map<Long, Long> failedUntil = java.util.Collections.synchronizedMap(
        new java.util.LinkedHashMap<>(128, .75f, true) {
            protected boolean removeEldestEntry(java.util.Map.Entry<Long, Long> entry) { return size() > 1000; }
        });
    public RestaurantPhotoController(RestaurantRepository restaurants, GooglePlacesClient google, GoogleCostProperties limits) {
        this.restaurants = restaurants; this.google = google; this.limits = limits;
    }
    public record Photo(String imageUrl, List<GooglePlacesClient.Author> authors, String sourceUrl) {}
    public static String pathFor(Long id) { return "/api/v1/restaurants/" + id + "/photo"; }
    @GetMapping
    public ResponseEntity<Photo> photo(@PathVariable Long id) {
        if (!limits.photosEnabled() || !google.isEnabled()) return unavailable();
        Long retryAt = failedUntil.get(id);
        if (retryAt != null && retryAt > System.currentTimeMillis()) return unavailable();
        var mine = new CompletableFuture<Optional<Photo>>();
        var existing = pending.putIfAbsent(id, mine);
        if (existing != null) return response(existing.join());
        try {
            Optional<Photo> result = resolve(id);
            if (result.isEmpty()) failedUntil.put(id, System.currentTimeMillis() + 300_000);
            mine.complete(result);
            return response(result);
        } catch (GoogleUnavailableException ex) {
            failedUntil.put(id, System.currentTimeMillis() + 60_000);
            mine.complete(Optional.empty());
            return unavailable();
        } catch (RuntimeException ex) {
            mine.complete(Optional.empty());
            throw ex;
        } finally {
            pending.remove(id, mine);
        }
    }
    private Optional<Photo> resolve(Long id) {
        return restaurants.findByIdAndStatus(id, RestaurantStatus.PUBLISHED)
            .filter(r -> r.getSource() != RestaurantSource.SEED)
            .map(Restaurant::getGooglePlaceId).flatMap(placeId -> google.fetchPhoto(placeId)
                .flatMap(photo -> google.resolvePhotoUri(photo.name()).map(uri -> new Photo(uri,
                    photo.authorAttributions() == null ? List.of() : photo.authorAttributions(),
                    photo.googleMapsUri() != null ? photo.googleMapsUri() : "https://www.google.com/maps/search/?api=1&query=restaurant&query_place_id=" + java.net.URLEncoder.encode(placeId, java.nio.charset.StandardCharsets.UTF_8)))));
    }
    private ResponseEntity<Photo> response(Optional<Photo> value) {
        return value.map(photo -> ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(photo)).orElseGet(this::unavailable);
    }
    private ResponseEntity<Photo> unavailable() {
        return ResponseEntity.status(404).cacheControl(CacheControl.noStore()).header("Retry-After", "60").build();
    }
}
