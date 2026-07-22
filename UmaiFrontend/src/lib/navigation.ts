/** Primary navigation, shared by the header and the mobile menu. */
export interface NavItem {
  to: string
  label: string
  icon: string
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/map', label: 'マップから探す', icon: '🗺️' },
  { to: '/search', label: 'お店を探す', icon: '🔍' },
  { to: '/categories', label: 'タイプから探す', icon: '🍚' },
]
