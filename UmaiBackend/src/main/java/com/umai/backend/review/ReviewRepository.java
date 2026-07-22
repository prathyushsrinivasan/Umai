package com.umai.backend.review;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface ReviewRepository extends JpaRepository<Review, Long> {

	Page<Review> findByRestaurantIdOrderByCreatedAtDesc(Long restaurantId, Pageable pageable);

	/** A user has at most one review per restaurant; this finds it for update. */
	Optional<Review> findByUserIdAndRestaurantId(Long userId, Long restaurantId);

	boolean existsByUserIdAndRestaurantId(Long userId, Long restaurantId);

	/**
	 * Aggregate ratings for several restaurants in one query, so list pages do not
	 * issue a rating query per row.
	 *
	 * <p>Restaurants without reviews are absent from the result rather than returned
	 * with a zero average — callers should fall back to {@link RatingSummary#empty}.
	 */
	@Query("""
			select new com.umai.backend.review.RatingSummary(
			    r.restaurant.id, avg(r.rating), count(r))
			from Review r
			where r.restaurant.id in :restaurantIds
			group by r.restaurant.id
			""")
	List<RatingSummary> findRatingSummaries(@Param("restaurantIds") Collection<Long> restaurantIds);

	@Query("""
			select new com.umai.backend.review.RatingSummary(
			    r.restaurant.id, avg(r.rating), count(r))
			from Review r
			where r.restaurant.id = :restaurantId
			group by r.restaurant.id
			""")
	Optional<RatingSummary> findRatingSummary(@Param("restaurantId") Long restaurantId);

}
