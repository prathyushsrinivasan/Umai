import { useContext } from 'react'

import { LanguageContext, type LanguageContextValue } from './languageContextValue'

/** Access the active language and dictionary. Throws if used outside the provider. */
export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}
