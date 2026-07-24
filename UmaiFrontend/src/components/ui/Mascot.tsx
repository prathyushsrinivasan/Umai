import type { SVGProps } from 'react'

interface MascotProps extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  /**
   * Facial expression: happy (default), sad (errors), crying (no results found), or
   * sleepy (loading).
   */
  mood?: 'happy' | 'sad' | 'crying' | 'sleepy'
  size?: number
}

/**
 * "Mochi", Umai's mascot — a plump little sprout with a face. Extends the leaf/sprout
 * motif already used by <Icon name="leaf" /> instead of introducing an unrelated
 * character, so the brand stays coherent. One consistent body, four expressions for
 * the states where a mascot adds warmth (empty, error, loading).
 */
export function Mascot({ mood = 'happy', size = 48, className, ...rest }: MascotProps) {
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-hidden="true"
      {...rest}
    >
      {/* Sprout leaves */}
      <path
        d="M50 32c-2-11-11-17-21-17 2 11 9 18 21 19Z"
        fill="#9bcf94"
        stroke="#3a7c36"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M50 32c2-13 13-20 24-19-2 13-11 21-24 21Z"
        fill="#6eb565"
        stroke="#3a7c36"
        strokeWidth="2"
        strokeLinejoin="round"
      />

      {/* Body */}
      <path
        d="M50 34c16 0 27 12 27 28 0 15-12 24-27 24S23 77 23 62c0-16 11-28 27-28Z"
        fill="#4c9a45"
        stroke="#30622e"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />

      {/* Cheeks */}
      <ellipse cx="34" cy="66" rx="5" ry="3.5" fill="#f8c98f" opacity="0.75" />
      <ellipse cx="66" cy="66" rx="5" ry="3.5" fill="#f8c98f" opacity="0.75" />

      {mood === 'happy' && (
        <>
          <circle cx="41" cy="58" r="3.4" fill="#2a4e29" />
          <circle cx="59" cy="58" r="3.4" fill="#2a4e29" />
          <path
            d="M41 68c3.5 3.5 14.5 3.5 18 0"
            fill="none"
            stroke="#2a4e29"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
        </>
      )}

      {mood === 'sad' && (
        <>
          <path d="M37 56.5 44 60M63 56.5 56 60" stroke="#2a4e29" strokeWidth="2.4" strokeLinecap="round" />
          <circle cx="41" cy="60" r="2.8" fill="#2a4e29" />
          <circle cx="59" cy="60" r="2.8" fill="#2a4e29" />
          <path d="M42 71c3-3 13-3 16 0" fill="none" stroke="#2a4e29" strokeWidth="2.4" strokeLinecap="round" />
        </>
      )}

      {mood === 'crying' && (
        <>
          <path d="M37 56.5 44 60M63 56.5 56 60" stroke="#2a4e29" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M38 61c1.5-2.2 4-2.2 5.5 0M56.5 61c1.5-2.2 4-2.2 5.5 0" fill="none" stroke="#2a4e29" strokeWidth="2.4" strokeLinecap="round" />
          <ellipse cx="50" cy="70.5" rx="6" ry="4.5" fill="#2a4e29" />
          <path
            d="M40 63c-2.5 3.5-2.5 7 0 9 2.5-2 2.5-5.5 0-9Z"
            fill="#7ec4e8"
            stroke="#3a7c36"
            strokeWidth="1"
          />
          <path
            d="M60 63c-2.5 3.5-2.5 7 0 9 2.5-2 2.5-5.5 0-9Z"
            fill="#7ec4e8"
            stroke="#3a7c36"
            strokeWidth="1"
          />
        </>
      )}

      {mood === 'sleepy' && (
        <>
          <path d="M37 58c2 2 6 2 8 0M55 58c2 2 6 2 8 0" fill="none" stroke="#2a4e29" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M43 69c2.5 1.8 11.5 1.8 14 0" fill="none" stroke="#2a4e29" strokeWidth="2.2" strokeLinecap="round" />
        </>
      )}
    </svg>
  )
}
