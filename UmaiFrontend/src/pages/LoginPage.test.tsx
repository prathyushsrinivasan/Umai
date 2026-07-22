import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { LoginPage } from './LoginPage'
import { ApiError } from '../api/client'
import { renderWithProviders } from '../test/renderWithProviders'
import * as authApi from '../api/auth'

vi.mock('../api/auth')

const mocked = vi.mocked(authApi)

const session = {
  token: 'token-abc',
  expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
  user: { id: 1, username: 'taro', email: 'taro@example.com', role: 'USER' as const },
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
})

describe('LoginPage', () => {
  it('logs in and stores the session', async () => {
    const user = userEvent.setup()
    mocked.login.mockResolvedValue(session)

    renderWithProviders(<LoginPage />, { route: '/login' })

    await user.type(screen.getByLabelText('メールアドレス'), 'taro@example.com')
    await user.type(screen.getByLabelText('パスワード'), 'a-good-password')
    await user.click(screen.getByRole('button', { name: 'ログイン' }))

    await waitFor(() =>
      expect(mocked.login).toHaveBeenCalledWith({
        email: 'taro@example.com',
        password: 'a-good-password',
      }),
    )
    await waitFor(() => expect(localStorage.getItem('umai.session')).toContain('token-abc'))
  })

  it('switches to registration and asks for a username', async () => {
    const user = userEvent.setup()
    mocked.register.mockResolvedValue(session)

    renderWithProviders(<LoginPage />, { route: '/login' })

    // The username field belongs only to registration.
    expect(screen.queryByLabelText('ユーザー名')).not.toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: '新規登録' }))

    expect(screen.getByLabelText('ユーザー名')).toBeInTheDocument()

    await user.type(screen.getByLabelText('ユーザー名'), 'taro')
    await user.type(screen.getByLabelText('メールアドレス'), 'taro@example.com')
    await user.type(screen.getByLabelText('パスワード'), 'a-good-password')
    await user.click(screen.getByRole('button', { name: 'アカウントを作成' }))

    await waitFor(() =>
      expect(mocked.register).toHaveBeenCalledWith({
        username: 'taro',
        email: 'taro@example.com',
        password: 'a-good-password',
      }),
    )
  })

  it("surfaces the backend's message on failure", async () => {
    const user = userEvent.setup()
    mocked.login.mockRejectedValue(
      new ApiError(401, 'メールアドレスまたはパスワードが正しくありません', null),
    )

    renderWithProviders(<LoginPage />, { route: '/login' })

    await user.type(screen.getByLabelText('メールアドレス'), 'taro@example.com')
    await user.type(screen.getByLabelText('パスワード'), 'wrong')
    await user.click(screen.getByRole('button', { name: 'ログイン' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'メールアドレスまたはパスワードが正しくありません',
    )
    expect(localStorage.getItem('umai.session')).toBeNull()
  })

  it('falls back to a generic message when the failure is not from the API', async () => {
    const user = userEvent.setup()
    mocked.login.mockRejectedValue(new TypeError('Failed to fetch'))

    renderWithProviders(<LoginPage />, { route: '/login' })

    await user.type(screen.getByLabelText('メールアドレス'), 'taro@example.com')
    await user.type(screen.getByLabelText('パスワード'), 'whatever')
    await user.click(screen.getByRole('button', { name: 'ログイン' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('通信に失敗しました')
  })

  it('clears a previous error when switching mode', async () => {
    const user = userEvent.setup()
    mocked.login.mockRejectedValue(new ApiError(401, 'だめです', null))

    renderWithProviders(<LoginPage />, { route: '/login' })

    await user.type(screen.getByLabelText('メールアドレス'), 'a@example.com')
    await user.type(screen.getByLabelText('パスワード'), 'x')
    await user.click(screen.getByRole('button', { name: 'ログイン' }))
    expect(await screen.findByRole('alert')).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: '新規登録' }))

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
