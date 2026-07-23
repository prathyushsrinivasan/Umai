import { useCallback, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Link } from 'react-router-dom'

import { ApiError } from '../../api/client'
import { createReview, deleteReview, fetchReviews, updateReview } from '../../api/reviews'
import { LoadingState, ErrorState } from '../ui/States'
import { StarRatingInput } from '../ui/StarRatingInput'
import { useAsync } from '../../hooks/useAsync'
import { useAuth } from '../../auth/useAuth'
import type { Review } from '../../types/auth'

interface ReviewSectionProps {
  restaurantId: number
  /** Called after a change, so the detail page can refresh its aggregate rating. */
  onChanged: () => void
}

/** Review list plus the logged-in user's own review form. */
const PAGE_SIZE = 10

export function ReviewSection({ restaurantId, onChanged }: ReviewSectionProps) {
  const { isAuthenticated } = useAuth()
  const [reloadToken, setReloadToken] = useState(0)
  // Pages accumulate rather than replace: reviews read as one growing list.
  const [page, setPage] = useState(0)
  const [loadedPages, setLoadedPages] = useState<Review[]>([])

  const load = useCallback(
    (signal: AbortSignal) => fetchReviews(restaurantId, page, PAGE_SIZE, signal),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [restaurantId, page, reloadToken],
  )
  const { data, loading, error, reload } = useAsync(load)

  // Append each newly-arrived page, keyed so a reload replaces rather than duplicates.
  const [syncedKey, setSyncedKey] = useState<string | null>(null)
  const currentKey = data ? `${reloadToken}:${data.page}` : null
  if (data && currentKey !== syncedKey) {
    setSyncedKey(currentKey)
    setLoadedPages((existing) => {
      const base = data.page === 0 ? [] : existing
      const seen = new Set(base.map((review) => review.id))
      return [...base, ...data.content.filter((review) => !seen.has(review.id))]
    })
  }

  function handleChanged() {
    // A change can reorder or remove entries, so start the list again.
    setPage(0)
    setLoadedPages([])
    setSyncedKey(null)
    setReloadToken((token) => token + 1)
    onChanged()
  }

  const reviews = loadedPages
  const ownReview = reviews.find((review) => review.ownedByCurrentUser) ?? null
  const hasMore = data ? !data.last : false

  return (
    <section className="mt-8" aria-labelledby="reviews-heading">
      <h2 id="reviews-heading" className="text-xl font-semibold text-bark-800">
        レビュー
        {data && data.totalElements > 0 && (
          <span className="ml-2 text-sm font-normal text-bark-400">{data.totalElements}件</span>
        )}
      </h2>

      {isAuthenticated ? (
        <ReviewForm
          restaurantId={restaurantId}
          existingReview={ownReview}
          onChanged={handleChanged}
        />
      ) : (
        <div className="mt-4 rounded-cozy border border-cream-200 bg-white p-6 text-center shadow-soft">
          <p className="text-sm text-bark-600">
            評価や口コミを投稿するにはログインが必要です。
          </p>
          <Link
            to="/login"
            className="mt-4 inline-block rounded-pill bg-leaf-500 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-leaf-600"
          >
            ログイン / 新規登録
          </Link>
        </div>
      )}

      <div className="mt-6">
        {loading && reviews.length === 0 && <LoadingState label="レビューを読み込んでいます…" />}
        {error && <ErrorState onRetry={reload} />}

        {data && reviews.length === 0 && !loading && (
          <p className="rounded-cozy border border-cream-200 bg-white p-8 text-center text-sm text-bark-600 shadow-soft">
            まだレビューがありません
          </p>
        )}

        <ul className="space-y-3">
          <AnimatePresence initial={false}>
            {reviews.map((review) => (
              <motion.li
                key={review.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25 }}
                className="rounded-cozy border border-cream-200 bg-white p-5 shadow-soft"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-bark-800">{review.username}</span>
                    {review.ownedByCurrentUser && (
                      <span className="rounded-pill bg-leaf-100 px-2.5 py-0.5 text-xs text-leaf-700">
                        あなた
                      </span>
                    )}
                  </div>
                  <Stars rating={review.rating} />
                </div>

                {review.comment && (
                  <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-bark-600">
                    {review.comment}
                  </p>
                )}

                <p className="mt-3 text-xs text-bark-400">
                  <time dateTime={review.createdAt}>
                    {new Date(review.createdAt).toLocaleDateString('ja-JP')}
                  </time>
                  {review.updatedAt !== review.createdAt && '（編集済み）'}
                </p>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>

        {hasMore && (
          <button
            type="button"
            onClick={() => setPage((current) => current + 1)}
            disabled={loading}
            className="mt-4 w-full cursor-pointer rounded-pill border border-cream-300 bg-white py-2.5 text-sm font-medium text-bark-600 transition-colors hover:border-leaf-300 hover:text-leaf-700 disabled:opacity-60"
          >
            {loading ? '読み込み中…' : `さらに表示（残り${(data?.totalElements ?? 0) - reviews.length}件）`}
          </button>
        )}
      </div>
    </section>
  )
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="text-apricot-500" aria-label={`5点満点中${rating}点`}>
      <span aria-hidden="true">{'★'.repeat(rating)}</span>
      <span aria-hidden="true" className="text-cream-300">
        {'★'.repeat(5 - rating)}
      </span>
    </span>
  )
}

interface ReviewFormProps {
  restaurantId: number
  existingReview: Review | null
  onChanged: () => void
}

/**
 * Posts a new review, or edits/deletes the user's existing one.
 *
 * A user holds at most one review per restaurant, so the form switches to edit mode
 * automatically rather than letting them create a duplicate that the API would reject.
 */
function ReviewForm({ restaurantId, existingReview, onChanged }: ReviewFormProps) {
  const [rating, setRating] = useState(existingReview?.rating ?? 0)
  const [comment, setComment] = useState(existingReview?.comment ?? '')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [editing, setEditing] = useState(existingReview === null)

  // Reset the fields when the loaded review changes underneath us.
  const [syncedId, setSyncedId] = useState(existingReview?.id ?? null)
  if ((existingReview?.id ?? null) !== syncedId) {
    setSyncedId(existingReview?.id ?? null)
    setRating(existingReview?.rating ?? 0)
    setComment(existingReview?.comment ?? '')
    setEditing(existingReview === null)
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()

    if (rating < 1) {
      setError('評価を選択してください。')
      return
    }

    setError(null)
    setSubmitting(true)

    try {
      const payload = { rating, comment: comment.trim() || undefined }
      if (existingReview) {
        await updateReview(restaurantId, existingReview.id, payload)
      } else {
        await createReview(restaurantId, payload)
      }
      setEditing(false)
      onChanged()
    } catch (cause) {
      setError(
        cause instanceof ApiError ? cause.message : '送信に失敗しました。もう一度お試しください。',
      )
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!existingReview) return

    setSubmitting(true)
    setError(null)

    try {
      await deleteReview(restaurantId, existingReview.id)
      setRating(0)
      setComment('')
      setEditing(true)
      onChanged()
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : '削除に失敗しました。')
    } finally {
      setSubmitting(false)
    }
  }

  if (existingReview && !editing) {
    return (
      <div className="mt-4 rounded-cozy border border-leaf-200 bg-leaf-50 p-5">
        <p className="text-sm text-bark-600">このお店にはレビューを投稿済みです。</p>
        <div className="mt-3 flex gap-3">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="cursor-pointer rounded-pill bg-white px-5 py-2 text-sm font-medium text-leaf-700 shadow-soft transition-colors hover:bg-cream-50"
          >
            編集する
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={submitting}
            className="cursor-pointer rounded-pill px-5 py-2 text-sm text-bark-600 transition-colors hover:text-berry-500 disabled:opacity-60"
          >
            削除する
          </button>
        </div>
        {error && (
          <p role="alert" className="mt-3 text-sm text-berry-500">
            {error}
          </p>
        )}
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-4 rounded-cozy border border-cream-200 bg-white p-6 shadow-soft"
    >
      <fieldset>
        <legend className="text-sm font-medium text-bark-600">評価</legend>
        <div className="mt-2">
          <StarRatingInput value={rating} onChange={setRating} />
        </div>
      </fieldset>

      <div className="mt-5">
        <label htmlFor="comment" className="block text-sm font-medium text-bark-600">
          口コミ（任意）
        </label>
        <textarea
          id="comment"
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          rows={4}
          maxLength={2000}
          placeholder="感想をどうぞ（任意）"
          className="mt-1.5 w-full rounded-cozy border border-cream-300 px-4 py-3 text-bark-800 transition-colors placeholder:text-bark-400 focus:border-leaf-400 focus:outline-none focus:ring-3 focus:ring-leaf-100"
        />
        <p className="mt-1 text-right text-xs text-bark-400">{comment.length} / 2000</p>
      </div>

      {error && (
        <p role="alert" className="mt-3 rounded-cozy bg-apricot-300/25 px-4 py-2.5 text-sm text-bark-800">
          {error}
        </p>
      )}

      <div className="mt-4 flex gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="cursor-pointer rounded-pill bg-leaf-500 px-6 py-2.5 text-white shadow-soft transition-colors hover:bg-leaf-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? '送信中…' : existingReview ? '更新する' : '投稿する'}
        </button>

        {existingReview && (
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="cursor-pointer rounded-pill px-6 py-2.5 text-bark-600 transition-colors hover:text-bark-800"
          >
            キャンセル
          </button>
        )}
      </div>
    </form>
  )
}
