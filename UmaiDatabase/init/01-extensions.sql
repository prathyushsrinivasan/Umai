-- Runs once, as superuser, when the PostgreSQL data directory is first created
-- (mounted into /docker-entrypoint-initdb.d by Docker Compose).
--
-- Only cluster-level provisioning belongs here. The application schema itself is
-- owned by Flyway migrations in UmaiBackend/src/main/resources/db/migration.

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
