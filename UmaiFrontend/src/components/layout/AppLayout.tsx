import { Outlet } from 'react-router-dom'

import { SiteFooter } from './SiteFooter'
import { SiteHeader } from './SiteHeader'

/** Shared page frame: header, routed page content, footer. */
export function AppLayout() {
  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main className="flex-1">
        <Outlet />
      </main>
      <SiteFooter />
    </div>
  )
}
