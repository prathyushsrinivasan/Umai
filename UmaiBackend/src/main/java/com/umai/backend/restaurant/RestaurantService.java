package com.umai.backend.restaurant;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.umai.backend.area.AreaRepository;
import com.umai.backend.category.Category;
import com.umai.backend.category.CategoryRepository;
import com.umai.backend.common.exception.ResourceNotFoundException;
import com.umai.backend.common.web.PageResponse;
import com.umai.backend.config.SubmissionProperties;
import com.umai.backend.restaurant.dto.CreateRestaurantRequest;
import com.umai.backend.restaurant.dto.MapRestaurantsDto;
import com.umai.backend.security.CurrentUser;
import com.umai.backend.user.User;
import com.umai.backend.user.UserService;
import com.umai.backend.restaurant.dto.RestaurantDetailDto;
import com.umai.backend.restaurant.dto.RestaurantSearchCriteria;
import com.umai.backend.restaurant.dto.RestaurantSummaryDto;
import com.umai.backend.review.RatingSummary;
import com.umai.backend.review.ReviewRepository;

/**
 * Read operations for restaurants: search, detail and map queries.
 *
 * <p>Ratings are always derived from reviews and loaded one query per page rather than
 * one per restaurant.
 */
@Service
@Transactional(readOnly = true)
public class RestaurantService {

	/** Upper bound on markers returned for a single map viewport. */
	static final int MAX_MAP_RESULTS = 300;

	private final RestaurantRepository restaurantRepository;

	private final ReviewRepository reviewRepository;

	private final RestaurantMapper mapper;

	private final AreaRepository areaRepository;

	private final CategoryRepository categoryRepository;

	private final UserService userService;

	private final SubmissionProperties submissionProperties;

	public RestaurantService(RestaurantRepository restaurantRepository, ReviewRepository reviewRepository,
			RestaurantMapper mapper, AreaRepository areaRepository, CategoryRepository categoryRepository,
			UserService userService, SubmissionProperties submissionProperties) {
		this.restaurantRepository = restaurantRepository;
		this.reviewRepository = reviewRepository;
		this.mapper = mapper;
		this.areaRepository = areaRepository;
		this.categoryRepository = categoryRepository;
		this.userService = userService;
		this.submissionProperties = submissionProperties;
	}

	/**
	 * Records a user-submitted restaurant.
	 *
	 * <p>Source and status are set by the server, never taken from the request, so a
	 * client cannot masquerade a submission as imported data or self-approve it.
	 */
	@Transactional
	public RestaurantDetailDto create(CreateRestaurantRequest request) {
		User submitter = userService.requireEntity(CurrentUser.requireId());

		Restaurant restaurant = new Restaurant(
			request.name().trim(),
			request.latitude(),
			request.longitude(),
			request.vegetarianType(),
			RestaurantSource.USER_SUBMISSION);

		restaurant.setDescription(blankToNull(request.description()));
		restaurant.setAddress(blankToNull(request.address()));
		restaurant.setPriceRange(request.priceRange());
		restaurant.setWebsiteUrl(blankToNull(request.websiteUrl()));
		restaurant.setPhone(blankToNull(request.phone()));
		restaurant.setOpeningHours(blankToNull(request.openingHours()));
		restaurant.setStatus(submissionProperties.statusForNewSubmission());
		restaurant.setSubmittedBy(submitter);

		if (request.areaSlug() != null && !request.areaSlug().isBlank()) {
			areaRepository.findBySlug(request.areaSlug())
				.ifPresentOrElse(restaurant::setArea, () -> {
					throw new IllegalArgumentException("エリアが見つかりません: " + request.areaSlug());
				});
		}

		if (!request.categorySlugs().isEmpty()) {
			List<Category> categories = categoryRepository.findBySlugIn(request.categorySlugs());
			if (categories.size() != request.categorySlugs().size()) {
				throw new IllegalArgumentException("料理ジャンルに不明な値が含まれています");
			}
			categories.forEach(restaurant::addCategory);
		}

		Restaurant saved = restaurantRepository.save(restaurant);
		return mapper.toDetail(saved, RatingSummary.empty(saved.getId()));
	}

	private String blankToNull(String value) {
		return (value == null || value.isBlank()) ? null : value.trim();
	}

	/** Paginated search across all supported filters. */
	public PageResponse<RestaurantSummaryDto> search(RestaurantSearchCriteria criteria, Pageable pageable) {
		Page<Restaurant> page = restaurantRepository.findAll(RestaurantSpecifications.from(criteria), pageable);
		Map<Long, RatingSummary> ratings = loadRatings(page.getContent());

		return PageResponse.of(page, restaurant -> mapper.toSummary(restaurant, ratingFor(ratings, restaurant)));
	}

	/** Full detail for one published restaurant. */
	public RestaurantDetailDto findById(Long id) {
		Restaurant restaurant = restaurantRepository.findByIdAndStatus(id, RestaurantStatus.PUBLISHED)
			.orElseThrow(() -> ResourceNotFoundException.of("Restaurant", id));

		RatingSummary rating = reviewRepository.findRatingSummary(id).orElseGet(() -> RatingSummary.empty(id));
		return mapper.toDetail(restaurant, rating);
	}

	/**
	 * Restaurants inside the map's visible bounds.
	 *
	 * <p>Capped at {@link #MAX_MAP_RESULTS}; the response reports the true total so the
	 * UI can tell the user to zoom in instead of quietly showing a subset.
	 */
	public MapRestaurantsDto findInBounds(MapBounds bounds) {
		List<Restaurant> restaurants = restaurantRepository.findWithinBoundingBox(
			bounds.minLon(), bounds.minLat(), bounds.maxLon(), bounds.maxLat(), MAX_MAP_RESULTS);

		long total = restaurantRepository.countWithinBoundingBox(
			bounds.minLon(), bounds.minLat(), bounds.maxLon(), bounds.maxLat());

		Map<Long, RatingSummary> ratings = loadRatings(restaurants);
		List<RestaurantSummaryDto> summaries = restaurants.stream()
			.map(restaurant -> mapper.toSummary(restaurant, ratingFor(ratings, restaurant)))
			.toList();

		return new MapRestaurantsDto(summaries, total, total > summaries.size());
	}

	/** A handful of well-rated restaurants for the homepage. */
	public List<RestaurantSummaryDto> findFeatured(int limit) {
		List<Restaurant> restaurants = restaurantRepository.findFeatured(PageRequest.of(0, limit));
		Map<Long, RatingSummary> ratings = loadRatings(restaurants);

		return restaurants.stream()
			.map(restaurant -> mapper.toSummary(restaurant, ratingFor(ratings, restaurant)))
			.toList();
	}

	/** One aggregate query for the whole page, instead of one per restaurant. */
	private Map<Long, RatingSummary> loadRatings(List<Restaurant> restaurants) {
		if (restaurants.isEmpty()) {
			return Map.of();
		}
		List<Long> ids = restaurants.stream().map(Restaurant::getId).toList();

		return new HashMap<>(reviewRepository.findRatingSummaries(ids).stream()
			.collect(Collectors.toMap(RatingSummary::restaurantId, Function.identity())));
	}

	/** Unreviewed restaurants are absent from the aggregate query, not zero-rated. */
	private RatingSummary ratingFor(Map<Long, RatingSummary> ratings, Restaurant restaurant) {
		return ratings.getOrDefault(restaurant.getId(), RatingSummary.empty(restaurant.getId()));
	}

}
