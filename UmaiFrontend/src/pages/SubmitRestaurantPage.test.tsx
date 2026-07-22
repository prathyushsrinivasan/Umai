import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { SubmitRestaurantPage } from './SubmitRestaurantPage'
import { ApiError } from '../api/client'
import { makeRestaurant } from '../test/fixtures'
import { renderWithProviders, testUser } from '../test/renderWithProviders'
import * as restaurantsApi from '../api/restaurants'

vi.mock('../api/restaurants')

const mocked = vi.mocked(restaurantsApi)

beforeEach(() => {
  vi.clearAllMocks()
  mocked.fetchCategories.mockResolvedValue([
    { id: 1, slug: 'washoku', nameJa: '和食', description: null },
  ])
  mocked.fetchAreas.mockResolvedValue([{ id: 1, slug: 'shinjuku', nameJa: '新宿' }])
})

async function fillRequiredFields(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/店名/), 'テスト八百屋カフェ')
  await user.type(screen.getByLabelText(/緯度/), '35.6896')
  await user.type(screen.getByLabelText(/経度/), '139.7006')
  await user.click(screen.getByRole('button', { name: 'ヴィーガン専門' }))
}

describe('SubmitRestaurantPage', () => {
  it('submits a valid restaurant', async () => {
    const user = userEvent.setup()
    mocked.createRestaurant.mockResolvedValue({
      ...makeRestaurant({ id: 15 }),
      websiteUrl: null,
      phone: null,
      openingHours: null,
      tags: [],
      source: 'USER_SUBMISSION',
      createdAt: '2026-07-01T00:00:00Z',
      updatedAt: '2026-07-01T00:00:00Z',
    })

    renderWithProviders(<SubmitRestaurantPage />, { route: '/restaurants/new', user: testUser })

    await screen.findByText('和食')
    await fillRequiredFields(user)
    await user.click(screen.getByRole('button', { name: 'このお店を登録する' }))

    await waitFor(() =>
      expect(mocked.createRestaurant).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'テスト八百屋カフェ',
          latitude: 35.6896,
          longitude: 139.7006,
          vegetarianType: 'VEGAN_ONLY',
        }),
      ),
    )
  })

  it('requires a diet classification before submitting', async () => {
    const user = userEvent.setup()

    renderWithProviders(<SubmitRestaurantPage />, { route: '/restaurants/new', user: testUser })

    await user.type(screen.getByLabelText(/店名/), '名前だけの店')
    await user.type(screen.getByLabelText(/緯度/), '35.6896')
    await user.type(screen.getByLabelText(/経度/), '139.7006')
    await user.click(screen.getByRole('button', { name: 'このお店を登録する' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'ヴィーガン・ベジタリアン対応を選択してください。',
    )
    expect(mocked.createRestaurant).not.toHaveBeenCalled()
  })

  it('rejects non-numeric coordinates before contacting the API', async () => {
    const user = userEvent.setup()

    renderWithProviders(<SubmitRestaurantPage />, { route: '/restaurants/new', user: testUser })

    await user.type(screen.getByLabelText(/店名/), '座標が変な店')
    await user.type(screen.getByLabelText(/緯度/), 'not-a-number')
    await user.type(screen.getByLabelText(/経度/), '139.7006')
    await user.click(screen.getByRole('button', { name: 'ヴィーガン専門' }))
    await user.click(screen.getByRole('button', { name: 'このお店を登録する' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('緯度・経度を数値で入力してください。')
    expect(mocked.createRestaurant).not.toHaveBeenCalled()
  })

  it('attaches server-side field errors to the field they belong to', async () => {
    const user = userEvent.setup()
    mocked.createRestaurant.mockRejectedValue(
      new ApiError(400, 'Request validation failed', {
        timestamp: '',
        status: 400,
        error: 'Bad Request',
        message: 'Request validation failed',
        path: '/api/v1/restaurants',
        fieldErrors: [
          { field: 'websiteUrl', message: 'URLは http:// または https:// で始めてください' },
        ],
      }),
    )

    renderWithProviders(<SubmitRestaurantPage />, { route: '/restaurants/new', user: testUser })

    await screen.findByText('和食')
    await fillRequiredFields(user)
    await user.type(screen.getByLabelText('Webサイト'), 'javascript:alert(1)')
    await user.click(screen.getByRole('button', { name: 'このお店を登録する' }))

    expect(
      await screen.findByText('URLは http:// または https:// で始めてください'),
    ).toBeInTheDocument()
    // The message must be tied to the input, not just floating on the page.
    expect(screen.getByLabelText('Webサイト')).toHaveAttribute('aria-invalid', 'true')
  })

  it('shows a general error when the API fails without field detail', async () => {
    const user = userEvent.setup()
    mocked.createRestaurant.mockRejectedValue(new ApiError(409, '既に登録されています', null))

    renderWithProviders(<SubmitRestaurantPage />, { route: '/restaurants/new', user: testUser })

    await screen.findByText('和食')
    await fillRequiredFields(user)
    await user.click(screen.getByRole('button', { name: 'このお店を登録する' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('既に登録されています')
  })

  it('offers categories and areas loaded from the API, not a hard-coded list', async () => {
    renderWithProviders(<SubmitRestaurantPage />, { route: '/restaurants/new', user: testUser })

    expect(await screen.findByRole('button', { name: '和食' })).toBeInTheDocument()
    expect(await screen.findByRole('option', { name: '新宿' })).toBeInTheDocument()
  })
})
