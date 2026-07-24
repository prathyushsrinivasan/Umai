import { fetchRomaji } from '../api/romaji'

/**
 * Best-effort romaji transliteration of Japanese text, for showing restaurant
 * names/addresses to English-reading visitors. This is NOT translation — see
 * UmaiBackend's RomajiService for what it actually does and why it can be wrong for
 * proper nouns like restaurant names.
 *
 * Conversion runs server-side (a dictionary-backed Japanese tokenizer isn't
 * something to ship to every browser); this just calls that endpoint and caches the
 * result, since the same restaurant name/address renders in multiple places (list
 * row, map popup, detail page).
 */
const cache = new Map<string, string>()

/** Fails soft: any network/server error returns the original text rather than throwing. */
export async function toRomaji(text: string): Promise<string> {
  const cached = cache.get(text)
  if (cached !== undefined) return cached

  try {
    const { romaji } = await fetchRomaji(text)
    cache.set(text, romaji)
    return romaji
  }
  catch {
    return text
  }
}
