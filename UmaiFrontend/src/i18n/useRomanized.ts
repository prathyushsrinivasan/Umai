import { useEffect, useState } from 'react'

import { toRomaji } from '../lib/romaji'
import { useLanguage } from './useLanguage'

/**
 * Romanizes `text` when the site is in English mode; returns it untouched in
 * Japanese mode. Conversion is async (loads a Japanese dictionary on first use), so
 * this returns the original Japanese text until the romanized version resolves,
 * then swaps in place — never a blank or loading string.
 */
export function useRomanized(text: string | null): string | null {
  const { lang } = useLanguage()
  const [romanized, setRomanized] = useState<string | null>(null)

  useEffect(() => {
    if (lang !== 'en' || !text) {
      setRomanized(null)
      return
    }

    let cancelled = false
    toRomaji(text).then((result) => {
      if (!cancelled) setRomanized(result)
    })
    return () => {
      cancelled = true
    }
  }, [lang, text])

  if (lang !== 'en' || !text) return text
  return romanized ?? text
}
