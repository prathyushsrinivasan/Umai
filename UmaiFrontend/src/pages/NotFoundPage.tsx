import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <div className="mx-auto max-w-xl px-5 py-24 text-center">
      <p aria-hidden="true" className="text-4xl">
        🌱
      </p>
      <h1 className="font-display mt-4 text-2xl text-bark-800">
        ページが見つかりませんでした
      </h1>
      <Link
        to="/"
        className="mt-8 inline-block rounded-pill bg-leaf-500 px-6 py-2.5 font-medium text-white shadow-soft transition-colors hover:bg-leaf-600"
      >
        ホームへ戻る
      </Link>
    </div>
  )
}
