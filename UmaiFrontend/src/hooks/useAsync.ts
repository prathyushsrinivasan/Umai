import { useCallback, useEffect, useState } from 'react'

export interface AsyncState<T> {
  data: T | null
  loading: boolean
  error: Error | null
  /** Re-runs the request, e.g. from a "retry" button. */
  reload: () => void
}

/**
 * Runs an async request and exposes explicit loading/error/data states, so every
 * screen can render all three rather than silently showing nothing on failure.
 *
 * The request receives an AbortSignal and is cancelled when dependencies change or
 * the component unmounts, preventing a slow response from overwriting a newer one.
 *
 * @param request  the call to run; must be stable (wrap in useCallback)
 */
export function useAsync<T>(request: (signal: AbortSignal) => Promise<T>): AsyncState<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  const reload = useCallback(() => setReloadToken((token) => token + 1), [])

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError(null)

    request(controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return
        setData(result)
        setLoading(false)
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return
        setError(cause instanceof Error ? cause : new Error(String(cause)))
        setLoading(false)
      })

    return () => controller.abort()
  }, [request, reloadToken])

  return { data, loading, error, reload }
}
