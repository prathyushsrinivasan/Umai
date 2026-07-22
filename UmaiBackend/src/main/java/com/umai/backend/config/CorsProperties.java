package com.umai.backend.config;

import java.util.List;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * CORS settings bound from the {@code umai.cors.*} configuration namespace.
 *
 * @param allowedOrigins origins permitted to call the API (e.g. the Vite dev server)
 */
@ConfigurationProperties(prefix = "umai.cors")
public record CorsProperties(List<String> allowedOrigins) {
}
