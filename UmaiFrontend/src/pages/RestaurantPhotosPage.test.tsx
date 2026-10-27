import { expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RestaurantPhotosPage } from './RestaurantPhotosPage'
import { apiRequest } from '../api/client'
import { renderWithProviders } from '../test/renderWithProviders'

vi.mock('../api/client', async importOriginal => ({ ...await importOriginal<typeof import('../api/client')>(), apiRequest: vi.fn() }))

it('makes no photo request until the user asks and displays the returned attribution', async () => {
  vi.mocked(apiRequest).mockResolvedValue({ imageUrl: 'https://example.org/photo.jpg', authors: [{ displayName: 'Photo owner', uri: 'https://example.org/owner' }], sourceUrl: 'https://maps.google.com/photo' })
  renderWithProviders(<RestaurantPhotosPage />, { route: '/restaurants/1/photos', path: '/restaurants/:id/photos' })
  expect(apiRequest).not.toHaveBeenCalled()
  await userEvent.click(screen.getByRole('button', { name: '写真を読み込む' }))
  expect(apiRequest).toHaveBeenCalledWith('/restaurants/1/photo')
  expect(await screen.findByRole('link', { name: 'Photo owner' })).toHaveAttribute('href', 'https://example.org/owner')
  expect(screen.getByRole('link', { name: '元の写真を見る' })).toHaveAttribute('href', 'https://maps.google.com/photo')
})
