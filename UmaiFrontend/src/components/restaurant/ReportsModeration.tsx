import { useCallback, useState } from 'react'
import { correctRestaurant, fetchAdminRestaurant, fetchReports, resolveReport, type Correction, type RestaurantReport } from '../../api/reports'
import { useAsync } from '../../hooks/useAsync'
import { useLanguage } from '../../i18n/useLanguage'
import type { RestaurantDetail, VegetarianType } from '../../types/restaurant'
import { ErrorState, LoadingState } from '../ui/States'

export function RestaurantEditor({ id, onSaved, onCancel }: { id: number; onSaved: () => void; onCancel: () => void }) {
  const load = useCallback((signal: AbortSignal) => fetchAdminRestaurant(id, signal), [id])
  const restaurant = useAsync(load)
  if (restaurant.loading) return <LoadingState />
  if (restaurant.error) return <ErrorState onRetry={restaurant.reload} />
  if (!restaurant.data) return null
  return <CorrectionForm key={id} restaurant={restaurant.data} onSave={async correction => { await correctRestaurant(id, correction); onSaved() }} onCancel={onCancel} />
}

function CorrectionForm({ restaurant, onSave, onCancel }: { restaurant: RestaurantDetail; onSave: (correction: Correction) => Promise<void>; onCancel: () => void }) {
  const { lang } = useLanguage()
  const ja = lang === 'ja'
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const fields = [
    ['name', ja ? '店名' : 'Name', restaurant.name],
    ['address', ja ? '住所' : 'Address', restaurant.address],
    ['openingHours', ja ? '営業時間' : 'Opening hours', restaurant.openingHours],
    ['websiteUrl', ja ? '公式サイト' : 'Website', restaurant.websiteUrl],
    ['phone', ja ? '電話番号' : 'Phone', restaurant.phone],
    ['imageUrl', ja ? '使用許可のある写真の URL' : 'Photo URL with permission to use', restaurant.imageUrl],
  ] as const
  return <form className="mt-4 space-y-3 rounded-cozy border border-cream-200 bg-white p-4" onSubmit={async event => {
    event.preventDefault(); setBusy(true); setError('')
    const data = new FormData(event.currentTarget)
    const correction: Correction = { vegetarianType: data.get('vegetarianType') as VegetarianType }
    for (const [field] of fields) correction[field] = String(data.get(field) ?? '')
    // Reusing the existing photo does not require a new rights assertion.
    if (correction.imageUrl === (restaurant.imageUrl ?? '')) delete correction.imageUrl
    correction.imageRightsConfirmed = data.get('rights') === 'on'
    try { await onSave(correction) }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not save') }
    finally { setBusy(false) }
  }}>
    <h3 className="font-medium">{ja ? '店舗情報を確認・修正' : 'Check and correct restaurant information'}</h3>
    {fields.map(([field, label, value]) => <label key={field} className="block text-sm">{label}<input name={field} required={field === 'name'} defaultValue={value ?? ''} maxLength={field === 'imageUrl' ? 1000 : field === 'name' ? 200 : field === 'phone' ? 32 : 500} className="mt-1 block w-full rounded border p-2" /></label>)}
    <label className="block text-sm">{ja ? '食事対応' : 'Dietary options'}<select name="vegetarianType" defaultValue={restaurant.vegetarianType} className="ml-3 rounded border p-2">{(['VEGAN_ONLY', 'VEGETARIAN_ONLY', 'VEGAN_FRIENDLY', 'VEGETARIAN_FRIENDLY', 'UNKNOWN'] as const).map(value => <option key={value} value={value}>{value}</option>)}</select></label>
    <label className="block text-sm"><input name="rights" type="checkbox" className="mr-2" />{ja ? '新しい写真を使用する権利・許可があります。' : 'I have permission to use the new photo.'}</label>
    {error && <p role="alert">{error}</p>}
    <button disabled={busy} className="rounded-pill bg-leaf-600 px-4 py-2 text-sm text-white disabled:opacity-50">{ja ? '確認して保存' : 'Save checked information'}</button>
    <button type="button" onClick={onCancel} className="ml-3 text-sm underline">{ja ? 'キャンセル' : 'Cancel'}</button>
  </form>
}

