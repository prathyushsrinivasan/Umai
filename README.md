# Umai — 東京ベジタリアン・ヴィーガン レストラン検索

A Japanese-language web application for discovering vegetarian and vegan-friendly
restaurants in Tokyo: map browsing, keyword search, category filters, reviews and
user-submitted restaurants.

> **Status: all 10 phases implemented.**
> Browsing, search, map, accounts, reviews, submission and OpenStreetMap import are
> in place. See [ISSUES.md](ISSUES.md) for known gaps and the work that remains —
> most importantly, **the database-backed test suite has never been executed**.

## Stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS v4, Motion, React Router |
| Map | Leaflet + OpenStreetMap *(wired up in Phase 6)* |
| Backend | Java 21, Spring Boot 4, Spring Data JPA, Spring Security |
| Database | PostgreSQL 16 + PostGIS 3.4 |
| Migrations | Flyway |
| Containers | Docker Compose |

## Repository layout

```
UmaiFrontend/     React + TypeScript + Vite frontend
UmaiBackend/      Spring Boot REST API (Flyway migrations live here)
UmaiDatabase/     Database provisioning (extensions, docs)
docker-compose.yml
.env.example
```

## Prerequisites

- Docker Desktop (Compose v2)
- Node.js 20+ and npm
- JDK 21+ *(only needed to run the backend outside Docker; the Maven wrapper handles Maven)*

## Getting started

### 1. Configure environment

```bash
cp .env.example .env
```

Then edit `.env` and set `POSTGRES_PASSWORD` — it has no default and startup fails
without it. `.env` is git-ignored.

### 2. Start the database and backend

```bash
docker compose up -d --build
```

This starts PostgreSQL/PostGIS and the API. Flyway applies migrations on backend
startup. Verify it is up:

```bash
curl http://localhost:8080/api/v1/health
```

Expected: `{"status":"UP","service":"umai-backend","timestamp":"..."}`

### 3. Start the frontend

```bash
cd UmaiFrontend
cp .env.example .env.local
npm install
npm run dev
```

Open <http://localhost:5173>. The homepage shows a connection badge that turns
green once it reaches the API.

## Running the backend without Docker

Start only the database, then run the app from source:

```bash
docker compose up -d db
cd UmaiBackend
./mvnw spring-boot:run
```

On Windows use `.\mvnw.cmd spring-boot:run`.

The backend reads `DB_URL`, `DB_USERNAME` and `DB_PASSWORD` from the environment
and falls back to `jdbc:postgresql://localhost:5432/umai` with user/password
`umai` for local development.

## Common commands

| Task | Command |
| --- | --- |
| Backend tests | `cd UmaiBackend && ./mvnw test` |
| Backend package | `cd UmaiBackend && ./mvnw package` |
| Frontend dev server | `cd UmaiFrontend && npm run dev` |
| Frontend type-check + build | `cd UmaiFrontend && npm run build` |
| Frontend lint | `cd UmaiFrontend && npm run lint` |
| Stop everything | `docker compose down` |
| Reset the database | `docker compose down -v` |

## Screens

| Route | Screen | Notes |
| --- | --- | --- |
| `/` | ホーム | Hero search, diet/cuisine entry points, top-rated restaurants |
| `/map` | マップから探す | Leaflet + OSM, markers with previews, synchronised list |
| `/search` | お店を探す | Keyword + filter chips, paginated results |
| `/categories` | タイプから探す | Browse by diet, cuisine genre, area |
| `/restaurants/:id` | 店舗詳細 | Full record, mini map, graceful missing-data handling |
| `/login` | ログイン / 新規登録 | One screen, two modes |
| `/restaurants/new` | レストラン追加 | Requires sign-in; redirects back after login |

Search filters live in the URL, so a filtered result is shareable, survives a reload
and works with the back button.

## API

