-- =============================================================================
-- DEVELOPMENT SEED DATA — NOT FOR PRODUCTION
--
-- Every restaurant below is FICTIONAL. The names, descriptions, phone numbers and
-- opening hours were invented for development and do not describe real businesses.
-- Coordinates are real Tokyo locations only so the map renders sensibly.
--
-- Seeded restaurants are marked `source = 'SEED'` so they are trivial to identify
-- and remove, and each description carries a visible 「開発用サンプルデータ」 note so
-- fictional data can never be mistaken for real listings in the UI.
--
-- This file lives in `classpath:db/seed`, which is included in FLYWAY_LOCATIONS by
-- default for local development. Production must set FLYWAY_LOCATIONS to
-- `classpath:db/migration` alone. See README.
--
-- It is a *repeatable* migration: Flyway re-runs it whenever its checksum changes.
-- Lookup rows are upserted (preserving ids and foreign keys); seed restaurants are
-- replaced wholesale, which also discards any reviews attached to them.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- areas
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
-- categories (cuisine genres)
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
-- tags
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

-- ---------------------------------------------------------------------------
-- restaurants
--
-- Coverage is deliberately uneven: several entries omit website, phone, opening
-- hours or price range so the UI's missing-data handling is exercised by default.
-- image_url is NULL throughout — we have no licensed photography for fictional
-- restaurants, and inventing image URLs would render as broken images.
-- ---------------------------------------------------------------------------
DELETE FROM restaurants WHERE source = 'SEED';

INSERT INTO restaurants (name, description, address, latitude, longitude,
                         vegetarian_type, price_range, status, source, source_external_id,
                         website_url, phone, opening_hours, area_id)
SELECT v.name,
       v.description,
       v.address,
       v.latitude,
       v.longitude,
       v.vegetarian_type,
       v.price_range,
       'PUBLISHED',
       'SEED',
       v.source_external_id,
       v.website_url,
       v.phone,
       v.opening_hours,
       a.id
FROM (
    VALUES
    -- 新宿
    ('みどりの木キッチン'::varchar,
     '野菜と豆を中心にした完全ヴィーガンの定食屋。日替わりのプレートが人気です。（開発用サンプルデータ）'::text,
     '東京都新宿区西新宿1-1-1'::varchar,
     35.6896::double precision, 139.7006::double precision,
     'VEGAN_ONLY'::varchar, 'MODERATE'::varchar, 'seed-shinjuku-01'::varchar,
     'https://example.com/midorinoki'::varchar, '03-0000-0001'::varchar,
     '月〜金 11:00-15:00, 17:00-21:00 / 土日 11:00-20:00'::text, 'shinjuku'::varchar),

    ('新宿ベジ食堂',
     '肉と魚を使わない定食を提供する食堂。学生にも通いやすい価格帯です。（開発用サンプルデータ）',
     '東京都新宿区新宿3-2-2',
     35.6910, 139.7040,
     'VEGETARIAN_FRIENDLY', 'BUDGET', 'seed-shinjuku-02',
     NULL, '03-0000-0002', '11:00-22:00（水曜定休）', 'shinjuku'),

    -- 渋谷
    ('そらまめカフェ',
     '豆乳スイーツとヴィーガンランチが楽しめるカフェ。テラス席あり。（開発用サンプルデータ）',
     '東京都渋谷区道玄坂2-3-3',
     35.6580, 139.6990,
     'VEGAN_FRIENDLY', 'MODERATE', 'seed-shibuya-01',
     'https://example.com/soramame', NULL, '9:00-19:00', 'shibuya'),

    ('渋谷スパイスハウス',
     '南インドのベジタリアン料理専門店。ミールスとドーサが看板メニュー。（開発用サンプルデータ）',
     '東京都渋谷区渋谷1-4-4',
     35.6595, 139.7030,
     'VEGETARIAN_ONLY', 'MODERATE', 'seed-shibuya-02',
     'https://example.com/spicehouse', '03-0000-0004', '11:30-15:00, 17:30-22:00', 'shibuya'),

    -- 東京・丸の内
    ('丸の内グリーンテーブル',
     '季節の野菜を使ったコース料理。ヴィーガン対応メニューを事前予約できます。（開発用サンプルデータ）',
     '東京都千代田区丸の内2-5-5',
     35.6812, 139.7671,
     'VEGAN_FRIENDLY', 'EXPENSIVE', 'seed-marunouchi-01',
     'https://example.com/greentable', '03-0000-0005',
     '月〜金 11:00-14:30, 17:30-22:00 / 土日祝休', 'marunouchi'),

    ('東京菜園ラーメン',
     '動物性食材を一切使わない野菜だしのラーメン店。替え玉無料。（開発用サンプルデータ）',
     '東京都千代田区丸の内1-6-6',
     35.6800, 139.7650,
     'VEGAN_ONLY', 'BUDGET', 'seed-marunouchi-02',
     NULL, NULL, '11:00-21:00', 'marunouchi'),

    -- 上野
    ('上野やさい亭',
     '下町の雰囲気が残る野菜中心の定食屋。（開発用サンプルデータ）',
     '東京都台東区上野4-7-7',
     35.7138, 139.7770,
     'VEGETARIAN_FRIENDLY', NULL, 'seed-ueno-01',
     NULL, NULL, NULL, 'ueno'),

    ('蓮の花ベジタリアン',
     '素菜（ベジタリアン中華）の専門店。点心も豊富です。（開発用サンプルデータ）',
     '東京都台東区上野2-8-8',
     35.7120, 139.7745,
     'VEGETARIAN_ONLY', 'MODERATE', 'seed-ueno-02',
     'https://example.com/hasunohana', '03-0000-0008', '11:00-15:00, 17:00-21:30', 'ueno'),

    -- 秋葉原
    ('秋葉原ヴィーガンバーガー',
     '大豆ミートを使ったバーガー専門店。テイクアウト中心。（開発用サンプルデータ）',
     '東京都千代田区外神田1-9-9',
     35.6984, 139.7731,
     'VEGAN_ONLY', 'BUDGET', 'seed-akihabara-01',
     'https://example.com/akibaburger', '03-0000-0009', '11:00-20:00', 'akihabara'),

    ('電気街カフェ 芽',
     'ヴィーガン対応のケーキとコーヒーが楽しめる小さなカフェ。（開発用サンプルデータ）',
     '東京都千代田区外神田3-10-10',
     35.7000, 139.7715,
     'VEGAN_FRIENDLY', 'BUDGET', 'seed-akihabara-02',
     NULL, NULL, '10:00-19:00（火曜定休）', 'akihabara'),

    -- 浅草
    ('浅草精進茶屋',
     '伝統的な精進料理をいただける和食店。観光の合間にも。（開発用サンプルデータ）',
     '東京都台東区浅草2-11-11',
     35.7148, 139.7967,
     'VEGETARIAN_ONLY', 'MODERATE', 'seed-asakusa-01',
     'https://example.com/shojinchaya', '03-0000-0011', '11:00-18:00', 'asakusa'),

    ('雷門ベジ天ぷら',
     '野菜天ぷらのコースが評判の店。ヴィーガン対応のつゆを用意。（開発用サンプルデータ）',
     '東京都台東区浅草1-12-12',
     35.7110, 139.7955,
     'VEGAN_FRIENDLY', 'EXPENSIVE', 'seed-asakusa-02',
     NULL, '03-0000-0012', '17:00-22:00（日曜定休）', 'asakusa'),

    -- 池袋
    ('池袋グリーンヌードル',
     '米粉麺を使ったグルテンフリーのラーメンが看板。（開発用サンプルデータ）',
     '東京都豊島区西池袋1-13-13',
     35.7295, 139.7109,
     'VEGAN_FRIENDLY', 'BUDGET', 'seed-ikebukuro-01',
     'https://example.com/greennoodle', NULL, '11:00-21:00', 'ikebukuro'),

    ('サンシャイン野菜キッチン',
     '産地直送の野菜を使ったビュッフェ。ベジタリアン向けの品数が豊富。（開発用サンプルデータ）',
     '東京都豊島区東池袋3-14-14',
     35.7280, 139.7190,
     'VEGETARIAN_FRIENDLY', 'MODERATE', 'seed-ikebukuro-02',
     'https://example.com/sunshinekitchen', '03-0000-0014', '11:00-22:00', 'ikebukuro')
) AS v(name, description, address, latitude, longitude,
       vegetarian_type, price_range, source_external_id,
       website_url, phone, opening_hours, area_slug)
