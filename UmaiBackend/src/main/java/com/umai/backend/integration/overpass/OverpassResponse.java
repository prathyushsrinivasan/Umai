package com.umai.backend.integration.overpass;

import java.util.List;
import java.util.Map;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

/**
 * Shape of an Overpass API JSON response.
 *
 * <p>Unknown fields are ignored: Overpass returns metadata we do not use, and its
 * output evolves.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record OverpassResponse(List<Element> elements) {

	public OverpassResponse {
		elements = elements == null ? List.of() : elements;
	}

	/**
	 * One OSM element.
	 *
	 * <p>Nodes carry {@code lat}/{@code lon} directly. Ways and relations — a building
	 * outline rather than a point — carry a {@code center} instead, which is why the
	 * query asks for {@code out center}.
	 */
	@JsonIgnoreProperties(ignoreUnknown = true)
	public record Element(
			String type,
			Long id,
			Double lat,
			Double lon,
			Center center,
			Map<String, String> tags) {

		/** Latitude of this element, whether it is a node or an area. */
		public Double latitude() {
			return lat != null ? lat : (center != null ? center.lat() : null);
		}

		public Double longitude() {
			return lon != null ? lon : (center != null ? center.lon() : null);
		}

		/** Stable identifier across imports, e.g. {@code node/1234}. */
		public String externalId() {
			return (type == null || id == null) ? null : type + "/" + id;
		}
	}

	@JsonIgnoreProperties(ignoreUnknown = true)
	public record Center(Double lat, Double lon) {
	}

}
