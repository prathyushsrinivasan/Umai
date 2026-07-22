import { apiRequest } from './client'
import type { HealthResponse } from '../types/api'

/** Checks that the backend is reachable. */
export function fetchHealth(signal?: AbortSignal): Promise<HealthResponse> {
  return apiRequest<HealthResponse>('/health', { signal })
}
