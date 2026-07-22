import { useEffect, useRef } from 'react'
import { useMap, useMapEvents } from 'react-leaflet'

import type { MapBounds } from '../../types/restaurant'

interface MapBoundsWatcherProps {
  onBoundsChange: (bounds: MapBounds) => void
  /** Delay before reporting, so a drag does not fire a request per frame. */
  debounceMs?: number
}

/**
 * Reports the map's visible bounds whenever the user finishes panning or zooming.
 *
 * Debounced because `moveend` fires on every interaction; without it, dragging across
 * Tokyo would issue a burst of overlapping requests.
 */
export function MapBoundsWatcher({ onBoundsChange, debounceMs = 400 }: MapBoundsWatcherProps) {
  const map = useMap()
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function report() {
    if (timerRef.current) clearTimeout(timerRef.current)

    timerRef.current = setTimeout(() => {
      const bounds = map.getBounds()
      onBoundsChange({
        minLat: bounds.getSouth(),
        minLon: bounds.getWest(),
        maxLat: bounds.getNorth(),
        maxLon: bounds.getEast(),
      })
    }, debounceMs)
  }

  useMapEvents({ moveend: report, zoomend: report })

  // Report the initial viewport too, so the list is populated before any interaction.
  useEffect(() => {
    const bounds = map.getBounds()
    onBoundsChange({
      minLat: bounds.getSouth(),
      minLon: bounds.getWest(),
      maxLat: bounds.getNorth(),
      maxLon: bounds.getEast(),
    })

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
    // Runs once on mount; later changes arrive through the map events above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map])

  return null
}
