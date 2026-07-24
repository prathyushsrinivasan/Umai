import { useLanguage } from '../../i18n/useLanguage'

export function SiteFooter() {
  const { t } = useLanguage()
  return (
    <footer className="mt-auto border-t border-cream-200/80 px-5 py-8">
      <div className="mx-auto max-w-5xl text-sm text-bark-600">
        <p className="text-xs text-bark-400">{t.footer.mapCredit}</p>
      </div>
    </footer>
  )
}
