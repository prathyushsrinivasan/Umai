import { expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RestaurantDataInfo } from './RestaurantDataInfo'
import { renderWithProviders, testUser } from '../../test/renderWithProviders'
import { makeRestaurant } from '../../test/fixtures'
import { submitReport } from '../../api/reports'
import type { RestaurantDetail } from '../../types/restaurant'

vi.mock('../../api/reports', () => ({ submitReport: vi.fn().mockResolvedValue(undefined) }))
vi.mock('../../api/auth', () => ({ fetchCurrentUser: vi.fn().mockResolvedValue({ id: 1, username: 'taro', email: 'taro@example.com', role: 'USER' }) }))
const restaurant: RestaurantDetail = { ...makeRestaurant(), source: 'OPENSTREETMAP', websiteUrl: null, phone: null,
  openingHours: null, googlePlaceId: null, tags: [], createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-10-20T00:00:00Z',
  lastSyncedAt: '2026-10-20T00:00:00Z', lastVerifiedAt: null }

it('distinguishes a source refresh from a moderator check', () => {
  renderWithProviders(<RestaurantDataInfo restaurant={restaurant} />)
  expect(screen.getByText('OpenStreetMap')).toBeInTheDocument()
  expect(screen.getByText(/出典の最終取得日/)).toBeInTheDocument()
  expect(screen.queryByText(/運営の確認日/)).not.toBeInTheDocument()
})

it('requires sign-in before reporting', async () => {
  renderWithProviders(<RestaurantDataInfo restaurant={restaurant} />)
  await userEvent.click(screen.getByRole('button', { name: '情報の修正を報告' }))
  expect(screen.getByRole('link', { name: 'ログインして報告' })).toBeInTheDocument()
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
})

it('submits a correction for moderator review', async () => {
  const user = userEvent.setup()
  renderWithProviders(<RestaurantDataInfo restaurant={restaurant} />, { user: testUser })
  await user.click(screen.getByRole('button', { name: '情報の修正を報告' }))
  await user.selectOptions(screen.getByRole('combobox'), 'HOURS')
  await user.type(screen.getByRole('textbox'), 'Official website says closed on Mondays')
  await user.click(screen.getByRole('button', { name: '報告する' }))
  await waitFor(() => expect(submitReport).toHaveBeenCalledWith(restaurant.id, 'HOURS', 'Official website says closed on Mondays'))
  expect(await screen.findByText('報告を受け付けました。運営が確認します。')).toBeInTheDocument()
})
