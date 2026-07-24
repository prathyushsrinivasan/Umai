import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { useEffect } from 'react'

import { NAV_ITEMS } from '../../lib/navigation'
import { useAuth } from '../../auth/useAuth'
import { useLanguage } from '../../i18n/useLanguage'
import { Icon } from '../ui/Icon'
import { Mascot } from '../ui/Mascot'

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
          className="group flex shrink-0 items-center gap-2 rounded-pill py-1 transition-colors hover:text-leaf-600"
        >
          <Mascot
            size={36}
            className="shrink-0 transition-transform duration-300 ease-out group-hover:-rotate-6 group-hover:scale-110"
          />
          <span className="font-display text-2xl tracking-wide">Umai</span>
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
              <Icon name={item.icon} className="size-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <LanguageToggle className="hidden sm:flex" />

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
              <li className="border-b border-cream-200 pb-2">
                <LanguageToggle className="flex w-fit" />
              </li>

              {[
                ...NAV_ITEMS,
                { to: '/restaurants/new', label: 'レストラン追加', icon: 'plus' as const },
                // Signed-in users get a logout action instead of a login link.
                ...(user ? [] : [{ to: '/login', label: 'ログイン', icon: 'person' as const }]),
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
                    <Icon name={item.icon} className="size-4.5" />
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
                    <Icon name="logout" className="size-4.5" />
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

// Track/thumb geometry, shared between the JSX below and the drag-distance math —
// kept as constants (not measured at runtime) so the two never drift out of sync.
// Sized to fit the full "日本語" label (not an abbreviation) inside the thumb.
const TRACK_PADDING = 3
const THUMB_WIDTH = 54
const THUMB_HEIGHT = 26
const TRACK_WIDTH = THUMB_WIDTH * 2 + TRACK_PADDING * 2
const THUMB_TRAVEL = TRACK_WIDTH - TRACK_PADDING * 2 - THUMB_WIDTH

/**
 * A tiny sliding switch: click anywhere, or grab the thumb and drag it to the other
 * side. Both gestures live on the same element — Framer Motion's tap and drag
 * recognizers already disambiguate a real drag (movement past a few px) from a plain
 * click, so there is no risk of a drag-release also firing a click-to-toggle.
 */
function LanguageToggle({ className = '' }: { className?: string }) {
  const { lang, setLang, t } = useLanguage()
  const isEn = lang === 'en'

  function settleAfterDrag(offsetX: number) {
    const finalX = (isEn ? THUMB_TRAVEL : 0) + offsetX
    setLang(finalX > THUMB_TRAVEL / 2 ? 'en' : 'ja')
  }

  return (
    <div
      onClick={() => setLang(isEn ? 'ja' : 'en')}
      style={{ width: TRACK_WIDTH, padding: TRACK_PADDING }}
      className={`relative cursor-pointer items-center rounded-pill border-2 border-bark-400/30 shadow-soft transition-colors duration-300 ${
        isEn ? 'bg-leaf-50' : 'bg-cream-100'
      } ${className}`}
    >
      <span
        style={{ width: THUMB_WIDTH }}
        className={`pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 text-center text-[11px] font-bold text-bark-500 transition-opacity ${
          isEn ? 'opacity-60' : 'opacity-0'
        }`}
      >
        日本語
      </span>
      <span
        style={{ width: THUMB_WIDTH }}
        className={`pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-center text-[11px] font-bold text-leaf-700 transition-opacity ${
          isEn ? 'opacity-0' : 'opacity-60'
        }`}
      >
        EN
      </span>

      <motion.div
        role="switch"
        aria-checked={isEn}
        aria-label={isEn ? t.languageToggle.switchToJa : t.languageToggle.switchToEn}
        tabIndex={0}
        drag="x"
        dragConstraints={{ left: 0, right: THUMB_TRAVEL }}
        dragElastic={0.1}
        dragMomentum={false}
        animate={{ x: isEn ? THUMB_TRAVEL : 0 }}
        transition={{ type: 'spring', stiffness: 500, damping: 32 }}
        onDragEnd={(_, info) => settleAfterDrag(info.offset.x)}
        onClick={(event) => {
          // The track's own onClick already toggles; stop this from bubbling into
          // it and firing a second (harmless but redundant) update.
          event.stopPropagation()
          setLang(isEn ? 'ja' : 'en')
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            setLang(isEn ? 'ja' : 'en')
          }
        }}
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.92 }}
        style={{ width: THUMB_WIDTH, height: THUMB_HEIGHT }}
        className="relative z-10 flex cursor-grab items-center justify-center rounded-pill bg-leaf-500 text-[11px] font-bold text-white shadow-soft active:cursor-grabbing"
      >
        {isEn ? 'EN' : '日本語'}
      </motion.div>
    </div>
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
