import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'

import { LanguageContext } from './languageContextValue'
import { translations, type Language } from './translations'

const STORAGE_KEY = 'umai.lang'

function readStoredLanguage(): Language {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'en' ? 'en' : 'ja'
  } catch {
    return 'ja'
  }
}

/** Site-wide JA/EN switch. Defaults to Japanese and remembers the visitor's choice. */
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>(readStoredLanguage)

  useEffect(() => {
    document.documentElement.lang = lang
    try {
      localStorage.setItem(STORAGE_KEY, lang)
    } catch {
      // Private browsing / storage disabled — the toggle still works for this session.
    }
  }, [lang])

  const setLang = useCallback((next: Language) => setLangState(next), [])

  const toggle = useCallback(() => {
    setLangState((current) => (current === 'ja' ? 'en' : 'ja'))
  }, [])

  const value = useMemo(() => ({ lang, toggle, setLang, t: translations[lang] }), [lang, toggle, setLang])

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}
