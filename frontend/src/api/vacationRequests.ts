import { api } from './http'

// Date-only ("YYYY-MM-DD") strings, matching the backend.
export type VacationStatus = 'Pending' | 'Approved' | 'Rejected'

export interface MyVacationRequest {
  id: string
  startDate: string
  endDate: string
  reason: string | null
  status: VacationStatus
  comments: string | null
  createdAt: string
}

export interface CreateVacationRequestPayload {
  startDate: string
  endDate: string
  reason?: string
}

// If the server hasn't answered within this time, the UI shows the "try again later" page.
export const CREATE_REQUEST_TIMEOUT_MS = 20_000

export async function createVacationRequest(
  payload: CreateVacationRequestPayload,
): Promise<{ id: string }> {
  const { data } = await api.post<{ id: string }>('/vacation-requests', payload, {
    timeout: CREATE_REQUEST_TIMEOUT_MS,
  })
  return data
}

export interface ValidatorVacationRequest extends MyVacationRequest {
  userId: string
  requesterName: string
}

export interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

// Validator view: every request, one page at a time.
export interface RequestFilters {
  status?: VacationStatus
  userId?: string
}

export async function fetchAllVacationRequests(
  page: number,
  limit: number,
  filters: RequestFilters = {},
  signal?: AbortSignal,
): Promise<{ data: ValidatorVacationRequest[]; pagination: Pagination }> {
  const { data } = await api.get('/vacation-requests', {
    params: { page, limit, ...filters },
    signal,
  })
  return data
}

export async function fetchRequesters(): Promise<{ id: string; name: string }[]> {
  const { data } = await api.get('/users')
  return data
}

export async function approveVacationRequest(id: string): Promise<void> {
  await api.post(`/vacation-requests/${id}/approve`)
}

export async function rejectVacationRequest(id: string, comment: string): Promise<void> {
  await api.post(`/vacation-requests/${id}/reject`, { comment })
}

// The logged-in user's own requests, one page at a time (for the "My requests" table).
export async function fetchMyVacationRequests(
  page: number,
  limit: number,
  signal?: AbortSignal,
): Promise<{ data: MyVacationRequest[]; pagination: Pagination }> {
  const { data } = await api.get('/my-vacation-requests', { params: { page, limit }, signal })
  return data
}

// All pending/approved requests of the logged-in user, unpaginated: the calendar marks these days as booked.
export async function fetchMyBookedRequests(): Promise<MyVacationRequest[]> {
  const { data } = await api.get<MyVacationRequest[]>('/my-vacation-requests/booked')
  return data
}
