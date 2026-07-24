package com.umai.backend.area;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.stereotype.Component;

/**
 * Infers a restaurant's {@link Area} from its free-text address.
 *
 * <p>The {@code areas} table holds neighbourhood names ({@code Area#getNameJa()}), but
 * addresses don't always spell them identically — Marunouchi's display name is
 * "東京・丸の内" while an address reads "...丸の内1-6-6", and Akihabara addresses use the
 * ward's actual chome name ("外神田") rather than the neighbourhood's popular name. A
 * curated alias list keeps matching exact and avoids guessing when nothing here applies.
 *
 * <p>Only used when the source (OSM import, or this row already) didn't already supply
 * an area — see {@code RestaurantImportService.assignAreaIfMissing}.
 */
@Component
public class AreaMatcher {

	private static final Map<String, List<String>> ADDRESS_ALIASES = Map.of(
		"shinjuku", List.of("新宿"),
		"shibuya", List.of("渋谷"),
		"marunouchi", List.of("丸の内"),
		"ueno", List.of("上野"),
		"akihabara", List.of("秋葉原", "外神田"),
		"asakusa", List.of("浅草"),
		"ikebukuro", List.of("池袋"));

	/** @return the first area whose alias appears in the address, if any. */
	public Optional<Area> match(String address, List<Area> areas) {
		if (address == null || address.isBlank()) {
			return Optional.empty();
		}

		for (Area area : areas) {
			List<String> aliases = ADDRESS_ALIASES.get(area.getSlug());
			if (aliases == null) {
				continue;
			}
			for (String alias : aliases) {
				if (address.contains(alias)) {
					return Optional.of(area);
				}
			}
		}

		return Optional.empty();
	}

}
