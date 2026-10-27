package com.umai.backend.config;

import java.time.Duration;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.caffeine.CaffeineCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import com.github.benmanes.caffeine.cache.Caffeine;

@Configuration
@EnableCaching
public class ReadCacheConfig {
    @Bean
    CacheManager cacheManager() {
        var manager = new CaffeineCacheManager("restaurantReads", "referenceData");
        manager.setCaffeine(Caffeine.newBuilder().maximumWeight(8 * 1024 * 1024).weigher((Object key, Object value) -> Math.max(1, (key.toString().length() + value.toString().length()) * 2 + 256)).expireAfterWrite(Duration.ofSeconds(60)));
        return manager;
    }
}
