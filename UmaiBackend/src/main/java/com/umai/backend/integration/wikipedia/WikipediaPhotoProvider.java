package com.umai.backend.integration.wikipedia;

import java.util.List;
import java.util.Locale;
import java.util.Optional;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import com.umai.backend.integration.photo.PlacePhotoProvider;

/**
 * Fills in restaurant photos from Japanese Wikipedia — free, keyless, no billing account,
 * unlike every other photo API worth using.
 *
 * <p>Coverage is narrow by nature: most restaurants never get their own Wikipedia article.
 * Chains and famous, long-running shops do (a chain's article covers the brand, not a
 * specific branch), so this mainly helps recognizable names like convenience-food chains
 * or landmark ramen shops. Unlike {@link com.umai.backend.integration.foursquare.FoursquarePhotoProvider},
 * matching is <strong>not</strong> location-based — a chain's article lives at its own
 * page regardless of which branch we're looking up — so a branch's photo is really "the
 * chain's photo." To avoid attaching a wrong, unrelated image, a match is only accepted
 * when the article title and the restaurant name substantially overlap.
 *
 * <p>Runs first in the backfill order (see {@link com.umai.backend.integration.photo.PhotoBackfillService}):
 * it costs nothing to try, so it's worth exhausting before spending Foursquare's rate-limited
 * quota on a restaurant Wikipedia could have already covered.
 */
@Component
@Order(1)
public class WikipediaPhotoProvider implements PlacePhotoProvider {

	private static final Logger log = LoggerFactory.getLogger(WikipediaPhotoProvider.class);

	private static final int THUMBNAIL_SIZE = 800;

	/** Middle dot, full-width space, and regular space — punctuation substring matching should ignore. */
	private static final String IGNORED_CHARS = "・　 ";

	private final RestClient restClient;

	public WikipediaPhotoProvider(RestClient.Builder restClientBuilder) {
		this.restClient = restClientBuilder
			.baseUrl("https://ja.wikipedia.org/w/api.php")
			.defaultHeader("Accept", "application/json")
			// Required: Wikimedia's API etiquette rejects requests with no identifying
			// user agent with a 403 ("Please set a user-agent and respect our robot
			// policy") — every request failed until this was added.
			.defaultHeader("User-Agent", "Umai-RestaurantFinder/1.0 (sample project photo lookup; "
				+ "contact: prathyushsrinivasan@gmail.com)")
			.build();
	}

	@Override
	public boolean isEnabled() {
		// No API key, no billing account, no config flag — this source is either usable
		// or the network is down, and a network failure is handled per-lookup below.
		return true;
	}

	@Override
	public String name() {
		return "Wikipedia";
	}

	@Override
	public Optional<String> findPhotoUrl(String placeName, double latitude, double longitude) {
		if (placeName == null || placeName.isBlank()) {
			return Optional.empty();
		}

		try {
			SearchResult match = searchBestMatch(placeName);
			if (match == null || match.thumbnail() == null || !titlesOverlap(placeName, match.title())) {
				return Optional.empty();
			}
			return Optional.ofNullable(match.thumbnail().source());
		}
		catch (RestClientException ex) {
			log.warn("Wikipedia lookup failed for '{}': {}", placeName, ex.getMessage());
			return Optional.empty();
		}
	}

	private SearchResult searchBestMatch(String placeName) {
		QueryResponse response = restClient.get()
			.uri(uriBuilder -> uriBuilder
				.queryParam("action", "query")
				.queryParam("generator", "search")
				.queryParam("gsrsearch", placeName)
				.queryParam("gsrlimit", 1)
				.queryParam("prop", "pageimages")
				.queryParam("piprop", "thumbnail")
				.queryParam("pithumbsize", THUMBNAIL_SIZE)
				.queryParam("format", "json")
				.queryParam("formatversion", 2)
				.build())
			.retrieve()
			.body(QueryResponse.class);

		if (response == null || response.query() == null || response.query().pages() == null
				|| response.query().pages().isEmpty()) {
			return null;
		}
		return response.query().pages().get(0);
	}

	/**
	 * True when the restaurant name and the article title are substantially the same
	 * business name — one containing the other after stripping whitespace and full-width
	 * punctuation. A branch name like "マクドナルド 新宿東口店" contains the chain article's
	 * title "マクドナルド"; an unrelated search hit sharing only a stray word does not.
	 *
	 * <p>Short or purely-numeric names are rejected outright, however they compare: a
	 * restaurant named "202" matched a counting-rod numeral diagram, and one named "頭"
	 * ("head") matched Wikipedia's own generic anatomy article — plain substring
	 * containment can't tell a real business name from a coincidental one-word or
	 * bare-number search hit landing on unrelated encyclopedia content.
	 *
	 * <p>Package-private and static so this is unit-testable without HTTP.
	 */
	static boolean titlesOverlap(String placeName, String articleTitle) {
		String normalizedPlace = normalize(placeName);
		String normalizedArticle = normalize(articleTitle);
		if (normalizedPlace.isEmpty() || normalizedArticle.isEmpty() || isTooGenericToTrust(normalizedPlace)) {
			return false;
		}
		return normalizedPlace.contains(normalizedArticle) || normalizedArticle.contains(normalizedPlace);
	}

	private static boolean isTooGenericToTrust(String normalizedPlaceName) {
		return normalizedPlaceName.length() < 3 || normalizedPlaceName.chars().allMatch(Character::isDigit);
	}

	private static String normalize(String value) {
		String result = value.toLowerCase(Locale.ROOT);
		for (char ignored : IGNORED_CHARS.toCharArray()) {
			result = result.replace(String.valueOf(ignored), "");
		}
		return result.strip();
	}

	@JsonIgnoreProperties(ignoreUnknown = true)
	private record QueryResponse(Query query) {
	}

	@JsonIgnoreProperties(ignoreUnknown = true)
	private record Query(List<SearchResult> pages) {
	}

	@JsonIgnoreProperties(ignoreUnknown = true)
	private record SearchResult(String title, Thumbnail thumbnail) {
	}

	@JsonIgnoreProperties(ignoreUnknown = true)
	private record Thumbnail(String source, @JsonProperty("width") int width, @JsonProperty("height") int height) {
	}

}
