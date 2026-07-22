package com.umai.backend.common.exception;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.validation.FieldError;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import com.umai.backend.integration.ExternalDataException;

/**
 * Translates exceptions into the shared {@link ApiError} shape.
 *
 * <p>Unexpected exceptions are logged in full but reported to the client generically,
 * so internal details never leak through the API.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

	private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

	@ExceptionHandler(ResourceNotFoundException.class)
	public ResponseEntity<ApiError> handleNotFound(ResourceNotFoundException ex, HttpServletRequest request) {
		return build(HttpStatus.NOT_FOUND, ex.getMessage(), request);
	}

	@ExceptionHandler(MethodArgumentNotValidException.class)
	public ResponseEntity<ApiError> handleValidation(MethodArgumentNotValidException ex, HttpServletRequest request) {
		List<Map<String, String>> fieldErrors = ex.getBindingResult().getFieldErrors().stream()
			.map(this::toFieldError)
			.toList();

		ApiError body = new ApiError(
			Instant.now(),
			HttpStatus.BAD_REQUEST.value(),
			HttpStatus.BAD_REQUEST.getReasonPhrase(),
			"Request validation failed",
			request.getRequestURI(),
			fieldErrors);

		return ResponseEntity.badRequest().body(body);
	}

	/**
	 * Unmapped paths. Without this, the catch-all handler below would turn a simple
	 * typo in a URL into a 500.
	 */
	@ExceptionHandler(NoResourceFoundException.class)
	public ResponseEntity<ApiError> handleNoResource(NoResourceFoundException ex, HttpServletRequest request) {
		return build(HttpStatus.NOT_FOUND, "No endpoint found for this path", request);
	}

	@ExceptionHandler(HttpRequestMethodNotSupportedException.class)
	public ResponseEntity<ApiError> handleMethodNotSupported(
			HttpRequestMethodNotSupportedException ex, HttpServletRequest request) {
		return build(HttpStatus.METHOD_NOT_ALLOWED, "HTTP method not supported for this endpoint", request);
	}

	@ExceptionHandler(HttpMessageNotReadableException.class)
	public ResponseEntity<ApiError> handleUnreadableBody(
			HttpMessageNotReadableException ex, HttpServletRequest request) {
		return build(HttpStatus.BAD_REQUEST, "Malformed request body", request);
	}

	@ExceptionHandler(IllegalArgumentException.class)
	public ResponseEntity<ApiError> handleIllegalArgument(IllegalArgumentException ex, HttpServletRequest request) {
		return build(HttpStatus.BAD_REQUEST, ex.getMessage(), request);
	}

	/** Violations on {@code @Validated} query parameters and path variables. */
	@ExceptionHandler(ConstraintViolationException.class)
	public ResponseEntity<ApiError> handleConstraintViolation(
			ConstraintViolationException ex, HttpServletRequest request) {

		List<Map<String, String>> fieldErrors = ex.getConstraintViolations().stream()
			.map(violation -> Map.of(
				"field", violation.getPropertyPath().toString(),
				"message", violation.getMessage()))
			.toList();

		ApiError body = new ApiError(
			Instant.now(),
			HttpStatus.BAD_REQUEST.value(),
			HttpStatus.BAD_REQUEST.getReasonPhrase(),
			"Request validation failed",
			request.getRequestURI(),
			fieldErrors);

		return ResponseEntity.badRequest().body(body);
	}

	/** A query parameter that cannot be converted, e.g. {@code minLat=abc}. */
	@ExceptionHandler(MethodArgumentTypeMismatchException.class)
	public ResponseEntity<ApiError> handleTypeMismatch(
			MethodArgumentTypeMismatchException ex, HttpServletRequest request) {
		return build(HttpStatus.BAD_REQUEST,
			"Invalid value for parameter '%s'".formatted(ex.getName()), request);
	}

	@ExceptionHandler(MissingServletRequestParameterException.class)
	public ResponseEntity<ApiError> handleMissingParameter(
			MissingServletRequestParameterException ex, HttpServletRequest request) {
		return build(HttpStatus.BAD_REQUEST,
			"Required parameter '%s' is missing".formatted(ex.getParameterName()), request);
	}

	@ExceptionHandler(ConflictException.class)
	public ResponseEntity<ApiError> handleConflict(ConflictException ex, HttpServletRequest request) {
		return build(HttpStatus.CONFLICT, ex.getMessage(), request);
	}

	/**
	 * Failed login. The message is intentionally identical for an unknown email and a
	 * wrong password, so responses cannot be used to enumerate registered accounts.
	 */
	@ExceptionHandler(BadCredentialsException.class)
	public ResponseEntity<ApiError> handleBadCredentials(
			BadCredentialsException ex, HttpServletRequest request) {
		return build(HttpStatus.UNAUTHORIZED, ex.getMessage(), request);
	}

	/**
	 * A unique-constraint breach that slipped past the up-front check, e.g. two
	 * concurrent registrations of the same email.
	 */
	@ExceptionHandler(DataIntegrityViolationException.class)
	public ResponseEntity<ApiError> handleDataIntegrity(
			DataIntegrityViolationException ex, HttpServletRequest request) {
		log.warn("Data integrity violation for {} {}", request.getMethod(), request.getRequestURI(), ex);
		return build(HttpStatus.CONFLICT, "既に登録されている内容と重複しています", request);
	}

	/**
	 * An upstream data source failed. Reported as 502 because the fault is outside
	 * this application, not in the caller's request.
	 */
	@ExceptionHandler(ExternalDataException.class)
	public ResponseEntity<ApiError> handleExternalData(
			ExternalDataException ex, HttpServletRequest request) {
		log.error("External data source failure for {}", request.getRequestURI(), ex);
		return build(HttpStatus.BAD_GATEWAY, "外部データソースへの接続に失敗しました", request);
	}

	@ExceptionHandler(AccessDeniedException.class)
	public ResponseEntity<ApiError> handleAccessDenied(AccessDeniedException ex, HttpServletRequest request) {
		return build(HttpStatus.FORBIDDEN, "Access denied", request);
	}

	@ExceptionHandler(Exception.class)
	public ResponseEntity<ApiError> handleUnexpected(Exception ex, HttpServletRequest request) {
		log.error("Unhandled exception for {} {}", request.getMethod(), request.getRequestURI(), ex);
		return build(HttpStatus.INTERNAL_SERVER_ERROR, "An unexpected error occurred", request);
	}

	private Map<String, String> toFieldError(FieldError error) {
		String message = error.getDefaultMessage() != null ? error.getDefaultMessage() : "invalid value";
		return Map.of("field", error.getField(), "message", message);
	}

	private ResponseEntity<ApiError> build(HttpStatus status, String message, HttpServletRequest request) {
		return ResponseEntity.status(status)
			.body(ApiError.of(status.value(), status.getReasonPhrase(), message, request.getRequestURI()));
	}

}
