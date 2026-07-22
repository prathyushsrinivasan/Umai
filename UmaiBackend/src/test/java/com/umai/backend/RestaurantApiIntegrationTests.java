package com.umai.backend;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

import com.umai.backend.support.AbstractPostgisIntegrationTest;
import com.umai.backend.support.PostgisIntegrationTest;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Exercises the public restaurant API end to end against the seeded database.
 */
@PostgisIntegrationTest
@AutoConfigureMockMvc
class RestaurantApiIntegrationTests extends AbstractPostgisIntegrationTest {

	@Autowired
	private MockMvc mockMvc;

	@Test
	@DisplayName("listing returns a paginated envelope")
	void listIsPaginated() throws Exception {
		mockMvc.perform(get("/api/v1/restaurants?page=0&size=5"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.content.length()").value(5))
			.andExpect(jsonPath("$.page").value(0))
			.andExpect(jsonPath("$.size").value(5))
			.andExpect(jsonPath("$.totalElements").value(14))
			.andExpect(jsonPath("$.first").value(true))
			.andExpect(jsonPath("$.last").value(false));
	}

	@Test
	@DisplayName("keyword search matches Japanese text")
	void keywordSearchWorks() throws Exception {
		mockMvc.perform(get("/api/v1/restaurants/search?keyword=ラーメン"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.totalElements").value(1))
			.andExpect(jsonPath("$.content[0].name").value("池袋グリーンヌードル"));
	}

	@Test
	@DisplayName("filters combine with AND across fields")
	void filtersCombine() throws Exception {
		mockMvc.perform(get("/api/v1/restaurants/search?vegetarianTypes=VEGAN_ONLY&priceRanges=BUDGET"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.content[*].vegetarianType").value(
				org.hamcrest.Matchers.everyItem(org.hamcrest.Matchers.is("VEGAN_ONLY"))));
	}

	@Test
	@DisplayName("category filter uses slugs")
	void categoryFilterWorks() throws Exception {
		mockMvc.perform(get("/api/v1/restaurants/search?categories=indian"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.totalElements").value(1))
			.andExpect(jsonPath("$.content[0].name").value("渋谷スパイスハウス"));
	}

	@Test
	@DisplayName("area filter uses slugs")
	void areaFilterWorks() throws Exception {
		mockMvc.perform(get("/api/v1/restaurants/search?areas=asakusa"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.totalElements").value(2));
	}

	@Test
	@DisplayName("tag filter requires all requested tags")
	void tagFilterRequiresAll() throws Exception {
		// Only 秋葉原ヴィーガンバーガー carries both takeout and gluten-free.
		mockMvc.perform(get("/api/v1/restaurants/search?tags=takeout&tags=gluten-free"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.totalElements").value(1));
	}

	@Test
	@DisplayName("unreviewed restaurants report a null rating, not zero")
	void unreviewedRestaurantsHaveNullRating() throws Exception {
		mockMvc.perform(get("/api/v1/restaurants?size=1"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.content[0].averageRating").doesNotExist())
			.andExpect(jsonPath("$.content[0].reviewCount").value(0));
	}

	@Test
	@DisplayName("detail omits fields the data source does not provide")
	void detailKeepsMissingFieldsAbsent() throws Exception {
		String body = mockMvc.perform(get("/api/v1/restaurants/search?keyword=上野やさい亭"))
			.andExpect(status().isOk())
			.andReturn().getResponse().getContentAsString();

		long id = com.jayway.jsonpath.JsonPath.parse(body).read("$.content[0].id", Integer.class);

		mockMvc.perform(get("/api/v1/restaurants/" + id))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.name").value("上野やさい亭"))
			.andExpect(jsonPath("$.websiteUrl").doesNotExist())
			.andExpect(jsonPath("$.phone").doesNotExist())
			.andExpect(jsonPath("$.openingHours").doesNotExist())
			.andExpect(jsonPath("$.priceRange").doesNotExist());
	}

	@Test
	@DisplayName("unknown restaurant returns 404 in the shared error shape")
	void unknownRestaurantReturns404() throws Exception {
		mockMvc.perform(get("/api/v1/restaurants/999999"))
			.andExpect(status().isNotFound())
			.andExpect(jsonPath("$.status").value(404))
			.andExpect(jsonPath("$.message").exists());
	}

	@Test
	@DisplayName("map endpoint returns restaurants inside the bounding box")
	void mapBoundingBoxWorks() throws Exception {
		// A box around 浅草 only.
		mockMvc.perform(get("/api/v1/restaurants/map?minLat=35.70&minLon=139.79&maxLat=35.72&maxLon=139.80"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.totalInBounds").value(2))
			.andExpect(jsonPath("$.truncated").value(false))
			.andExpect(jsonPath("$.restaurants.length()").value(2));
	}

	@Test
	@DisplayName("an inverted bounding box is rejected as a 400")
	void invalidBoundingBoxIsRejected() throws Exception {
		mockMvc.perform(get("/api/v1/restaurants/map?minLat=35.80&minLon=139.79&maxLat=35.70&maxLon=139.80"))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.status").value(400));
	}

	@Test
	@DisplayName("lookup endpoints expose seeded reference data")
	void lookupEndpointsWork() throws Exception {
		mockMvc.perform(get("/api/v1/categories"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.length()").value(7));

		mockMvc.perform(get("/api/v1/areas"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$[0].nameJa").value("新宿"));

		mockMvc.perform(get("/api/v1/tags"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.length()").value(6));
	}

	@Test
	@DisplayName("OpenAPI document is served")
	void openApiDocumentIsAvailable() throws Exception {
		mockMvc.perform(get("/v3/api-docs"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.info.title").value("Umai API"))
			.andExpect(jsonPath("$.paths['/api/v1/restaurants/search']").exists());
	}

}
