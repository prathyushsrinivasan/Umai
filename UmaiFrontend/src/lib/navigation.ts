import type { IconName } from '../components/ui/Icon'

/** Primary navigation, shared by the header and the mobile menu. */
export interface NavItem {
  to: string
  label: string
  icon: IconName
}

/**
 * Browsing now lives entirely on the map-first home, so there are no separate
 * "map / search / categories" destinations to list. The header keeps just the brand
 * link home plus the account/add actions. Kept as an array so re-introducing a
 * top-level destination later is a one-line change.
 */
export const NAV_ITEMS: NavItem[] = []
