import { useCallback, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Link } from 'react-router-dom'

import { ApiError } from '../api/client'
import {
  approveRestaurant,
  fetchModerationQueue,
  rejectRestaurant,
  type RestaurantStatus,
} from '../api/moderation'
import { Chip } from '../components/ui/Chip'
import { EmptyState, ErrorState, LoadingState } from '../components/ui/States'
import { useAsync } from '../hooks/useAsync'
import { VEGETARIAN_TYPE_LABELS, VEGETARIAN_TYPE_STYLES } from '../lib/labels'

const TABS: Array<{ status: RestaurantStatus; label: string }> = [
  { status: 'PENDING', label: '承認待ち' },
  { status: 'PUBLISHED', label: '公開中' },
  { status: 'REJECTED', label: '却下' },
]

/**
 * Moderation queue for submitted restaurants.
 *
 * Without this screen, holding submissions as PENDING would make them invisible to
 * everyone including their author — so `SUBMISSIONS_AUTO_PUBLISH=false` would be an
 * unusable setting rather than a safer one.
 */
export function ModerationPage() {
  const [status, setStatus] = useState<RestaurantStatus>('PENDING')
  const [reloadToken, setReloadToken] = useState(0)
  const [actioningId, setActioningId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(
    (signal: AbortSignal) => fetchModerationQueue(status, 0, signal),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [status, reloadToken],
  )
  const queue = useAsync(load)

  async function act(id: number, action: 'approve' | 'reject') {
    setActioningId(id)
    setError(null)

    try {
      await (action === 'approve' ? approveRestaurant(id) : rejectRestaurant(id))
      setReloadToken((token) => token + 1)
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : '操作に失敗しました。')
    } finally {
      setActioningId(null)
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-5 py-10">
      <header>
        <h1 className="text-2xl font-bold text-bark-800">モデレーション</h1>
        <p className="mt-1 text-sm text-bark-600">
          投稿されたお店を確認して、公開または却下します。
        </p>
      </header>

      <div role="tablist" aria-label="状態で絞り込み" className="mt-6 flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <Chip
            key={tab.status}
            label={tab.label}
            selected={status === tab.status}
            onClick={() => setStatus(tab.status)}
          />
        ))}
      </div>

      {error && (
        <p role="alert" className="mt-4 rounded-cozy bg-apricot-300/25 px-4 py-3 text-sm text-bark-800">
          {error}
        </p>
      )}

      <div className="mt-6">
        {queue.loading && <LoadingState />}
        {queue.error && <ErrorState onRetry={queue.reload} />}

        {queue.data && queue.data.totalElements === 0 && (
          <EmptyState
            title={status === 'PENDING' ? '承認待ちのお店はありません' : '該当するお店はありません'}
            description={
              status === 'PENDING'
                ? '新しい投稿があるとここに表示されます。'
                : '別の状態を選択してみてください。'
            }
          />
        )}

        <ul className="space-y-3">
          <AnimatePresence initial={false}>
            {queue.data?.content.map((restaurant) => (
              <motion.li
                key={restaurant.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="rounded-cozy border border-cream-200 bg-white p-5 shadow-soft"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <span
                      className={`inline-block rounded-pill px-2.5 py-0.5 text-xs font-medium ${VEGETARIAN_TYPE_STYLES[restaurant.vegetarianType]}`}
                    >
                      {VEGETARIAN_TYPE_LABELS[restaurant.vegetarianType]}
                    </span>

                    <h2 className="mt-2 font-bold text-bark-800">
                      <Link
                        to={`/restaurants/${restaurant.id}`}
                        className="transition-colors hover:text-leaf-600"
                      >
                        {restaurant.name}
                      </Link>
                    </h2>

                    {restaurant.address && (
                      <p className="mt-1 text-sm text-bark-600">{restaurant.address}</p>
                    )}
                    {restaurant.description && (
                      <p className="mt-2 line-clamp-2 text-sm text-bark-600">
                        {restaurant.description}
                      </p>
                    )}
                  </div>

                  <div className="flex shrink-0 gap-2">
                    {status !== 'PUBLISHED' && (
                      <button
                        type="button"
                        disabled={actioningId === restaurant.id}
                        onClick={() => act(restaurant.id, 'approve')}
                        className="cursor-pointer rounded-pill bg-leaf-500 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-leaf-600 disabled:opacity-60"
                      >
                        公開する
                      </button>
                    )}
                    {status !== 'REJECTED' && (
                      <button
                        type="button"
                        disabled={actioningId === restaurant.id}
                        onClick={() => act(restaurant.id, 'reject')}
                        className="cursor-pointer rounded-pill border border-cream-300 px-5 py-2 text-sm text-bark-600 transition-colors hover:border-berry-500 hover:text-berry-500 disabled:opacity-60"
                      >
                        却下する
                      </button>
                    )}
                  </div>
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      </div>
    </div>
  )
}
