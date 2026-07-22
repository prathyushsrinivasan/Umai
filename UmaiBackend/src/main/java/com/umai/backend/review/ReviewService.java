package com.umai.backend.review;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.umai.backend.common.exception.ConflictException;
import com.umai.backend.common.exception.ResourceNotFoundException;
import com.umai.backend.common.web.PageResponse;
import com.umai.backend.restaurant.Restaurant;
import com.umai.backend.restaurant.RestaurantRepository;
import com.umai.backend.restaurant.RestaurantStatus;
import com.umai.backend.review.dto.ReviewDtos.ReviewDto;
import com.umai.backend.review.dto.ReviewDtos.ReviewRequest;
import com.umai.backend.security.CurrentUser;
import com.umai.backend.user.User;
import com.umai.backend.user.UserRole;
import com.umai.backend.user.UserService;

/**
 * Review creation, update, deletion and listing.
 *
 * <p>A user may hold one review per restaurant. Creating a second is rejected rather
 * than silently overwriting, so a duplicate submission is visible to the client and
 * the aggregate rating cannot be skewed by repeat posts.
 */
@Service
@Transactional(readOnly = true)
public class ReviewService {

	private final ReviewRepository reviewRepository;

	private final RestaurantRepository restaurantRepository;

	private final UserService userService;

	public ReviewService(ReviewRepository reviewRepository, RestaurantRepository restaurantRepository,
			UserService userService) {
		this.reviewRepository = reviewRepository;
		this.restaurantRepository = restaurantRepository;
		this.userService = userService;
	}

	public PageResponse<ReviewDto> findForRestaurant(Long restaurantId, Pageable pageable) {
		requirePublishedRestaurant(restaurantId);

		Long currentUserId = CurrentUser.idOrNull();
		Page<Review> page = reviewRepository.findByRestaurantIdOrderByCreatedAtDesc(restaurantId, pageable);

		return PageResponse.of(page, review -> toDto(review, currentUserId));
	}

	@Transactional
	public ReviewDto create(Long restaurantId, ReviewRequest request) {
		Restaurant restaurant = requirePublishedRestaurant(restaurantId);
		Long userId = CurrentUser.requireId();

		if (reviewRepository.existsByUserIdAndRestaurantId(userId, restaurantId)) {
			throw new ConflictException("このお店には既にレビューを投稿しています。編集してください。");
		}

		User user = userService.requireEntity(userId);
		Review review = reviewRepository.save(
			new Review(user, restaurant, request.rating(), normaliseComment(request.comment())));

		return toDto(review, userId);
	}

	@Transactional
	public ReviewDto update(Long restaurantId, Long reviewId, ReviewRequest request) {
		Review review = requireOwnReview(restaurantId, reviewId);

		review.setRating(request.rating());
		review.setComment(normaliseComment(request.comment()));

		return toDto(review, CurrentUser.requireId());
	}

	@Transactional
	public void delete(Long restaurantId, Long reviewId) {
		reviewRepository.delete(requireOwnReview(restaurantId, reviewId));
	}

	/**
	 * Loads a review, confirming it belongs to the given restaurant and that the caller
	 * is allowed to modify it.
	 *
	 * <p>A review belonging to someone else reports 404 rather than 403, so the API
	 * does not confirm the existence of other users' reviews by id.
	 */
	private Review requireOwnReview(Long restaurantId, Long reviewId) {
		Review review = reviewRepository.findById(reviewId)
			.orElseThrow(() -> ResourceNotFoundException.of("Review", reviewId));

		if (!review.getRestaurant().getId().equals(restaurantId)) {
			throw ResourceNotFoundException.of("Review", reviewId);
		}

		Long userId = CurrentUser.requireId();
		boolean isAuthor = review.getUser().getId().equals(userId);
		boolean isAdmin = CurrentUser.hasRole(UserRole.ADMIN);

		if (!isAuthor && !isAdmin) {
			throw new AccessDeniedException("自分のレビューのみ編集・削除できます");
		}

		return review;
	}

	private Restaurant requirePublishedRestaurant(Long restaurantId) {
		return restaurantRepository.findByIdAndStatus(restaurantId, RestaurantStatus.PUBLISHED)
			.orElseThrow(() -> ResourceNotFoundException.of("Restaurant", restaurantId));
	}

	/** Treats a blank comment as no comment, so the column holds null rather than "". */
	private String normaliseComment(String comment) {
		return (comment == null || comment.isBlank()) ? null : comment.trim();
	}

	private ReviewDto toDto(Review review, Long currentUserId) {
		return new ReviewDto(
			review.getId(),
			review.getRestaurant().getId(),
			review.getUser().getId(),
			review.getUser().getUsername(),
			review.getRating(),
			review.getComment(),
			review.getCreatedAt(),
			review.getUpdatedAt(),
			currentUserId != null && currentUserId.equals(review.getUser().getId()));
	}

}
