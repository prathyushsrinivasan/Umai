package com.umai.backend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "umai.data")
public record DataProperties(boolean includeSeed) {
}
