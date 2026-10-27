package com.umai.backend;

import java.util.List;
import java.util.concurrent.Executors;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import com.umai.backend.support.*;
import com.umai.backend.integration.google.*;
import org.springframework.transaction.support.TransactionTemplate;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@PostgisIntegrationTest
@AutoConfigureMockMvc
class DiscoveryCostIntegrationTests extends AbstractPostgisIntegrationTest {
    @Autowired MockMvc mvc;
    @Autowired JdbcTemplate jdbc;
    @Autowired TransactionTemplate transactions;
    @Autowired com.umai.backend.restaurant.RestaurantReadRepository reads;

    @Test
    @Transactional
    void aCappedSourceCellIsMarkedPartialWhenRefreshAllowanceRunsOut() {
        var imports = org.mockito.Mockito.mock(com.umai.backend.integration.RestaurantImportService.class);
        org.mockito.Mockito.when(imports.importFrom(org.mockito.ArgumentMatchers.anyString(), org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.anyInt()))
            .thenReturn(new com.umai.backend.integration.ImportResult(499,0,0,499,true));
        var settings = new com.umai.backend.integration.RefreshProperties(true,35.5,139.5,35.9,139.95,1,1,java.time.Duration.ofSeconds(1));
        new com.umai.backend.integration.RestaurantRefreshService(jdbc, imports, settings).refresh();
        assertEquals("PARTIAL", jdbc.queryForObject("SELECT status FROM data_refresh_runs ORDER BY id DESC LIMIT 1",String.class));
        org.mockito.Mockito.verify(imports,org.mockito.Mockito.times(1)).importFrom(org.mockito.ArgumentMatchers.anyString(),org.mockito.ArgumentMatchers.any(),org.mockito.ArgumentMatchers.anyInt());
    }

    @Test
    void productionSearchExcludesSamplesAndIncludesTheRealSnapshot() {
        var criteria = new com.umai.backend.restaurant.dto.RestaurantSearchCriteria(null,null,null,null,null,null,null);
        var results = reads.search(criteria, org.springframework.data.domain.PageRequest.of(0,100), false, false);
        assertTrue(results.total() >= 295);
        assertTrue(jdbc.queryForObject("SELECT count(*) FROM restaurants WHERE source='OPENSTREETMAP' AND last_synced_at IS NOT NULL", Long.class) >= 295);
        for (var match : results.rows()) assertNotEquals("SEED", jdbc.queryForObject("SELECT source FROM restaurants WHERE id=?", String.class, match.id()));
    }

