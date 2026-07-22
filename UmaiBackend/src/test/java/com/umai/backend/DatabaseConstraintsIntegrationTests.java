package com.umai.backend;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.transaction.annotation.Transactional;

import com.umai.backend.restaurant.Restaurant;
import com.umai.backend.restaurant.RestaurantRepository;
import com.umai.backend.restaurant.RestaurantSource;
import com.umai.backend.restaurant.VegetarianType;
import com.umai.backend.review.Review;
import com.umai.backend.review.ReviewRepository;
import com.umai.backend.support.AbstractPostgisIntegrationTest;
import com.umai.backend.support.PostgisIntegrationTest;
import com.umai.backend.user.User;
import com.umai.backend.user.UserRepository;
import com.umai.backend.user.UserRole;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Confirms the database rejects invalid data on its own, independently of any
 * application-level validation that could be bypassed.
 */
@PostgisIntegrationTest
@Transactional
class DatabaseConstraintsIntegrationTests extends AbstractPostgisIntegrationTest {

	@Autowired
	private RestaurantRepository restaurantRepository;

	@Autowired
	private UserRepository userRepository;

	@Autowired
	private ReviewRepository reviewRepository;

	@Test
	@DisplayName("a rating outside 1-5 is rejected")
	void ratingOutsideRangeIsRejected() {
		User user = newUser("reviewer1", "reviewer1@example.com");
		Restaurant restaurant = newRestaurant("テスト店1");

		Review invalid = new Review(user, restaurant, (short) 6, "範囲外の評価");

		assertThatThrownBy(() -> reviewRepository.saveAndFlush(invalid))
			.isInstanceOf(DataIntegrityViolationException.class);
	}

	@Test
	@DisplayName("a user cannot review the same restaurant twice")
	void duplicateReviewIsRejected() {
		User user = newUser("reviewer2", "reviewer2@example.com");
		Restaurant restaurant = newRestaurant("テスト店2");

		reviewRepository.saveAndFlush(new Review(user, restaurant, (short) 4, "おいしい"));
		Review duplicate = new Review(user, restaurant, (short) 5, "もう一度");

		assertThatThrownBy(() -> reviewRepository.saveAndFlush(duplicate))
			.isInstanceOf(DataIntegrityViolationException.class);
	}

	@Test
	@DisplayName("an out-of-range latitude is rejected")
	void invalidCoordinatesAreRejected() {
		Restaurant invalid = new Restaurant("座標が不正な店", 120.0, 139.7, VegetarianType.UNKNOWN,
			RestaurantSource.USER_SUBMISSION);

		assertThatThrownBy(() -> restaurantRepository.saveAndFlush(invalid))
			.isInstanceOf(DataIntegrityViolationException.class);
	}

	@Test
	@DisplayName("email uniqueness ignores case")
	void emailUniquenessIsCaseInsensitive() {
		newUser("taro", "Taro@example.com");
		User clash = new User("taro2", "taro@example.com", "hash", UserRole.USER);

		assertThatThrownBy(() -> userRepository.saveAndFlush(clash))
			.isInstanceOf(DataIntegrityViolationException.class);
	}

	@Test
	@DisplayName("aggregate ratings are computed from review rows")
	void ratingSummaryIsDerivedFromReviews() {
		Restaurant restaurant = newRestaurant("評価集計テスト店");
		reviewRepository.saveAndFlush(new Review(newUser("r1", "r1@example.com"), restaurant, (short) 5, null));
		reviewRepository.saveAndFlush(new Review(newUser("r2", "r2@example.com"), restaurant, (short) 3, null));

		var summary = reviewRepository.findRatingSummary(restaurant.getId()).orElseThrow();

		assertThat(summary.reviewCount()).isEqualTo(2L);
		assertThat(summary.averageRating()).isEqualTo(4.0);
	}

	@Test
	@DisplayName("a restaurant with no reviews has no rating summary")
	void unreviewedRestaurantHasNoSummary() {
		Restaurant restaurant = newRestaurant("未評価の店");

		assertThat(reviewRepository.findRatingSummary(restaurant.getId())).isEmpty();
	}

	private User newUser(String username, String email) {
		return userRepository.saveAndFlush(new User(username, email, "not-a-real-hash", UserRole.USER));
	}

	private Restaurant newRestaurant(String name) {
		return restaurantRepository.saveAndFlush(
			new Restaurant(name, 35.68, 139.76, VegetarianType.VEGAN_FRIENDLY, RestaurantSource.USER_SUBMISSION));
	}

}
