package com.umai.backend.restaurant;

/**
 * A geographic bounding box, as sent by the map when its viewport changes.
 *
 * @param minLat south edge
 * @param minLon west edge
 * @param maxLat north edge
 * @param maxLon east edge
 */
public record MapBounds(double minLat, double minLon, double maxLat, double maxLon) {

	/**
	 * Validates the box on construction, so a malformed viewport is rejected as a 400
	 * rather than silently returning nothing.
	 */
	public MapBounds {
		if (minLat < -90 || maxLat > 90 || minLon < -180 || maxLon > 180) {
			throw new IllegalArgumentException("Bounding box coordinates are out of range");
		}
		if (minLat > maxLat) {
			throw new IllegalArgumentException("minLat must not be greater than maxLat");
		}
		if (minLon > maxLon) {
			// A box crossing the antimeridian would need splitting; Tokyo never does.
			throw new IllegalArgumentException("minLon must not be greater than maxLon");
		}
	}

}
