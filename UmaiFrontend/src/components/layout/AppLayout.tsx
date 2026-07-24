import { AnimatePresence, motion } from 'motion/react'
import { Outlet, useLocation } from 'react-router-dom'

import { SiteFooter } from './SiteFooter'
import { SiteHeader } from './SiteHeader'

/**
 * Shared page frame: header, routed page content, footer.
 *
 * The page content cross-fades between routes rather than snapping instantly — keyed
 * on the pathname so `AnimatePresence` sees a mount/unmount on every navigation, even
 * though `Outlet` itself is the same element across the whole route tree.
 */
export function AppLayout() {
  const location = useLocation()

  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main className="flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
      <SiteFooter />
    </div>
  )
}
