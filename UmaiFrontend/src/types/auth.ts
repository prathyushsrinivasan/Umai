/** Types mirroring the backend auth DTOs. */

export type UserRole = 'USER' | 'MODERATOR' | 'ADMIN'

export interface AuthUser {
  id: number
  username: string
  email: string
  role: UserRole
}

export interface AuthResponse {
  token: string
  expiresAt: string
  user: AuthUser
}

export interface RegisterRequest {
  username: string
  email: string
  password: string
}

export interface LoginRequest {
  email: string
  password: string
}

/** A review as returned by the API. */
export interface Review {
  id: number
  restaurantId: number
  userId: number
  username: string
  rating: number
  comment: string | null
  createdAt: string
  updatedAt: string
  /** True when the requesting user wrote this review. */
  ownedByCurrentUser: boolean
}

export interface ReviewRequest {
  rating: number
  comment?: string
}
