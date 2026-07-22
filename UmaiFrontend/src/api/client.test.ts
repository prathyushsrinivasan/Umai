import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiError, apiRequest, setAccessToken, setUnauthorizedHandler } from './client'

function mockFetch(response: Partial<Response> & { json?: () => Promise<unknown> }) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({}),
    ...response,
  })
  globalThis.fetch = fetchMock as unknown as typeof fetch
  return fetchMock
}

/** Headers the client actually sent on its first (and only) call. */
function requestHeaders(fetchMock: ReturnType<typeof mockFetch>): Record<string, string> {
  const call = fetchMock.mock.calls[0]
  if (!call) throw new Error('fetch was not called')
  return (call[1] as RequestInit).headers as Record<string, string>
}

describe('apiRequest', () => {
  beforeEach(() => setAccessToken(null))
  afterEach(() => {
    setAccessToken(null)
    setUnauthorizedHandler(null)
  })

  it('returns the parsed body on success', async () => {
    mockFetch({ json: async () => ({ id: 1, name: '店' }) })

    await expect(apiRequest('/restaurants/1')).resolves.toEqual({ id: 1, name: '店' })
  })

  it('sends no Authorization header when signed out', async () => {
    const fetchMock = mockFetch({})

    await apiRequest('/restaurants')

    expect(requestHeaders(fetchMock)).not.toHaveProperty('Authorization')
  })

  it('attaches the bearer token once signed in', async () => {
    const fetchMock = mockFetch({})
    setAccessToken('token-123')

    await apiRequest('/auth/me')

    expect(requestHeaders(fetchMock).Authorization).toBe('Bearer token-123')
  })

  it('throws an ApiError carrying the backend message', async () => {
    mockFetch({
      ok: false,
      status: 409,
      json: async () => ({ status: 409, message: '既に投稿しています' }),
    })

    await expect(apiRequest('/restaurants/1/reviews', { method: 'POST', body: {} }))
      .rejects.toMatchObject({ status: 409, message: '既に投稿しています' })
  })

  it('still throws usefully when the error body is not JSON', async () => {
    mockFetch({
      ok: false,
      status: 500,
      json: async () => {
        throw new Error('not json')
      },
    })

    await expect(apiRequest('/restaurants')).rejects.toBeInstanceOf(ApiError)
  })

  it('returns undefined for 204 rather than trying to parse a body', async () => {
    mockFetch({ status: 204 })

    await expect(apiRequest('/restaurants/1/reviews/1', { method: 'DELETE' }))
      .resolves.toBeUndefined()
  })

  it('signals an expired session when a 401 comes back with a token set', async () => {
    // Otherwise the UI would keep showing a logged-in state that no longer works.
    const onUnauthorized = vi.fn()
    setAccessToken('expired-token')
    setUnauthorizedHandler(onUnauthorized)
    mockFetch({ ok: false, status: 401, json: async () => ({ status: 401, message: 'nope' }) })

    await expect(apiRequest('/auth/me')).rejects.toBeInstanceOf(ApiError)
    expect(onUnauthorized).toHaveBeenCalledOnce()
  })

  it('does not signal an expired session for an anonymous 401', async () => {
    const onUnauthorized = vi.fn()
    setUnauthorizedHandler(onUnauthorized)
    mockFetch({ ok: false, status: 401, json: async () => ({ status: 401, message: 'nope' }) })

    await expect(apiRequest('/auth/me')).rejects.toBeInstanceOf(ApiError)
    expect(onUnauthorized).not.toHaveBeenCalled()
  })
})
