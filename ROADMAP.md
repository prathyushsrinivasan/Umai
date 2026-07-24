# Umai Roadmap — Live restaurants, photos, and a map-first UI

This roadmap turns Umai from a seed-data demo with a heavy "sketchy" visual style
into a clean, map-first app showing **real Tokyo vegetarian/vegan restaurants with
photos**. It's ordered so each phase is shippable on its own.

Status legend: ☐ not started · ◐ in progress · ☑ done

## Progress (2026-07-24)

- ☑ **Phase 0** — Docker stack up (postgis + Spring backend), migrations run.
- ☑ **Phase 1** — 295 real Tokyo restaurants imported from OpenStreetMap, frozen as
  a permanent migration (`V4`) so a fresh `docker compose up` has real data from
  first boot — no manual admin call needed anymore (a bug we hit: the first import
  was only ever run against a since-discarded Docker volume, so this session's fresh
  stack was silently showing just the 14 fictional seed restaurants until this was
  fixed). Reference data is also a permanent migration (`V3`); fictional seed
  excluded from prod.
- ☑ **Phase 2** — OSM photo capture (`image`/`wikimedia_commons`) wired + tested;
  **Wikipedia added as a free, keyless photo source** (`WikipediaPhotoProvider`) that
  runs before Foursquare in the backfill order, so a restaurant matching a Wikipedia
  article (mostly chains and famous shops) never needs the keyed provider at all;
  **Foursquare** remains the keyed fallback (`FoursquarePhotoProvider` + admin
  `PhotoBackfillService`/`PhotoBackfillController`, disabled until
  `FOURSQUARE_API_KEY` is set); on-brand fallback (`RestaurantPhoto`) covers whatever
  neither source has. Licensing metadata (`image_source`/`image_attribution`
  columns) and hotlink/caching safety are not done — see Phase 2 below.
- ☑ **Phase 3** — Map-first home (map + list + inline filters on one screen),
  custom icon system (no emoji anywhere in the frontend), old `/map` `/search`
  `/categories` screens redirect into `/`, calm cards.

---

## Phase 0 — Stand up the stack (prerequisite for anything "live") — done

Was blocking everything: the frontend had nothing to talk to (`/api/v1/*` →
`ECONNREFUSED`) until this was resolved.

- ☑ **Postgres + PostGIS** running locally via `docker-compose.yml` (the `db` service,
  schema uses `geometry`, `pg_trgm`, and a generated `location` column — see
  `V1__enable_extensions.sql`).
