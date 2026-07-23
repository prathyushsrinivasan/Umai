# Custom Image Assets — Checklist

Everything the site currently renders is either an inline SVG (drawn in code) or an
emoji. Nothing is broken — this is just a list of every spot where you can drop in
your own imagery, what size/format works best, and which file to hand it to.

For each item: save your file into the path listed, then tell me (or edit the "Used
in" file yourself) and I'll wire it in — swapping most of these is a one-line change.

---

## 1. Favicon

- **Current:** [UmaiFrontend/public/favicon.svg](UmaiFrontend/public/favicon.svg) — a
  plain leaf mark, referenced from
  [UmaiFrontend/index.html:5](UmaiFrontend/index.html#L5).
- **What to provide:** an SVG (preferred, scales cleanly) or a 512×512 PNG.
- **Also nice to have:** a 180×180 PNG for `apple-touch-icon` (shows up when someone
  adds the site to an iOS home screen) — not wired up yet, ask if you want it added.
- **Drop in:** `UmaiFrontend/public/favicon.svg` (or `.png`)

## 2. Logo (header mark)

- **Current:** an inline SVG leaf (`LeafMark` in
  [SiteHeader.tsx:159-175](UmaiFrontend/src/components/layout/SiteHeader.tsx#L159-L175))
  next to the text "Umai".
- **What to provide:** SVG preferred (recolors cleanly, stays sharp at any size); PNG
  with transparent background is fine too. Roughly square, works at ~36×36px.
- **Drop in:** `UmaiFrontend/src/assets/logo.svg`

## 3. Hero background (homepage)

- **Current:** a plain green→cream gradient with two decorative emoji (🌿🌱) in
  [HomePage.tsx:112-119](UmaiFrontend/src/pages/HomePage.tsx#L112-L119).
- **What to provide:** a wide background image or illustration, roughly
  **1920×960** (2:1), JPG or WebP, ideally under 300KB. Should stay readable with
  dark text overlaid in the center — a soft/blurred or low-contrast image works
  best, not a busy photo.
- **Drop in:** `UmaiFrontend/src/assets/hero-background.jpg`

## 4. Restaurant card placeholder (no-photo state)

- **Current:** most restaurants have no photo (real-world data rarely includes
  one), so cards without `imageUrl` show a soft green gradient with a leaf icon —
  see `RestaurantImage` in
  [RestaurantCard.tsx:94-121](UmaiFrontend/src/components/restaurant/RestaurantCard.tsx#L94-L121).
- **What to provide (optional):** a repeatable pattern or illustration to use
  instead of the gradient. Roughly **640×320** (2:1), SVG or PNG.
- **Drop in:** `UmaiFrontend/src/assets/card-placeholder.svg`

## 5. Map markers

- **Current:** markers are drawn as inline SVG pins (green = normal, orange =
  selected) in
  [lib/leaflet.ts](UmaiFrontend/src/lib/leaflet.ts) — no image files involved at all.
- **What to provide (optional):** a custom pin/icon design, roughly **64×88px**
  (pin proportions), PNG or SVG, with a transparent background.
- **Drop in:** `UmaiFrontend/src/assets/marker.svg` and
  `UmaiFrontend/src/assets/marker-selected.svg`

## 6. Category / type icons

- **Current:** emoji stand in for icons everywhere — 🌿 for diet types, 🍽️ for
  cuisine genres (see
  [CategoriesPage.tsx](UmaiFrontend/src/pages/CategoriesPage.tsx)), 🗺️/🔍 for the
  homepage's map/search buttons, 📍 for location, 👤 for account, ✏️ for "add a
  restaurant".
- **What to provide (optional):** a matching icon set (e.g. one style for 和食,
  カフェ, ラーメン, 洋食, 中華, etc.), roughly **24×24**, SVG.
- **Drop in:** `UmaiFrontend/src/assets/icons/` (one file per category, e.g.
  `ramen.svg`, `cafe.svg`)

## 7. Social share preview (Open Graph image)

- **Current:** none — sharing a link to the site on LINE/X/Slack/etc. currently
  shows no preview image.
- **What to provide:** **1200×630**, JPG or PNG, should look good as a small
  thumbnail (readable at ~300px wide).
- **Drop in:** `UmaiFrontend/public/og-image.jpg` (I'll add the
  `<meta property="og:image">` tag once it exists)

## 8. Restaurant photos (data, not a site asset)

Individual restaurant photos are a per-restaurant `imageUrl` field, not a site
asset — they'd be added per restaurant (via import or, later, an upload feature)
rather than dropped into the codebase. Worth knowing: **the restaurant detail
page doesn't currently display an image at all**, even when `imageUrl` is set —
only the search/homepage cards do. Let me know if you want that added.

---

## Quick priority guide

If you only do a few of these, the ones with the most visual impact are:
**#1 favicon**, **#2 logo**, **#3 hero background**. The rest (#4–#7) are polish.
