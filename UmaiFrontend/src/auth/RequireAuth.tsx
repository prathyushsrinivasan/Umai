import { Navigate, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'

import { LoadingState } from '../components/ui/States'
import { useAuth } from './useAuth'

interface RequireAuthProps {
  children: ReactNode
  /** Also require an administrator account, for moderation screens. */
  requireAdmin?: boolean
}

/**
 * Gate for routes that need a signed-in user.
 *
 * Redirects to the login page, remembering where the user was heading so they land
 * back there after signing in rather than on the homepage.
 *
 * This is a convenience, not a security boundary — the API enforces the same rules
 * server-side, since anything in the browser can be bypassed.
 */
export function RequireAuth({ children, requireAdmin = false }: RequireAuthProps) {
  const { isAuthenticated, initialising, user } = useAuth()
  const location = useLocation()

  // Waiting for the stored session avoids bouncing an authenticated user to login.
  if (initialising) return <LoadingState />

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (requireAdmin && user?.role !== 'ADMIN' && user?.role !== 'MODERATOR') {
    // Signed in but not permitted: say so rather than bouncing to login, which would
    // suggest the wrong remedy.
    return (
      <div className="mx-auto max-w-xl px-5 py-24 text-center">
        <p aria-hidden="true" className="text-4xl">
          🔒
        </p>
        <h1 className="mt-4 text-2xl font-bold text-bark-800">権限がありません</h1>
        <p className="mt-3 text-bark-600">このページは管理者のみが利用できます。</p>
      </div>
    )
  }

  return <>{children}</>
}
