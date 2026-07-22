package com.umai.backend.common.exception;

/** Thrown when a request conflicts with existing state. Mapped to HTTP 409. */
public class ConflictException extends RuntimeException {

	public ConflictException(String message) {
		super(message);
	}

}
