package com.umai.backend.common.web;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import com.umai.backend.common.exception.GlobalExceptionHandler;
import com.umai.backend.config.CorsProperties;
import com.umai.backend.config.JwtProperties;
import com.umai.backend.config.RestAuthenticationEntryPoint;
import com.umai.backend.security.ratelimit.RateLimitProperties;
import com.umai.backend.config.SecurityConfig;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Covers the public web contract: the health endpoint is reachable anonymously, and
 * both security rejections and unknown paths come back as the shared JSON error shape.
 */
@WebMvcTest(HealthController.class)
@Import({ SecurityConfig.class, RestAuthenticationEntryPoint.class, GlobalExceptionHandler.class })
@EnableConfigurationProperties({ CorsProperties.class, JwtProperties.class, RateLimitProperties.class })
@TestPropertySource(properties = {
	"umai.cors.allowed-origins=http://localhost:5173",
	"umai.security.jwt.secret=test-only-signing-key-not-used-anywhere-outside-the-test-suite",
	// Limits are exercised by TokenBucketTests; leaving them on here would make
	// repeated requests across tests flaky.
	"umai.rate-limit.enabled=false" })
class HealthControllerTests {

	@Autowired
	private MockMvc mockMvc;

	@Test
	void healthIsPubliclyAccessible() throws Exception {
		mockMvc.perform(get("/api/v1/health"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.status").value("UP"))
			.andExpect(jsonPath("$.service").value("umai-backend"));
	}

	@Test
	void anonymousWriteRequestIsUnauthorized() throws Exception {
		mockMvc.perform(post("/api/v1/restaurants"))
			.andExpect(status().isUnauthorized())
			.andExpect(jsonPath("$.status").value(401))
			.andExpect(jsonPath("$.path").value("/api/v1/restaurants"));
	}

	@Test
	void unknownPathReturnsNotFoundRatherThanServerError() throws Exception {
		mockMvc.perform(get("/api/v1/does-not-exist"))
			.andExpect(status().isNotFound())
			.andExpect(jsonPath("$.status").value(404));
	}

}
