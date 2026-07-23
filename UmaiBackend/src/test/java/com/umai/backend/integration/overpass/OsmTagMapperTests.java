package com.umai.backend.integration.overpass;

import java.util.Map;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;

import com.umai.backend.integration.ExternalRestaurant;
import com.umai.backend.restaurant.RestaurantSource;
import com.umai.backend.restaurant.VegetarianType;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Rules for turning OpenStreetMap tags into our model.
 *
 * <p>Pure logic with no database or network, so these run everywhere. They encode the
 * decisions that matter most for correctness: OSM is volunteer-contributed and
 * inconsistent, and a wrong vegan classification is worse than none at all.
 */
class OsmTagMapperTests {

	private final OsmTagMapper mapper = new OsmTagMapper();

	private ExternalRestaurant map(Map<String, String> tags) {
		return mapper.toExternalRestaurant("node/1", 35.68, 139.76, tags).orElseThrow();
	}

	@Nested
	@DisplayName("diet classification")
	class DietClassification {

		@ParameterizedTest(name = "diet:vegan={0} -> {1}")
		@CsvSource({
			"only, VEGAN_ONLY",
			"yes,  VEGAN_FRIENDLY",
		})
		void veganTagsMap(String value, VegetarianType expected) {
			assertThat(map(Map.of("name", "店", "diet:vegan", value)).vegetarianType())
				.isEqualTo(expected);
		}

		@ParameterizedTest(name = "diet:vegetarian={0} -> {1}")
		@CsvSource({
			"only, VEGETARIAN_ONLY",
			"yes,  VEGETARIAN_FRIENDLY",
		})
		void vegetarianTagsMap(String value, VegetarianType expected) {
			assertThat(map(Map.of("name", "店", "diet:vegetarian", value)).vegetarianType())
				.isEqualTo(expected);
		}

		@Test
		@DisplayName("vegan wins over vegetarian, being the stricter claim")
		void veganTakesPrecedence() {
			ExternalRestaurant result = map(Map.of(
				"name", "店", "diet:vegan", "only", "diet:vegetarian", "yes"));

			assertThat(result.vegetarianType()).isEqualTo(VegetarianType.VEGAN_ONLY);
		}

		@ParameterizedTest(name = "ambiguous value ''{0}'' yields UNKNOWN")
		@ValueSource(strings = { "limited", "no", "maybe", "", "  " })
		void ambiguousValuesYieldUnknown(String value) {
			ExternalRestaurant result = map(Map.of(
				"name", "店", "diet:vegan", value, "diet:vegetarian", value));

			// We will not imply a venue caters to a diet on ambiguous evidence.
			assertThat(result.vegetarianType()).isEqualTo(VegetarianType.UNKNOWN);
		}

		@Test
		@DisplayName("no diet tag at all yields UNKNOWN rather than a guess")
		void missingTagsYieldUnknown() {
			assertThat(map(Map.of("name", "店")).vegetarianType()).isEqualTo(VegetarianType.UNKNOWN);
		}

		@Test
		@DisplayName("values are matched case-insensitively")
		void valuesAreCaseInsensitive() {
			assertThat(map(Map.of("name", "店", "diet:vegan", "ONLY")).vegetarianType())
				.isEqualTo(VegetarianType.VEGAN_ONLY);
		}
	}

	@Nested
	@DisplayName("naming")
	class Naming {

		@Test
		@DisplayName("the Japanese name is preferred, since the UI is Japanese")
		void japaneseNameWins() {
			ExternalRestaurant result = map(Map.of(
				"name", "Midori Kitchen", "name:ja", "みどりキッチン", "name:en", "Green Kitchen"));

			assertThat(result.name()).isEqualTo("みどりキッチン");
		}

		@Test
		@DisplayName("falls back to the generic name, then the English one")
		void fallsBackThroughNameTags() {
			assertThat(map(Map.of("name", "Midori")).name()).isEqualTo("Midori");
			assertThat(map(Map.of("name:en", "Green")).name()).isEqualTo("Green");
		}

		@Test
		@DisplayName("an unnamed venue is skipped, not imported blank")
		void unnamedVenuesAreSkipped() {
			assertThat(mapper.toExternalRestaurant("node/1", 35.68, 139.76, Map.of("amenity", "cafe")))
				.isEmpty();
		}

