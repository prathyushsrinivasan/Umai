import { MapContainer, Marker, TileLayer } from 'react-leaflet'

import { OSM_ATTRIBUTION, OSM_TILE_URL, restaurantIcon } from '../../lib/leaflet'

interface RestaurantMiniMapProps {
  latitude: number
  longitude: number
  name: string
  height?: number
}

/** Small non-interactive-ish map pinning a single restaurant on the detail page. */
export function RestaurantMiniMap({
  latitude,
  longitude,
  name,
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
      <Marker position={[latitude, longitude]} icon={restaurantIcon} title={name} />
    </MapContainer>
  )
}
