import type { ApiErrorBody } from '../types/api'

/**
 * Base URL for the API. In development this defaults to `/api/v1`, which the Vite
 * dev server proxies to the backend, keeping the browser same-origin.
 */
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1'

/** Error thrown for any non-2xx API response, carrying the backend's error body. */
export class ApiError extends Error {
  readonly status: number
  readonly body: ApiErrorBody | null

  constructor(status: number, message: string, body: ApiErrorBody | null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

/**
 * Current access token, held in a module variable set by the auth context.
 *
 * Kept here so every request picks it up without threading it through call sites,
 * and so there is exactly one place that decides what gets sent.
 */
let accessToken: string | null = null

export function setAccessToken(token: string | null): void {
  accessToken = token
}

/** Notified when the API rejects our token, so the session can be cleared. */
let onUnauthorized: (() => void) | null = null

export function setUnauthorizedHandler(handler: (() => void) | null): void {
  onUnauthorized = handler
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  body?: unknown
  signal?: AbortSignal
}

/**
 * Single entry point for backend calls, so error handling, headers and the base
 * URL stay in one place.
 */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, signal } = options

  const headers: Record<string, string> = {}
  if (body) headers['Content-Type'] = 'application/json'
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    signal,
  })

  if (!response.ok) {
    const errorBody = await readJson<ApiErrorBody>(response)

    // An expired or invalid token should end the session rather than leaving the UI
    // showing a logged-in state that no longer works.
    if (response.status === 401 && accessToken) {
      onUnauthorized?.()
    }

    throw new ApiError(
      response.status,
      errorBody?.message ?? `Request failed with status ${response.status}`,
      errorBody,
    )
  }

  if (response.status === 204) {
    return undefined as T
  }

  const data = await readJson<T>(response)
  if (data === null) {
    throw new ApiError(response.status, 'Expected a JSON response body', null)
  }
  return data
}

/** Parses a JSON body, returning null instead of throwing when it is absent or malformed. */
async function readJson<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T
  } catch {
    return null
  }
}
