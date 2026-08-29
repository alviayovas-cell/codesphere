import type { LearningModule, LearningTopic, ProgressSummary, User } from '../types'

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api'

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

let authToken: string | null = null

export function setAuthToken(token: string | null) {
  authToken = token
}

function extractErrorMessage(body: unknown, fallback: string): string {
  if (body && typeof body === 'object' && 'detail' in body) {
    const detail = (body as { detail: unknown }).detail
    if (typeof detail === 'string') return detail
    if (Array.isArray(detail) && detail.length > 0 && typeof detail[0]?.msg === 'string') {
      return detail[0].msg
    }
  }
  return fallback
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  }
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`
  }

  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers })

  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new ApiError(response.status, extractErrorMessage(body, response.statusText))
  }

  if (response.status === 204) {
    return undefined as T
  }
  return response.json() as Promise<T>
}

export interface HealthResponse {
  status: string
  service: string
}

export function getHealth(): Promise<HealthResponse> {
  return request<HealthResponse>('/health')
}

export interface LoginResponse {
  access_token: string
  token_type: string
  user: User
}

export function login(email: string, password: string): Promise<LoginResponse> {
  return request<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export function getMe(): Promise<User> {
  return request<User>('/auth/me')
}

export function changePassword(currentPassword: string, newPassword: string): Promise<{ message: string }> {
  return request<{ message: string }>('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
  })
}

export interface StudentImportError {
  row: number
  reason: string
}

export interface CreatedStudentCredential {
  id: string
  name: string
  email: string
  registerNumber: string
  temporaryPassword: string
}

export interface StudentImportResult {
  created: number
  skipped: StudentImportError[]
  createdStudents: CreatedStudentCredential[]
}

export function listStudents(): Promise<User[]> {
  return request<User[]>('/admin/students')
}

export async function importStudents(file: File): Promise<StudentImportResult> {
  const formData = new FormData()
  formData.append('file', file)

  const headers: Record<string, string> = {}
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`
  }

  const response = await fetch(`${API_BASE_URL}/admin/students/import`, {
    method: 'POST',
    headers,
    body: formData,
  })

  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new ApiError(response.status, extractErrorMessage(body, response.statusText))
  }
  return response.json() as Promise<StudentImportResult>
}

export function resetStudentPassword(studentId: string): Promise<{ temporaryPassword: string }> {
  return request<{ temporaryPassword: string }>(`/admin/students/${studentId}/reset-password`, {
    method: 'POST',
  })
}

// -- Learning (student-facing) ----------------------------------------------

export function getModules(): Promise<LearningModule[]> {
  return request<LearningModule[]>('/learning/modules')
}

export function getTopic(topicId: string): Promise<LearningTopic> {
  return request<LearningTopic>(`/learning/topics/${topicId}`)
}

export function markTopicComplete(topicId: string): Promise<void> {
  return request<void>(`/learning/topics/${topicId}/complete`, { method: 'POST' })
}

export function unmarkTopicComplete(topicId: string): Promise<void> {
  return request<void>(`/learning/topics/${topicId}/complete`, { method: 'DELETE' })
}

export function getProgress(): Promise<ProgressSummary> {
  return request<ProgressSummary>('/learning/progress')
}

// -- Learning (admin management) ---------------------------------------------

export interface LearningModuleInput {
  title: string
  description: string
  order: number
  language?: string
}

export function createModule(payload: LearningModuleInput): Promise<LearningModule> {
  return request<LearningModule>('/admin/learning/modules', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function updateModule(
  moduleId: string,
  payload: Partial<LearningModuleInput>,
): Promise<LearningModule> {
  return request<LearningModule>(`/admin/learning/modules/${moduleId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export function deleteModule(moduleId: string): Promise<void> {
  return request<void>(`/admin/learning/modules/${moduleId}`, { method: 'DELETE' })
}

export interface LearningTopicInput {
  title: string
  description: string
  videoUrl?: string | null
  order: number
}

export function createTopic(moduleId: string, payload: LearningTopicInput): Promise<LearningTopic> {
  return request<LearningTopic>(`/admin/learning/modules/${moduleId}/topics`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function updateTopic(
  topicId: string,
  payload: Partial<LearningTopicInput>,
): Promise<LearningTopic> {
  return request<LearningTopic>(`/admin/learning/topics/${topicId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export function deleteTopic(topicId: string): Promise<void> {
  return request<void>(`/admin/learning/topics/${topicId}`, { method: 'DELETE' })
}
