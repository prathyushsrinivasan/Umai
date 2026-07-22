package com.umai.backend;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import com.jayway.jsonpath.JsonPath;
import com.umai.backend.support.AbstractPostgisIntegrationTest;
import com.umai.backend.support.PostgisIntegrationTest;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Covers registration, login, review lifecycle and restaurant submission, including
 * the authorisation rules that keep one user from acting as another.
 */
@PostgisIntegrationTest
@AutoConfigureMockMvc
class AuthAndReviewIntegrationTests extends AbstractPostgisIntegrationTest {

	@Autowired
	private MockMvc mockMvc;

	// ---- registration & login -------------------------------------------------

	@Test
	@DisplayName("a registered user receives a token and can read their account")
	void registerAndFetchAccount() throws Exception {
		String token = registerAndGetToken("alice", "alice@example.com");

		mockMvc.perform(get("/api/v1/auth/me").header("Authorization", "Bearer " + token))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.username").value("alice"))
			.andExpect(jsonPath("$.role").value("USER"))
			// The hash must never leave the server.
			.andExpect(jsonPath("$.passwordHash").doesNotExist());
	}

	@Test
	@DisplayName("registering a duplicate email is rejected")
	void duplicateEmailIsRejected() throws Exception {
		registerAndGetToken("bob", "bob@example.com");

		mockMvc.perform(post("/api/v1/auth/register")
				.contentType(MediaType.APPLICATION_JSON)
				.content(registerBody("bob2", "bob@example.com")))
			.andExpect(status().isConflict())
			.andExpect(jsonPath("$.status").value(409));
	}

