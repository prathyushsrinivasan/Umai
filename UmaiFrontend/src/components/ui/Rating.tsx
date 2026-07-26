import { useLanguage } from '../../i18n/useLanguage'
import { formatRating } from '../../lib/labels'

interface RatingProps {
  averageRating: number | null
  reviewCount: number
  /** Google's rating, shown as a fallback when there are no local reviews. */
  googleRating?: number | null
  googleRatingCount?: number | null
  size?: 'sm' | 'md'
}

/**
 * Displays a rating. Prefers the app's own reviews; when a restaurant has none, falls
 * back to Google's star rating (labelled as such). Only when neither exists does it say
 * there's no rating yet — an unrated restaurant is not a badly rated one.
 */
export function Rating({
  averageRating,
  reviewCount,
  googleRating = null,
  googleRatingCount = null,
  size = 'sm',
}: RatingProps) {
  const { t } = useLanguage()
  const textSize = size === 'md' ? 'text-base' : 'text-sm'

  const local = formatRating(averageRating)
  if (local !== null) {
    return (
      <span className={`inline-flex items-baseline gap-1.5 ${textSize}`}>
        <span aria-hidden="true" className="text-apricot-500">
          ★
        </span>
        <span className="font-semibold text-bark-800">{local}</span>
        <span className="text-bark-400">({t.rating.reviews(reviewCount)})</span>
        <span className="sr-only">{`${local} / 5 · ${t.rating.reviews(reviewCount)}`}</span>
      </span>
    )
  }

  const google = formatRating(googleRating)
  if (google !== null) {
    return (
      <span className={`inline-flex items-center gap-1.5 ${textSize}`}>
        <span aria-hidden="true" className="text-apricot-500">
          ★
        </span>
        <span className="font-semibold text-bark-800">{google}</span>
        {googleRatingCount != null && (
          <span className="text-bark-400">({t.rating.reviews(googleRatingCount)})</span>
        )}
        <span className="rounded-pill bg-cream-200 px-1.5 py-0.5 text-[10px] font-medium text-bark-600">
          {t.rating.google}
        </span>
        <span className="sr-only">{`${t.rating.google}: ${google} / 5`}</span>
      </span>
    )
  }

  return <span className={`${textSize} text-bark-400`}>{t.rating.none}</span>
}