LEFT JOIN areas a ON a.slug = v.area_slug;

-- ---------------------------------------------------------------------------
-- restaurant ↔ category links
-- ---------------------------------------------------------------------------
INSERT INTO restaurant_categories (restaurant_id, category_id)
SELECT r.id, c.id
FROM (
    VALUES ('seed-shinjuku-01'::varchar, 'washoku'::varchar),
           ('seed-shinjuku-01', 'cafe'),
           ('seed-shinjuku-02', 'washoku'),
           ('seed-shibuya-01', 'cafe'),
           ('seed-shibuya-02', 'indian'),
           ('seed-marunouchi-01', 'yoshoku'),
           ('seed-marunouchi-02', 'ramen'),
           ('seed-ueno-01', 'washoku'),
           ('seed-ueno-02', 'chuka'),
           ('seed-akihabara-01', 'yoshoku'),
           ('seed-akihabara-02', 'cafe'),
           ('seed-asakusa-01', 'washoku'),
           ('seed-asakusa-02', 'washoku'),
           ('seed-ikebukuro-01', 'ramen'),
           ('seed-ikebukuro-02', 'other')
) AS v(source_external_id, category_slug)
JOIN restaurants r ON r.source = 'SEED' AND r.source_external_id = v.source_external_id
JOIN categories c ON c.slug = v.category_slug
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- restaurant ↔ tag links
-- ---------------------------------------------------------------------------
INSERT INTO restaurant_tags (restaurant_id, tag_id)
SELECT r.id, t.id
FROM (
    VALUES ('seed-shinjuku-01'::varchar, 'organic'::varchar),
           ('seed-shinjuku-01', 'english-menu'),
           ('seed-shibuya-01', 'non-smoking'),
           ('seed-shibuya-02', 'halal'),
           ('seed-shibuya-02', 'english-menu'),
           ('seed-marunouchi-01', 'organic'),
           ('seed-marunouchi-02', 'takeout'),
           ('seed-ueno-02', 'english-menu'),
           ('seed-akihabara-01', 'takeout'),
           ('seed-akihabara-01', 'gluten-free'),
           ('seed-akihabara-02', 'non-smoking'),
           ('seed-asakusa-01', 'english-menu'),
           ('seed-ikebukuro-01', 'gluten-free'),
           ('seed-ikebukuro-01', 'takeout'),
           ('seed-ikebukuro-02', 'non-smoking')
) AS v(source_external_id, tag_slug)
JOIN restaurants r ON r.source = 'SEED' AND r.source_external_id = v.source_external_id
JOIN tags t ON t.slug = v.tag_slug
ON CONFLICT DO NOTHING;
