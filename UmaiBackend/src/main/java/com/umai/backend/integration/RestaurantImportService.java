package com.umai.backend.integration;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.umai.backend.category.Category;
import com.umai.backend.category.CategoryRepository;
import com.umai.backend.restaurant.MapBounds;
import com.umai.backend.restaurant.Restaurant;
import com.umai.backend.restaurant.RestaurantRepository;
import com.umai.backend.restaurant.RestaurantStatus;

/**
 * Imports restaurants from an external provider into our own database.
 *
 * <p>Normalising and storing external data — rather than querying the source at
 * request time — keeps the application fast, available when the source is not, and
 * free to enrich records beyond what any one provider offers.
 *
 * <p>Records are matched on {@code (source, sourceExternalId)}, so re-running an
 * import updates rows instead of duplicating them.
 */
@Service
public class RestaurantImportService {

	private static final Logger log = LoggerFactory.getLogger(RestaurantImportService.class);

	private final RestaurantRepository restaurantRepository;

	private final CategoryRepository categoryRepository;

	private final List<RestaurantDataProvider> providers;

	public RestaurantImportService(RestaurantRepository restaurantRepository,
			CategoryRepository categoryRepository, List<RestaurantDataProvider> providers) {
		this.restaurantRepository = restaurantRepository;
		this.categoryRepository = categoryRepository;
		this.providers = providers;
	}

	/**
	 * Runs an import from the named provider over the given area.
	 *
	 * @param sourceName provider identifier, matching a {@code RestaurantSource} value
	 */
	@Transactional
	public ImportResult importFrom(String sourceName, MapBounds bounds, int limit) {
		RestaurantDataProvider provider = providers.stream()
			.filter(candidate -> candidate.source().name().equalsIgnoreCase(sourceName))
			.findFirst()
			.orElseThrow(() -> new IllegalArgumentException("Unknown data source: " + sourceName));

		List<ExternalRestaurant> fetched = provider.fetchWithin(bounds, limit);
		log.info("Fetched {} records from {}", fetched.size(), provider.source());

		Map<String, Category> categoriesBySlug = categoryRepository.findAll().stream()
			.collect(Collectors.toMap(Category::getSlug, Function.identity()));

		int created = 0;
		int updated = 0;
		int skipped = 0;

		for (ExternalRestaurant external : fetched) {
			var existing = restaurantRepository
				.findBySourceAndSourceExternalId(external.source(), external.externalId());

			if (existing.isPresent()) {
				if (applyUpdate(existing.get(), external, categoriesBySlug)) {
					updated++;
				}
				else {
					skipped++;
				}
			}
			else {
				restaurantRepository.save(toEntity(external, categoriesBySlug));
				created++;
			}
		}

		ImportResult result = new ImportResult(fetched.size(), created, updated, skipped);
		log.info("Import from {} finished: {}", provider.source(), result);
		return result;
	}

	private Restaurant toEntity(ExternalRestaurant external, Map<String, Category> categoriesBySlug) {
		Restaurant restaurant = new Restaurant(
			external.name(),
			external.latitude(),
			external.longitude(),
			external.vegetarianType(),
			external.source());

		restaurant.setSourceExternalId(external.externalId());
		restaurant.setStatus(RestaurantStatus.PUBLISHED);
		copyOptionalFields(restaurant, external);
		applyCategories(restaurant, external, categoriesBySlug);

		return restaurant;
	}

	/**
	 * Refreshes an imported record from the source.
	 *
	 * @return false when the record was left alone
	 */
	private boolean applyUpdate(Restaurant restaurant, ExternalRestaurant external,
			Map<String, Category> categoriesBySlug) {

		// A record a moderator rejected must not silently reappear on the next import.
		if (restaurant.getStatus() == RestaurantStatus.REJECTED) {
			return false;
		}

		restaurant.setName(external.name());
		restaurant.setLatitude(external.latitude());
		restaurant.setLongitude(external.longitude());

		// Never downgrade a known classification to UNKNOWN: a tag removed upstream
		// should not erase information we already had.
		if (external.vegetarianType() != com.umai.backend.restaurant.VegetarianType.UNKNOWN) {
			restaurant.setVegetarianType(external.vegetarianType());
		}

		copyOptionalFields(restaurant, external);
		applyCategories(restaurant, external, categoriesBySlug);
		return true;
	}

	/**
	 * Copies optional fields, leaving existing values in place where the source has
	 * nothing — an absent tag upstream means "unknown", not "deleted".
	 */
	private void copyOptionalFields(Restaurant restaurant, ExternalRestaurant external) {
		if (external.address() != null) {
			restaurant.setAddress(external.address());
		}
		if (external.websiteUrl() != null) {
			restaurant.setWebsiteUrl(external.websiteUrl());
		}
		if (external.phone() != null) {
			restaurant.setPhone(external.phone());
		}
		if (external.openingHours() != null) {
			restaurant.setOpeningHours(external.openingHours());
		}
		if (external.description() != null) {
			restaurant.setDescription(external.description());
		}
		if (external.imageUrl() != null) {
			restaurant.setImageUrl(external.imageUrl());
		}
		if (external.priceRange() != null) {
			restaurant.setPriceRange(external.priceRange());
		}
	}

	/** Adds categories the source reports, without removing ones already attached. */
	private void applyCategories(Restaurant restaurant, ExternalRestaurant external,
			Map<String, Category> categoriesBySlug) {

		for (String slug : external.categorySlugs()) {
			Category category = categoriesBySlug.get(slug);
			if (category != null) {
				restaurant.addCategory(category);
			}
			else {
				log.debug("Ignoring unknown category slug '{}' from {}", slug, external.source());
			}
		}
	}

}
