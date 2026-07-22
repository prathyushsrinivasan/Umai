import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* Outermost, so a render error anywhere shows a recoverable page rather than
        unmounting the tree and leaving a blank screen. */}
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
