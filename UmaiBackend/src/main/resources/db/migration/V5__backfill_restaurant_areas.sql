-- Backfills area_id for restaurants imported before area inference existed.
--
-- Before this migration, only the fictional dev-seed restaurants ever got an
-- area_id — OpenStreetMap almost never tags a Tokyo neighbourhood directly, and
-- the importer (RestaurantImportService) did not derive one from the address until
-- now. This one-time UPDATE applies the same alias matching AreaMatcher.java uses
-- for future imports, so the 295 restaurants frozen into V4 aren't stuck without an
-- area forever. Only touches rows with no area yet; never overwrites one already set.
--
-- Most restaurants have no address at all (OSM coverage is inconsistent), so this
-- only reaches a minority of rows — that's a real data gap, not a bug in this
-- migration, and is expected to improve as more restaurants get an address.

UPDATE restaurants SET area_id = (SELECT id FROM areas WHERE slug = 'shinjuku')
WHERE area_id IS NULL AND address ILIKE '%新宿%';

UPDATE restaurants SET area_id = (SELECT id FROM areas WHERE slug = 'shibuya')
WHERE area_id IS NULL AND address ILIKE '%渋谷%';

UPDATE restaurants SET area_id = (SELECT id FROM areas WHERE slug = 'marunouchi')
WHERE area_id IS NULL AND address ILIKE '%丸の内%';

UPDATE restaurants SET area_id = (SELECT id FROM areas WHERE slug = 'ueno')
WHERE area_id IS NULL AND address ILIKE '%上野%';

UPDATE restaurants SET area_id = (SELECT id FROM areas WHERE slug = 'akihabara')
WHERE area_id IS NULL AND (address ILIKE '%秋葉原%' OR address ILIKE '%外神田%');

UPDATE restaurants SET area_id = (SELECT id FROM areas WHERE slug = 'asakusa')
WHERE area_id IS NULL AND address ILIKE '%浅草%';

UPDATE restaurants SET area_id = (SELECT id FROM areas WHERE slug = 'ikebukuro')
WHERE area_id IS NULL AND address ILIKE '%池袋%';
