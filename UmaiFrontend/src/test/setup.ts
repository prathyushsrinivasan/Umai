import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// Unmount between tests so queries never match a previous test's DOM.
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

// jsdom implements neither of these, and Leaflet and Motion both reach for them.
globalThis.matchMedia ??= ((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
})) as unknown as typeof globalThis.matchMedia

globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
}