		@Test
		@DisplayName("a blank name counts as no name")
		void blankNameIsSkipped() {
			assertThat(mapper.toExternalRestaurant("node/1", 35.68, 139.76, Map.of("name", "   ")))
				.isEmpty();
		}
	}

	@Nested
	@DisplayName("required fields")
	class RequiredFields {

		@Test
		@DisplayName("an element without coordinates is skipped")
		void missingCoordinatesAreSkipped() {
			assertThat(mapper.toExternalRestaurant("node/1", null, 139.76, Map.of("name", "店"))).isEmpty();
			assertThat(mapper.toExternalRestaurant("node/1", 35.68, null, Map.of("name", "店"))).isEmpty();
		}

		@Test
		@DisplayName("an element without an id is skipped, having nothing to match on later")
		void missingIdIsSkipped() {
			assertThat(mapper.toExternalRestaurant(null, 35.68, 139.76, Map.of("name", "店"))).isEmpty();
		}

		@Test
		@DisplayName("null tags are handled rather than throwing")
		void nullTagsAreHandled() {
			assertThat(mapper.toExternalRestaurant("node/1", 35.68, 139.76, null)).isEmpty();
		}

		@Test
		@DisplayName("the source is always recorded as OpenStreetMap")
		void sourceIsRecorded() {
			ExternalRestaurant result = map(Map.of("name", "店"));

			assertThat(result.source()).isEqualTo(RestaurantSource.OPENSTREETMAP);
			assertThat(result.externalId()).isEqualTo("node/1");
		}
	}

	@Nested
	@DisplayName("cuisine to category")
	class CuisineMapping {

		@ParameterizedTest(name = "cuisine={0} -> {1}")
		@CsvSource({
			"japanese, washoku",
			"sushi,    washoku",
			"ramen,    ramen",
			"indian,   indian",
			"chinese,  chuka",
			"italian,  yoshoku",
			"burger,   yoshoku",
		})
		void knownCuisinesMap(String cuisine, String expectedSlug) {
			assertThat(map(Map.of("name", "店", "cuisine", cuisine)).categorySlugs())
				.containsExactly(expectedSlug);
		}

		@Test
		@DisplayName("multiple semicolon-separated cuisines all map")
		void multipleCuisinesMap() {
			assertThat(map(Map.of("name", "店", "cuisine", "japanese;ramen")).categorySlugs())
				.containsExactly("washoku", "ramen");
		}

		@Test
		@DisplayName("an unrecognised cuisine falls back to 'other' rather than a near match")
		void unknownCuisineFallsBack() {
			assertThat(map(Map.of("name", "店", "cuisine", "ethiopian")).categorySlugs())
				.containsExactly("other");
		}

		@Test
		@DisplayName("amenity=cafe is a genre in its own right")
		void cafeAmenityAddsCategory() {
			assertThat(map(Map.of("name", "店", "amenity", "cafe")).categorySlugs())
				.containsExactly("cafe");
		}

		@Test
		@DisplayName("duplicate cuisines do not produce duplicate categories")
		void duplicatesAreCollapsed() {
			assertThat(map(Map.of("name", "店", "cuisine", "sushi;japanese", "amenity", "cafe"))
				.categorySlugs())
				.containsExactly("washoku", "cafe");
		}

		@Test
		@DisplayName("a venue with no cuisine information still gets a category")
		void alwaysHasACategory() {
			assertThat(map(Map.of("name", "店")).categorySlugs()).containsExactly("other");
		}
	}

	@Nested
	@DisplayName("website")
	class Website {

		@ParameterizedTest(name = "{0} is accepted")
		@ValueSource(strings = { "https://example.com", "http://example.com/a?b=c" })
		void httpUrlsAreAccepted(String url) {
			assertThat(map(Map.of("name", "店", "website", url)).websiteUrl()).isEqualTo(url);
		}

		@ParameterizedTest(name = "{0} is rejected")
		@ValueSource(strings = {
			"javascript:alert(1)",
			"data:text/html,<script>alert(1)</script>",
			"example.com",
			"ftp://example.com",
		})
		void nonHttpUrlsAreRejected(String url) {
			// A hostile tag value must never become a link the frontend renders.
			assertThat(map(Map.of("name", "店", "website", url)).websiteUrl()).isNull();
		}

		@Test
		@DisplayName("contact:website is used when website is absent")
		void contactWebsiteIsUsed() {
			assertThat(map(Map.of("name", "店", "contact:website", "https://example.com")).websiteUrl())
				.isEqualTo("https://example.com");
		}

