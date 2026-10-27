package com.umai.backend.integration.google;

/** Operational failure, distinct from a successful search that found no match. */
public class GoogleUnavailableException extends RuntimeException {
    public GoogleUnavailableException() { super("Google requests are temporarily unavailable"); }
}
