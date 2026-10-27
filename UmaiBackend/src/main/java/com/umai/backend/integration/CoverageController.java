package com.umai.backend.integration;

import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1")
public class CoverageController {
    private final RestaurantRefreshService refresh;
    public CoverageController(RestaurantRefreshService refresh) { this.refresh = refresh; }
    @GetMapping("/coverage")
    public Map<String, Object> coverage() { return refresh.coverage(); }
    @PostMapping("/admin/refresh")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> refresh() { refresh.refresh(); return ResponseEntity.accepted().build(); }
}
