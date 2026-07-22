import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { SearchPage } from './SearchPage'
import { makeRestaurant } from '../test/fixtures'
import { renderWithProviders } from '../test/renderWithProviders'
import * as restaurantsApi from '../api/restaurants'

vi.mock('../api/restaurants')

const mocked = vi.mocked(restaurantsApi)

function page(content: ReturnType<typeof makeRestaurant>[], totalElements = content.length) {
  return {
    content,
    page: 0,
    size: 12,
    totalElements,
    totalPages: Math.max(1, Math.ceil(totalElements / 12)),
    first: true,
    last: totalElements <= 12,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mocked.fetchCategories.mockResolvedValue([
    { id: 1, slug: 'ramen', nameJa: 'ラーメン', description: null },
  ])
  mocked.fetchAreas.mockResolvedValue([{ id: 1, slug: 'ueno', nameJa: '上野' }])
  mocked.fetchTags.mockResolvedValue([{ id: 1, slug: 'takeout', nameJa: 'テイクアウト可' }])
})

describe('SearchPage', () => {
  it('lists results with a count', async () => {
    mocked.searchRestaurants.mockResolvedValue(
      page([makeRestaurant({ id: 1, name: 'みどりの木キッチン' })]),
    )

    renderWithProviders(<SearchPage />, { route: '/search' })

    expect(await screen.findByText('みどりの木キッチン')).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('reads filters from the URL and sends them to the API', async () => {
    mocked.searchRestaurants.mockResolvedValue(page([]))

    renderWithProviders(<SearchPage />, {
      route: '/search?vegetarianTypes=VEGAN_ONLY&areas=ueno',
    })

    await waitFor(() =>
      expect(mocked.searchRestaurants).toHaveBeenCalledWith(
        expect.objectContaining({
          vegetarianTypes: ['VEGAN_ONLY'],
          areas: ['ueno'],
        }),
        expect.anything(),
      ),
    )
  })

  it('re-queries when a filter chip is toggled', async () => {
    const user = userEvent.setup()
    mocked.searchRestaurants.mockResolvedValue(page([]))

    renderWithProviders(<SearchPage />, { route: '/search' })

    await screen.findByText('ラーメン')
    await user.click(screen.getByRole('button', { name: 'ラーメン' }))

    await waitFor(() =>
      expect(mocked.searchRestaurants).toHaveBeenLastCalledWith(
        expect.objectContaining({ categories: ['ramen'] }),
        expect.anything(),
      ),
    )
  })

  it('shows an empty state with a way out when nothing matches', async () => {
    const user = userEvent.setup()
    mocked.searchRestaurants.mockResolvedValue(page([]))

    renderWithProviders(<SearchPage />, { route: '/search?areas=ueno' })

    expect(await screen.findByText('お店が見つかりませんでした')).toBeInTheDocument()

    // Clearing must actually reset the query, not just the display.
    await user.click(screen.getByRole('button', { name: '条件をクリア' }))

    await waitFor(() =>
      expect(mocked.searchRestaurants).toHaveBeenLastCalledWith(
        expect.objectContaining({ areas: [] }),
        expect.anything(),
      ),
    )
  })

  it('shows a retryable error when the request fails', async () => {
    mocked.searchRestaurants.mockRejectedValue(new Error('network down'))

    renderWithProviders(<SearchPage />, { route: '/search' })

    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '再読み込み' })).toBeInTheDocument()
  })

  it('submits the keyword box', async () => {
    const user = userEvent.setup()
    mocked.searchRestaurants.mockResolvedValue(page([]))

    renderWithProviders(<SearchPage />, { route: '/search' })

    await user.type(screen.getByRole('searchbox'), 'ラーメン')
    await user.click(screen.getByRole('button', { name: '検索' }))

    await waitFor(() =>
      expect(mocked.searchRestaurants).toHaveBeenLastCalledWith(
        expect.objectContaining({ keyword: 'ラーメン' }),
        expect.anything(),
      ),
    )
  })

  it('hides pagination when everything fits on one page', async () => {
    mocked.searchRestaurants.mockResolvedValue(page([makeRestaurant()]))

    renderWithProviders(<SearchPage />, { route: '/search' })

    await screen.findByText('みどりの木キッチン')
    expect(screen.queryByRole('navigation', { name: 'ページ送り' })).not.toBeInTheDocument()
  })

  it('pages through larger result sets', async () => {
    const user = userEvent.setup()
    mocked.searchRestaurants.mockResolvedValue(page([makeRestaurant()], 40))

    renderWithProviders(<SearchPage />, { route: '/search' })

    await screen.findByText('みどりの木キッチン')
    await user.click(screen.getByRole('button', { name: '次へ' }))

    await waitFor(() =>
      expect(mocked.searchRestaurants).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 1 }),
        expect.anything(),
      ),
    )
  })
})
