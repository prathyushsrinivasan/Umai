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
 *
 * Degenerate (zero-area) bounds are ignored: on first paint the map can briefly report a
 * collapsed viewport before it has been laid out, which would otherwise fire a request
 * that returns nothing and flashes an empty "no restaurants" state.
 */
export function MapBoundsWatcher({ onBoundsChange, debounceMs = 400 }: MapBoundsWatcherProps) {
  const map = useMap()
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function emit() {
    const bounds = map.getBounds()
    const minLat = bounds.getSouth()
    const maxLat = bounds.getNorth()
    const minLon = bounds.getWest()
    const maxLon = bounds.getEast()
    // Skip a collapsed viewport (map not sized yet) — it matches nothing.
    if (maxLat - minLat < 1e-6 || maxLon - minLon < 1e-6) return
    onBoundsChange({ minLat, minLon, maxLat, maxLon })
  }

  function report() {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(emit, debounceMs)
  }

  useMapEvents({ moveend: report, zoomend: report })

  // Report the initial viewport too, so the list is populated before any interaction.
  // invalidateSize first, in case the map mounted before its container had a height.
  useEffect(() => {
    map.invalidateSize()
    emit()

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
    // Runs once on mount; later changes arrive through the map events above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map])

  return null
}
