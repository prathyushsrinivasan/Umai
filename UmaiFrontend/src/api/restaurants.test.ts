import { afterEach, describe, expect, it, vi } from 'vitest'

import { fetchRestaurantsInBounds, searchRestaurants } from './restaurants'

function mockFetch() {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ content: [], page: 0, size: 20, totalElements: 0 }),
  })
  globalThis.fetch = fetchMock as unknown as typeof fetch
  return fetchMock
}

/** The path the client actually requested. */
function requestedUrl(fetchMock: ReturnType<typeof mockFetch>): string {
  const call = fetchMock.mock.calls[0]
  if (!call) throw new Error('fetch was not called')
  return call[0] as string
}

afterEach(() => vi.restoreAllMocks())

describe('searchRestaurants', () => {
  it('omits empty and undefined parameters instead of sending blanks', async () => {
    const fetchMock = mockFetch()

    await searchRestaurants({ keyword: '', areas: [], minRating: undefined })

    expect(requestedUrl(fetchMock)).toBe('/api/v1/restaurants/search')
  })

  it('repeats list parameters, which is what Spring binds to a List', async () => {
    const fetchMock = mockFetch()

    await searchRestaurants({ areas: ['ueno', 'asakusa'] })

    const url = requestedUrl(fetchMock)
    expect(url).toContain('areas=ueno')
    expect(url).toContain('areas=asakusa')
    // Comma-joining would be read as a single area named "ueno,asakusa".
    expect(url).not.toContain('ueno%2Casakusa')
  })

  it('encodes Japanese keywords', async () => {
    const fetchMock = mockFetch()

    await searchRestaurants({ keyword: 'ラーメン' })

    expect(requestedUrl(fetchMock)).toContain(`keyword=${encodeURIComponent('ラーメン')}`)
  })

  it('passes pagination through', async () => {
    const fetchMock = mockFetch()

    await searchRestaurants({ page: 2, size: 12 })

    expect(requestedUrl(fetchMock)).toContain('page=2')
    expect(requestedUrl(fetchMock)).toContain('size=12')
  })

  it('keeps page=0, which is a meaningful value rather than an empty one', async () => {
    const fetchMock = mockFetch()

    await searchRestaurants({ page: 0 })

    expect(requestedUrl(fetchMock)).toContain('page=0')
  })
})

describe('fetchRestaurantsInBounds', () => {
  it('sends all four bounding-box edges', async () => {
    const fetchMock = mockFetch()

    await fetchRestaurantsInBounds({ minLat: 35.6, minLon: 139.6, maxLat: 35.8, maxLon: 139.9 })

    const url = requestedUrl(fetchMock)
    expect(url).toContain('minLat=35.6')
    expect(url).toContain('minLon=139.6')
    expect(url).toContain('maxLat=35.8')
    expect(url).toContain('maxLon=139.9')
  })
})
