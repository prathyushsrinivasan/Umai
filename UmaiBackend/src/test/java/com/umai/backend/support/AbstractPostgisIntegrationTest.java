package com.umai.backend.support;

import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;

/**
 * Supplies a real PostgreSQL + PostGIS database to integration tests.
 *
 * <p>Uses the same image as Docker Compose and runs the application's own Flyway
 * migrations, so migrations, constraints, indexes and the generated geometry column
 * are exercised exactly as written rather than approximated by an in-memory database.
 *
 * <p>The container is a singleton started once per JVM and shared by every subclass,
 * keeping the suite to a single database startup.
 *
 * <p>Subclasses must be annotated {@link PostgisIntegrationTest}, which both loads the
 * application context and skips the class when Docker is unavailable. Skipped is not
 * passed: a run that started no container has verified nothing about the schema.
 */
public abstract class AbstractPostgisIntegrationTest {

	private static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>(
		DockerImageName.parse("postgis/postgis:16-3.4").asCompatibleSubstituteFor("postgres"))
			.withDatabaseName("umai")
			.withUsername("umai")
			.withPassword("umai");

	static {
		// Guarded so loading this class on a Docker-less machine does not fail the
		// build; the enablement condition then skips the tests themselves.
		if (DockerAvailability.isAvailable()) {
			POSTGRES.start();
		}
	}

	@DynamicPropertySource
	static void datasourceProperties(DynamicPropertyRegistry registry) {
		registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
		registry.add("spring.datasource.username", POSTGRES::getUsername);
		registry.add("spring.datasource.password", POSTGRES::getPassword);
		// Seed data is part of what these tests verify.
		registry.add("spring.flyway.locations", () -> "classpath:db/migration,classpath:db/seed");
		// Test-only signing key. Real deployments supply this via JWT_SECRET.
		registry.add("umai.security.jwt.secret",
			() -> "test-only-signing-key-not-used-anywhere-outside-the-test-suite");
		// Every request in these tests comes from the same address, so the limiter
		// would reject later cases for reasons unrelated to what they assert. The
		// limiting logic itself is covered by TokenBucketTests.
		registry.add("umai.rate-limit.enabled", () -> "false");
	}

}
