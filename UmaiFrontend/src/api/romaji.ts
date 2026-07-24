import { apiRequest } from './client'

interface RomajiResponse {
  text: string
  romaji: string
}

/** Server-side romanization (kuromoji-backed — see UmaiBackend's RomajiService). */
export function fetchRomaji(text: string, signal?: AbortSignal): Promise<RomajiResponse> {
  const query = new URLSearchParams({ text }).toString()
  return apiRequest<RomajiResponse>(`/romaji?${query}`, { signal })
}
