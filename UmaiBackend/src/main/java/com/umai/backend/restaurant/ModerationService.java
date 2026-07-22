package com.umai.backend.restaurant;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.umai.backend.common.exception.ResourceNotFoundException;
import com.umai.backend.common.web.PageResponse;
import com.umai.backend.restaurant.dto.RestaurantDetailDto;
import com.umai.backend.restaurant.dto.RestaurantSummaryDto;
import com.umai.backend.review.RatingSummary;
import com.umai.backend.security.CurrentUser;

/** Approving and rejecting submitted restaurants. */
@Service
@Transactional(readOnly = true)
public class ModerationService {

	private static final Logger log = LoggerFactory.getLogger(ModerationService.class);

	private final RestaurantRepository restaurantRepository;

	private final RestaurantMapper mapper;

	public ModerationService(RestaurantRepository restaurantRepository, RestaurantMapper mapper) {
		this.restaurantRepository = restaurantRepository;
		this.mapper = mapper;
	}

	public PageResponse<RestaurantSummaryDto> findByStatus(RestaurantStatus status, Pageable pageable) {
		Page<Restaurant> page = restaurantRepository.findByStatus(status, pageable);

		// Unpublished restaurants have no reviews worth aggregating; an empty summary
		// keeps the moderation list to a single query.
		return PageResponse.of(page,
			restaurant -> mapper.toSummary(restaurant, RatingSummary.empty(restaurant.getId())));
	}

	public long countPending() {
		return restaurantRepository.countByStatus(RestaurantStatus.PENDING);
	}

	@Transactional
	public RestaurantDetailDto approve(Long id) {
		return transition(id, RestaurantStatus.PUBLISHED);
	}

	@Transactional
	public RestaurantDetailDto reject(Long id) {
		return transition(id, RestaurantStatus.REJECTED);
	}

	private RestaurantDetailDto transition(Long id, RestaurantStatus target) {
		Restaurant restaurant = restaurantRepository.findById(id)
			.orElseThrow(() -> ResourceNotFoundException.of("Restaurant", id));

		RestaurantStatus previous = restaurant.getStatus();
		restaurant.setStatus(target);

		// Moderation decisions change what the public sees, so they are always logged
		// with the account responsible.
		log.info("Restaurant {} moved from {} to {} by user {}",
			id, previous, target, CurrentUser.idOrNull());

		return mapper.toDetail(restaurant, RatingSummary.empty(id));
	}

}
