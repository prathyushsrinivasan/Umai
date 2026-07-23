# Umai Roadmap — Live restaurants, photos, and a map-first UI

This roadmap turns Umai from a seed-data demo with a heavy "sketchy" visual style
into a clean, map-first app showing **real Tokyo vegetarian/vegan restaurants with
photos**. It's ordered so each phase is shippable on its own.

Status legend: ☐ not started · ◐ in progress · ☑ done

## Progress (2026-07-23)

- ☑ **Phase 0** — Docker stack up (postgis + Spring backend), migrations run.
- ☑ **Phase 1** — 260 real Tokyo restaurants imported from OpenStreetMap; reference
  data moved to a permanent migration (`V3`); fictional seed removed; reproducible
  from a clean volume.
- ◐ **Phase 2** — OSM photo capture (`image`/`wikimedia_commons`) wired + tested; the
  on-brand fallback ships on the detail page. (Real photos are ~1/260 — a keyed photo
  API is the remaining optional upgrade.)
- ☑ **Phase 3** — Map-first home (map + list + inline filters on one screen),
  custom icon system (no emoji), old screens redirected, calm cards.

---

## Phase 0 — Stand up the stack (prerequisite for anything "live")

The frontend currently talks to a backend that isn't running (`/api/v1/*` →
`ECONNREFUSED`). Nothing "live" is possible until the stack is up.

- ☐ **Postgres + PostGIS** running locally (the schema uses `geometry`, `pg_trgm`,
  and a generated `location` column — see `V1__enable_extensions.sql`).
- ☑ **Secrets**: `UmaiBackend/.env` holds `JWT_SECRET` + `DB_PASSWORD`; `.env.example`
  documents them. *(Still to wire: Spring doesn't auto-load `.env` — see below.)*
- ☐ **Backend boots**: `JWT_SECRET` exported/loaded, Flyway migrations + dev seed run.
- ☐ **`.env` loading**: add `spring-dotenv` or an IDE EnvFile config so the backend
  actually reads `UmaiBackend/.env`.
- ☐ **Admin account**: register a user, set `UMAI_ADMIN_EMAILS=<that email>` so the
  import endpoint (ADMIN-only) is callable.

**Deliverable:** app loads with seed data end-to-end; `/api/v1/restaurants/featured`
returns rows.

---

## Phase 1 — Real restaurant data (replace the seed)

The OSM/Overpass importer already exists (`OverpassRestaurantProvider`,
`OsmTagMapper`, `ImportController`). It fetches venues tagged `diet:vegan` /
`diet:vegetarian`, classifies them, dedupes by `(source, source_external_id)`, and
upserts. It is **built but never run**.

- ☐ **Run the importer over Tokyo.** `POST /api/v1/admin/imports/openstreetmap`
  with a bounding box. One call caps at 500 elements (`overpass.max-elements`), and
  Tokyo has more veg-tagged venues than that, so:
- ☐ **Tile the city.** Add a batch that splits the 23-ward bbox into a grid and
  imports each tile (or run per-ward). Store as a small admin action / script.
- ☐ **Keep seed out of prod.** Set `FLYWAY_LOCATIONS=classpath:db/migration` in
  production so the fictional "開発用サンプルデータ" rows never ship; dev keeps the seed.
- ☐ **Freshness (later):** a weekly scheduled re-import so data stays live; surface
  last-run + counts in the moderation screen.

**Deliverable:** the map and lists show real, deduplicated Tokyo venues with name,
coordinates, diet type, cuisine categories, address, website, phone, and hours.
**No photos yet** — OSM almost never has them.

---

## Phase 2 — Photos (the genuinely new capability)

`restaurants.image_url` exists but is always null today. Coverage strategy, best
source first, with an honest fallback:

1. ☐ **OSM-native images (free, correct licensing, sparse).** `OsmTagMapper`
   currently drops the `image` and `wikimedia_commons` tags — capture them, resolve
   Wikimedia Commons filenames to thumbnail URLs. Only a minority of venues have these.
2. ☐ **Real cover photos (decision — see below).** A places API matched by
   name + coordinates fills `image_url` for most venues:
   - **Google Places Photos** — best coverage; needs a Google Cloud API key with
     billing enabled; must store photo attribution.
   - **Foursquare Places** — real photos, generous free tier; needs a Foursquare key.
3. ☐ **On-brand generated fallback.** For venues with no photo, render a cuisine-tinted
   cover (gradient + category glyph), **never** a stock photo of a *different*
   restaurant (that would misrepresent a real place).

Backend support:
- ☐ **Migration `V3`**: add `image_source` + `image_attribution` columns (licensing).
- ☐ **`RestaurantImageService`**: fills `image_url` during/after import; caches results.
- ☐ **Hotlink/rate-limit safety**: proxy + optionally store thumbnails rather than
  linking a provider URL that can rotate or rate-limit.

**Deliverable:** most restaurant cards and detail pages show a real photo; the rest
show a tasteful branded cover.

---

## Phase 3 — Frontend: clean, map-first, fewer screens

- ☑ **Calm the visuals (item 1).** Retire the heavy `sketchy-edge` displacement
  filter as a default; keep flat sticker-shadows, rounded corners, and the crayon
  display font only on the logo + page titles. Cards become legible.
- ☐ **Map-first landing (item 5).** `/` becomes the map experience: a full Tokyo map
  with many markers + a synchronized results rail, filters folded in as compact
  controls. Fold today's separate **Search** and **Categories** pages into it. Keep
  **detail**, **login**, **submit**, **moderation** as their own routes.
- ☐ **Less text (item 5).** Drop the marketing hero copy and the three stacked
  homepage sections; lead with the map and results.
- ☐ **Custom icon system (item 4).** A single `Icon` component backed by a curated
  in-house SVG set (extends the existing `PersonIcon`/`PlusIcon` style). Replace every
  emoji (nav, hero, cards, search, empty states — 8 files).
- ☐ **Cards + detail** render real photos with the branded fallback.

**Deliverable:** a visitor lands on a live Tokyo map full of real restaurants with
photos, filters inline, minimal chrome.

---

## Phase 4 — Ops & polish

- ☐ Attribution page (OSM ODbL is already credited on the map; add photo credits).
- ☐ Caching + rate-limit handling for the image provider.
- ☐ Tests: new `OsmTagMapper` image fields, `RestaurantImageService`, map-first UI.

---

## Open decision (blocks Phase 2 real-photo work)

**Where do restaurant photos come from?** Free OSM/Wikimedia + branded fallback (no
cost, sparse real photos) vs. a keyed places API (Google/Foursquare — real photos for
most venues, needs an API key + possibly billing you provision). Everything else in
the roadmap proceeds regardless of this answer.
