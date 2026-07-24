package com.umai.backend.restaurant;

import java.util.List;

import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;

import org.springframework.data.jpa.domain.Specification;

import com.umai.backend.restaurant.dto.RestaurantSearchCriteria;

/**
 * Composable predicates for restaurant search.
 *
 * <p>Filters are built dynamically rather than as a repository method per combination:
 * the screen offers keyword, diet, cuisine, tag, area and price filters that can be
 * used in any mix.
 */
public final class RestaurantSpecifications {

	private RestaurantSpecifications() {
	}

	/** Restricts results to publicly visible listings. */
	public static Specification<Restaurant> isPublished() {
		return (root, query, cb) -> cb.equal(root.get("status"), RestaurantStatus.PUBLISHED);
	}

	/**
	 * Case-insensitive partial match across name, description, address, and area name.
	 *
	 * <p>Uses LIKE with a leading wildcard, which the pg_trgm GIN indexes on those
	 * columns can serve. Japanese has no word boundaries, so substring matching is the
	 * right default here. The area join is left (not inner) so a restaurant with no
	 * area assigned yet still matches on its other fields rather than being dropped.
	 */
	public static Specification<Restaurant> matchesKeyword(String keyword) {
		return (root, query, cb) -> {
			// Escape LIKE metacharacters so user input cannot alter the pattern.
			String escaped = keyword
				.replace("!", "!!")
				.replace("%", "!%")
				.replace("_", "!_");
			String pattern = "%" + escaped.toLowerCase() + "%";

			var area = root.join("area", JoinType.LEFT);

			return cb.or(
				cb.like(cb.lower(root.get("name")), pattern, '!'),
				cb.like(cb.lower(root.get("description")), pattern, '!'),
				cb.like(cb.lower(root.get("address")), pattern, '!'),
				cb.like(cb.lower(area.get("nameJa")), pattern, '!'));
		};
	}

	public static Specification<Restaurant> hasVegetarianTypeIn(List<VegetarianType> types) {
		return (root, query, cb) -> root.get("vegetarianType").in(types);
	}

	public static Specification<Restaurant> hasPriceRangeIn(List<PriceRange> priceRanges) {
		return (root, query, cb) -> root.get("priceRange").in(priceRanges);
	}

	public static Specification<Restaurant> hasAreaSlugIn(List<String> areaSlugs) {
		return (root, query, cb) -> root.join("area", JoinType.INNER).get("slug").in(areaSlugs);
	}

	/** Matches restaurants belonging to any of the given cuisine genres. */
	public static Specification<Restaurant> hasAnyCategorySlug(List<String> categorySlugs) {
		return (root, query, cb) -> {
			// A join multiplies rows when a restaurant has several categories.
			if (query != null) {
				query.distinct(true);
			}
			return root.join("categories", JoinType.INNER).get("slug").in(categorySlugs);
		};
	}

	/**
	 * Matches restaurants carrying <em>all</em> the given tags.
	 *
	 * <p>Tags narrow a search ("gluten-free AND takeout"), unlike categories where
	 * selecting several genres broadens it.
	 */
	public static Specification<Restaurant> hasAllTagSlugs(List<String> tagSlugs) {
		return (root, query, cb) -> {
			Predicate[] predicates = tagSlugs.stream()
				.map(slug -> {
					// A separate correlated subquery per tag, so the conditions are AND-ed.
					var subquery = query == null ? null : query.subquery(Long.class);
					if (subquery == null) {
						return cb.conjunction();
					}
					var tagRoot = subquery.correlate(root).join("tags", JoinType.INNER);
					subquery.select(cb.literal(1L)).where(cb.equal(tagRoot.get("slug"), slug));
					return cb.exists(subquery);
				})
				.toArray(Predicate[]::new);

			return cb.and(predicates);
		};
	}

	/**
	 * Matches restaurants whose mean review rating is at least {@code minRating}.
	 *
	 * <p>Expressed as a correlated subquery so the filter is applied in SQL and
	 * pagination stays correct — filtering after fetching a page would return short
	 * pages and wrong totals.
	 *
	 * <p>Restaurants with no reviews have a null average and are therefore excluded,
	 * which is the intended reading of "rated at least N".
	 */
	public static Specification<Restaurant> hasMinimumAverageRating(double minRating) {
		return (root, query, cb) -> {
			if (query == null) {
				return cb.conjunction();
			}
			var subquery = query.subquery(Double.class);
			var review = subquery.from(com.umai.backend.review.Review.class);
			subquery.select(cb.avg(review.get("rating")));
			subquery.where(cb.equal(review.get("restaurant"), root));
			return cb.greaterThanOrEqualTo(subquery, minRating);
		};
	}

	/** Builds the combined specification for a set of criteria. */
	public static Specification<Restaurant> from(RestaurantSearchCriteria criteria) {
		Specification<Restaurant> spec = isPublished();

		if (criteria.hasKeyword()) {
			spec = spec.and(matchesKeyword(criteria.keyword()));
		}
		if (!criteria.vegetarianTypes().isEmpty()) {
			spec = spec.and(hasVegetarianTypeIn(criteria.vegetarianTypes()));
		}
		if (!criteria.priceRanges().isEmpty()) {
			spec = spec.and(hasPriceRangeIn(criteria.priceRanges()));
		}
		if (!criteria.areaSlugs().isEmpty()) {
			spec = spec.and(hasAreaSlugIn(criteria.areaSlugs()));
		}
		if (!criteria.categorySlugs().isEmpty()) {
			spec = spec.and(hasAnyCategorySlug(criteria.categorySlugs()));
		}
		if (!criteria.tagSlugs().isEmpty()) {
			spec = spec.and(hasAllTagSlugs(criteria.tagSlugs()));
		}
		if (criteria.hasRatingFilter()) {
			spec = spec.and(hasMinimumAverageRating(criteria.minRating()));
		}

		return spec;
	}

}
