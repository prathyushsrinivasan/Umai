import { Suspense, lazy } from 'react'
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'

import { AuthProvider } from './auth/AuthContext'
import { RequireAuth } from './auth/RequireAuth'
import { AppLayout } from './components/layout/AppLayout'
import { LoadingState } from './components/ui/States'
import { LanguageProvider } from './i18n/LanguageContext'
import { HomePage } from './pages/HomePage'

/*
 * The map-first HomePage is the whole browse experience — map, list and filters on one
 * screen — so it is imported eagerly (it is the landing, and it needs Leaflet anyway).
 * The old /map, /search and /categories screens were folded into it and now redirect.
 *
 * Everything else is loaded on demand so a first visit does not pay for screens it may
 * never open.
 */
const RestaurantsPage = lazy(() =>
  import('./pages/RestaurantsPage').then((m) => ({ default: m.RestaurantsPage })),
)
const RestaurantDetailPage = lazy(() =>
  import('./pages/RestaurantDetailPage').then((m) => ({ default: m.RestaurantDetailPage })),
)
const LoginPage = lazy(() => import('./pages/LoginPage').then((m) => ({ default: m.LoginPage })))
const SubmitRestaurantPage = lazy(() =>
  import('./pages/SubmitRestaurantPage').then((m) => ({ default: m.SubmitRestaurantPage })),
)
const ModerationPage = lazy(() =>
  import('./pages/ModerationPage').then((m) => ({ default: m.ModerationPage })),
)
const NotFoundPage = lazy(() =>
  import('./pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })),
)

/** One Suspense boundary covering every lazy route, shown while a chunk downloads. */
function LazyRoutes() {
  return (
    <Suspense fallback={<LoadingState />}>
      <Outlet />
    </Suspense>
  )
}

function App() {
  return (
    <BrowserRouter>
      <LanguageProvider>
        <AuthProvider>
          <Routes>
            <Route element={<AppLayout />}>
              <Route element={<LazyRoutes />}>
                <Route path="/" element={<HomePage />} />
                {/* Folded into the map-first home. Redirect old links rather than 404. */}
                <Route path="/map" element={<Navigate to="/" replace />} />
                <Route path="/search" element={<Navigate to="/" replace />} />
                <Route path="/categories" element={<Navigate to="/" replace />} />
                <Route path="/restaurants" element={<RestaurantsPage />} />
                <Route path="/restaurants/:id" element={<RestaurantDetailPage />} />
                <Route path="/login" element={<LoginPage />} />

                {/* Submitting a restaurant requires an account. */}
                <Route
                  path="/restaurants/new"
                  element={
                    <RequireAuth>
                      <SubmitRestaurantPage />
                    </RequireAuth>
                  }
                />

                {/* Moderation is further restricted to administrators. */}
                <Route
                  path="/moderation"
                  element={
                    <RequireAuth requireAdmin>
                      <ModerationPage />
                    </RequireAuth>
                  }
                />

                <Route path="*" element={<NotFoundPage />} />
              </Route>
            </Route>
          </Routes>
        </AuthProvider>
      </LanguageProvider>
    </BrowserRouter>
  )
}

export default App
