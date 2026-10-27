import { beforeEach, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RestaurantsPage } from './RestaurantsPage'
import { renderWithProviders } from '../test/renderWithProviders'
import { makeRestaurant } from '../test/fixtures'
import { fetchAreas, fetchCategories, searchRestaurants } from '../api/restaurants'

vi.mock('../api/restaurants', () => ({ fetchAreas: vi.fn(), fetchCategories: vi.fn(), searchRestaurants: vi.fn() }))

beforeEach(() => {
  vi.mocked(fetchAreas).mockResolvedValue([])
  vi.mocked(fetchCategories).mockResolvedValue([])
  vi.mocked(searchRestaurants).mockImplementation(async params => ({
    content: [makeRestaurant({ id: params.page ? 525 : 1, name: params.page ? 'Last restaurant' : 'First restaurant', branchCount: 3 })],
    page: params.page ?? 0, size: 24, totalElements: 525, totalPages: 22, first: !params.page, last: params.page === 21,
  }))
})

it('uses server totals and requests the next page without fetching the whole dataset', async () => {
  const user = userEvent.setup()
  renderWithProviders(<RestaurantsPage />)
  expect(await screen.findByText('First restaurant')).toBeInTheDocument()
  expect(screen.getByText('525件のお店')).toBeInTheDocument()
  expect(vi.mocked(searchRestaurants).mock.calls[0]?.[0]).toMatchObject({ size: 24, page: 0, groupByName: true })
  await user.click(screen.getByRole('button', { name: '次へ' }))
  await waitFor(() => expect(vi.mocked(searchRestaurants).mock.lastCall?.[0]).toMatchObject({ size: 24, page: 1 }))
  expect(await screen.findByText('Last restaurant')).toBeInTheDocument()
})
