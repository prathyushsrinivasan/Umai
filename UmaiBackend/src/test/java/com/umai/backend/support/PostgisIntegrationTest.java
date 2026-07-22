package com.umai.backend.support;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Inherited;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

import org.junit.jupiter.api.condition.EnabledIf;
import org.springframework.boot.test.context.SpringBootTest;

/**
 * Marks a test that needs the full application context backed by a real PostGIS
 * database.
 *
 * <p>Applied directly to each concrete test class: JUnit resolves the enablement
 * condition from the class under execution, so inheriting it from an abstract base
 * is not reliable.
 */
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@Documented
@Inherited
@SpringBootTest
@EnabledIf("com.umai.backend.support.DockerAvailability#isAvailable")
public @interface PostgisIntegrationTest {
}