export function ReportsModeration() {
  const { lang } = useLanguage()
  const ja = lang === 'ja'
  const [page, setPage] = useState(0)
    const [editing, setEditing] = useState<RestaurantReport | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const load = useCallback((signal: AbortSignal) => fetchReports(page, signal), [page])
  const reports = useAsync(load)
  async function act(report: RestaurantReport, action: 'CLOSE' | 'DISMISS') {
    setBusy(true); setError('')
    try { await resolveReport(report.id, action, action === 'CLOSE' ? 'Moderator confirmed closure' : 'Report reviewed and dismissed'); setPage(0); reports.reload() }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not resolve report') }
    finally { setBusy(false) }
  }
  return <section className="mt-10 border-t border-cream-200 pt-6">
    <h2 className="font-display text-2xl">{ja ? '情報の修正報告' : 'Correction reports'}</h2>
    {reports.loading && <LoadingState />}
    {reports.error && <ErrorState onRetry={reports.reload} />}
    {error && <p role="alert">{error}</p>}
    {reports.data?.totalElements === 0 && <p className="mt-3 text-sm text-bark-400">{ja ? '確認待ちの報告はありません。' : 'No reports awaiting review.'}</p>}
    <ul className="mt-4 space-y-4">{reports.data?.content.map(report => <li key={report.id} className="rounded-cozy border border-cream-200 bg-white p-4">
      <h3 className="font-medium">{report.name} · {report.type}</h3><p className="mt-2 whitespace-pre-wrap text-sm">{report.description}</p>
      <div className="mt-3 flex flex-wrap gap-3 text-sm">
        <button disabled={busy} className="text-leaf-700 underline" onClick={() => setEditing(report)}>{ja ? '修正して解決' : 'Correct and resolve'}</button>
        {report.type === 'CLOSED' && <button disabled={busy} className="text-berry-600 underline" onClick={() => act(report, 'CLOSE')}>{ja ? '閉店を確認・掲載終了' : 'Confirm closure and unpublish'}</button>}
        <button disabled={busy} className="underline" onClick={() => act(report, 'DISMISS')}>{ja ? '対応不要として終了' : 'Dismiss after review'}</button>
      </div>
      {editing?.id === report.id && <ReportEditor report={report} onSaved={() => { setEditing(null); setPage(0); reports.reload() }} onCancel={() => setEditing(null)} />}
    </li>)}</ul>
    {reports.data && reports.data.totalPages > 1 && <div className="mt-4 flex gap-4"><button disabled={page === 0} onClick={() => setPage(p => p - 1)}>{ja ? '前へ' : 'Previous'}</button><span>{page + 1} / {reports.data.totalPages}</span><button disabled={reports.data.last} onClick={() => setPage(p => p + 1)}>{ja ? '次へ' : 'Next'}</button></div>}
  </section>
}

function ReportEditor({ report, onSaved, onCancel }: { report: RestaurantReport; onSaved: () => void; onCancel: () => void }) {
  const load = useCallback((signal: AbortSignal) => fetchAdminRestaurant(report.restaurantId, signal), [report.restaurantId])
  const restaurant = useAsync(load)
  if (restaurant.loading) return <LoadingState />
  if (restaurant.error) return <ErrorState onRetry={restaurant.reload} />
  if (!restaurant.data) return null
  return <CorrectionForm restaurant={restaurant.data} onCancel={onCancel} onSave={async correction => {
    await resolveReport(report.id, 'CORRECT', 'Moderator checked and corrected restaurant information', correction); onSaved()
  }} />
}