Swagger UI: <http://localhost:8080/swagger-ui.html> · OpenAPI JSON: `/v3/api-docs`

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/v1/restaurants` | Paginated listing |
| GET | `/api/v1/restaurants/search` | Keyword + filters + pagination |
| GET | `/api/v1/restaurants/map` | Bounding-box query (PostGIS, GiST-indexed) |
| GET | `/api/v1/restaurants/featured` | Top-rated, for the homepage |
| GET | `/api/v1/restaurants/{id}` | Full detail |
| POST | `/api/v1/restaurants` | Submit a restaurant 🔒 |
| GET | `/api/v1/categories`, `/areas`, `/tags` | Filter reference data |
| POST | `/api/v1/auth/register`, `/auth/login` | Obtain a token |
| GET | `/api/v1/auth/me` | Current account 🔒 |
| GET | `/api/v1/restaurants/{id}/reviews` | List reviews |
| POST | `/api/v1/restaurants/{id}/reviews` | Post a review 🔒 |
| PUT/DELETE | `/api/v1/restaurants/{id}/reviews/{reviewId}` | Edit/remove own review 🔒 |

🔒 requires `Authorization: Bearer <token>`.

Contract notes for clients:

- Optional fields are **null when unknown**. Render the absence — never a placeholder.
- `averageRating` is derived from reviews and is `null` when there are none, with
  `reviewCount: 0`. An unrated restaurant is not a badly rated one.
- Filters combine with AND; multiple values of one filter combine with OR — except
  `tags`, where **all** requested tags must be present, since tags narrow a search.
- Sorting is restricted to `name`, `createdAt`, `updatedAt`; unknown sort keys are
  ignored rather than rejected.
- `/map` caps results and sets `truncated: true` when matches were omitted, so the UI
  can prompt the user to zoom in instead of silently showing a subset.

## Authentication

Stateless HS256 JWTs. Passwords are hashed with BCrypt and the hash never leaves the
server. Reads stay public; every write requires a token.

**`JWT_SECRET` is required — the backend refuses to start without it.** There is no
built-in default on purpose: a committed signing key would be public, and every
deployment would share it. Generate one:

```bash
openssl rand -base64 48
```

Design notes:

- **Identity comes from the token, never the request.** The author of a review or
  submission is taken from the verified JWT, so a client cannot act as another user.
- **Login failures are indistinguishable.** An unknown email and a wrong password
  return the same message, so the endpoint cannot be used to enumerate accounts.
- **Someone else's review reports 404, not 403** on edit/delete, so ids cannot be
  probed for existence.
- **`source` and `status` are server-set** on submission — a client cannot pass its
  submission off as imported data or self-approve it.
- **Logout is client-side.** Tokens are short-lived and stateless; server-side
  revocation would need a token store, which this MVP does not warrant.
- **The session lives in `localStorage`**, so it survives a reload at the cost of
  being readable by any script on the page — the usual trade-off for a token SPA.
  An httpOnly cookie would require CSRF protection on the API.

Submissions are published immediately by default. Set `SUBMISSIONS_AUTO_PUBLISH=false`
to route them to `PENDING` instead — but note there is no moderation UI yet, so
pending submissions would be invisible to everyone including their author.

## OpenStreetMap import

Restaurant data can be imported from OpenStreetMap via the Overpass API. The frontend
never talks to Overpass: data is fetched, normalised and **stored in our own
database**, so the app stays fast and keeps working when Overpass does not.

Providers sit behind the `RestaurantDataProvider` interface, so adding another source
means writing one implementation — the importer, domain model and API stay untouched.

Imports are admin-only and explicit:

```bash
curl -X POST "http://localhost:8080/api/v1/admin/imports/OPENSTREETMAP?minLat=35.65&minLon=139.68&maxLat=35.72&maxLon=139.78&limit=200" \
  -H "Authorization: Bearer <admin-token>"
