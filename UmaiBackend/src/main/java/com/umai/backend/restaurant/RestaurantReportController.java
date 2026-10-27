package com.umai.backend.restaurant;

import java.time.Instant;
import java.util.List;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import com.umai.backend.common.exception.*;
import com.umai.backend.common.web.PageResponse;
import com.umai.backend.restaurant.dto.RestaurantDetailDto;
import com.umai.backend.review.RatingSummary;
import com.umai.backend.security.CurrentUser;

@RestController
@RequestMapping("/api/v1")
public class RestaurantReportController {
    private final JdbcTemplate jdbc;
    private final RestaurantRepository restaurants;
    private final RestaurantMapper mapper;
    public RestaurantReportController(JdbcTemplate jdbc, RestaurantRepository restaurants, RestaurantMapper mapper) {
        this.jdbc = jdbc; this.restaurants = restaurants; this.mapper = mapper;
    }
    public enum ReportType { CLOSED, HOURS, DIET, OTHER }
    public enum Action { CORRECT, CLOSE, DISMISS }
    public record NewReport(@NotNull ReportType type, @NotBlank @Size(max=2000) String description) {}
    public record Report(long id, long restaurantId, String name, ReportType type, String description,
                         String status, Instant createdAt, String resolution) {}
    public record Correction(@Size(max=200) String name, @Size(max=500) String address,
        @Size(max=2000) String description, @Size(max=500) String openingHours,
        @Pattern(regexp="^$|^https?://.{1,490}$") String websiteUrl,
        @Pattern(regexp="^$|^[0-9+()\\-\\s]{6,32}$") String phone,
        VegetarianType vegetarianType, PriceRange priceRange,
        @Pattern(regexp="^$|^https://.{1,990}$") String imageUrl, Boolean imageRightsConfirmed) {}
    public record Resolution(@NotNull Action action, @NotBlank @Size(max=2000) String note, @Valid Correction correction) {}

    @PostMapping("/restaurants/{id}/reports")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<java.util.Map<String, String>> report(@PathVariable Long id, @RequestBody @Valid NewReport report) {
        restaurants.findByIdAndStatus(id, RestaurantStatus.PUBLISHED)
            .orElseThrow(() -> ResourceNotFoundException.of("Restaurant", id));
        Long user = CurrentUser.requireId();
        int inserted = jdbc.update("""
            INSERT INTO restaurant_reports(restaurant_id, user_id, type, description)
            VALUES (?, ?, ?, ?) ON CONFLICT (restaurant_id, user_id) WHERE status='PENDING' DO NOTHING
            """, id, user, report.type().name(), report.description().trim());
        if (inserted == 0) throw new ConflictException("You already have a pending report for this restaurant");
        return ResponseEntity.accepted().body(java.util.Map.of("status", "PENDING"));
    }

    @GetMapping("/admin/reports")
    @PreAuthorize("hasAnyRole('ADMIN','MODERATOR')")
    public PageResponse<Report> reports(@RequestParam(defaultValue="0") int page) {
        if (page < 0 || page > 100_000) throw new IllegalArgumentException("Invalid page");
        long total = jdbc.queryForObject("SELECT count(*) FROM restaurant_reports WHERE status='PENDING'", Long.class);
        List<Report> rows = jdbc.query("""
            SELECT rr.*, r.name FROM restaurant_reports rr JOIN restaurants r ON r.id=rr.restaurant_id
            WHERE rr.status='PENDING' ORDER BY rr.created_at, rr.id LIMIT 20 OFFSET ?
            """, (rs, index) -> new Report(rs.getLong("id"), rs.getLong("restaurant_id"), rs.getString("name"),
                ReportType.valueOf(rs.getString("type")), rs.getString("description"), rs.getString("status"),
                rs.getTimestamp("created_at").toInstant(), rs.getString("resolution")), (long) page * 20);
        return new PageResponse<>(rows, page, 20, total, (int) Math.ceil(total / 20.0), page == 0, (long) page * 20 + rows.size() >= total);
    }

    @GetMapping("/admin/restaurants/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','MODERATOR')")
    @Transactional(readOnly=true)
    public RestaurantDetailDto detail(@PathVariable Long id) {
        Restaurant r = restaurants.findById(id).orElseThrow(() -> ResourceNotFoundException.of("Restaurant", id));
        return mapper.toDetail(r, RatingSummary.empty(id));
    }

    @PostMapping("/admin/reports/{id}/resolve")
    @PreAuthorize("hasAnyRole('ADMIN','MODERATOR')")
    @Transactional
    @CacheEvict(cacheNames="restaurantReads", allEntries=true)
    public ResponseEntity<Void> resolve(@PathVariable Long id, @RequestBody @Valid Resolution resolution) {
        List<Long> ids = jdbc.queryForList("SELECT restaurant_id FROM restaurant_reports WHERE id=? AND status='PENDING' FOR UPDATE", Long.class, id);
        if (ids.isEmpty()) throw ResourceNotFoundException.of("Pending report", id);
        Restaurant r = restaurants.findById(ids.get(0)).orElseThrow();
        if (resolution.action() == Action.CLOSE) {
            r.setStatus(RestaurantStatus.REJECTED);
            r.setLastVerifiedAt(Instant.now());
        } else if (resolution.action() == Action.CORRECT) {
            if (resolution.correction() == null) throw new IllegalArgumentException("Corrections are required");
            apply(r, resolution.correction());
        }
        jdbc.update("UPDATE restaurant_reports SET status=?, resolved_at=now(), resolved_by=?, resolution=? WHERE id=?",
            resolution.action() == Action.DISMISS ? "DISMISSED" : "RESOLVED", CurrentUser.requireId(), resolution.note().trim(), id);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/admin/restaurants/{id}/details")
    @PreAuthorize("hasAnyRole('ADMIN','MODERATOR')")
    @Transactional
    @CacheEvict(cacheNames="restaurantReads", allEntries=true)
    public ResponseEntity<Void> correct(@PathVariable Long id, @RequestBody @Valid Correction correction) {
        apply(restaurants.findById(id).orElseThrow(() -> ResourceNotFoundException.of("Restaurant", id)), correction);
        return ResponseEntity.noContent().build();
    }

    private void apply(Restaurant r, Correction c) {
        if (c.name() != null) { if (c.name().isBlank()) throw new IllegalArgumentException("Name cannot be blank"); r.setName(c.name().trim()); }
        if (c.address() != null) r.setAddress(clean(c.address()));
        if (c.description() != null) r.setDescription(clean(c.description()));
        if (c.openingHours() != null) r.setOpeningHours(clean(c.openingHours()));
        if (c.websiteUrl() != null) r.setWebsiteUrl(clean(c.websiteUrl()));
        if (c.phone() != null) r.setPhone(clean(c.phone()));
        if (c.vegetarianType() != null) r.setVegetarianType(c.vegetarianType());
        if (c.priceRange() != null) r.setPriceRange(c.priceRange());
        if (c.imageUrl() != null) {
            if (!c.imageUrl().isBlank() && !Boolean.TRUE.equals(c.imageRightsConfirmed())) throw new IllegalArgumentException("Confirm permission to use this photo");
            r.setImageUrl(clean(c.imageUrl()));
        }
        r.setManuallyMaintained(true);
        r.setLastVerifiedAt(Instant.now());
    }
    private String clean(String value) { return value.isBlank() ? null : value.trim(); }
}
