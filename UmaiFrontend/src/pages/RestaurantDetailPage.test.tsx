import { screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { RestaurantDetailPage } from './RestaurantDetailPage'
import { ApiError } from '../api/client'
import { makeRestaurant } from '../test/fixtures'
import { renderWithProviders } from '../test/renderWithProviders'
import * as restaurantsApi from '../api/restaurants'
import * as reviewsApi from '../api/reviews'
import type { RestaurantDetail } from '../types/restaurant'

vi.mock('../api/restaurants')
vi.mock('../api/reviews')
// Leaflet needs real layout APIs jsdom does not provide; the map itself is not what
// these tests are about.
vi.mock('../components/map/RestaurantMiniMap', () => ({
  RestaurantMiniMap: () => <div data-testid="mini-map" />,
}))

const mockedRestaurants = vi.mocked(restaurantsApi)
const mockedReviews = vi.mocked(reviewsApi)

function makeDetail(overrides: Partial<RestaurantDetail> = {}): RestaurantDetail {
  return {
    ...makeRestaurant(),
    websiteUrl: 'https://example.com',
    phone: '03-0000-0001',
    openingHours: '11:00-21:00',
    tags: [{ id: 1, slug: 'organic', nameJa: 'オーガニック食材' }],
    source: 'USER_SUBMISSION',
    createdAt: '2026-07-01T00:00:00Z',
    updatedAt: '2026-07-01T00:00:00Z',
    ...overrides,
  }
}

const emptyReviews = {
  content: [],
  page: 0,
  size: 10,
  totalElements: 0,
  totalPages: 1,
  first: true,
  last: true,
}

beforeEach(() => {
  vi.clearAllMocks()
  mockedReviews.fetchReviews.mockResolvedValue(emptyReviews)
})

function renderDetail() {
  return renderWithProviders(<RestaurantDetailPage />, {
    route: '/restaurants/1',
    path: '/restaurants/:id',
  })
}

describe('RestaurantDetailPage', () => {
  it('shows the restaurant and its known details', async () => {
    mockedRestaurants.fetchRestaurant.mockResolvedValue(makeDetail())

    renderDetail()

    expect(await screen.findByRole('heading', { name: 'みどりの木キッチン' })).toBeInTheDocument()
    expect(screen.getByText('東京都新宿区西新宿1-1-1')).toBeInTheDocument()
    expect(screen.getByText('11:00-21:00')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '03-0000-0001' })).toHaveAttribute(
      'href',
      'tel:03-0000-0001',
    )
  })

  describe('missing data', () => {
    it('omits rows for fields the source does not provide', async () => {
      mockedRestaurants.fetchRestaurant.mockResolvedValue(
        makeDetail({ phone: null, websiteUrl: null, openingHours: null, priceRange: null }),
      )

      renderDetail()

      await screen.findByRole('heading', { name: 'みどりの木キッチン' })

      expect(screen.queryByText('営業時間')).not.toBeInTheDocument()
      expect(screen.queryByText('電話番号')).not.toBeInTheDocument()
      expect(screen.queryByText('価格帯')).not.toBeInTheDocument()
    })

    it('explains the absence rather than leaving a silent gap', async () => {
      mockedRestaurants.fetchRestaurant.mockResolvedValue(
        makeDetail({ phone: null, websiteUrl: null, openingHours: null }),
      )

      renderDetail()

      expect(
        await screen.findByText('営業時間・電話番号・Webサイトの情報はまだ登録されていません。'),
      ).toBeInTheDocument()
    })

    it('says there is no rating rather than showing zero', async () => {
      mockedRestaurants.fetchRestaurant.mockResolvedValue(
        makeDetail({ averageRating: null, reviewCount: 0 }),
      )

      renderDetail()

      expect(await screen.findByText('まだ評価がありません')).toBeInTheDocument()
    })
  })

  it('marks seeded restaurants as development data', async () => {
    mockedRestaurants.fetchRestaurant.mockResolvedValue(makeDetail({ source: 'SEED' }))

    renderDetail()

    expect(
      await screen.findByText(/このお店は開発用のサンプルデータです/),
    ).toBeInTheDocument()
  })

  it('does not show the development notice for real submissions', async () => {
    mockedRestaurants.fetchRestaurant.mockResolvedValue(makeDetail({ source: 'USER_SUBMISSION' }))

    renderDetail()

    await screen.findByRole('heading', { name: 'みどりの木キッチン' })
    expect(screen.queryByText(/開発用のサンプルデータ/)).not.toBeInTheDocument()
  })

  it('shows a not-found page for an unknown restaurant', async () => {
    mockedRestaurants.fetchRestaurant.mockRejectedValue(new ApiError(404, 'not found', null))

    renderDetail()

    expect(await screen.findByText('お店が見つかりませんでした')).toBeInTheDocument()
  })

  it('offers a retry when the request fails for another reason', async () => {
    mockedRestaurants.fetchRestaurant.mockRejectedValue(new ApiError(500, 'boom', null))

    renderDetail()

    expect(await screen.findByRole('button', { name: '再読み込み' })).toBeInTheDocument()
  })

  it('prompts anonymous visitors to sign in before reviewing', async () => {
    mockedRestaurants.fetchRestaurant.mockResolvedValue(makeDetail())

    renderDetail()

    expect(
      await screen.findByText('評価や口コミを投稿するにはログインが必要です。'),
    ).toBeInTheDocument()
  })
})
