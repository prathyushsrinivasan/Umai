/**
 * Loading, error and empty states.
 *
 * Every screen that fetches data renders all three, so a failure or an empty result
 * is always explained rather than shown as a blank area.
 */
import { useLanguage } from '../../i18n/useLanguage'
import { Mascot } from './Mascot'

interface LoadingStateProps {
  label?: string
}

export function LoadingState({ label }: LoadingStateProps) {
  const { t } = useLanguage()
  return (
    <div role="status" className="flex flex-col items-center gap-3 py-16 text-bark-400">
      <Mascot mood="sleepy" size={44} className="animate-bounce" />
      <p className="text-sm">{label ?? t.states.loading}</p>
    </div>
  )
}

/** Skeleton cards, used where the page shape is known before data arrives. */
export function CardSkeletonGrid({ count = 6 }: { count?: number }) {
  const { t } = useLanguage()
  return (
    <div role="status" aria-label={t.states.loading} className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
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

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  const { t } = useLanguage()
  return (
    <div role="alert" className="rounded-cozy border border-apricot-300 bg-apricot-300/15 p-8 text-center">
      <Mascot mood="sad" size={56} className="mx-auto" />
      <p className="mt-3 text-bark-800">{message ?? t.states.error}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-5 cursor-pointer rounded-pill bg-leaf-500 px-6 py-2 font-medium text-white transition-colors hover:bg-leaf-600"
        >
          {t.states.retry}
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

export function EmptyState({ title, description, children }: EmptyStateProps) {
  const { t } = useLanguage()
  return (
    <div className="rounded-cozy border border-cream-200 bg-white p-12 text-center shadow-soft">
      <Mascot mood="crying" size={64} className="mx-auto" />
      <h2 className="mt-4 font-bold text-bark-800">{title ?? t.states.emptyTitle}</h2>
      <p className="mt-2 text-sm text-bark-600">{description ?? t.states.emptyDescription}</p>
      {children && <div className="mt-6">{children}</div>}
    </div>
  )
}
