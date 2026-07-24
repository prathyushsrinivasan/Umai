import { useState } from 'react'

import { categoryLabel } from '../../i18n/dataLabels'
import { useLanguage } from '../../i18n/useLanguage'
import { Icon } from '../ui/Icon'
import type { Category } from '../../types/restaurant'

interface RestaurantPhotoProps {
  imageUrl: string | null
  name: string
  categories?: Category[]
  className?: string
}

/**
 * A restaurant's photo, with an on-brand fallback.
 *
 * Real photos are rare in the source data (OpenStreetMap almost never has one), so the
 * common case is the fallback: a soft cuisine-tinted panel with the leaf mark and the
 * restaurant's name. It is deliberately NOT a stock photo of some other restaurant —
 * that would misrepresent a real place. If a real image URL is present but fails to
 * load, we fall back to the same panel rather than showing a broken image.
 *
 * `className` fully controls sizing (width/height) — it is not merged with a
 * hardcoded `w-full` here, so callers can size this as a full-width banner, a
 * fixed-size thumbnail, or anything else without a class-conflict fight.
 */
export function RestaurantPhoto({ imageUrl, name, categories, className = 'h-48 w-full' }: RestaurantPhotoProps) {
  const [failed, setFailed] = useState(false)
  const { lang } = useLanguage()

  if (imageUrl && !failed) {
    return (
      <img
        src={imageUrl}
        alt={name}
        loading="lazy"
        onError={() => setFailed(true)}
        // object-bottom, not the object-cover default of center: these are almost all
        // building-exterior shots taken from street level, so the storefront and
        // entrance — the part that actually identifies the restaurant — sits low in
        // the frame, with sky/upper floors above it. Centering the crop cuts off
        // exactly the part a small thumbnail most needs to show.
        className={`object-cover object-bottom ${className}`}
      />
    )
  }

  const cuisine = categories?.[0] ? categoryLabel(categories[0], lang) : undefined
  return (
    <div
      aria-hidden="true"
      className={`flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-leaf-100 via-leaf-50 to-cream-100 ${className}`}
    >
      <Icon name="leaf" className="size-10 text-leaf-400" />
      <span className="px-4 text-center text-sm font-medium text-leaf-700/80">{cuisine ?? name}</span>
    </div>
  )
}
