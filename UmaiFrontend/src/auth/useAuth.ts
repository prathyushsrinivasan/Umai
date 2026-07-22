import { useContext } from 'react'

import { AuthContext, type AuthContextValue } from './authContextValue'

/** Access the current session. Throws if used outside the provider. */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
