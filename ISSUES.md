# Known issues and outstanding work

State of the project as of 2026-07-23.

All ten planned phases are implemented. Both projects build, and **132 tests now
execute and pass** (58 backend + 74 frontend), up from 49 executing at the end of
Phase 10.

The central problem is unchanged: **41 database-backed tests have still never run.**
Everything else below is ordered by how much it should worry you.

---

## Blockers

### 1. The database layer has never been executed

**Nothing that touches PostgreSQL has ever run.** No Docker, WSL distro, or local
PostgreSQL was available on the development machine, so every database-backed test is
reported as *skipped* and the build still passes.

```
Tests run: 99, Failures: 0, Errors: 0, Skipped: 41
```

Those 41 tests are the only evidence that would confirm the migrations apply, the
PostGIS generated column is accepted, Hibernate's `validate` agrees with the schema,
the seed data loads, the constraints bite, and every API endpoint works.

**Now partly addressed:** a CI workflow (`.github/workflows/ci.yml`) runs the backend
suite on `ubuntu-latest`, where Docker *is* available — so the integration tests
execute there. It also **fails the build if any test is skipped**, so a run where the
container failed to start cannot masquerade as green.

**To resolve:** push to GitHub and read the Actions run. Or locally, with Docker:

```bash
cd UmaiBackend && ./mvnw test   # expect Skipped: 0
```

**Most likely to fail first**, in order:

1. `RestaurantSpecifications.hasAllTagSlugs` — a correlated `EXISTS` subquery built
   per tag through the Criteria API. The least conventional code here, never executed.
2. The `location` generated column — PostgreSQL requires the expression be
   `IMMUTABLE`; believed correct, unproven.
3. `RestaurantRepository.findFeatured` — HQL with `left join ... on`, `group by r`
   and `coalesce(avg(...))` combined with `Pageable`.
4. `ddl-auto: validate` against `columnDefinition = "text"` columns.

### 2. Frontend/backend integration is unproven

The frontend has only ever run against a hand-written stub matching the DTOs. That
proves the UI handles correctly-shaped responses; it proves nothing about whether the
Java produces those shapes. Enum casing, `Instant` formatting, null-vs-absent fields
and the pagination envelope would all surface on first real contact.

---

## Security

### 3. Tokens are stored in `localStorage`

Readable by any script on the page, so an XSS bug becomes account takeover. The
conventional trade-off for a token SPA, but a trade-off. Moving to an httpOnly cookie
means adding CSRF protection to the API — **a decision worth making deliberately, not
a fix to apply quietly.**

### 5. No email verification

Any address can be registered without proving ownership, including someone else's.
Needs an SMTP provider.

### 7. Moderation exists but is off by default

`SUBMISSIONS_AUTO_PUBLISH=true`, so a signed-in user still writes straight to the
public dataset. The queue and UI now exist (see resolved #6), so flipping it to
`false` is a real option — but that is a policy choice about how much friction
contributors should face.

---

## Correctness and robustness

### 8. The Overpass import has never contacted Overpass

The tag-mapping rules have 46 passing unit tests, but `OverpassRestaurantProvider`
itself — query construction, the HTTP call, JSON parsing — has never run against the
real API. The Overpass QL query in particular is unverified.

### 11. Reviews and moderation lack deep pagination UI

Reviews now load 10 at a time with a "load more" control (resolved below), and the
moderation queue loads the first 20. Neither offers page navigation beyond that.

### 12. Map results are capped at 300 per viewport

The API sets `truncated: true` and the UI tells the user to zoom in, so it degrades
honestly. Marker clustering would be the real fix, and needs a new dependency.

### 15. Opening hours are unparsed free text

Stored as-is from OSM, so the UI cannot answer "open now" — the single most useful
question about a restaurant. Needs an `opening_hours` parser; easy to get subtly
wrong, so it deserves its own focused change.

---

## Data and content

### 13. All restaurant data is fictional

The 14 seeded restaurants are invented, marked `source = 'SEED'`, and carry visible
notices. Nothing in the production config prevents seeding a real deployment except
remembering `FLYWAY_LOCATIONS=classpath:db/migration`.

### 14. No images anywhere

`image_url` is null throughout and there is no upload path. Deliberate — inventing
image URLs would render as broken images — but needs hosting to resolve.

---

## Not started

- **i18n** — Japanese is hard-coded throughout, per the spec
- **Password reset**
- **Restaurant editing after submission**
- **Favourites / user profiles**
- **Accessibility audit** — semantics and ARIA were written carefully and are asserted
  in tests, but nothing has been checked with a real screen reader

---

## Resolved

| # | Issue | How |
| --- | --- | --- |
| 4 | No rate limiting | Token-bucket filter on auth and write endpoints, running before authentication so failed logins are throttled. 9 unit tests with injected time. Auth 10/min, writes 60/min, per client address; `X-Forwarded-For` deliberately ignored as spoofable |
| 6 | Submissions unmoderated | Moderation queue: admin endpoints plus a `/moderation` screen with approve/reject, so `SUBMISSIONS_AUTO_PUBLISH=false` is now usable rather than a dead end |
| 7 | Admin only via SQL | `UMAI_ADMIN_EMAILS` promotes already-registered accounts at startup. Never creates users or sets passwords, so it cannot become a backdoor |
| 8 | Synchronous import | Runs in the background, returns `202` with a job id; `GET /admin/imports/jobs/{id}` reports progress. Job state is in memory — lost on restart, not shared across instances |
| 9 | No page-level tests | 35 new tests across SearchPage, LoginPage, RestaurantDetailPage, SubmitRestaurantPage, ModerationPage and the auth guard. **74 frontend tests total** |
| 10 | Filters mounted twice | One instance, shown/hidden with CSS. Cost: the mobile collapse animation |
| 16 | 572 kB bundle | Route-level `React.lazy`. Main bundle **572 kB → 331 kB**; Leaflet split into a 153 kB chunk loaded only where a map appears |
| 17 | Mockito self-attach warning | Configured as a `-javaagent` via `maven-dependency-plugin` |
| 18 | Java version mismatch | CI pins JDK 21, matching the `pom.xml` target |
| 19 | No CI pipeline | GitHub Actions: backend tests with Docker, frontend lint/test/build, Docker image build and compose validation. Fails if any test is skipped |
