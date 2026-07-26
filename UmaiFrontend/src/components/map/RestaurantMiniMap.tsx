import { useEffect } from 'react'
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet'
import { Link } from 'react-router-dom'

import { OSM_ATTRIBUTION, OSM_TILE_URL, markerIcon } from '../../lib/leaflet'
import type { VegetarianType } from '../../types/restaurant'

/** A sibling branch to plot alongside the main restaurant. */
export interface BranchPoint {
  id: number
  latitude: number
  longitude: number
  name: string
  vegetarianType: VegetarianType
}

interface RestaurantMiniMapProps {
  latitude: number
  longitude: number
  name: string
  vegetarianType?: VegetarianType
  /** Other branches of the same chain, plotted as extra (clickable) pins. */
  branches?: BranchPoint[]
  height?: number
}

/**
 * Small map pinning a restaurant on the detail page. When the restaurant is part of a
 * chain, its other branches are plotted too (clickable, linking to their own pages), and
 * the view fits them all.
 */
export function RestaurantMiniMap({
  latitude,
  longitude,
  name,
  vegetarianType = 'UNKNOWN',
  branches = [],
  height = 260,
}: RestaurantMiniMapProps) {
  return (
    <MapContainer
      center={[latitude, longitude]}
      zoom={16}
      // Scroll wheel is off so the page keeps scrolling normally over the map.
      scrollWheelZoom={false}
      style={{ height, width: '100%' }}
      aria-label={`${name} の地図`}
    >
      <TileLayer url={OSM_TILE_URL} attribution={OSM_ATTRIBUTION} />
      <Marker position={[latitude, longitude]} icon={markerIcon(vegetarianType, true)} title={name} />
      {branches.map((branch) => (
        <Marker
          key={branch.id}
          position={[branch.latitude, branch.longitude]}
          icon={markerIcon(branch.vegetarianType)}
          title={branch.name}
        >
          <Popup>
            <Link to={`/restaurants/${branch.id}`} className="font-display text-sm text-leaf-700">
              {branch.name}
            </Link>
          </Popup>
        </Marker>
      ))}
      <FitToPoints main={[latitude, longitude]} branches={branches} />
    </MapContainer>
  )
}

/** Fits the view to the main pin plus any branches; falls back to a close zoom for one. */
function FitToPoints({ main, branches }: { main: [number, number]; branches: BranchPoint[] }) {
  const map = useMap()
  useEffect(() => {
    if (branches.length === 0) {
      map.setView(main, 16)
      return
    }
    const points: [number, number][] = [main, ...branches.map((b) => [b.latitude, b.longitude] as [number, number])]
    map.fitBounds(points, { padding: [40, 40], maxZoom: 16 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branches])
  return null
}
