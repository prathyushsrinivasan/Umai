import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { apiRequest } from '../api/client'
import { useLanguage } from '../i18n/useLanguage'

interface Photo { imageUrl: string; authors: { displayName: string; uri: string }[]; sourceUrl: string | null }
const safeUrl = (value: string | null) => value && /^https?:\/\//i.test(value) ? value : undefined

/** Google content is displayed on a separate page without an OpenStreetMap map. */
export function RestaurantPhotosPage() {
  const { id } = useParams()
  const { lang } = useLanguage()
  const ja = lang === 'ja'
  const [photo, setPhoto] = useState<Photo | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  return <article className="mx-auto max-w-3xl space-y-5 px-5 py-10">
    <Link to={`/restaurants/${id}`} className="text-leaf-700 underline">{ja ? '店舗に戻る' : 'Back to restaurant'}</Link>
    <h1 className="font-display text-2xl">Google Maps</h1>
    {!photo && <button disabled={busy || !!error} className="rounded-pill bg-leaf-600 px-5 py-2 text-white disabled:opacity-50" onClick={async () => {
      if (!id || !/^\d+$/.test(id)) return
      setBusy(true)
      try { setPhoto(await apiRequest<Photo>(`/restaurants/${id}/photo`)) }
      catch { setError(ja ? '写真は現在利用できません。' : 'Photos are currently unavailable.') }
      finally { setBusy(false) }
    }}>{busy ? (ja ? '読み込み中…' : 'Loading…') : (ja ? '写真を読み込む' : 'Load photo')}</button>}
    {error && <p role="status">{error}</p>}
    {photo && <figure className="space-y-3">
      <img src={safeUrl(photo.imageUrl)} alt={ja ? 'レストランの写真' : 'Restaurant photo'} className="max-h-[600px] w-full object-contain" referrerPolicy="no-referrer" />
      <figcaption>Google Maps{photo.authors.map((author, index) => <span key={index}> · <a href={safeUrl(author.uri)} target="_blank" rel="noopener noreferrer" className="underline">{author.displayName}</a></span>)}
        {safeUrl(photo.sourceUrl) && <a href={safeUrl(photo.sourceUrl)} target="_blank" rel="noopener noreferrer" className="ml-3 underline">{ja ? '元の写真を見る' : 'View original photo'}</a>}
      </figcaption>
    </figure>}
    <p className="text-xs text-bark-400"><a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="underline">Google Privacy Policy</a> · <a href="https://maps.google.com/help/terms_maps/" target="_blank" rel="noopener noreferrer" className="underline">Google Maps Terms</a></p>
  </article>
}
