import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'

import { setAccessToken, setUnauthorizedHandler } from '../api/client'
import { login as loginRequest, register as registerRequest } from '../api/auth'
import { AuthContext, type AuthContextValue } from './authContextValue'
import type { AuthUser, LoginRequest, RegisterRequest } from '../types/auth'

interface StoredSession {
  token: string
  expiresAt: string
  user: AuthUser
}

/**
 * Where the session is kept.
 *
 * localStorage means the session survives a reload, at the cost of being readable by
 * any script running on the page — the standard trade-off for a token-based SPA.
 * Moving to an httpOnly cookie would require CSRF protection on the API, which is
 * out of scope here.
 */
const STORAGE_KEY = 'umai.session'

function readStoredSession(): StoredSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null

    const session = JSON.parse(raw) as StoredSession
    // Tokens are rejected by the server once expired; dropping them here avoids
    // starting the app in a logged-in state that is already invalid.
    if (new Date(session.expiresAt).getTime() <= Date.now()) return null

    return session
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<StoredSession | null>(null)
  const [initialising, setInitialising] = useState(true)

  const logout = useCallback(() => {
    setSession(null)
    setAccessToken(null)
    localStorage.removeItem(STORAGE_KEY)
  }, [])

  // Restore a stored session before first render of the guarded routes.
  useEffect(() => {
    const stored = readStoredSession()
    if (stored) {
      setSession(stored)
      setAccessToken(stored.token)
    }
    setInitialising(false)
  }, [])

  // Clear the session when the API rejects our token mid-flight.
  useEffect(() => {
    setUnauthorizedHandler(logout)
    return () => setUnauthorizedHandler(null)
  }, [logout])

  const persist = useCallback((next: StoredSession) => {
    setSession(next)
    setAccessToken(next.token)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  }, [])

  const login = useCallback(
    async (request: LoginRequest) => {
      persist(await loginRequest(request))
    },
    [persist],
  )

  const register = useCallback(
    async (request: RegisterRequest) => {
      persist(await registerRequest(request))
    },
    [persist],
  )

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      isAuthenticated: session !== null,
      initialising,
      login,
      register,
      logout,
    }),
    [session, initialising, login, register, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
