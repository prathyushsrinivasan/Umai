import { render, type RenderOptions } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import type { ReactElement, ReactNode } from 'react'

import { AuthProvider } from '../auth/AuthContext'
import { LanguageProvider } from '../i18n/LanguageContext'
import type { AuthUser } from '../types/auth'

interface Options extends Omit<RenderOptions, 'wrapper'> {
  /** Starting URL, so tests can exercise route params and query strings. */
  route?: string
  /** Path pattern, when the component reads `useParams`. */
  path?: string
  /** Seeds a signed-in session before rendering. */
  user?: AuthUser
}

/**
 * Renders a page with the router and auth context in place.
 *
 * Signing in is done by seeding the same localStorage entry the app uses, rather
 * than stubbing the context — so the tests exercise the real session-restore path.
 */
export function renderWithProviders(ui: ReactElement, options: Options = {}) {
  const { route = '/', path, user, ...renderOptions } = options

  if (user) {
    localStorage.setItem(
      'umai.session',
      JSON.stringify({
        token: 'test-token',
        // Comfortably in the future so the session is not discarded as expired.
        expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
        user,
      }),
    )
  } else {
    localStorage.clear()
  }

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <MemoryRouter initialEntries={[route]}>
        <LanguageProvider>
          <AuthProvider>
            {path ? <Routes><Route path={path} element={children} /></Routes> : children}
          </AuthProvider>
        </LanguageProvider>
      </MemoryRouter>
    )
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions })
}

export const testUser: AuthUser = {
  id: 1,
  username: 'taro',
  email: 'taro@example.com',
  role: 'USER',
}

export const testAdmin: AuthUser = {
  id: 2,
  username: 'admin',
  email: 'admin@example.com',
  role: 'ADMIN',
}
