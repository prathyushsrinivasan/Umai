/** Shared response shapes returned by the Umai backend. */

/** Error body produced by the backend's global exception handler. */
export interface ApiErrorBody {
  timestamp: string
  status: number
  error: string
  message: string
  path: string
  fieldErrors?: Array<{ field: string; message: string }>
}

/** Response of `GET /api/v1/health`. */
export interface HealthResponse {
  status: string
  service: string
  timestamp: string
}
