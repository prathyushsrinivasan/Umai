import { createContext } from 'react'

import type { Language, Translations } from './translations'

export interface LanguageContextValue {
  lang: Language
  /** Flips between 'ja' and 'en'. */
  toggle: () => void
  /** Sets the language explicitly — used by the draggable switch, which lands on a
   *  specific side rather than always flipping. */
  setLang: (lang: Language) => void
  /** The active dictionary — `t.home.title`, `t.states.loading`, etc. */
  t: Translations
}

/**
 * Kept in its own module rather than beside the provider: a file that exports both
 * a component and a non-component breaks React Fast Refresh.
 */
export const LanguageContext = createContext<LanguageContextValue | null>(null)
