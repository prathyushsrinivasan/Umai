package com.umai.backend.restaurant;

import java.util.List;
import java.util.Map;

import org.springframework.data.domain.Pageable;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import com.umai.backend.restaurant.dto.RestaurantSearchCriteria;

/** Queries identifiers first, so pagination never loads an entire matching dataset. */
@Repository
public class RestaurantReadRepository {
    private final NamedParameterJdbcTemplate jdbc;

    public RestaurantReadRepository(NamedParameterJdbcTemplate jdbc) { this.jdbc = jdbc; }

    public record Match(long id, long branchCount) {}
    public record Matches(List<Match> rows, long total) {}

    public Matches search(RestaurantSearchCriteria criteria, Pageable page, boolean grouped, boolean includeSeed) {
        Query query = filters(criteria, includeSeed);
        String count = grouped ? "count(DISTINCT btrim(r.name))" : "count(*)";
        long total = jdbc.queryForObject("SELECT " + count + " FROM restaurants r WHERE " + query.where(), query.params(), Long.class);
        String column = page.getSort().stream().findFirst().map(order -> switch (order.getProperty()) {
            case "createdAt" -> "created_at";
            case "updatedAt" -> "updated_at";
            default -> "name";
        }).orElse("name");
        String direction = page.getSort().stream().findFirst().map(order -> order.isDescending() ? " DESC" : " ASC").orElse(" ASC");
        String sql;
        if (grouped) {
            sql = """
                WITH ranked AS (
                  SELECT r.id, r.name, r.created_at, r.updated_at,
                    count(*) OVER (PARTITION BY btrim(r.name)) AS branch_count,
                    row_number() OVER (PARTITION BY btrim(r.name) ORDER BY
                      (r.image_url IS NOT NULL AND r.image_url NOT LIKE '/api/v1/restaurants/%%') DESC,
                      coalesce((SELECT avg(rev.rating) FROM reviews rev WHERE rev.restaurant_id = r.id), 0) DESC,
                      r.id) AS position
                  FROM restaurants r WHERE %s
                )
                SELECT id, branch_count FROM ranked WHERE position = 1
                ORDER BY %s%s, id ASC LIMIT :limit OFFSET :offset
                """.formatted(query.where(), column, direction);
        } else {
            sql = "SELECT r.id, 1 AS branch_count FROM restaurants r WHERE " + query.where()
                + " ORDER BY r." + column + direction + ", r.id ASC LIMIT :limit OFFSET :offset";
        }
        query.params().addValue("limit", page.getPageSize()).addValue("offset", page.getOffset());
        return new Matches(jdbc.query(sql, query.params(), (rs, row) -> new Match(rs.getLong("id"), rs.getLong("branch_count"))), total);
    }

    public Matches map(MapBounds bounds, RestaurantSearchCriteria criteria, int limit, boolean includeSeed) {
        Query query = filters(criteria, includeSeed);
        String where = query.where() + " AND r.location && ST_MakeEnvelope(:west, :south, :east, :north, 4326)";
        query.params().addValue("west", bounds.minLon()).addValue("south", bounds.minLat())
            .addValue("east", bounds.maxLon()).addValue("north", bounds.maxLat()).addValue("limit", limit);
        long total = jdbc.queryForObject("SELECT count(*) FROM restaurants r WHERE " + where, query.params(), Long.class);
        List<Match> rows = jdbc.query("SELECT r.id FROM restaurants r WHERE " + where + " ORDER BY r.id LIMIT :limit",
            query.params(), (rs, row) -> new Match(rs.getLong("id"), 1));
        return new Matches(rows, total);
    }

    private record Query(String where, MapSqlParameterSource params) {}

    private Query filters(RestaurantSearchCriteria criteria, boolean includeSeed) {
        var params = new MapSqlParameterSource();
        var where = new StringBuilder("r.status = 'PUBLISHED'");
        if (!includeSeed) where.append(" AND r.source <> 'SEED'");
        if (criteria.hasKeyword()) {
            String escaped = criteria.keyword().toLowerCase(java.util.Locale.ROOT)
                .replace("!", "!!").replace("%", "!%").replace("_", "!_");
            params.addValue("keyword", "%" + escaped + "%");
            where.append("""
                 AND r.id IN (
                   SELECT k.id FROM restaurants k WHERE lower(k.name) LIKE :keyword ESCAPE '!'
                   UNION SELECT k.id FROM restaurants k WHERE lower(k.description) LIKE :keyword ESCAPE '!'
                   UNION SELECT k.id FROM restaurants k WHERE lower(k.address) LIKE :keyword ESCAPE '!'
                   UNION SELECT k.id FROM restaurants k JOIN areas a ON a.id=k.area_id WHERE lower(a.name_ja) LIKE :keyword ESCAPE '!'
                 )
                """);
        }
        if (!criteria.vegetarianTypes().isEmpty()) {
            where.append(" AND r.vegetarian_type IN (:diets)");
            params.addValue("diets", criteria.vegetarianTypes().stream().map(Enum::name).toList());
        }
        if (!criteria.priceRanges().isEmpty()) {
            where.append(" AND r.price_range IN (:prices)");
            params.addValue("prices", criteria.priceRanges().stream().map(Enum::name).toList());
        }
        if (!criteria.areaSlugs().isEmpty()) {
            where.append(" AND EXISTS (SELECT 1 FROM areas a WHERE a.id = r.area_id AND a.slug IN (:areas))");
            params.addValue("areas", criteria.areaSlugs());
        }
        if (!criteria.categorySlugs().isEmpty()) {
            where.append(" AND EXISTS (SELECT 1 FROM restaurant_categories rc JOIN categories c ON c.id = rc.category_id WHERE rc.restaurant_id = r.id AND c.slug IN (:categories))");
            params.addValue("categories", criteria.categorySlugs());
        }
        for (int index = 0; index < criteria.tagSlugs().size(); index++) {
            where.append(" AND EXISTS (SELECT 1 FROM restaurant_tags rt JOIN tags t ON t.id = rt.tag_id WHERE rt.restaurant_id = r.id AND t.slug = :tag" + index + ")");
            params.addValue("tag" + index, criteria.tagSlugs().get(index));
        }
        if (criteria.hasRatingFilter()) {
            where.append(" AND (SELECT avg(rev.rating) FROM reviews rev WHERE rev.restaurant_id = r.id) >= :rating");
            params.addValue("rating", criteria.minRating());
        }
        return new Query(where.toString(), params);
    }
}
