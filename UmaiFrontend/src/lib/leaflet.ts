import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

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

function markerSvg(fill: string, scale: number): string {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 44" width="${32 * scale}" height="${44 * scale}">
      <path d="M16 43C16 43 30 26.5 30 16A14 14 0 1 0 2 16c0 10.5 14 27 14 27Z"
            fill="${fill}" stroke="#ffffff" stroke-width="2.5"/>
      <circle cx="16" cy="16" r="5.5" fill="#ffffff"/>
    </svg>`
}

function buildIcon(fill: string, scale: number): L.DivIcon {
  return L.divIcon({
    html: markerSvg(fill, scale),
    className: 'umai-marker',
    iconSize: [32 * scale, 44 * scale],
    iconAnchor: [16 * scale, 44 * scale],
    popupAnchor: [0, -40 * scale],
  })
}

/** Standard marker. */
export const restaurantIcon = buildIcon('#4c9a45', 1)

/** Marker for the currently selected restaurant — larger and in a warmer colour. */
export const selectedRestaurantIcon = buildIcon('#ec9a3c', 1.2)
