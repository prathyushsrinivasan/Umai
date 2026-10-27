import { useState } from 'react'
import { Link } from 'react-router-dom'
import { submitReport, type ReportType } from '../../api/reports'
import { useAuth } from '../../auth/useAuth'
import { useLanguage } from '../../i18n/useLanguage'
import type { RestaurantDetail } from '../../types/restaurant'

export function RestaurantDataInfo({ restaurant }: { restaurant: RestaurantDetail }) {
  const { lang } = useLanguage()
  const { isAuthenticated } = useAuth()
  const ja = lang === 'ja'
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<ReportType>('OTHER')
  const [description, setDescription] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const labels: Record<ReportType, string> = ja
    ? { CLOSED: '閉店・休業', HOURS: '営業時間', DIET: '食事対応', OTHER: 'その他' }
    : { CLOSED: 'Closed', HOURS: 'Opening hours', DIET: 'Dietary options', OTHER: 'Other' }
  function date(value: string) {
    return new Intl.DateTimeFormat(ja ? 'ja-JP' : 'en-GB', { dateStyle: 'medium', timeZone: 'Asia/Tokyo' }).format(new Date(value))
  }
  return <section className="mt-6 rounded-cozy border border-cream-200 bg-cream-50 p-4 text-sm text-bark-600">
    <h2 className="font-medium">{ja ? '情報の出典と更新' : 'Source and freshness'}</h2>
    <p className="mt-2">{restaurant.source === 'OPENSTREETMAP' ? 'OpenStreetMap' : restaurant.source === 'SEED' ? (ja ? '開発用サンプル' : 'Development sample') : (ja ? 'ユーザー投稿' : 'Community submission')}</p>
    {restaurant.lastSyncedAt && <p>{ja ? '出典の最終取得日：' : 'Source last refreshed: '}{date(restaurant.lastSyncedAt)}</p>}
    {restaurant.lastVerifiedAt && <p>{ja ? '運営の確認日：' : 'Moderator checked: '}{date(restaurant.lastVerifiedAt)}</p>}
    {!restaurant.lastSyncedAt && !restaurant.lastVerifiedAt && <p>{ja ? '最新の確認日は未登録です。' : 'No recent check has been recorded.'}</p>}
    <p className="mt-2">{ja ? '掲載は網羅的ではありません。営業時間や食事対応はお店にご確認ください。' : 'Coverage is incomplete. Confirm hours and dietary options with the restaurant.'}</p>
    {restaurant.googlePlaceId && <Link to={`/restaurants/${restaurant.id}/photos`} className="mt-3 block text-leaf-700 underline">{ja ? 'Google Maps の写真を見る' : 'View Google Maps photos'}</Link>}
    <button type="button" className="mt-3 cursor-pointer text-leaf-700 underline" onClick={() => setOpen(!open)}>{ja ? '情報の修正を報告' : 'Report a correction'}</button>
    {open && !isAuthenticated && <p className="mt-3"><Link to="/login" state={{ from: { pathname: `/restaurants/${restaurant.id}` } }} className="underline">{ja ? 'ログインして報告' : 'Sign in to report a correction'}</Link></p>}
    {open && isAuthenticated && <form className="mt-3 space-y-3" onSubmit={async (event) => {
      event.preventDefault(); setBusy(true); setMessage('')
      try { await submitReport(restaurant.id, type, description); setMessage(ja ? '報告を受け付けました。運営が確認します。' : 'Report received. A moderator will review it.'); setOpen(false); setDescription('') }
      catch (error) { setMessage(error instanceof Error ? error.message : (ja ? '送信できませんでした。' : 'Could not submit report.')) }
      finally { setBusy(false) }
    }}>
      <label className="block">{ja ? '種類' : 'Issue'}<select value={type} onChange={e => setType(e.target.value as ReportType)} className="ml-3 rounded border p-2">{Object.entries(labels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      <label className="block">{ja ? '詳細・確認できる情報源' : 'Details and supporting source'}<textarea required maxLength={2000} value={description} onChange={e => setDescription(e.target.value)} className="mt-1 block w-full rounded border p-2" /></label>
      <button disabled={busy || !description.trim()} className="rounded-pill bg-leaf-600 px-4 py-2 text-white disabled:opacity-50">{ja ? '報告する' : 'Submit report'}</button>
    </form>}
    {message && <p role="status" className="mt-3">{message}</p>}
  </section>
}