```

Records are matched on `(source, sourceExternalId)`, so re-running updates rows rather
than duplicating them.

How incomplete OSM data is handled — the rules are unit tested in `OsmTagMapperTests`:

- `diet:vegan=only` → `VEGAN_ONLY`, `diet:vegan=yes` → `VEGAN_FRIENDLY` (same for
  vegetarian). Vegan wins over vegetarian, being the stricter claim.
- **Anything ambiguous — `limited`, `no`, missing — becomes `UNKNOWN`.** A wrong vegan
  classification is worse than none.
- Unnamed venues, and those without coordinates or an id, are **skipped**, not
  imported blank.
- Non-`http(s)` website values are dropped, so a hostile tag cannot become a link.
- An absent tag upstream means "unknown", not "deleted" — existing values are kept.
- `REJECTED` records are never resurrected by a later import.

> No account is an admin by default. Promote one directly in the database:
> `UPDATE users SET role = 'ADMIN' WHERE email = '...';`

## Testing

```bash
cd UmaiBackend && ./mvnw test     # 99 tests
cd UmaiFrontend && npm test       # 74 tests
```

CI (`.github/workflows/ci.yml`) runs both on every push. The backend job runs on
`ubuntu-latest`, where Docker is available, so the integration tests actually execute
there — and the job **fails if any test is skipped**, so a run where the database
container never started cannot look green.

The backend suite has two kinds of test:

- **Unit tests** (OSM tag mapping, web layer) — pure logic, run anywhere.
- **Integration tests** (`*IntegrationTests`) start a real `postgis/postgis` container
  via Testcontainers and apply the actual Flyway migrations, so the schema, CHECK and
  unique constraints, geospatial indexes and the generated geometry column are
  verified as written.

**Integration tests require Docker.** Without it they are reported as *skipped* and the
build still passes — **skipped is not passed.** If you see `Tests run: 90, Skipped: 41`,
the entire database layer went unverified on that run. See [ISSUES.md](ISSUES.md#1-the-database-layer-has-never-been-executed).

Frontend tests use Vitest + Testing Library and cover the API client, query
serialisation, URL-driven filters, the error boundary, and the missing-data rendering
rules.

## Database

The schema is created by Flyway migrations in
`UmaiBackend/src/main/resources/db/migration`; Hibernate runs with
`ddl-auto: validate` and never modifies tables. See
[UmaiDatabase/README.md](UmaiDatabase/README.md) for the entity relationships and the
reasoning behind the model.

### Development seed data

The app ships with **14 fictional restaurants** across 新宿, 渋谷, 東京・丸の内, 上野,
秋葉原, 浅草 and 池袋, plus cuisine categories, tags and areas, so filtering and the map
have something to show immediately.

This data is **not real**. Every seeded restaurant is marked `source = 'SEED'` and its
description carries a visible 「開発用サンプルデータ」 note. Several entries deliberately
omit website, phone, opening hours or price so the UI's missing-data handling is
exercised by default; `image_url` is null throughout, since inventing image URLs for
fictional restaurants would only render as broken images.

Seed data lives in a separate Flyway location. **Production must exclude it:**

```
FLYWAY_LOCATIONS=classpath:db/migration
```

## Configuration

Environment variables are split by concern:

| File | Purpose |
| --- | --- |
| `.env` (from `.env.example`) | Database credentials, ports, CORS origins — used by Compose and the backend |
| `UmaiFrontend/.env.local` (from `.env.example`) | Frontend API base URL and dev proxy target |

Backend defaults live in `UmaiBackend/src/main/resources/application.yml`; every
value there can be overridden by an environment variable. No secrets are committed.

## Architecture notes

- **The frontend never calls Overpass/OpenStreetMap directly.** External data
  sources are imported and normalised into our own database behind a provider
  abstraction on the backend, so more sources can be added later.
- **In development the browser is same-origin.** Vite proxies `/api` to the
  backend, so day-to-day work does not depend on CORS. CORS is still configured on
  the backend (`umai.cors.allowed-origins`) for deployed environments.
- **Flyway owns the schema.** Hibernate runs with `ddl-auto: validate` and never
  modifies tables. Extensions are provisioned by `UmaiDatabase/init` (superuser,
  once per volume) and re-asserted idempotently in migration `V1`.
- **Errors are uniform.** Every failure is rendered by the backend's global
  exception handler into a consistent JSON body; stack traces are never returned
  to clients.

## Roadmap

| Phase | Scope | Status |
| --- | --- | --- |
| 1 | Project structure, frontend, backend, PostGIS, Docker, config | ✅ Done |
| 2 | Schema, migrations, restaurant/category entities, seed data | ✅ Done |
| 3 | Restaurant REST APIs, search, filtering, pagination, OpenAPI | ✅ Done |
| 4 | Design system, homepage, navigation, restaurant cards | ✅ Done |
| 5 | Search/list page, filters, restaurant detail page | ✅ Done |
| 6 | Leaflet map, markers, previews, PostGIS geo queries | ✅ Done |
| 7 | Authentication, registration/login, protected endpoints | ✅ Done |
| 8 | Ratings and reviews | ✅ Done |
| 9 | Restaurant submission | ✅ Done |
| 10 | Overpass import, testing, responsive polish, animation, docs | ✅ Done |

## Data attribution

Map tiles and geographic data come from
[OpenStreetMap](https://www.openstreetmap.org/copyright) contributors (ODbL).
Google Maps APIs are not used and its data is not scraped.
