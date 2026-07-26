-- Anchors each restaurant to its Google Places record.
--
-- Google's Maps Platform terms allow storing a place_id indefinitely (unlike photos and
-- most other place fields, which must be fetched live). Keeping it lets the app resolve a
-- restaurant to Google once, then fetch photos on demand and re-run detail enrichment
-- cheaply without repeating the name+location search.
--
-- Nullable: a restaurant is unmatched until the admin Google enrichment runs, and some
-- may never match. Indexed so "not yet matched" scans and lookups by id stay cheap.

ALTER TABLE restaurants ADD COLUMN google_place_id VARCHAR(128);

CREATE INDEX idx_restaurants_google_place_id ON restaurants (google_place_id);
