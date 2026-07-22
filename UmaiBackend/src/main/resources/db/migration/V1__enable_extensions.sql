-- Baseline migration: database extensions the application depends on.
--
-- postgis  : geometry column + geospatial indexes for map bounding-box queries.
-- pg_trgm  : trigram indexes for restaurant name/keyword search.
--
-- These are idempotent so they can also run against a database where the
-- Docker init script (UmaiDatabase/init) already created them.

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
