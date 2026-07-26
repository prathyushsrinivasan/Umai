import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

import type { VegetarianType } from '../types/restaurant'

/**
 * Leaflet's default marker icons are referenced by relative URL, which breaks under
 * a bundler. We draw our own SVG markers instead, keeping them on-brand and avoiding
 * any image requests.
 */

/** Roughly the centre of Tokyo's 23 wards. */
export const TOKYO_CENTER: [number, number] = [35.6812, 139.7671]

export const TOKYO_DEFAULT_ZOOM = 12

export const OSM_TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'

/** Attribution is required by the OpenStreetMap licence (ODbL). */
export const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'

/**
 * A colour per diet type, so the map reads at a glance: green shades for dedicated
 * (専門) veg/vegan places, warm accent colours for merely accommodating ones, and a
 * muted neutral when it's unknown. Kept in sync with the on-brand palette in index.css.
 */
export const VEGETARIAN_PIN_COLORS: Record<VegetarianType, string> = {
  VEGAN_ONLY: '#3a7c36', // leaf-600 — the strongest green
  VEGETARIAN_ONLY: '#6eb565', // leaf-400
  VEGAN_FRIENDLY: '#ec9a3c', // apricot-500
  VEGETARIAN_FRIENDLY: '#c4577a', // berry-500
  UNKNOWN: '#a89e8c', // bark-400
}

/**
 * The glyph inside the white disc: a small leaf in the diet colour for veg/vegan types,
 * or a plain dot for UNKNOWN. Colour + glyph together keep the pin types distinguishable
 * beyond colour alone.
 */
function innerGlyph(type: VegetarianType, fill: string): string {
  if (type === 'UNKNOWN') {
    return `<circle cx="15" cy="15" r="3.6" fill="${fill}"/>`
  }
  return `
    <g transform="translate(15,15)">
      <path d="M0 -5.4C3.2 -2.9 3.2 2.9 0 5.4C-3.2 2.9 -3.2 -2.9 0 -5.4Z" fill="${fill}"/>
      <path d="M0 -3.8V3.8" stroke="#ffffff" stroke-width="1.1" stroke-linecap="round"/>
    </g>`
}

/**
 * A rounded map pin: a colour-filled teardrop with a white rim, a white disc, and the
 * diet glyph inside — the familiar "colour pin / white centre / coloured icon" look,
 * far cleaner than a flat blob. A soft drop shadow is applied in CSS (`.umai-marker`).
 */
function markerSvg(type: VegetarianType, scale: number): string {
  const fill = VEGETARIAN_PIN_COLORS[type]
  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 40" width="${30 * scale}" height="${40 * scale}">
      <path d="M15 39C15 39 27 24.5 27 14A12 12 0 1 0 3 14C3 24.5 15 39 15 39Z"
            fill="${fill}" stroke="#ffffff" stroke-width="2.5" stroke-linejoin="round"/>
      <circle cx="15" cy="14.5" r="7.6" fill="#ffffff"/>
      <g transform="translate(0,-0.5)">${innerGlyph(type, fill)}</g>
    </svg>`
}

const iconCache = new Map<string, L.DivIcon>()

/**
 * The marker for a restaurant of a given diet type. Selected markers are larger and
 * get a gentle bounce (see `.umai-marker-selected` in index.css). Cached so panning a
 * few hundred markers doesn't rebuild identical icons every render.
 */
export function markerIcon(type: VegetarianType, selected = false): L.DivIcon {
  const key = `${type}:${selected}`
  const cached = iconCache.get(key)
  if (cached) return cached

  const scale = selected ? 1.3 : 1
  const icon = L.divIcon({
    html: markerSvg(type, scale),
    className: selected ? 'umai-marker umai-marker-selected' : 'umai-marker',
    iconSize: [30 * scale, 40 * scale],
    iconAnchor: [15 * scale, 40 * scale],
    popupAnchor: [0, -36 * scale],
  })
  iconCache.set(key, icon)
  return icon
}
