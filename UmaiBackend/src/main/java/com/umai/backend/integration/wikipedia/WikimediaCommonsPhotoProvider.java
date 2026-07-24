package com.umai.backend.integration.wikipedia;

import java.util.List;
import java.util.Optional;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import com.umai.backend.integration.photo.PlacePhotoProvider;

/**
 * Fills in restaurant photos from Wikimedia Commons directly — free and keyless, same
 * as {@link WikipediaPhotoProvider}, but a different net: Commons holds many individual
 * uploaded photos (often imported from Flickr) of places that never got a Wikipedia
 * article of their own. Searching file titles in the {@code File:} namespace catches
 * some of those, mostly chains and well-known shops photographed by someone at some
 * point — small independent restaurants still won't have one.
 *
 * <p>Runs after {@link WikipediaPhotoProvider} in the backfill order: article search is
 * tried first since an article's lead photo is usually the more canonical image, and
 * this is a second free pass over whatever it missed, not a replacement for it.
 *
 * <p>Matching reuses {@link WikipediaPhotoProvider#titlesOverlap}: a Commons file title
 * like {@code "File:AFURI 新宿 (39573231501).jpg"} still contains the restaurant name as
 * a substring, so the same overlap check guards against an unrelated file matching on a
 * stray shared word.
 */
@Component
@Order(2)
public class WikimediaCommonsPhotoProvider implements PlacePhotoProvider {

	private static final Logger log = LoggerFactory.getLogger(WikimediaCommonsPhotoProvider.class);

	private static final int THUMBNAIL_WIDTH = 800;

	/** The {@code File:} namespace — searching all of Commons would mostly return categories and pages. */
	private static final int FILE_NAMESPACE = 6;

	private final RestClient restClient;

	public WikimediaCommonsPhotoProvider(RestClient.Builder restClientBuilder) {
		this.restClient = restClientBuilder
			.baseUrl("https://commons.wikimedia.org/w/api.php")
			.defaultHeader("Accept", "application/json")
			.defaultHeader("User-Agent", "Umai-RestaurantFinder/1.0 (sample project photo lookup; "
				+ "contact: prathyushsrinivasan@gmail.com)")
			.build();
	}

	@Override
	public boolean isEnabled() {
		return true;
	}

	@Override
	public String name() {
		return "Wikimedia Commons";
	}

	@Override
	public Optional<String> findPhotoUrl(String placeName, double latitude, double longitude) {
		if (placeName == null || placeName.isBlank()) {
			return Optional.empty();
		}

		try {
			SearchResult match = searchBestMatch(placeName);
			if (match == null || match.imageinfo() == null || match.imageinfo().isEmpty()) {
				return Optional.empty();
			}
			if (!WikipediaPhotoProvider.titlesOverlap(placeName, match.title())) {
				return Optional.empty();
			}
			return Optional.ofNullable(match.imageinfo().get(0).thumburl());
		}
		catch (RestClientException ex) {
			log.warn("Wikimedia Commons lookup failed for '{}': {}", placeName, ex.getMessage());
			return Optional.empty();
		}
	}

	private SearchResult searchBestMatch(String placeName) {
		QueryResponse response = restClient.get()
			.uri(uriBuilder -> uriBuilder
				.queryParam("action", "query")
				.queryParam("generator", "search")
				.queryParam("gsrsearch", placeName)
				.queryParam("gsrnamespace", FILE_NAMESPACE)
				.queryParam("gsrlimit", 1)
				.queryParam("prop", "imageinfo")
				.queryParam("iiprop", "url")
				.queryParam("iiurlwidth", THUMBNAIL_WIDTH)
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

	@JsonIgnoreProperties(ignoreUnknown = true)
	private record QueryResponse(Query query) {
	}

	@JsonIgnoreProperties(ignoreUnknown = true)
	private record Query(List<SearchResult> pages) {
	}

	@JsonIgnoreProperties(ignoreUnknown = true)
	private record SearchResult(String title, List<ImageInfo> imageinfo) {
	}

	@JsonIgnoreProperties(ignoreUnknown = true)
	private record ImageInfo(String thumburl) {
	}

}
