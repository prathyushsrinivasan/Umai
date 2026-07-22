package com.umai.backend.restaurant;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

/**
 * Data access for restaurants.
 *
 * <p>Extends {@link JpaSpecificationExecutor} so the search and filter combinations
 * in the next phase can be composed dynamically instead of multiplying query methods.
 */
@Repository
public interface RestaurantRepository extends JpaRepository<Restaurant, Long>, JpaSpecificationExecutor<Restaurant> {

	/**
	 * Search entry point. The area is join-fetched because every card renders it;
	 * categories and tags are batch-loaded instead (see {@code @BatchSize}), since
	 * join-fetching a collection alongside a limit forces in-memory pagination.
	 */
	@Override
	@EntityGraph(attributePaths = "area")
	Page<Restaurant> findAll(Specification<Restaurant> spec, Pageable pageable);

	/** Publicly visible restaurants only. */
	Page<Restaurant> findByStatus(RestaurantStatus status, Pageable pageable);

	Optional<Restaurant> findByIdAndStatus(Long id, RestaurantStatus status);

	/** Used on re-import to update an existing record rather than duplicate it. */
	Optional<Restaurant> findBySourceAndSourceExternalId(RestaurantSource source, String sourceExternalId);

	boolean existsBySourceAndSourceExternalId(RestaurantSource source, String sourceExternalId);

	long countByStatus(RestaurantStatus status);

	/**
	 * Restaurants whose location falls inside a lon/lat bounding box.
	 *
	 * <p>Native SQL because the geometry column is maintained by the database and is
	 * deliberately not mapped on the entity. The {@code &&} operator uses the GiST
	 * index on {@code location}, so panning the map stays cheap as data grows.
	 *
	 * <p>{@code limit} caps how many markers a single viewport can return, so zooming
	 * out cannot pull the whole table into a response.
	 */
	@Query(value = """
			SELECT * FROM restaurants r
			WHERE r.status = 'PUBLISHED'
			  AND r.location && ST_MakeEnvelope(:minLon, :minLat, :maxLon, :maxLat, 4326)
			ORDER BY r.id
			LIMIT :maxResults
			""", nativeQuery = true)
	List<Restaurant> findWithinBoundingBox(
			@Param("minLon") double minLon,
			@Param("minLat") double minLat,
			@Param("maxLon") double maxLon,
			@Param("maxLat") double maxLat,
			@Param("maxResults") int maxResults);

	/** Total matching a bounding box, so the UI can say when results were capped. */
	@Query(value = """
			SELECT count(*) FROM restaurants r
			WHERE r.status = 'PUBLISHED'
			  AND r.location && ST_MakeEnvelope(:minLon, :minLat, :maxLon, :maxLat, 4326)
			""", nativeQuery = true)
	long countWithinBoundingBox(
			@Param("minLon") double minLon,
			@Param("minLat") double minLat,
			@Param("maxLon") double maxLon,
			@Param("maxLat") double maxLat);

	/** Highest-rated published restaurants, for the homepage. Unreviewed ones rank last. */
	@Query("""
			select r from Restaurant r
			left join Review rev on rev.restaurant = r
			where r.status = com.umai.backend.restaurant.RestaurantStatus.PUBLISHED
			group by r
			order by coalesce(avg(rev.rating), 0) desc, count(rev) desc, r.id asc
			""")
	List<Restaurant> findFeatured(Pageable pageable);

}
