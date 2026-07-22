import { useEffect, useState } from 'react'

import { fetchHealth } from '../api/health'

export type BackendStatus = 'loading' | 'online' | 'offline'

/**
 * Reports whether the frontend can reach the backend API.
 *
 * Used during setup to make frontend/backend integration visible rather than
 * something you discover only when a feature silently fails.
 */
export function useBackendStatus(): BackendStatus {
  const [status, setStatus] = useState<BackendStatus>('loading')

  useEffect(() => {
    const controller = new AbortController()

    fetchHealth(controller.signal)
      .then((health) => setStatus(health.status === 'UP' ? 'online' : 'offline'))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return
        setStatus('offline')
      })

    return () => controller.abort()
  }, [])

  return status
}
