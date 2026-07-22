package com.umai.backend.common.exception;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * Consistent error payload returned by every failing API call.
 *
 * @param timestamp     when the error was produced
 * @param status        HTTP status code
 * @param error         HTTP status reason phrase
 * @param message       human-readable, client-safe description
 * @param path          request path that failed
 * @param fieldErrors   per-field validation failures, omitted when empty
 */
@JsonInclude(JsonInclude.Include.NON_EMPTY)
public record ApiError(
		Instant timestamp,
		int status,
		String error,
		String message,
		String path,
		List<Map<String, String>> fieldErrors) {

	public static ApiError of(int status, String error, String message, String path) {
		return new ApiError(Instant.now(), status, error, message, path, List.of());
	}

}
