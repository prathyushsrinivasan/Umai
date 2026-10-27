import { apiRequest } from './client'
import type { PageResponse, RestaurantDetail, VegetarianType } from '../types/restaurant'

export type ReportType = 'CLOSED' | 'HOURS' | 'DIET' | 'OTHER'
export interface RestaurantReport {
  id: number
  restaurantId: number
  name: string
  type: ReportType
  description: string
  createdAt: string
}
export interface Correction {
  name?: string
  address?: string
  description?: string
  openingHours?: string
  websiteUrl?: string
  phone?: string
  vegetarianType?: VegetarianType
  imageUrl?: string
  imageRightsConfirmed?: boolean
}
export const submitReport = (id: number, type: ReportType, description: string) =>
  apiRequest<void>(`/restaurants/${id}/reports`, { method: 'POST', body: { type, description } })
export const fetchReports = (page: number, signal?: AbortSignal) =>
  apiRequest<PageResponse<RestaurantReport>>(`/admin/reports?page=${page}`, { signal })
export const resolveReport = (id: number, action: 'CORRECT' | 'CLOSE' | 'DISMISS', note: string, correction?: Correction) =>
  apiRequest<void>(`/admin/reports/${id}/resolve`, { method: 'POST', body: { action, note, correction } })
export const fetchAdminRestaurant = (id: number, signal?: AbortSignal) =>
  apiRequest<RestaurantDetail>(`/admin/restaurants/${id}`, { signal })
export const correctRestaurant = (id: number, correction: Correction) =>
  apiRequest<void>(`/admin/restaurants/${id}/details`, { method: 'PUT', body: correction })
