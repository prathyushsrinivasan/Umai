import { useCallback } from 'react'
import { apiRequest } from '../../api/client'
import { useAsync } from '../../hooks/useAsync'
import { useLanguage } from '../../i18n/useLanguage'

export function CoverageNotice() {
  const { lang } = useLanguage()
  const load = useCallback((signal: AbortSignal) => apiRequest<{ restaurantCount: number; lastRun: { status?: string; finished_at?: string } }>('/coverage', { signal }), [])
  const { data } = useAsync(load)
  const ja = lang === 'ja'
  return <p className="mt-3 text-xs text-bark-400" role="status">
    {ja ? '東京の掲載情報です。すべてのお店を網羅しているわけではありません。' : 'Tokyo listings from our database. Coverage is not exhaustive.'}
    {data && <> {ja ? `実在のお店 ${data.restaurantCount}件。` : `${data.restaurantCount} real listings.`}</>}
    {data?.lastRun.finished_at && <> {ja ? '最終取得：' : 'Last import: '}{new Date(data.lastRun.finished_at).toLocaleDateString(ja ? 'ja-JP' : 'en-GB', { timeZone: 'Asia/Tokyo' })}.</>}
    {data?.lastRun.status && data.lastRun.status !== 'SUCCEEDED' && <> {ja ? 'データ更新中、または一部未取得の情報があります。' : 'The latest import is in progress or incomplete.'}</>}
  </p>
}
