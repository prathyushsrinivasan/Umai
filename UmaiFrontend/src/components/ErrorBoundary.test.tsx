import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { ErrorBoundary } from './ErrorBoundary'

function Boom(): never {
  throw new Error('render exploded')
}

describe('ErrorBoundary', () => {
  it('renders its children when nothing goes wrong', () => {
    render(
      <ErrorBoundary>
        <p>正常な内容</p>
      </ErrorBoundary>,
    )

    expect(screen.getByText('正常な内容')).toBeInTheDocument()
  })

  it('shows a recoverable message instead of a blank page when a child throws', () => {
    // React logs the error itself; silence it so the test output stays readable.
    vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    )

    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText('問題が発生しました')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '再読み込み' })).toBeInTheDocument()
  })

  it('does not leak the internal error message to the user', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    )

    expect(screen.queryByText(/render exploded/)).not.toBeInTheDocument()
  })
})
