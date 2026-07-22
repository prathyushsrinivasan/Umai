import { formatRating } from '../../lib/labels'

interface RatingProps {
  averageRating: number | null
  reviewCount: number
  size?: 'sm' | 'md'
}

/**
 * Displays an average rating.
 *
 * A restaurant with no reviews shows 「まだ評価がありません」 rather than 0.0 — an
 * unrated restaurant is not a badly rated one.
 */
export function Rating({ averageRating, reviewCount, size = 'sm' }: RatingProps) {
  const formatted = formatRating(averageRating)
  const textSize = size === 'md' ? 'text-base' : 'text-sm'

  if (formatted === null) {
    return <span className={`${textSize} text-bark-400`}>まだ評価がありません</span>
  }

  return (
    <span className={`inline-flex items-baseline gap-1.5 ${textSize}`}>
      <span aria-hidden="true" className="text-apricot-500">
        ★
      </span>
      <span className="font-semibold text-bark-800">{formatted}</span>
      <span className="text-bark-400">({reviewCount}件)</span>
      <span className="sr-only">5点満点中{formatted}点、レビュー{reviewCount}件</span>
    </span>
  )
}
