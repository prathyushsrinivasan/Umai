import { motion } from 'motion/react'

interface ChipProps {
  label: string
  selected?: boolean
  onClick?: () => void
  /** Renders as a static label rather than a control. */
  readOnly?: boolean
  className?: string
}

/**
 * Pill-shaped label, used both as a filter toggle and as a static badge on cards.
 *
 * Selected state is conveyed by colour *and* `aria-pressed`, so it is not
 * colour-only information.
 */
export function Chip({ label, selected = false, onClick, readOnly = false, className = '' }: ChipProps) {
  const base = 'inline-flex items-center rounded-pill px-3.5 py-1.5 text-sm transition-colors'

  if (readOnly) {
    return <span className={`${base} ${className || 'bg-cream-100 text-bark-600'}`}>{label}</span>
  }

  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      whileTap={{ scale: 0.96 }}
      transition={{ duration: 0.15 }}
      className={`${base} cursor-pointer border ${
        selected
          ? 'border-leaf-500 bg-leaf-500 font-medium text-white shadow-soft'
          : 'border-cream-300 bg-white text-bark-600 hover:border-leaf-300 hover:text-leaf-700'
      } ${className}`}
    >
      {label}
    </motion.button>
  )
}