	@Test
	@DisplayName("a short password is rejected with a field error")
	void weakPasswordIsRejected() throws Exception {
		mockMvc.perform(post("/api/v1/auth/register")
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"username":"shorty","email":"shorty@example.com","password":"abc"}
						"""))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.fieldErrors[?(@.field=='password')]").exists());
	}

	@Test
	@DisplayName("a wrong password and an unknown email fail identically")
	void loginFailuresAreIndistinguishable() throws Exception {
		registerAndGetToken("carol", "carol@example.com");

		String wrongPassword = mockMvc.perform(post("/api/v1/auth/login")
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"email":"carol@example.com","password":"not-the-password"}
						"""))
			.andExpect(status().isUnauthorized())
			.andReturn().getResponse().getContentAsString();

		String unknownEmail = mockMvc.perform(post("/api/v1/auth/login")
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"email":"nobody@example.com","password":"not-the-password"}
						"""))
			.andExpect(status().isUnauthorized())
			.andReturn().getResponse().getContentAsString();

		String messageA = JsonPath.parse(wrongPassword).read("$.message");
		String messageB = JsonPath.parse(unknownEmail).read("$.message");

		// Identical messages prevent using login to discover registered addresses.
		org.assertj.core.api.Assertions.assertThat(messageA).isEqualTo(messageB);
	}

	// ---- reviews --------------------------------------------------------------

	@Test
	@DisplayName("an anonymous review attempt is rejected")
	void anonymousReviewIsRejected() throws Exception {
		mockMvc.perform(post("/api/v1/restaurants/{id}/reviews", firstRestaurantId())
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"rating":5,"comment":"すばらしい"}
						"""))
			.andExpect(status().isUnauthorized());
	}

	@Test
	@DisplayName("a review updates the restaurant's derived average rating")
	void reviewAffectsAggregateRating() throws Exception {
		String token = registerAndGetToken("dave", "dave@example.com");
		long restaurantId = firstRestaurantId();

		mockMvc.perform(get("/api/v1/restaurants/{id}", restaurantId))
			.andExpect(jsonPath("$.averageRating").doesNotExist())
			.andExpect(jsonPath("$.reviewCount").value(0));

		mockMvc.perform(post("/api/v1/restaurants/{id}/reviews", restaurantId)
				.header("Authorization", "Bearer " + token)
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"rating":4,"comment":"おいしかったです"}
						"""))
			.andExpect(status().isCreated())
			.andExpect(jsonPath("$.rating").value(4))
			.andExpect(jsonPath("$.username").value("dave"))
			.andExpect(jsonPath("$.ownedByCurrentUser").value(true));

		mockMvc.perform(get("/api/v1/restaurants/{id}", restaurantId))
			.andExpect(jsonPath("$.averageRating").value(4.0))
			.andExpect(jsonPath("$.reviewCount").value(1));
	}

	@Test
	@DisplayName("a second review by the same user is rejected")
	void duplicateReviewIsRejected() throws Exception {
		String token = registerAndGetToken("erin", "erin@example.com");
		long restaurantId = restaurantIdAt(1);

		postReview(token, restaurantId, 5).andExpect(status().isCreated());
		postReview(token, restaurantId, 3).andExpect(status().isConflict());
	}

	@Test
	@DisplayName("a rating outside 1-5 is rejected before reaching the database")
	void invalidRatingIsRejected() throws Exception {
		String token = registerAndGetToken("frank", "frank@example.com");

		postReview(token, restaurantIdAt(2), 9)
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.fieldErrors[?(@.field=='rating')]").exists());
	}

	@Test
	@DisplayName("a user cannot edit or delete someone else's review")
	void cannotModifyAnotherUsersReview() throws Exception {
		String ownerToken = registerAndGetToken("grace", "grace@example.com");
		String otherToken = registerAndGetToken("heidi", "heidi@example.com");
		long restaurantId = restaurantIdAt(3);

		String created = postReview(ownerToken, restaurantId, 5)
			.andExpect(status().isCreated())
			.andReturn().getResponse().getContentAsString();
		int reviewId = JsonPath.parse(created).read("$.id", Integer.class);

		mockMvc.perform(put("/api/v1/restaurants/{r}/reviews/{v}", restaurantId, reviewId)
				.header("Authorization", "Bearer " + otherToken)
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"rating":1,"comment":"のっとり"}
						"""))
			.andExpect(status().isForbidden());

		mockMvc.perform(delete("/api/v1/restaurants/{r}/reviews/{v}", restaurantId, reviewId)
				.header("Authorization", "Bearer " + otherToken))
			.andExpect(status().isForbidden());
	}

	@Test
	@DisplayName("an author can update and then delete their own review")
	void authorCanUpdateAndDelete() throws Exception {
		String token = registerAndGetToken("ivan", "ivan@example.com");
		long restaurantId = restaurantIdAt(4);

		String created = postReview(token, restaurantId, 2)
			.andReturn().getResponse().getContentAsString();
		int reviewId = JsonPath.parse(created).read("$.id", Integer.class);

		mockMvc.perform(put("/api/v1/restaurants/{r}/reviews/{v}", restaurantId, reviewId)
				.header("Authorization", "Bearer " + token)
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"rating":5,"comment":"再訪してよかった"}
						"""))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.rating").value(5));

		mockMvc.perform(delete("/api/v1/restaurants/{r}/reviews/{v}", restaurantId, reviewId)
				.header("Authorization", "Bearer " + token))
			.andExpect(status().isNoContent());

		mockMvc.perform(get("/api/v1/restaurants/{id}", restaurantId))
			.andExpect(jsonPath("$.averageRating").doesNotExist())
			.andExpect(jsonPath("$.reviewCount").value(0));
	}

	// ---- restaurant submission ------------------------------------------------

	@Test
	@DisplayName("an anonymous submission is rejected")
	void anonymousSubmissionIsRejected() throws Exception {
		mockMvc.perform(post("/api/v1/restaurants")
				.contentType(MediaType.APPLICATION_JSON)
				.content(submissionBody("匿名の店")))
			.andExpect(status().isUnauthorized());
	}

	@Test
	@DisplayName("an authenticated user can submit a restaurant and it becomes findable")
	void authenticatedUserCanSubmit() throws Exception {
		String token = registerAndGetToken("judy", "judy@example.com");

		String created = mockMvc.perform(post("/api/v1/restaurants")
				.header("Authorization", "Bearer " + token)
				.contentType(MediaType.APPLICATION_JSON)
				.content(submissionBody("新しいヴィーガン食堂")))
			.andExpect(status().isCreated())
			.andExpect(jsonPath("$.name").value("新しいヴィーガン食堂"))
			// Provenance is set by the server, not the client.
			.andExpect(jsonPath("$.source").value("USER_SUBMISSION"))
			.andExpect(jsonPath("$.averageRating").doesNotExist())
			.andReturn().getResponse().getContentAsString();

		int id = JsonPath.parse(created).read("$.id", Integer.class);

		mockMvc.perform(get("/api/v1/restaurants/{id}", id))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.name").value("新しいヴィーガン食堂"));
	}

	@Test
	@DisplayName("a submission missing required fields reports field errors")
	void invalidSubmissionReportsFieldErrors() throws Exception {
		String token = registerAndGetToken("ken", "ken@example.com");

		mockMvc.perform(post("/api/v1/restaurants")
				.header("Authorization", "Bearer " + token)
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"name":"","latitude":null,"longitude":139.7,"vegetarianType":"VEGAN_ONLY"}
						"""))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.fieldErrors").isNotEmpty());
	}

	@Test
	@DisplayName("a non-http website URL is rejected")
	void unsafeWebsiteUrlIsRejected() throws Exception {
		String token = registerAndGetToken("lena", "lena@example.com");

		mockMvc.perform(post("/api/v1/restaurants")
				.header("Authorization", "Bearer " + token)
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"name":"あやしい店","latitude":35.68,"longitude":139.76,
						 "vegetarianType":"VEGAN_ONLY","websiteUrl":"javascript:alert(1)"}
						"""))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.fieldErrors[?(@.field=='websiteUrl')]").exists());
	}

	@Test
	@DisplayName("a tampered token is rejected")
	void tamperedTokenIsRejected() throws Exception {
		String token = registerAndGetToken("mike", "mike@example.com");
		// Flip the final character of the signature.
		String tampered = token.substring(0, token.length() - 1)
			+ (token.endsWith("A") ? "B" : "A");

		mockMvc.perform(get("/api/v1/auth/me").header("Authorization", "Bearer " + tampered))
			.andExpect(status().isUnauthorized());
	}

	// ---- helpers --------------------------------------------------------------

	private String registerAndGetToken(String username, String email) throws Exception {
		String body = mockMvc.perform(post("/api/v1/auth/register")
				.contentType(MediaType.APPLICATION_JSON)
				.content(registerBody(username, email)))
			.andExpect(status().isCreated())
			.andReturn().getResponse().getContentAsString();

		return JsonPath.parse(body).read("$.token");
	}

	private String registerBody(String username, String email) {
		return """
				{"username":"%s","email":"%s","password":"a-good-enough-password"}
				""".formatted(username, email);
	}

	private String submissionBody(String name) {
		return """
				{"name":"%s","latitude":35.6896,"longitude":139.7006,
				 "vegetarianType":"VEGAN_ONLY","areaSlug":"shinjuku","categorySlugs":["washoku"]}
				""".formatted(name);
	}

	private org.springframework.test.web.servlet.ResultActions postReview(
			String token, long restaurantId, int rating) throws Exception {
		return mockMvc.perform(post("/api/v1/restaurants/{id}/reviews", restaurantId)
			.header("Authorization", "Bearer " + token)
			.contentType(MediaType.APPLICATION_JSON)
			.content("{\"rating\":%d,\"comment\":\"テスト\"}".formatted(rating)));
	}

	/** Uses a distinct seeded restaurant per test so reviews do not collide. */
	private long restaurantIdAt(int index) throws Exception {
		String body = mockMvc.perform(get("/api/v1/restaurants?size=20"))
			.andReturn().getResponse().getContentAsString();
		return JsonPath.parse(body).read("$.content[" + index + "].id", Integer.class);
	}

	private long firstRestaurantId() throws Exception {
		return restaurantIdAt(0);
	}

}
