/**
 * Well-known Tokyo neighbourhoods, so searching an area name (e.g. 秋葉原 / Akihabara)
 * flies the map there instead of matching only the handful of restaurants that happen to
 * have that word in their name or address. Restaurant addresses use ward/district names
 * (Chiyoda, Kanda…) rather than the popular neighbourhood name, so a plain text search
 * misses most places in a district — this bridges that gap.
 */
export interface KnownPlace {
  center: [number, number]
  zoom: number
}

interface PlaceEntry extends KnownPlace {
  /** Lower-cased names that should resolve to this place (Japanese + romaji). */
  aliases: string[]
}

const PLACES: PlaceEntry[] = [
  { aliases: ['秋葉原', 'akihabara', 'akiba'], center: [35.6984, 139.7731], zoom: 16 },
  { aliases: ['渋谷', 'shibuya'], center: [35.658, 139.7016], zoom: 15 },
  { aliases: ['新宿', 'shinjuku'], center: [35.6896, 139.7006], zoom: 15 },
  { aliases: ['池袋', 'ikebukuro'], center: [35.7295, 139.7109], zoom: 15 },
  { aliases: ['銀座', 'ginza'], center: [35.6717, 139.765], zoom: 16 },
  { aliases: ['浅草', 'asakusa'], center: [35.7148, 139.7967], zoom: 16 },
  { aliases: ['上野', 'ueno'], center: [35.7141, 139.7774], zoom: 15 },
  { aliases: ['六本木', 'roppongi'], center: [35.6628, 139.7314], zoom: 16 },
  { aliases: ['原宿', 'harajuku'], center: [35.6702, 139.7027], zoom: 16 },
  { aliases: ['恵比寿', 'ebisu'], center: [35.6467, 139.71], zoom: 16 },
  { aliases: ['中目黒', 'nakameguro'], center: [35.644, 139.699], zoom: 16 },
  { aliases: ['品川', 'shinagawa'], center: [35.6285, 139.7387], zoom: 15 },
  { aliases: ['吉祥寺', 'kichijoji'], center: [35.703, 139.58], zoom: 16 },
  { aliases: ['神楽坂', 'kagurazaka'], center: [35.7009, 139.7405], zoom: 16 },
  { aliases: ['東京駅', 'tokyo station', '丸の内', 'marunouchi'], center: [35.6812, 139.7671], zoom: 15 },
]

/** Resolves a search term to a known neighbourhood, or null if it isn't one. */
export function matchKnownPlace(query: string): KnownPlace | null {
  const q = query.trim().toLowerCase()
  if (!q) return null
  for (const place of PLACES) {
    if (place.aliases.some((alias) => q === alias || q.includes(alias))) {
      return { center: place.center, zoom: place.zoom }
    }
  }
  return null
}
