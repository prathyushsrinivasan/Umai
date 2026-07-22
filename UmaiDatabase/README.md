# UmaiDatabase

Database provisioning for the Umai application.

## What lives where

| Concern | Owner | Location |
| --- | --- | --- |
| Extensions, cluster setup | Docker init scripts | `init/*.sql` |
| Application schema (tables, indexes, constraints) | Flyway | `UmaiBackend/src/main/resources/db/migration` |

## Schema overview

```
users ──────────┐
                │ submitted_by_user_id (nullable)
areas ──────┐   │
            ▼   ▼
        restaurants ──< restaurant_categories >── categories
            │  ▲
            │  └────── < restaurant_tags >────── tags
            │
            └──< reviews >── users
```

Design notes:

- **`vegetarian_type` is a column, not a category.** Exactly one classification applies
  per restaurant, and `UNKNOWN` is a real value — imported data is often ambiguous and
  we never guess. Cuisine genres are the many-valued axis and live in `categories`.
- **`location` is a generated column.** PostgreSQL derives
  `geometry(Point, 4326)` from `longitude`/`latitude`, so geometry can never drift from
  the coordinates the application writes. It carries a GiST index for bounding-box and
  radius queries.
- **Ratings are never stored.** Aggregates are computed from `reviews`, so a displayed
  score cannot disagree with the reviews behind it. `uq_reviews_user_restaurant` keeps
  it to one review per user per restaurant.
- **Closed sets** (`status`, `role`, `vegetarian_type`, `price_range`, `source`) are
  `VARCHAR` + `CHECK`, mapped to Java enums. **Open sets** (areas, categories, tags) are
  lookup tables so they extend without a schema change.
- **`source` + `source_external_id`** are uniquely indexed together, so re-importing
  OpenStreetMap data updates rows instead of duplicating them.

## Seed data

`R__seed_development_data.sql` lives in `classpath:db/seed`, a separate Flyway location.
Every restaurant in it is **fictional**, marked `source = 'SEED'`, and carries a visible
「開発用サンプルデータ」 note in its description.

Production must exclude it:

```
FLYWAY_LOCATIONS=classpath:db/migration
```

## Init scripts

`init/` scripts are executed **once**, by the `postgis/postgis` image, as superuser,
the first time the data volume is created. They are not re-run on later startups —
if you change them, recreate the volume:

```bash
docker compose down -v && docker compose up -d db
```

Schema changes must always go into a new Flyway migration, never into `init/`.

## Connecting manually

```bash
docker compose exec db psql -U umai -d umai
```

## Running without Docker

Install PostgreSQL 16+ with the PostGIS extension, create the database and role,
then run `init/01-extensions.sql` against it as a superuser. The backend's Flyway
migrations handle everything after that.
