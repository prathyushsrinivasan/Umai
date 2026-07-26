import type { RestaurantSummary } from '../types/restaurant'

export interface ChainGroup<T> {
  /** The single branch shown in a list to stand in for the whole chain. */
  representative: T
  /** Every branch sharing this name, including the representative. */
  members: T[]
}

/** Best rating we know for a restaurant — its own reviews, else Google's. */
function bestRating(r: RestaurantSummary): number {
  return r.averageRating ?? r.googleRating ?? 0
}

/** A branch with a photo and a good rating makes the most useful list entry. */
function score(r: RestaurantSummary): number {
  return (r.imageUrl ? 1000 : 0) + bestRating(r)
}

/**
 * Collapses branches of the same-named chain into one list entry.
 *
 * <p>Chains like AFURI or Starbucks otherwise fill a list with near-identical cards;
 * lists should show each name once. The map still plots every branch — only lists group.
 * The representative is the branch with a photo and the highest rating, so the card shown
 * is the most useful one. First-seen order is preserved, so a distance- or relevance-sorted
 * input stays roughly ordered.
 */
export function groupByName<T extends RestaurantSummary>(list: T[]): ChainGroup<T>[] {
  const groups = new Map<string, T[]>()
  for (const restaurant of list) {
    const key = restaurant.name.trim()
    const existing = groups.get(key)
    if (existing) existing.push(restaurant)
    else groups.set(key, [restaurant])
  }

  return [...groups.values()].map((members) => ({
    representative: members.reduce((best, current) => (score(current) > score(best) ? current : best)),
    members,
  }))
}
