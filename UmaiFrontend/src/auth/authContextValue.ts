import { createContext } from 'react'

import type { AuthUser, LoginRequest, RegisterRequest } from '../types/auth'

export interface AuthContextValue {
  user: AuthUser | null
  isAuthenticated: boolean
  /** True until the stored session has been read, so route guards do not flash. */
  initialising: boolean
  login: (request: LoginRequest) => Promise<void>
  register: (request: RegisterRequest) => Promise<void>
  logout: () => void
}

/**
 * Kept in its own module rather than beside the provider: a file that exports both
 * a component and a non-component breaks React Fast Refresh.
 */
export const AuthContext = createContext<AuthContextValue | null>(null)
