import { useState } from 'react'

interface StarRatingInputProps {
  value: number
  onChange: (value: number) => void
}

const RATINGS = [1, 2, 3, 4, 5]

/**
 * 1–5 star picker.
 *
 * Built from radio inputs rather than clickable icons, so it is keyboard operable
 * and announced as a single-choice group by screen readers. The visible stars are a
 * label for each radio; the inputs themselves are visually hidden.
 */
export function StarRatingInput({ value, onChange }: StarRatingInputProps) {
  const [hovered, setHovered] = useState<number | null>(null)
  const shown = hovered ?? value

  return (
    <div className="flex items-center gap-1" onMouseLeave={() => setHovered(null)}>
      {RATINGS.map((rating) => (
        <label
          key={rating}
          onMouseEnter={() => setHovered(rating)}
          className="cursor-pointer text-3xl leading-none transition-transform hover:scale-110"
        >
          <input
            type="radio"
            name="rating"
            value={rating}
            checked={value === rating}
            onChange={() => onChange(rating)}
            className="sr-only"
          />
          <span
            aria-hidden="true"
            className={rating <= shown ? 'text-apricot-500' : 'text-cream-300'}
          >
            ★
          </span>
          <span className="sr-only">{rating}点</span>
        </label>
      ))}

      <span className="ml-2 text-sm text-bark-400">
        {value > 0 ? `${value} / 5` : '未選択'}
      </span>
    </div>
  )
}
