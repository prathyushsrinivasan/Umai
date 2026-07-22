/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL for the backend REST API. Defaults to the Vite dev proxy path. */
  readonly VITE_API_BASE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
