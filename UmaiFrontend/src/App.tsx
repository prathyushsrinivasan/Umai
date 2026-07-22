import { Suspense, lazy } from 'react'
import { BrowserRouter, Outlet, Route, Routes } from 'react-router-dom'

import { AuthProvider } from './auth/AuthContext'
import { RequireAuth } from './auth/RequireAuth'
import { AppLayout } from './components/layout/AppLayout'
import { LoadingState } from './components/ui/States'
import { HomePage } from './pages/HomePage'

/*
 * Routes are loaded on demand so a first visit does not pay for screens it may never
 * open. The map matters most: Leaflet and its CSS are a large share of the bundle and
 * are only needed on /map and the detail page's mini map.
 *
 * HomePage is imported eagerly — it is the most common entry point, and lazy-loading
 * it would only add a spinner before the first paint.
 */
const MapPage = lazy(() => import('./pages/MapPage').then((m) => ({ default: m.MapPage })))
const SearchPage = lazy(() => import('./pages/SearchPage').then((m) => ({ default: m.SearchPage })))
const CategoriesPage = lazy(() =>
  import('./pages/CategoriesPage').then((m) => ({ default: m.CategoriesPage })),
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
      <AuthProvider>
        <Routes>
          <Route element={<AppLayout />}>
            <Route element={<LazyRoutes />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/map" element={<MapPage />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/categories" element={<CategoriesPage />} />
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
    </BrowserRouter>
  )
}

export default App
