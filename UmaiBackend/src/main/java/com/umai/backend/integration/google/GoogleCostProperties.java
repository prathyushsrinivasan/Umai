package com.umai.backend.integration.google;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "umai.google.cost")
public record GoogleCostProperties(int dailyRequests, int monthlyRequests, boolean photosEnabled) {
}
