import { useState, type FormEvent } from 'react'
import { motion } from 'motion/react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'

import { ApiError } from '../api/client'
import { useAuth } from '../auth/useAuth'

type Mode = 'login' | 'register'

/** ログイン / 新規登録 — one screen with two modes. */
export function LoginPage() {
  const [mode, setMode] = useState<Mode>('login')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const { login, register, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // Where the user was heading before being redirected here.
  const redirectTo = (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? '/'

  if (isAuthenticated) {
    return <Navigate to={redirectTo} replace />
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      if (mode === 'login') {
        await login({ email, password })
      } else {
        await register({ username, email, password })
      }
      navigate(redirectTo, { replace: true })
    } catch (cause) {
      // The backend's messages are already user-facing Japanese; fall back only if
      // the failure came from somewhere else (e.g. the network).
      setError(
        cause instanceof ApiError
          ? cause.message
          : '通信に失敗しました。時間をおいてもう一度お試しください。',
      )
    } finally {
      setSubmitting(false)
    }
  }

  function switchMode(next: Mode) {
    setMode(next)
    setError(null)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="mx-auto max-w-md px-5 py-14"
    >
      <div className="rounded-cozy border border-cream-200 bg-white p-8 shadow-soft">
        <h1 className="font-display text-center text-3xl text-bark-800">
          {mode === 'login' ? 'ログイン' : '新規登録'}
        </h1>
        <p className="mt-2 text-center text-sm text-bark-600">
          {mode === 'login'
            ? 'アカウントにログインして、評価や口コミを投稿しましょう。'
            : 'アカウントを作成すると、お店の評価や登録ができます。'}
        </p>

        {/* Mode switch */}
        <div
          role="tablist"
          aria-label="ログインまたは新規登録"
          className="mt-6 grid grid-cols-2 gap-1 rounded-pill bg-cream-100 p-1"
        >
          {(['login', 'register'] as const).map((value) => (
            <button
              key={value}
              role="tab"
              type="button"
              aria-selected={mode === value}
              onClick={() => switchMode(value)}
              className={`cursor-pointer rounded-pill py-2 text-sm font-medium transition-colors ${
                mode === value ? 'bg-white text-leaf-700 shadow-soft' : 'text-bark-600'
              }`}
            >
              {value === 'login' ? 'ログイン' : '新規登録'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {mode === 'register' && (
            <Field
              id="username"
              label="ユーザー名"
              value={username}
              onChange={setUsername}
              autoComplete="username"
              required
              minLength={2}
              maxLength={50}
              hint="2〜50文字。他の利用者に表示されます。"
            />
          )}

          <Field
            id="email"
            label="メールアドレス"
            type="email"
            value={email}
            onChange={setEmail}
            autoComplete="email"
            required
          />

          <Field
            id="password"
            label="パスワード"
            type="password"
            value={password}
            onChange={setPassword}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            required
            minLength={mode === 'register' ? 8 : undefined}
            hint={mode === 'register' ? '8文字以上で入力してください。' : undefined}
          />

          {error && (
            <p role="alert" className="rounded-cozy bg-apricot-300/25 px-4 py-3 text-sm text-bark-800">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="sketchy-edge font-display w-full cursor-pointer rounded-pill bg-leaf-500 py-3 text-lg text-white shadow-soft transition-colors hover:bg-leaf-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? '送信中…' : mode === 'login' ? 'ログイン' : 'アカウントを作成'}
          </button>
        </form>
      </div>

      <p className="mt-6 text-center text-sm text-bark-400">
        <Link to="/" className="transition-colors hover:text-leaf-600">
          ← ホームへ戻る
        </Link>
      </p>
    </motion.div>
  )
}

interface FieldProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
  autoComplete?: string
  required?: boolean
  minLength?: number
  maxLength?: number
  hint?: string
}

function Field({ id, label, value, onChange, type = 'text', hint, ...rest }: FieldProps) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-bark-600">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-describedby={hint ? `${id}-hint` : undefined}
        className="mt-1.5 w-full rounded-cozy border border-cream-300 px-4 py-2.5 text-bark-800 transition-colors focus:border-leaf-400 focus:outline-none focus:ring-3 focus:ring-leaf-100"
        {...rest}
      />
      {hint && (
        <p id={`${id}-hint`} className="mt-1 text-xs text-bark-400">
          {hint}
        </p>
      )}
    </div>
  )
}
