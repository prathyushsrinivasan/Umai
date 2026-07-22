import { apiRequest } from './client'
import type { AuthResponse, AuthUser, LoginRequest, RegisterRequest } from '../types/auth'

export function register(request: RegisterRequest): Promise<AuthResponse> {
  return apiRequest<AuthResponse>('/auth/register', { method: 'POST', body: request })
}

export function login(request: LoginRequest): Promise<AuthResponse> {
  return apiRequest<AuthResponse>('/auth/login', { method: 'POST', body: request })
}

/** Confirms a stored token is still accepted, and refreshes the cached account. */
export function fetchCurrentUser(signal?: AbortSignal): Promise<AuthUser> {
  return apiRequest<AuthUser>('/auth/me', { signal })
}
