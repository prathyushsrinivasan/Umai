-- Reference / lookup data: areas, cuisine categories, and tags.
--
-- These are NOT development seed data — they are the fixed vocabulary the whole
-- application (and the OpenStreetMap importer's category mapping) depends on, so
-- they belong in a permanent migration rather than the optional dev seed. Moving
-- them here means a production database, or a freshly recreated volume, has a
-- working set of areas/categories/tags without loading any fictional restaurants.
--
-- Upserts (ON CONFLICT) so this applies cleanly to a database that already has these
-- rows from the earlier development seed. As a versioned migration it runs once and
-- is immutable; add or change lookup rows in a later migration, never by editing this
-- one.

-- ---------------------------------------------------------------------------
-- areas — Tokyo districts used by the エリア filter
-- ---------------------------------------------------------------------------
INSERT INTO areas (slug, name_ja, display_order)
VALUES ('shinjuku', '新宿', 10),
       ('shibuya', '渋谷', 20),
       ('marunouchi', '東京・丸の内', 30),
       ('ueno', '上野', 40),
       ('akihabara', '秋葉原', 50),
       ('asakusa', '浅草', 60),
       ('ikebukuro', '池袋', 70)
ON CONFLICT (slug) DO UPDATE
    SET name_ja       = EXCLUDED.name_ja,
        display_order = EXCLUDED.display_order,
        updated_at    = now();

-- ---------------------------------------------------------------------------
-- categories — cuisine genres. The OpenStreetMap importer maps onto these slugs
-- (see OsmTagMapper), so they must exist for imported restaurants to be classified.
-- ---------------------------------------------------------------------------
INSERT INTO categories (slug, name_ja, description, display_order)
VALUES ('washoku', '和食', '定食、精進料理、そばなどの日本料理。', 10),
       ('indian', 'インド料理', 'カレーやベジタリアン向けの南アジア料理。', 20),
       ('cafe', 'カフェ', '軽食やスイーツを楽しめるカフェ。', 30),
       ('ramen', 'ラーメン', '動物性食材を使わないスープのラーメンなど。', 40),
       ('yoshoku', '洋食', 'パスタ、バーガーなどの洋風料理。', 50),
       ('chuka', '中華', '中華料理。素菜（ベジタリアン中華）を含む。', 60),
       ('other', 'その他', '上記に当てはまらないジャンル。', 900)
ON CONFLICT (slug) DO UPDATE
    SET name_ja       = EXCLUDED.name_ja,
        description   = EXCLUDED.description,
        display_order = EXCLUDED.display_order,
        updated_at    = now();

-- ---------------------------------------------------------------------------
-- tags — free-form extensible labels
-- ---------------------------------------------------------------------------
INSERT INTO tags (slug, name_ja)
VALUES ('gluten-free', 'グルテンフリー対応'),
       ('takeout', 'テイクアウト可'),
       ('english-menu', '英語メニューあり'),
       ('halal', 'ハラル対応'),
       ('organic', 'オーガニック食材'),
       ('non-smoking', '全席禁煙')
ON CONFLICT (slug) DO UPDATE
    SET name_ja    = EXCLUDED.name_ja,
        updated_at = now();
