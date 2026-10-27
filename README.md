# Umai

Tokyo vegetarian and vegan restaurant discovery with React, Spring Boot, PostgreSQL and PostGIS.

Searches read our database. Migration V4 includes **295 real OpenStreetMap listings fetched on July 24, 2026**. They are a snapshot, not an exhaustive directory or a guarantee that a venue is still open or vegan. Fourteen fictional restaurants are available through the explicit development profile.

## Run locally

Requires Docker Compose, Node.js 22+, and Java 21 when running Java outside Docker.

1. Copy `.env.example` to `.env`, choose `POSTGRES_PASSWORD`, and set a private `JWT_SECRET` (`openssl rand -base64 48`).
2. Run `docker compose up -d --build`.
3. In `UmaiFrontend`, copy `.env.example` to `.env.local`, run `npm ci`, then `npm run dev`.
4. Open http://localhost:5173. API health: http://localhost:8080/api/v1/health.

Compose defaults to `prod`. Fictional samples are excluded from migrations and public queries. Production refuses to start if sample migrations or `UMAI_INCLUDE_SEED=true` are configured. Previously applied repeatable sample migrations may be omitted when switching to production; versioned migrations remain validated. For samples, use `SPRING_PROFILES_ACTIVE=dev` and `FLYWAY_LOCATIONS=classpath:db/migration,classpath:db/seed`.

Submissions wait for moderation by default. Register an account, add its email to `UMAI_ADMIN_EMAILS`, and restart for admin access. The `/moderation` screen supports publication decisions, paginated correction reports, and corrections including permitted owner-supplied photo URLs. Imported updates preserve moderated corrections; confirmed closures are unpublished and cannot be resurrected by imports.

## Coverage and freshness

`UMAI_REFRESH_ENABLED=true` enables a Tokyo refresh at startup if no successful refresh occurred in the past seven days, then every Monday at 04:00 Asia/Tokyo. A database advisory lock allows only one scheduled refresh across instances. The service queries a 4-by-4 grid and subdivides cells when Overpass caps raw results, including when unnamed records were skipped. Each run makes at most `UMAI_REFRESH_MAX_REQUESTS` requests (default 64), with two seconds between calls. Failed and incomplete runs remain visible and retain imported data. Partial imports never claim complete coverage.

The initial bounding box is latitude 35.50–35.90, longitude 139.50–139.95. Override `UMAI_REFRESH_MIN_LAT`, `UMAI_REFRESH_MIN_LON`, `UMAI_REFRESH_MAX_LAT`, `UMAI_REFRESH_MAX_LON`, or `UMAI_REFRESH_CRON` when needed. `OVERPASS_ENDPOINT` selects a compatible provider if the configured service is unavailable. Public Overpass and OSM tiles have no availability guarantee.

Restaurant pages distinguish **source last refreshed** from **moderator checked**. V9 records the original July 24 source date for the V4 snapshot; deployment is never presented as a fresh restaurant check. Visitors see the real published-record count and whether the latest import completed. Signed-in users can report closures, hours, dietary information, and other corrections for moderator review.

## Cost controls

- Browse requests return 24 server-grouped restaurant names per page, with no 500-record download limit. `branchCount` counts matching branches. Ordinary search is ungrouped unless `groupByName=true` is supplied.
- Map filters execute before the 300-marker cap. The API reports the matching count and truncation; the UI offers filtered paginated browsing when results are truncated.
- Trigram indexes match the `lower(...)` expressions used by search. Map queries retain the generated PostGIS geometry and GiST index.
- Bounded in-process caches hold public restaurant/reference DTOs for 60 seconds, with an estimated 8 MiB allowance per cache. Mutations evict restaurant reads. Other instances expire entries within 60 seconds. The frontend shares reference requests for five minutes.
- Google matching stores place IDs only; it no longer copies Google phone numbers, descriptions, addresses, hours or ratings into our dataset.
- Google photos load after an explicit click on a separate page without an OSM map. Metadata requests ask only for `photos,attributions`. Author/source attribution is displayed. Responses use `Cache-Control: no-store`; concurrent lookups share only in-flight requests. Failures use bounded operational cooldowns.
- `GOOGLE_DAILY_REQUESTS=100` and `GOOGLE_MONTHLY_REQUESTS=1000` cap **all outgoing Google requests**, including free metadata and failed attempts. Counters persist across restarts and are shared across replicas. Zero disables calls. A photo normally consumes two requests. These limits cover this application, not other applications sharing your Google billing account. Configure provider-side quotas for account-level control.
- Photo endpoint calls default to ten per client address per minute. Auth and write limits remain separate. Budget exhaustion and upstream failures use fallback covers.
- JSON responses are compressed; the database pool defaults to eight connections. The frontend build is static and can be served by a static host/CDN. Choose infrastructure capacity from measured traffic and memory use.

Existing databases may contain historical Google-enriched text from the previous implementation. Those fields were mixed with OSM/user values without field-level provenance, so they cannot be safely removed automatically. Historical Google ratings and Google cover paths are no longer exposed in public cached DTOs. Audit mixed-origin text against its original source before redistributing it; new enrichment stores identifiers only.

## API additions

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/v1/restaurants/search?groupByName=true&page=0&size=24` | Server grouping and pagination |
| GET | `/api/v1/restaurants/map?...&vegetarianTypes=VEGAN_ONLY&categories=cafe` | Filters before map limits |
| GET | `/api/v1/coverage` | Real-record count and refresh status |
| POST | `/api/v1/admin/refresh` | Bounded background refresh (admin) |
| POST | `/api/v1/restaurants/{id}/reports` | Submit a correction (signed in) |
| GET | `/api/v1/admin/reports?page=0` | Pending reports (moderator/admin) |
| POST | `/api/v1/admin/reports/{id}/resolve` | Correct, close, or dismiss |
| GET | `/api/v1/admin/restaurants/{id}` | Inspect any listing (moderator/admin) |
| PUT | `/api/v1/admin/restaurants/{id}/details` | Correct a listing (moderator/admin) |
| GET | `/api/v1/restaurants/{id}/photo` | Live photo JSON with attribution |

Swagger UI: http://localhost:8080/swagger-ui.html. Filters use repeated query parameters. Search page sizes are capped at 100. Writes use bearer authentication; admin routes also enforce roles.

## Verification

```powershell
cd UmaiFrontend
npm test
npm run lint
npm run build

cd ../UmaiBackend
./mvnw.cmd test
```

Integration tests use a real PostGIS container when Docker is available. A separately provisioned **disposable** database is supported through `UMAI_TEST_DB_URL`, `UMAI_TEST_DB_USERNAME`, and `UMAI_TEST_DB_PASSWORD`. Tests write data and migrations; never point them at an application database. CI uses PostgreSQL 16/PostGIS 3.4 and rejects skipped tests.

## Attribution

Restaurant snapshot and map data: [OpenStreetMap contributors](https://www.openstreetmap.org/copyright), ODbL. Google photo handling follows [Places policies](https://developers.google.com/maps/documentation/places/web-service/policies) and [photo attribution requirements](https://developers.google.com/maps/documentation/places/web-service/place-photos). Keep map attribution visible and respect [OSM tile usage](https://operations.osmfoundation.org/policies/tiles/). The tile URL is configurable with `VITE_OSM_TILE_URL`.
