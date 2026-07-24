import type { Language } from './translations'
import type { Area, Category, Tag } from '../types/restaurant'

/**
 * English labels for reference data (categories, tags), keyed by the `slug` the
 * backend already returns. Restaurant `name`, `address`, and `description` are real
 * Japanese business data with no English field anywhere in the system — those are
 * deliberately NOT translated here (see the "why" note in the roadmap/PR).
 */
const CATEGORY_LABELS_EN: Record<string, string> = {
  washoku: 'Japanese',
  indian: 'Indian',
  cafe: 'Cafe',
  ramen: 'Ramen',
  yoshoku: 'Western',
  chuka: 'Chinese',
  other: 'Other',
}

const TAG_LABELS_EN: Record<string, string> = {
  'gluten-free': 'Gluten-free',
  takeout: 'Takeout',
  'english-menu': 'English menu',
  halal: 'Halal',
  organic: 'Organic',
  'non-smoking': 'Non-smoking',
}

/**
 * Tokyo ward/area names: the slug is already the standard English exonym
 * (Shinjuku, Shibuya, ...), so no separate lookup table is needed — just format it.
 */
function formatAreaSlug(slug: string): string {
  return slug.charAt(0).toUpperCase() + slug.slice(1)
}

export function categoryLabel(category: Category, lang: Language): string {
  if (lang === 'ja') return category.nameJa
  return CATEGORY_LABELS_EN[category.slug] ?? category.nameJa
}

export function tagLabel(tag: Tag, lang: Language): string {
  if (lang === 'ja') return tag.nameJa
  return TAG_LABELS_EN[tag.slug] ?? tag.nameJa
}

export function areaLabel(area: Area, lang: Language): string {
  if (lang === 'ja') return area.nameJa
  return formatAreaSlug(area.slug) || area.nameJa
}
