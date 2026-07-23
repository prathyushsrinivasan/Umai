package com.umai.backend.integration.photo;

import java.util.Optional;

/**
 * Finds a representative photo for a real-world place, matched by name and location.
 *
 * <p>Separate from the restaurant data providers (which supply the listings
 * themselves): photos are an enrichment layer applied after import, from a source that
 * actually has photography — OpenStreetMap almost never does.
 *
 * <p>Implementations must fail soft: a lookup that errors or finds nothing returns
 * {@link Optional#empty()} rather than throwing, so one bad match never aborts a batch.
 */
public interface PlacePhotoProvider {

	/** Whether the provider is configured and usable (e.g. an API key is present). */
	boolean isEnabled();

	/** A human name for the provider, for logs and status messages. */
	String name();

	/**
	 * A photo URL for the place at the given coordinates, if a confident match exists.
	 *
	 * @return an http(s) image URL, or empty when disabled, unmatched, or on any error
	 */
	Optional<String> findPhotoUrl(String placeName, double latitude, double longitude);

}
