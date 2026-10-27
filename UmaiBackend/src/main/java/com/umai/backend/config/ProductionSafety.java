package com.umai.backend.config;

import org.springframework.context.annotation.Profile;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

/** A production deployment must never load fictional sample restaurants. */
@Component
@Profile("prod")
public class ProductionSafety {
    public ProductionSafety(Environment environment, DataProperties data) {
        if (data.includeSeed() || environment.getProperty("spring.flyway.locations", "").contains("db/seed")) {
            throw new IllegalStateException("Production cannot enable sample data. Use FLYWAY_LOCATIONS=classpath:db/migration and UMAI_INCLUDE_SEED=false.");
        }
    }
}
