import { useState, type FormEvent } from 'react'

interface SearchBarProps {
  initialValue?: string
  placeholder?: string
  onSubmit: (keyword: string) => void
  size?: 'md' | 'lg'
}

/**
 * Keyword input. Submits on Enter or button press rather than on every keystroke,
 * so typing does not fire a request per character.
 */
export function SearchBar({
  initialValue = '',
  placeholder = '店名、料理、エリアで検索',
  onSubmit,
  size = 'md',
}: SearchBarProps) {
  const [value, setValue] = useState(initialValue)

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    onSubmit(value.trim())
  }

  const padding = size === 'lg' ? 'py-4 pl-13 pr-32' : 'py-3 pl-11 pr-26'

  return (
    <form onSubmit={handleSubmit} role="search" className="relative w-full">
      <label htmlFor="keyword" className="sr-only">
        キーワード検索
      </label>

      <span
        aria-hidden="true"
        className={`pointer-events-none absolute top-1/2 -translate-y-1/2 text-bark-400 ${size === 'lg' ? 'left-5' : 'left-4'}`}
      >
        🔍
      </span>

      <input
        id="keyword"
        type="search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={placeholder}
        className={`w-full rounded-pill border border-cream-300 bg-white ${padding} text-bark-800 shadow-soft transition-colors placeholder:text-bark-400 focus:border-leaf-400 focus:outline-none focus:ring-3 focus:ring-leaf-100`}
      />

      <button
        type="submit"
        className={`absolute top-1/2 -translate-y-1/2 cursor-pointer rounded-pill bg-leaf-500 font-medium text-white transition-colors hover:bg-leaf-600 ${
          size === 'lg' ? 'right-2 px-6 py-2.5' : 'right-1.5 px-4 py-2 text-sm'
        }`}
      >
        検索
      </button>
    </form>
  )
}
