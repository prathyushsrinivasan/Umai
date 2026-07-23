import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { useEffect } from 'react'

import { NAV_ITEMS } from '../../lib/navigation'
import { useAuth } from '../../auth/useAuth'

/**
 * Site header with responsive navigation: inline links on desktop, a disclosure
 * menu on mobile.
 */
export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()
  const { user, logout } = useAuth()

  // Navigating from within the mobile menu should close it.
  useEffect(() => setMenuOpen(false), [location.pathname])

  return (
    <header className="sticky top-0 z-[1000] border-b border-cream-200/80 bg-cream-50/90 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3.5">
        <Link
          to="/"
          className="flex shrink-0 items-center gap-2.5 rounded-pill py-1 transition-colors hover:text-leaf-600"
        >
          <LeafMark />
          <span className="font-display text-xl tracking-wide">Umai</span>
        </Link>

        <nav aria-label="メインナビゲーション" className="hidden items-center gap-1 md:flex">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-1.5 rounded-pill px-4 py-2 text-sm transition-colors ${
                  isActive ? 'bg-leaf-100 font-medium text-leaf-700' : 'text-bark-600 hover:bg-cream-100'
                }`
              }
            >
              <span aria-hidden="true">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            to="/restaurants/new"
            aria-label="レストラン追加"
            className="sketchy-edge hidden items-center justify-center rounded-pill bg-leaf-500 p-2.5 text-white shadow-soft transition-colors hover:bg-leaf-600 sm:flex"
          >
            <PlusIcon />
          </Link>

          {user ? (
            <div className="hidden items-center gap-2 sm:flex">
              {(user.role === 'ADMIN' || user.role === 'MODERATOR') && (
                <Link
                  to="/moderation"
                  className="rounded-pill border border-cream-300 px-4 py-2 text-sm text-bark-600 transition-colors hover:border-leaf-300 hover:text-leaf-700"
                >
                  モデレーション
                </Link>
              )}
              <span className="rounded-pill bg-leaf-100 px-4 py-2 text-sm font-medium text-leaf-700">
                {user.username}
              </span>
              <button
                type="button"
                onClick={logout}
                aria-label="ログアウト"
                className="flex cursor-pointer items-center justify-center rounded-pill border border-cream-300 p-2.5 text-bark-600 transition-colors hover:border-leaf-300 hover:text-leaf-700"
              >
                <LogoutIcon />
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              aria-label="ログイン"
              className="hidden items-center justify-center rounded-pill border border-cream-300 p-2.5 text-bark-600 transition-colors hover:border-leaf-300 hover:text-leaf-700 sm:flex"
            >
              <PersonIcon />
            </Link>
          )}

          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            aria-label="メニューを開閉"
            className="cursor-pointer rounded-pill p-2 text-bark-600 transition-colors hover:bg-cream-100 md:hidden"
          >
            <svg viewBox="0 0 24 24" fill="none" className="size-6">
              <path
                d={menuOpen ? 'M6 6l12 12M18 6L6 18' : 'M4 7h16M4 12h16M4 17h16'}
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.nav
            id="mobile-menu"
            aria-label="モバイルナビゲーション"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="overflow-hidden border-t border-cream-200 bg-cream-50 md:hidden"
          >
            <ul className="mx-auto max-w-6xl px-5 py-3">
              {[
                ...NAV_ITEMS,
                { to: '/restaurants/new', label: 'レストラン追加', icon: '✏️' },
                // Signed-in users get a logout action instead of a login link.
                ...(user ? [] : [{ to: '/login', label: 'ログイン', icon: '👤' }]),
              ].map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-cozy px-3 py-3 transition-colors ${
                        isActive ? 'bg-leaf-100 font-medium text-leaf-700' : 'text-bark-600 hover:bg-cream-100'
                      }`
                    }
                  >
                    <span aria-hidden="true">{item.icon}</span>
                    {item.label}
                  </NavLink>
                </li>
              ))}

              {user && (
                <li className="mt-2 border-t border-cream-200 pt-2">
                  <button
                    type="button"
                    onClick={logout}
                    className="flex w-full cursor-pointer items-center gap-3 rounded-cozy px-3 py-3 text-left text-bark-600 transition-colors hover:bg-cream-100"
                  >
                    <span aria-hidden="true">👤</span>
                    {user.username} — ログアウト
                  </button>
                </li>
              )}
            </ul>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  )
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="size-4">
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  )
}

function PersonIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="size-4">
      <circle cx="12" cy="8" r="3.2" stroke="currentColor" strokeWidth="2" />
      <path d="M5 20c1.2-4 4-6 7-6s5.8 2 7 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function LogoutIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="size-4">
      <path
        d="M9 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h3M15 8l4 4-4 4M19 12H9"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function LeafMark() {
  return (
    <span
      aria-hidden="true"
      className="flex size-9 items-center justify-center rounded-pill bg-leaf-100 text-leaf-600"
    >
      <svg viewBox="0 0 24 24" fill="none" className="size-5">
        <path
          d="M20 4c0 9-5.5 14-12 14-1 0-2-.2-2.8-.5C6 11 11 6.5 20 4Z"
          fill="currentColor"
          opacity="0.9"
        />
        <path d="M4 20c1-4.5 3.5-8 7.5-10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    </span>
  )
}
