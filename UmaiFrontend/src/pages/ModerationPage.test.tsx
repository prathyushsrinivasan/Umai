import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ModerationPage } from './ModerationPage'
import { RequireAuth } from '../auth/RequireAuth'
import { makeRestaurant } from '../test/fixtures'
import { renderWithProviders, testAdmin, testUser } from '../test/renderWithProviders'
import * as moderationApi from '../api/moderation'

vi.mock('../api/moderation')

const mocked = vi.mocked(moderationApi)

function queue(content: ReturnType<typeof makeRestaurant>[]) {
  return {
    content,
    page: 0,
    size: 20,
    totalElements: content.length,
    totalPages: 1,
    first: true,
    last: true,
  }
}

beforeEach(() => vi.clearAllMocks())

describe('ModerationPage', () => {
  it('lists submissions awaiting approval by default', async () => {
    mocked.fetchModerationQueue.mockResolvedValue(
      queue([makeRestaurant({ id: 9, name: '承認待ちの店' })]),
    )

    renderWithProviders(<ModerationPage />, { route: '/moderation', user: testAdmin })

    expect(await screen.findByText('承認待ちの店')).toBeInTheDocument()
    expect(mocked.fetchModerationQueue).toHaveBeenCalledWith('PENDING', 0, expect.anything())
  })

  it('approves a submission and refreshes the queue', async () => {
    const user = userEvent.setup()
    mocked.fetchModerationQueue.mockResolvedValue(queue([makeRestaurant({ id: 9 })]))
    mocked.approveRestaurant.mockResolvedValue({} as never)

    renderWithProviders(<ModerationPage />, { route: '/moderation', user: testAdmin })

    await screen.findByText('みどりの木キッチン')
    await user.click(screen.getByRole('button', { name: '公開する' }))

    await waitFor(() => expect(mocked.approveRestaurant).toHaveBeenCalledWith(9))
    // Two calls: the initial load and the refresh after the decision.
    await waitFor(() => expect(mocked.fetchModerationQueue).toHaveBeenCalledTimes(2))
  })

  it('rejects a submission', async () => {
    const user = userEvent.setup()
    mocked.fetchModerationQueue.mockResolvedValue(queue([makeRestaurant({ id: 9 })]))
    mocked.rejectRestaurant.mockResolvedValue({} as never)

    renderWithProviders(<ModerationPage />, { route: '/moderation', user: testAdmin })

    await screen.findByText('みどりの木キッチン')
    await user.click(screen.getByRole('button', { name: '却下する' }))

    await waitFor(() => expect(mocked.rejectRestaurant).toHaveBeenCalledWith(9))
  })

  it('switches which status is listed', async () => {
    const user = userEvent.setup()
    mocked.fetchModerationQueue.mockResolvedValue(queue([]))

    renderWithProviders(<ModerationPage />, { route: '/moderation', user: testAdmin })

    await screen.findByText('承認待ちのお店はありません')
    await user.click(screen.getByRole('button', { name: '却下' }))

    await waitFor(() =>
      expect(mocked.fetchModerationQueue).toHaveBeenLastCalledWith('REJECTED', 0, expect.anything()),
    )
  })

  it('reports a failed decision instead of silently doing nothing', async () => {
    const user = userEvent.setup()
    mocked.fetchModerationQueue.mockResolvedValue(queue([makeRestaurant({ id: 9 })]))
    mocked.approveRestaurant.mockRejectedValue(new Error('boom'))

    renderWithProviders(<ModerationPage />, { route: '/moderation', user: testAdmin })

    await screen.findByText('みどりの木キッチン')
    await user.click(screen.getByRole('button', { name: '公開する' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('操作に失敗しました')
  })
})

describe('RequireAuth', () => {
  it('lets an administrator through', async () => {
    mocked.fetchModerationQueue.mockResolvedValue(queue([]))

    renderWithProviders(
      <RequireAuth requireAdmin>
        <ModerationPage />
      </RequireAuth>,
      { route: '/moderation', user: testAdmin },
    )

    expect(await screen.findByRole('heading', { name: 'モデレーション' })).toBeInTheDocument()
  })

  it('refuses an ordinary signed-in user without redirecting them to login', async () => {
    renderWithProviders(
      <RequireAuth requireAdmin>
        <ModerationPage />
      </RequireAuth>,
      { route: '/moderation', user: testUser },
    )

    // Bouncing them to login would suggest the wrong remedy — they are already signed in.
    expect(await screen.findByText('権限がありません')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'モデレーション' })).not.toBeInTheDocument()
  })
})
