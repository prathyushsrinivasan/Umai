/**
 * Loading, error and empty states.
 *
 * Every screen that fetches data renders all three, so a failure or an empty result
 * is always explained rather than shown as a blank area.
 */
import { Icon } from './Icon'

interface LoadingStateProps {
  label?: string
}

export function LoadingState({ label = '読み込み中…' }: LoadingStateProps) {
  return (
    <div role="status" className="flex flex-col items-center gap-3 py-16 text-bark-400">
      <span
        aria-hidden="true"
        className="size-8 animate-spin rounded-pill border-3 border-cream-200 border-t-leaf-500"
      />
      <p className="text-sm">{label}</p>
    </div>
  )
}

/** Skeleton cards, used where the page shape is known before data arrives. */
export function CardSkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div role="status" aria-label="読み込み中" className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className="animate-pulse rounded-cozy border border-cream-200 bg-white p-5 shadow-soft"
        >
          <div className="h-4 w-2/3 rounded-pill bg-cream-200" />
          <div className="mt-3 h-3 w-full rounded-pill bg-cream-100" />
          <div className="mt-2 h-3 w-4/5 rounded-pill bg-cream-100" />
          <div className="mt-5 h-6 w-24 rounded-pill bg-cream-100" />
        </div>
      ))}
    </div>
  )
}

interface ErrorStateProps {
  message?: string
  onRetry?: () => void
}

export function ErrorState({
  message = 'データの取得に失敗しました。時間をおいてもう一度お試しください。',
  onRetry,
}: ErrorStateProps) {
  return (
    <div role="alert" className="rounded-cozy border border-apricot-300 bg-apricot-300/15 p-8 text-center">
      <Icon name="sprout" className="mx-auto size-8 text-apricot-500" />
      <p className="mt-3 text-bark-800">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-5 cursor-pointer rounded-pill bg-leaf-500 px-6 py-2 font-medium text-white transition-colors hover:bg-leaf-600"
        >
          再読み込み
        </button>
      )}
    </div>
  )
}

interface EmptyStateProps {
  title?: string
  description?: string
  children?: React.ReactNode
}

export function EmptyState({
  title = 'お店が見つかりませんでした',
  description = '条件を変えて、もう一度お試しください。',
  children,
}: EmptyStateProps) {
  return (
    <div className="rounded-cozy border border-cream-200 bg-white p-12 text-center shadow-soft">
      <Icon name="sprout" className="mx-auto size-10 text-leaf-400" />
      <h2 className="mt-4 font-bold text-bark-800">{title}</h2>
      <p className="mt-2 text-sm text-bark-600">{description}</p>
      {children && <div className="mt-6">{children}</div>}
    </div>
  )
}
