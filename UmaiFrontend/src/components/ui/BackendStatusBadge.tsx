import { useBackendStatus } from '../../hooks/useBackendStatus'

const LABELS: Record<ReturnType<typeof useBackendStatus>, string> = {
  loading: 'サーバーに接続中…',
  online: 'サーバーに接続できました',
  offline: 'サーバーに接続できません',
}

const STYLES: Record<ReturnType<typeof useBackendStatus>, string> = {
  loading: 'bg-cream-100 text-bark-600',
  online: 'bg-leaf-100 text-leaf-700',
  offline: 'bg-apricot-300/40 text-bark-800',
}

/**
 * Shows whether the API is reachable. This is a setup aid for developers and is
 * expected to be replaced by real content on the homepage in a later phase.
 */
export function BackendStatusBadge() {
  const status = useBackendStatus()

  return (
    <span
      role="status"
      className={`inline-flex items-center gap-2 rounded-pill px-4 py-1.5 text-sm font-medium ${STYLES[status]}`}
    >
      <span
        aria-hidden="true"
        className={`size-2 rounded-pill ${
          status === 'online'
            ? 'bg-leaf-500'
            : status === 'offline'
              ? 'bg-apricot-500'
              : 'animate-pulse bg-bark-400'
        }`}
      />
      {LABELS[status]}
    </span>
  )
}
