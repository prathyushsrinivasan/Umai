import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

/**
 * Catches render-time errors anywhere below it.
 *
 * Without this, one thrown error unmounts the whole React tree and the user is left
 * on a blank white page with no explanation and no way forward.
 *
 * Must be a class: there is no hook equivalent of componentDidCatch.
 */
export class ErrorBoundary extends Component<Props, State> {

  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Kept in the console rather than shown: internal details belong in logs, not
    // in front of users.
    console.error('Unhandled render error', error, info.componentStack)
  }

  render() {
    if (!this.state.error) {
      return this.props.children
    }

    return (
      <div role="alert" className="mx-auto max-w-xl px-5 py-24 text-center">
        <p aria-hidden="true" className="text-4xl">
          🍂
        </p>
        <h1 className="font-display mt-4 text-2xl text-bark-800">
          問題が発生しました
        </h1>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="cursor-pointer rounded-pill bg-leaf-500 px-6 py-2.5 font-medium text-white shadow-soft transition-colors hover:bg-leaf-600"
          >
            再読み込み
          </button>
          <a
            href="/"
            className="rounded-pill border border-cream-300 bg-white px-6 py-2.5 text-bark-600 transition-colors hover:border-leaf-300"
          >
            ホームへ戻る
          </a>
        </div>
      </div>
    )
  }

}
