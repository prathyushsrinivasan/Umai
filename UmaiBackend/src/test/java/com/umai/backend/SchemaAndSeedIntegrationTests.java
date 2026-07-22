package com.umai.backend;

import java.util.List;

import javax.sql.DataSource;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

import com.umai.backend.area.AreaRepository;
import com.umai.backend.category.CategoryRepository;
import com.umai.backend.restaurant.Restaurant;
import com.umai.backend.restaurant.RestaurantRepository;
import com.umai.backend.restaurant.RestaurantSource;
import com.umai.backend.restaurant.RestaurantStatus;
import com.umai.backend.support.AbstractPostgisIntegrationTest;
import com.umai.backend.support.PostgisIntegrationTest;
import com.umai.backend.tag.TagRepository;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Verifies that the migrations produce the schema the entities expect, and that the
 * development seed data loads correctly.
 *
 * <p>Context startup alone is meaningful here: Hibernate runs with
 * {@code ddl-auto: validate}, so a mismatch between an entity mapping and a migration
 * fails these tests before any assertion runs.
 */
@PostgisIntegrationTest
class SchemaAndSeedIntegrationTests extends AbstractPostgisIntegrationTest {

	@Autowired
	private RestaurantRepository restaurantRepository;

	@Autowired
	private CategoryRepository categoryRepository;

	@Autowired
	private AreaRepository areaRepository;

	@Autowired
	private TagRepository tagRepository;

	@Autowired
	private DataSource dataSource;

	@Test
	@DisplayName("required extensions are installed")
	void extensionsAreInstalled() {
		List<String> extensions = jdbc().queryForList(
			"select extname from pg_extension", String.class);

		assertThat(extensions).contains("postgis", "pg_trgm");
	}

	@Test
	@DisplayName("seed data loads across all Tokyo areas")
	void seedDataIsLoaded() {
		assertThat(areaRepository.findAll()).hasSize(7);
		assertThat(categoryRepository.findAll()).hasSize(7);
		assertThat(tagRepository.findAll()).hasSize(6);

		long seeded = restaurantRepository.countByStatus(RestaurantStatus.PUBLISHED);
		assertThat(seeded).isGreaterThanOrEqualTo(14);
	}

	@Test
	@DisplayName("seeded restaurants are marked as development data")
	void seededRestaurantsAreIdentifiable() {
		Restaurant restaurant = restaurantRepository
			.findBySourceAndSourceExternalId(RestaurantSource.SEED, "seed-shinjuku-01")
			.orElseThrow();

		assertThat(restaurant.getName()).isEqualTo("みどりの木キッチン");
		assertThat(restaurant.getSource()).isEqualTo(RestaurantSource.SEED);
		assertThat(restaurant.getDescription()).contains("開発用サンプルデータ");
		assertThat(restaurant.getArea()).isNotNull();
		assertThat(restaurant.getArea().getNameJa()).isEqualTo("新宿");
		assertThat(restaurant.getCategories()).hasSize(2);
		assertThat(restaurant.getTags()).hasSize(2);
	}

	@Test
	@DisplayName("restaurants with unknown data keep those fields null rather than inventing values")
	void missingDataStaysNull() {
		Restaurant sparse = restaurantRepository
			.findBySourceAndSourceExternalId(RestaurantSource.SEED, "seed-ueno-01")
			.orElseThrow();

		assertThat(sparse.getWebsiteUrl()).isNull();
		assertThat(sparse.getPhone()).isNull();
		assertThat(sparse.getOpeningHours()).isNull();
		assertThat(sparse.getPriceRange()).isNull();
		assertThat(sparse.getImageUrl()).isNull();
	}

	@Test
	@DisplayName("PostGIS location column is generated from latitude/longitude")
	void locationIsGeneratedFromCoordinates() {
		Restaurant restaurant = restaurantRepository
			.findBySourceAndSourceExternalId(RestaurantSource.SEED, "seed-shinjuku-01")
			.orElseThrow();

		// The database derives the geometry; the application only ever writes lat/lon.
		Double x = jdbc().queryForObject(
			"select ST_X(location) from restaurants where id = ?", Double.class, restaurant.getId());
		Double y = jdbc().queryForObject(
			"select ST_Y(location) from restaurants where id = ?", Double.class, restaurant.getId());
		Integer srid = jdbc().queryForObject(
			"select ST_SRID(location) from restaurants where id = ?", Integer.class, restaurant.getId());

		assertThat(x).isEqualTo(restaurant.getLongitude());
		assertThat(y).isEqualTo(restaurant.getLatitude());
		assertThat(srid).isEqualTo(4326);
	}

	@Test
	@DisplayName("bounding-box query over Tokyo returns seeded restaurants")
	void boundingBoxQueryWorks() {
		// A box loosely covering central Tokyo.
		Integer withinTokyo = jdbc().queryForObject("""
				select count(*) from restaurants
				where location && ST_MakeEnvelope(139.60, 35.60, 139.85, 35.80, 4326)
				""", Integer.class);

		assertThat(withinTokyo).isGreaterThanOrEqualTo(14);
	}

	@Test
	@DisplayName("geospatial and trigram indexes exist")
	void indexesExist() {
		List<String> indexes = jdbc().queryForList(
			"select indexname from pg_indexes where tablename = 'restaurants'", String.class);

		assertThat(indexes).contains(
			"ix_restaurants_location",
			"ix_restaurants_name_trgm",
			"uq_restaurants_source_external");
	}

	private JdbcTemplate jdbc() {
		return new JdbcTemplate(dataSource);
	}

}