    @Test
    @Transactional
    void correctionReportsRequireReviewAndProtectCorrectionsFromFutureImports() throws Exception {
        Long restaurant = jdbc.queryForObject("INSERT INTO restaurants(name,latitude,longitude,vegetarian_type,status,source) VALUES ('Report test',35.7,139.7,'VEGAN_ONLY','PUBLISHED','OPENSTREETMAP') RETURNING id", Long.class);
        Long user = jdbc.queryForObject("INSERT INTO users(username,email,password_hash,role) VALUES ('reporter','reporter@example.com','test','USER') RETURNING id", Long.class);
        Long moderator = jdbc.queryForObject("INSERT INTO users(username,email,password_hash,role) VALUES ('moderator','moderator@example.com','test','MODERATOR') RETURNING id", Long.class);
        var reporter = org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt()
            .jwt(jwt -> jwt.subject(user.toString()).claim("role", "USER"));
        var reviewer = org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt()
            .jwt(jwt -> jwt.subject(moderator.toString()).claim("role", "MODERATOR"))
            .authorities(new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_MODERATOR"));
        mvc.perform(post("/api/v1/restaurants/" + restaurant + "/reports").with(reporter)
            .contentType("application/json").content("{\"type\":\"HOURS\",\"description\":\"Closed on Mondays per official website\"}"))
            .andExpect(status().isAccepted()).andExpect(jsonPath("$.status").value("PENDING"));
        assertNull(jdbc.queryForObject("SELECT opening_hours FROM restaurants WHERE id=?", String.class, restaurant));
        mvc.perform(post("/api/v1/restaurants/" + restaurant + "/reports").with(reporter)
            .contentType("application/json").content("{\"type\":\"HOURS\",\"description\":\"Duplicate report\"}"))
            .andExpect(status().isConflict());
        Long report = jdbc.queryForObject("SELECT id FROM restaurant_reports WHERE restaurant_id=?", Long.class, restaurant);
        mvc.perform(post("/api/v1/admin/reports/" + report + "/resolve").with(reviewer)
            .contentType("application/json").content("{\"action\":\"CORRECT\",\"note\":\"Checked official website\",\"correction\":{\"openingHours\":\"Tu-Su 10:00-18:00\"}}"))
            .andExpect(status().isNoContent());
        // JPA changes flush at transaction commit; flush before inspecting through JDBC.
        entityManager.flush();
        assertEquals("Tu-Su 10:00-18:00", jdbc.queryForObject("SELECT opening_hours FROM restaurants WHERE id=?", String.class, restaurant));
        assertTrue(jdbc.queryForObject("SELECT manually_maintained FROM restaurants WHERE id=?", Boolean.class, restaurant));
        assertEquals("RESOLVED", jdbc.queryForObject("SELECT status FROM restaurant_reports WHERE id=?", String.class, report));
    }

    @Autowired jakarta.persistence.EntityManager entityManager;

    @Test
    @Transactional
    void groupedBrowseCanReachRestaurantsBeyondFiveHundred() throws Exception {
        jdbc.update("""
            INSERT INTO restaurants(name,latitude,longitude,vegetarian_type,status,source)
            SELECT 'cost-regression-' || lpad(n::text,4,'0'),35.7,139.7,'VEGAN_ONLY','PUBLISHED','OPENSTREETMAP'
            FROM generate_series(1,525) n
            """);
        jdbc.update("INSERT INTO restaurants(name,latitude,longitude,vegetarian_type,status,source) VALUES ('cost-regression-0001',35.71,139.71,'VEGAN_ONLY','PUBLISHED','OPENSTREETMAP')");
        mvc.perform(get("/api/v1/restaurants/search").param("keyword","cost-regression-").param("groupByName","true").param("size","24").param("page","21"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(525))
            .andExpect(jsonPath("$.content.length()").value(21)).andExpect(jsonPath("$.last").value(true));
        mvc.perform(get("/api/v1/restaurants/search").param("keyword","cost-regression-").param("groupByName","true"))
            .andExpect(jsonPath("$.content[0].branchCount").value(2));
    }

    @Test
    @Transactional
    void mapFiltersAreAppliedBeforeTheThreeHundredResultLimit() throws Exception {
        jdbc.update("""
            INSERT INTO restaurants(name,latitude,longitude,vegetarian_type,status,source)
            SELECT 'map-limit-' || n,35.55,139.55,'UNKNOWN','PUBLISHED','OPENSTREETMAP' FROM generate_series(1,310) n
            """);
        jdbc.update("INSERT INTO restaurants(name,latitude,longitude,vegetarian_type,status,source) VALUES ('map-target',35.55,139.55,'VEGAN_ONLY','PUBLISHED','OPENSTREETMAP')");
        mvc.perform(get("/api/v1/restaurants/map").param("minLat","35.54").param("maxLat","35.56").param("minLon","139.54").param("maxLon","139.56").param("vegetarianTypes","VEGAN_ONLY"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.totalInBounds").value(1))
            .andExpect(jsonPath("$.restaurants[0].name").value("map-target")).andExpect(jsonPath("$.truncated").value(false));
    }

    @Test
    void anonymousUsersCannotReadReportsOrTriggerRefresh() throws Exception {
        mvc.perform(get("/api/v1/admin/reports")).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/v1/admin/refresh")).andExpect(status().isUnauthorized());
    }

    @Test
    void requestAllowanceIsAtomicAndSharedBetweenInstances() throws Exception {
        jdbc.update("DELETE FROM external_api_usage");
        var first = new ExternalRequestBudget(jdbc, transactions, new GoogleCostProperties(3,3,true));
        var second = new ExternalRequestBudget(jdbc, transactions, new GoogleCostProperties(3,3,true));
        try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
            var calls = new java.util.ArrayList<java.util.concurrent.Future<Boolean>>();
            for (int i=0;i<12;i++) calls.add(executor.submit(i%2==0 ? first::acquire : second::acquire));
            int allowed = 0;
            for (var call : calls) if (call.get()) allowed++;
            assertEquals(3, allowed);
        } finally { jdbc.update("DELETE FROM external_api_usage"); }
    }
}
