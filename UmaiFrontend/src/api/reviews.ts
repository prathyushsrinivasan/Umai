import { apiRequest } from './client'
import type { Review, ReviewRequest } from '../types/auth'
import type { PageResponse } from '../types/restaurant'

/** One page of reviews, newest first. */
export function fetchReviews(
  restaurantId: number,
  page = 0,
  size = 10,
  signal?: AbortSignal,
): Promise<PageResponse<Review>> {
  return apiRequest<PageResponse<Review>>(
    `/restaurants/${restaurantId}/reviews?page=${page}&size=${size}`,
    { signal },
  )
}

export function createReview(restaurantId: number, request: ReviewRequest): Promise<Review> {
  return apiRequest<Review>(`/restaurants/${restaurantId}/reviews`, {
    method: 'POST',
    body: request,
  })
}

export function updateReview(
  restaurantId: number,
  reviewId: number,
  request: ReviewRequest,
): Promise<Review> {
  return apiRequest<Review>(`/restaurants/${restaurantId}/reviews/${reviewId}`, {
    method: 'PUT',
    body: request,
  })
}

export function deleteReview(restaurantId: number, reviewId: number): Promise<void> {
  return apiRequest<void>(`/restaurants/${restaurantId}/reviews/${reviewId}`, { method: 'DELETE' })
}