		@Test
		@DisplayName("an over-long URL is dropped rather than truncated into nonsense")
		void overlongUrlIsDropped() {
			String longUrl = "https://example.com/" + "x".repeat(600);

			assertThat(map(Map.of("name", "店", "website", longUrl)).websiteUrl()).isNull();
		}
	}

	@Nested
	@DisplayName("address and contact")
	class AddressAndContact {

		@Test
		@DisplayName("addr:full is used verbatim when present")
		void fullAddressWins() {
			assertThat(map(Map.of("name", "店", "addr:full", "東京都新宿区西新宿1-1-1")).address())
				.isEqualTo("東京都新宿区西新宿1-1-1");
		}

		@Test
		@DisplayName("address parts are assembled largest unit first, as Japanese addresses run")
		void addressPartsAreJoinedInJapaneseOrder() {
			ExternalRestaurant result = map(Map.of(
				"name", "店",
				"addr:province", "東京都",
				"addr:city", "新宿区",
				"addr:quarter", "西新宿",
				"addr:housenumber", "1-1-1"));

			assertThat(result.address()).isEqualTo("東京都新宿区西新宿1-1-1");
		}

		@Test
		@DisplayName("no address tags yields null, not an empty string")
		void missingAddressIsNull() {
			assertThat(map(Map.of("name", "店")).address()).isNull();
		}

		@Test
		@DisplayName("phone falls back to contact:phone")
		void phoneFallsBack() {
			assertThat(map(Map.of("name", "店", "contact:phone", "03-0000-0000")).phone())
				.isEqualTo("03-0000-0000");
		}

		@Test
		@DisplayName("opening hours are passed through as free text")
		void openingHoursArePassedThrough() {
			assertThat(map(Map.of("name", "店", "opening_hours", "Mo-Fr 11:00-21:00")).openingHours())
				.isEqualTo("Mo-Fr 11:00-21:00");
		}

		@Test
		@DisplayName("fields OSM cannot supply stay null rather than being invented")
		void unsupportedFieldsStayNull() {
			ExternalRestaurant result = map(Map.of("name", "店"));

			assertThat(result.description()).isNull();
			assertThat(result.priceRange()).isNull();
			assertThat(result.phone()).isNull();
			assertThat(result.openingHours()).isNull();
		}
	}

	@Nested
	@DisplayName("image")
	class Image {

		@ParameterizedTest(name = "{0} is accepted verbatim")
		@ValueSource(strings = { "https://example.com/photo.jpg", "http://example.com/p.png?w=1" })
		void directHttpImagesAreAccepted(String url) {
			assertThat(map(Map.of("name", "店", "image", url)).imageUrl()).isEqualTo(url);
		}

		@ParameterizedTest(name = "{0} is rejected")
		@ValueSource(strings = { "javascript:alert(1)", "example.com/x.jpg", "ftp://example.com/x.jpg" })
		void nonHttpImagesAreRejected(String url) {
			// A hostile tag value must never become an <img src> the frontend renders.
			assertThat(map(Map.of("name", "店", "image", url)).imageUrl()).isNull();
		}

		@Test
		@DisplayName("a wikimedia_commons File: reference becomes a Special:FilePath thumbnail")
		void commonsFileBecomesThumbnail() {
			assertThat(map(Map.of("name", "店", "wikimedia_commons", "File:Green Cafe.jpg")).imageUrl())
				.isEqualTo("https://commons.wikimedia.org/wiki/Special:FilePath/Green_Cafe.jpg?width=800");
		}

		@Test
		@DisplayName("a Category: commons reference is skipped — it is a gallery, not one photo")
		void commonsCategoryIsSkipped() {
			assertThat(map(Map.of("name", "店", "wikimedia_commons", "Category:Restaurants")).imageUrl())
				.isNull();
		}

		@Test
		@DisplayName("a direct image tag wins over a commons reference")
		void directImageWinsOverCommons() {
			assertThat(map(Map.of(
				"name", "店",
				"image", "https://example.com/photo.jpg",
				"wikimedia_commons", "File:Other.jpg")).imageUrl())
				.isEqualTo("https://example.com/photo.jpg");
		}

		@Test
		@DisplayName("no image tags yields null rather than a placeholder")
		void missingImageIsNull() {
			assertThat(map(Map.of("name", "店")).imageUrl()).isNull();
		}
	}

}