- ☑ **Secrets**: `UmaiBackend/.env` holds `JWT_SECRET` + `DB_PASSWORD`; `.env.example`
  documents them. *(Resolved without `spring-dotenv`: Docker Compose reads `.env`
  itself and injects the values as container environment variables — see the
  `backend` service's `environment:` block.)*
- ☑ **Backend boots**: `docker compose up` runs Flyway migrations + dev seed and
  starts the backend; healthcheck hits `/actuator/health`.
- ☑ **Admin account**: register a user, set `UMAI_ADMIN_EMAILS=<that email>` so the
  import endpoint (ADMIN-only) is callable.

**Deliverable:** app loads with seed data end-to-end; `/api/v1/restaurants/featured`
returns rows.

---

## Phase 1 — Real restaurant data (replace the seed)

The OSM/Overpass importer already exists (`OverpassRestaurantProvider`,
`OsmTagMapper`, `ImportController`). It fetches venues tagged `diet:vegan` /
`diet:vegetarian`, classifies them, dedupes by `(source, source_external_id)`, and
upserts.

- ☑ **Run the importer over Tokyo.** `POST /api/v1/admin/imports/openstreetmap`
  with a bounding box; 295 restaurants imported (under the 500-element
  `overpass.max-elements` cap in a single call). The result is now frozen into
  `V4__osm_restaurant_import.sql` (see Progress above) — a fresh environment gets
  this data automatically, no admin call required. Re-running the live import
  endpoint still works and is safe: both paths upsert on `(source,
  source_external_id)`.
- ☐ **Tile the city (still manual).** No automated batch exists yet to split the
  23-ward bbox into a grid and import each tile — if coverage needs to grow past
  what one bbox call returns, this is still a small admin action / script to write
  (and re-running it means regenerating `V4` from the result — see that file's header).
- ☑ **Keep seed out of prod.** `docker-compose.yml` and `application.yml` default
  `FLYWAY_LOCATIONS` to include `db/seed`; production overrides it to
  `classpath:db/migration` alone so the fictional "開発用サンプルデータ" rows never ship.
- ☐ **Freshness (later):** a weekly scheduled re-import so data stays live; surface
  last-run + counts in the moderation screen.

**Deliverable:** the map and lists show real, deduplicated Tokyo venues with name,
coordinates, diet type, cuisine categories, address, website, phone, and hours.

---

## Phase 2 — Photos (the genuinely new capability)

Coverage strategy, best source first, with an honest fallback:

1. ☑ **OSM-native images (free, correct licensing, sparse).** `OsmTagMapper.resolveImageUrl`
   captures the `image` tag directly and resolves `wikimedia_commons` `File:` references
   to a Commons `Special:FilePath` thumbnail. Only a minority of venues have these
   (~1/295) — expected, since OSM rarely carries photos.
2. ☑ **Wikipedia + Wikimedia Commons — free, keyless, tried first.**
   `WikipediaPhotoProvider` searches Japanese Wikipedia article titles;
   `WikimediaCommonsPhotoProvider` separately searches Commons' `File:` namespace,
   catching individual uploaded photos (often Flickr imports) of places that never got
   a full article. No API key, no billing account, no rate limit to manage — the
   tradeoff is coverage: most independent restaurants have neither, so this mainly
   resolves chains and well-known shops. 45/309 restaurants have a photo this way as of
   the last backfill run.
   Matching is by name overlap only (not location, unlike Foursquare below) since an
   article/file's subject doesn't move with the branch being looked up — a match is
   only accepted when the restaurant name and the title substantially overlap
   (`WikipediaPhotoProvider.titlesOverlap`, shared by both providers). This still isn't
   airtight: short or generic names, or ones that happen to double as an unrelated
   common word, acronym, place, or person's name, can coincidentally overlap
   Wikipedia/Commons content about that *other* thing rather than the restaurant — found
   live and fixed twice: numeric-only names ("202" matched a counting-rod numeral
   diagram) and names under 3 characters ("頭"/"head" matched Wikipedia's anatomy
   article) are now rejected outright, and a manual audit after backfilling caught and
   cleared a handful of remaining homonym collisions ("COCOMO" the restaurant vs. the
   software cost model, "Sky High" vs. a 1922 film, etc.) that no simple heuristic
   would catch — that class of error would need actual semantic verification (e.g.
   cross-checking Wikidata's "instance of" property) to close for good, which is a
   larger undertaking than this pass.
3. ☑ **Foursquare — keyed fallback for what the free sources can't cover.**
   `FoursquarePhotoProvider` (in `integration/foursquare`) matches each remaining
   photo-less restaurant by name + coordinates (tight radius, single closest result)
   and pulls its top photo via Foursquare Places v3. Disabled by default; set
   `FOURSQUARE_API_KEY` to turn it on. Run via the admin endpoints below — none of the
   three providers run automatically during import.
4. ☑ **On-brand generated fallback.** `RestaurantPhoto.tsx` renders a cuisine-tinted
   gradient panel + leaf glyph for venues with no photo, and also catches `<img>`
   load failures (broken/rotated provider URLs) rather than showing a broken image.
   Never a stock photo of a *different* restaurant. Real photos crop with
   `object-bottom` rather than the default center — these are almost all street-level
   building shots, so the storefront/entrance sits low in the frame and centering cut
   it off in small thumbnails.

Backend support:
- ☑ **Admin endpoints**: `GET /api/v1/admin/photos/status` and
  `POST /api/v1/admin/photos/backfill?limit=` (`PhotoBackfillController` /
  `PhotoBackfillService`), ADMIN-only, bounded per call, paced 120ms between
  provider calls to stay under free-tier rate limits. `PhotoBackfillService` takes an
  ordered `List<PlacePhotoProvider>` (Spring `@Order`: Wikipedia = 1, Wikimedia Commons
  = 2, Foursquare = 3) and tries each enabled provider in turn per restaurant, so the
  free sources are always exhausted before spending Foursquare's rate-limited quota.
- *Out of scope (sample project):* licensing metadata (`image_source`/
  `image_attribution` columns), hotlink proxying/caching. Not worth building for a
  demo with no real users or legal exposure.

**Deliverable:** chains and famous shops can get a real photo via Wikipedia with zero
setup; the rest can too once `FOURSQUARE_API_KEY` is set and the backfill has been run;
everything else shows a tasteful branded cover.

---

## Phase 3 — Frontend: clean, map-first, fewer screens

- ☑ **Calm the visuals (item 1).** Retired the heavy `sketchy-edge` displacement
  filter as a default; flat sticker-shadows, rounded corners, and the crayon
  display font stay only on the logo + page titles. Cards are legible.
- ☑ **Map-first landing (item 5).** `/` (`HomePage.tsx`) is the map experience: a
  full Tokyo map with markers synced to a results rail, keyword/diet/cuisine filters
  inline above it. The old **Search**, **Categories**, and **Map** pages were deleted
  and now `<Navigate>` to `/` (`App.tsx`). **Detail**, **login**, **submit**,
  **moderation** remain their own routes.
- ☑ **Less text (item 5).** Marketing hero copy and the stacked homepage sections
  are gone; the page leads with the map and results.
- ☑ **Custom icon system (item 4).** `components/ui/Icon.tsx` is a single component
  backed by an in-house SVG set. No emoji remain anywhere in the frontend.
- ☑ **Cards + detail** render real photos with the branded fallback via the shared
  `RestaurantPhoto` component.

**Deliverable:** a visitor lands on a live Tokyo map full of real restaurants with
photos where available, filters inline, minimal chrome.

---

## Phase 4 — Make it cute: crayon aesthetic, mascot, custom identity

This is a sample/portfolio project, not a production service — ops concerns
(attribution pages, rate-limit hardening, test coverage) are explicitly **out of
scope**. The priority now is the best possible frontend: leaning further into the
crayon/hand-drawn identity and giving the app a distinct, cute visual character
rather than generic SaaS styling.

- ☐ **Custom background.** Replace the flat cream background with a subtle
  hand-drawn/textured one (paper grain, doodled produce, or a soft illustrated
  pattern) that doesn't fight with card content or map legibility.
- ☐ **Cute mascot.** An original in-house character (not a stock icon) that can
  appear in empty states, loading states, and maybe the header — reinforcing the
  vegetarian/Tokyo theme established by the existing leaf motif.
- ☐ **Logo.** A proper wordmark/mark for "Umai" beyond plain text, in the crayon
  display style, usable at header size and as a favicon base.
- ☐ **Favicon.** Generated from the new logo/mascot, replacing the default Vite icon.
- ☐ **Lean further into crayon/hand-drawn.** Phase 3 calmed the visuals down for
  legibility; now selectively push hand-drawn touches back in (wobble, sketchy
  borders, playful micro-interactions) where they add charm without hurting
  usability — the opposite direction from Phase 3's "calm it down," now that the
  layout itself is settled.

**Deliverable:** the app feels distinctly hand-crafted and cute rather than templated
— a memorable visual identity, not just "a map with a leaf icon."

---

## Decision log

**Where do restaurant photos come from? → Resolved: Wikipedia first, Foursquare second.**
Wikipedia costs nothing (no key, no billing account, no rate limit) so it runs first and
permanently — added specifically because the dataset turned out to contain many
recognizable chains (McDonald's, KFC, Doutor, CoCo Ichibanya, AFURI, Hidakaya, Mutekiya)
that are far more likely to have a Wikipedia article than a small independent restaurant
is. Foursquare (chosen earlier over Google Places Photos for its generous free tier and
simpler, billing-free key setup) remains as the keyed fallback for whatever Wikipedia
can't match. Both implement `PlacePhotoProvider` and are tried in `@Order` sequence by
`PhotoBackfillService`. Remaining follow-up: store `image_source`/`image_attribution`
per Foursquare's attribution requirement (Phase 2 backend support, above) — Wikipedia
images are Commons-licensed and would need the same treatment if this ever went to
production, but per the sample-project scope this isn't being built now.
