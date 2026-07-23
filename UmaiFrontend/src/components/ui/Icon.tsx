import type { SVGProps } from 'react'

/**
 * The app's single icon set. Custom, hand-drawn line icons on a 24×24 grid, in the
 * same stroke style as the brand mark — no emoji, no icon-font dependency, and every
 * glyph inherits `currentColor` so it takes the surrounding text colour.
 *
 * Usage: <Icon name="search" className="size-5" />. Size and colour come from
 * className (e.g. `size-5 text-leaf-600`); decorative by default (aria-hidden), pass
 * a `title` for the rare standalone icon that must be announced.
 */
export type IconName =
  | 'search'
  | 'map'
  | 'pin'
  | 'leaf'
  | 'sprout'
  | 'plate'
  | 'arrow-right'
  | 'plus'
  | 'person'
  | 'logout'
  | 'menu'
  | 'close'
  | 'globe'
  | 'phone'
  | 'clock'
  | 'filter'

/** Path/shape markup per icon. Stroke icons inherit the shared attrs below; the leaf
 *  and sprout mix fill and stroke, so they set their own. */
const ICONS: Record<IconName, React.ReactNode> = {
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16l4.5 4.5" />
    </>
  ),
  map: (
    <>
      <path d="M9 4 3.5 6v14L9 18l6 2 5.5-2V4L15 6 9 4Z" />
      <path d="M9 4v14M15 6v14" />
    </>
  ),
  pin: (
    <>
      <path d="M12 21c4.5-4.2 7-7.6 7-11a7 7 0 1 0-14 0c0 3.4 2.5 6.8 7 11Z" />
      <circle cx="12" cy="10" r="2.6" />
    </>
  ),
  leaf: (
    <path
      d="M20 4c0 9-5.5 14-12 14-1 0-2-.2-2.8-.5C6 11 11 6.5 20 4Z M4 20c1-4.5 3.5-8 7.5-10"
      fill="currentColor"
      fillOpacity="0.15"
    />
  ),
  sprout: (
    <>
      <path d="M12 20v-7" />
      <path d="M12 13c0-3 2.4-5.4 5.5-5.4C17.5 10.6 15 13 12 13Z" fill="currentColor" fillOpacity="0.15" />
      <path d="M12 13c0-2.6-2.1-4.7-4.8-4.7C7.2 11 9.3 13 12 13Z" fill="currentColor" fillOpacity="0.15" />
    </>
  ),
  plate: (
    <>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="3.4" />
    </>
  ),
  'arrow-right': <path d="M5 12h14M13 6l6 6-6 6" />,
  plus: <path d="M12 5v14M5 12h14" />,
  person: (
    <>
      <circle cx="12" cy="8" r="3.2" />
      <path d="M5 20c1.2-4 4-6 7-6s5.8 2 7 6" />
    </>
  ),
  logout: <path d="M9 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h3M15 8l4 4-4 4M19 12H9" />,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  globe: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.5 12h17M12 3.5c2.5 2.5 2.5 14.5 0 17M12 3.5c-2.5 2.5-2.5 14.5 0 17" />
    </>
  ),
  phone: (
    <path d="M6 4h3l1.5 4-2 1.5a11 11 0 0 0 5 5l1.5-2 4 1.5V22a1 1 0 0 1-1 1A17 17 0 0 1 5 5a1 1 0 0 1 1-1Z" />
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  filter: <path d="M4 6h16M7 12h10M10 18h4" />,
}

interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: IconName
  /** When set, the icon is announced to assistive tech with this label. */
  title?: string
}

export function Icon({ name, title, className, ...rest }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      {...rest}
    >
      {ICONS[name]}
    </svg>
  )
}
