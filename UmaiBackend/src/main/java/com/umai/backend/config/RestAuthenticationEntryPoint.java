package com.umai.backend.config;

import java.io.IOException;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.stereotype.Component;

import tools.jackson.databind.ObjectMapper;

import com.umai.backend.common.exception.ApiError;

/**
 * Renders security failures using the same JSON error shape as the rest of the API.
 *
 * <p>Security rejections happen in the filter chain, before any controller advice runs,
 * so they need their own handler to avoid Spring's default HTML error page.
 *
 * <p>Missing or invalid credentials produce 401; an authenticated user lacking the
 * required permission produces 403.
 */
@Component
public class RestAuthenticationEntryPoint implements AuthenticationEntryPoint, AccessDeniedHandler {

	private final ObjectMapper objectMapper;

	public RestAuthenticationEntryPoint(ObjectMapper objectMapper) {
		this.objectMapper = objectMapper;
	}

	@Override
	public void commence(HttpServletRequest request, HttpServletResponse response,
			AuthenticationException authException) throws IOException {
		write(request, response, HttpStatus.UNAUTHORIZED, "Authentication is required to access this resource");
	}

	@Override
	public void handle(HttpServletRequest request, HttpServletResponse response,
			AccessDeniedException accessDeniedException) throws IOException {
		write(request, response, HttpStatus.FORBIDDEN, "Access denied");
	}

	private void write(HttpServletRequest request, HttpServletResponse response, HttpStatus status, String message)
			throws IOException {
		response.setStatus(status.value());
		response.setContentType(MediaType.APPLICATION_JSON_VALUE);
		response.setCharacterEncoding("UTF-8");

		ApiError body = ApiError.of(status.value(), status.getReasonPhrase(), message, request.getRequestURI());
		objectMapper.writeValue(response.getOutputStream(), body);
	}

}
