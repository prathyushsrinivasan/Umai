import { Link } from 'react-router-dom'

import { Icon } from '../components/ui/Icon'
import { useLanguage } from '../i18n/useLanguage'

export function NotFoundPage() {
  const { t } = useLanguage()
  return (
    <div className="mx-auto max-w-xl px-5 py-24 text-center">
      <Icon name="sprout" className="mx-auto size-10 text-leaf-400" />
      <h1 className="font-display mt-4 text-2xl text-bark-800">{t.notFoundPage.title}</h1>
      <Link
        to="/"
        className="mt-8 inline-block rounded-pill bg-leaf-500 px-6 py-2.5 font-medium text-white shadow-soft transition-colors hover:bg-leaf-600"
      >
        {t.notFoundPage.cta}
      </Link>
    </div>
  )
}
