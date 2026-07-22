package com.umai.backend.config;

import java.util.List;

import javax.crypto.spec.SecretKeySpec;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import com.nimbusds.jose.jwk.source.ImmutableSecret;
import com.umai.backend.security.TokenService;

import java.nio.charset.StandardCharsets;

/**
 * Security configuration.
 *
 * <p>The API is stateless and authenticated with bearer JWTs, so there are no
 * server-side sessions and no CSRF tokens — CSRF protects cookie-based auth, which
 * this API does not use.
 *
 * <p>Reads stay public: browsing restaurants must work for anonymous visitors.
 * Writes require a token.
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

	private final CorsProperties corsProperties;

	private final JwtProperties jwtProperties;

	private final RestAuthenticationEntryPoint authenticationEntryPoint;

	public SecurityConfig(CorsProperties corsProperties, JwtProperties jwtProperties,
			RestAuthenticationEntryPoint authenticationEntryPoint) {
		this.corsProperties = corsProperties;
		this.jwtProperties = jwtProperties;
		this.authenticationEntryPoint = authenticationEntryPoint;
	}

	@Bean
	SecurityFilterChain apiSecurityFilterChain(HttpSecurity http) throws Exception {
		return http
			.cors(Customizer.withDefaults())
			.csrf(csrf -> csrf.disable())
			.sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
			.authorizeHttpRequests(auth -> auth
				.requestMatchers(HttpMethod.GET, "/api/v1/health").permitAll()
				.requestMatchers("/actuator/health/**", "/actuator/info").permitAll()
				// API documentation is public; it describes only public read endpoints.
				.requestMatchers("/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html").permitAll()
				// Registration and login must be reachable without a token.
				.requestMatchers(HttpMethod.POST, "/api/v1/auth/register", "/api/v1/auth/login").permitAll()
				// Public browsing of restaurant data.
				.requestMatchers(HttpMethod.GET, "/api/v1/**").permitAll()
				// Everything else — submissions, reviews, account info — needs a token.
				.anyRequest().authenticated())
			.oauth2ResourceServer(oauth2 -> oauth2
				.jwt(jwt -> jwt.jwtAuthenticationConverter(jwtAuthenticationConverter()))
				.authenticationEntryPoint(authenticationEntryPoint)
				.accessDeniedHandler(authenticationEntryPoint))
			.exceptionHandling(handling -> handling
				.authenticationEntryPoint(authenticationEntryPoint)
				.accessDeniedHandler(authenticationEntryPoint))
			.httpBasic(basic -> basic.disable())
			.formLogin(form -> form.disable())
			.build();
	}

	/** Maps the token's {@code role} claim onto a Spring Security {@code ROLE_*} authority. */
	private JwtAuthenticationConverter jwtAuthenticationConverter() {
		JwtGrantedAuthoritiesConverter authorities = new JwtGrantedAuthoritiesConverter();
		authorities.setAuthorityPrefix("ROLE_");
		authorities.setAuthoritiesClaimName(TokenService.CLAIM_ROLE);

		JwtAuthenticationConverter converter = new JwtAuthenticationConverter();
		converter.setJwtGrantedAuthoritiesConverter(authorities);
		return converter;
	}

	private SecretKeySpec signingKey() {
		return new SecretKeySpec(jwtProperties.secret().getBytes(StandardCharsets.UTF_8), "HmacSHA256");
	}

	@Bean
	JwtEncoder jwtEncoder() {
		return new NimbusJwtEncoder(new ImmutableSecret<>(signingKey()));
	}

	@Bean
	JwtDecoder jwtDecoder() {
		return NimbusJwtDecoder.withSecretKey(signingKey())
			.macAlgorithm(MacAlgorithm.HS256)
			.build();
	}

	@Bean
	CorsConfigurationSource corsConfigurationSource() {
		CorsConfiguration configuration = new CorsConfiguration();
		configuration.setAllowedOrigins(corsProperties.allowedOrigins());
		configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
		configuration.setAllowedHeaders(List.of("Authorization", "Content-Type"));
		configuration.setMaxAge(3600L);

		UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
		source.registerCorsConfiguration("/api/**", configuration);
		return source;
	}

	@Bean
	PasswordEncoder passwordEncoder() {
		return new BCryptPasswordEncoder();
	}

}
