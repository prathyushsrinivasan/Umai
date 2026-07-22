package com.umai.backend.common.web;

import java.time.Instant;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Lightweight liveness endpoint used by the frontend to confirm it can reach the API.
 * Operational health checks belong to Spring Boot Actuator.
 */
@RestController
@RequestMapping("/api/v1")
public class HealthController {

	@GetMapping("/health")
	public HealthResponse health() {
		return new HealthResponse("UP", "umai-backend", Instant.now());
	}

	public record HealthResponse(String status, String service, Instant timestamp) {
	}

}
