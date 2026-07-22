package com.umai.backend.integration;

/**
 * Raised when an external data source is unreachable or returns something we cannot
 * use. Mapped to HTTP 502, since the failure is upstream rather than in the request.
 */
public class ExternalDataException extends RuntimeException {

	public ExternalDataException(String message) {
		super(message);
	}

	public ExternalDataException(String message, Throwable cause) {
		super(message, cause);
	}

}
