package com.umai.backend.integration.google;

import java.time.LocalDate;
import java.time.ZoneOffset;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionTemplate;

/** Atomic, persistent request allowances shared across restarts and replicas. */
@Component
public class ExternalRequestBudget {
    private final JdbcTemplate jdbc;
    private final TransactionTemplate transactions;
    private final GoogleCostProperties limits;

    public ExternalRequestBudget(JdbcTemplate jdbc, TransactionTemplate transactions, GoogleCostProperties limits) {
        this.jdbc = jdbc;
        this.transactions = transactions;
        this.limits = limits;
    }

    public boolean acquire() {
        if (limits.dailyRequests() <= 0 || limits.monthlyRequests() <= 0) return false;
        LocalDate today = LocalDate.now(ZoneOffset.UTC);
        return Boolean.TRUE.equals(transactions.execute(status -> {
            if (!increment("GOOGLE_DAY", today, limits.dailyRequests())
                    || !increment("GOOGLE_MONTH", today.withDayOfMonth(1), limits.monthlyRequests())) {
                status.setRollbackOnly();
                return false;
            }
            return true;
        }));
    }

    private boolean increment(String provider, LocalDate period, int limit) {
        return !jdbc.queryForList("""
            INSERT INTO external_api_usage (provider, period_start, requests) VALUES (?, ?, 1)
            ON CONFLICT (provider, period_start) DO UPDATE
            SET requests = external_api_usage.requests + 1 WHERE external_api_usage.requests < ?
            RETURNING requests
            """, Integer.class, provider, period, limit).isEmpty();
    }
}
