-- Google rating + a "has this row been enriched yet" flag.
--
-- The app shows Google's star rating when a restaurant has no reviews of its own, so the
-- rating and its count are cached here alongside the place id. Ratings are volatile, so
-- treat these as a periodically-refreshed cache of Google data, not a permanent copy.
--
-- google_enriched replaces the old "google_place_id IS NULL" targeting for the enrichment
-- job: a row is processed exactly once (matched or not, rated or not) and then marked, so
-- re-running is a clean no-op and unmatchable rows are never retried forever. Existing rows
-- default to FALSE so the next enrichment pass backfills their ratings.

ALTER TABLE restaurants ADD COLUMN google_rating DOUBLE PRECISION;
ALTER TABLE restaurants ADD COLUMN google_rating_count INTEGER;
ALTER TABLE restaurants ADD COLUMN google_enriched BOOLEAN NOT NULL DEFAULT FALSE;
