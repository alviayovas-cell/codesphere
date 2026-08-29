import type {
  AssessmentConfig,
  CodingRoundAdminView,
  CodingRoundSummary,
  JobEnqueuedResponse,
  JobStatusResponse,
  LearningModule,
  LearningTopic,
  ProblemAdminView,
  ProblemPublic,
  ProblemSummary,
  ProgressSummary,
  QuestionPoolConfig,
  ResultConfig,
  RoundSessionPublic,
  TestCaseAdminView,
  TestCaseVisibility,
  User,
} from '../types'

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

  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers })
  } catch {
    // fetch() itself threw - the request never reached the server (offline,
    // DNS failure, CORS, backend down, etc.), as opposed to the server
    // responding with an error status.
    throw new ApiError(0, 'Unable to connect to the server. Please try again.')
  }

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

  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}/admin/students/import`, {
      method: 'POST',
      headers,
      body: formData,
    })
  } catch {
    throw new ApiError(0, 'Unable to connect to the server. Please try again.')
  }

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

// -- Problems (student-facing) -----------------------------------------------

export function getProblems(): Promise<ProblemSummary[]> {
  return request<ProblemSummary[]>('/problems')
}

export function getProblem(problemId: string): Promise<ProblemPublic> {
  return request<ProblemPublic>(`/problems/${problemId}`)
}

// -- Problems (admin management) ---------------------------------------------

export interface ProblemExampleInput {
  input: string
  output: string
  explanation?: string | null
}

export interface ProblemInput {
  title: string
  slug?: string | null
  description: string
  inputFormat: string
  outputFormat: string
  constraints: string
  examples?: ProblemExampleInput[]
  difficulty: 'easy' | 'medium' | 'hard'
  topic: string
  language?: string
  marks: number
}

export function createProblem(payload: ProblemInput): Promise<ProblemAdminView> {
  return request<ProblemAdminView>('/admin/problems', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function getProblemAdmin(problemId: string): Promise<ProblemAdminView> {
  return request<ProblemAdminView>(`/admin/problems/${problemId}`)
}

export function updateProblem(
  problemId: string,
  payload: Partial<ProblemInput>,
): Promise<ProblemAdminView> {
  return request<ProblemAdminView>(`/admin/problems/${problemId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export function deleteProblem(problemId: string): Promise<void> {
  return request<void>(`/admin/problems/${problemId}`, { method: 'DELETE' })
}

export interface TestCaseInput {
  input: string
  expectedOutput: string
  visibility: TestCaseVisibility
}

export function createTestCase(problemId: string, payload: TestCaseInput): Promise<TestCaseAdminView> {
  return request<TestCaseAdminView>(`/admin/problems/${problemId}/test-cases`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function deleteTestCase(testCaseId: string): Promise<void> {
  return request<void>(`/admin/test-cases/${testCaseId}`, { method: 'DELETE' })
}

// -- Code execution (queued: enqueue, then poll job status) -------------------
//
// Run/Submit no longer execute inline - they enqueue a job onto a Redis/RQ
// queue (spec section 12) and return immediately. Use pollJob to wait for
// the result.

export function runCode(problemId: string, code: string, stdin: string): Promise<JobEnqueuedResponse> {
  return request<JobEnqueuedResponse>('/code/run', {
    method: 'POST',
    body: JSON.stringify({ problemId, code, stdin }),
  })
}

export function submitCode(
  problemId: string,
  code: string,
  roundId?: string,
): Promise<JobEnqueuedResponse> {
  return request<JobEnqueuedResponse>('/code/submit', {
    method: 'POST',
    body: JSON.stringify({ problemId, code, roundId }),
  })
}

export function getJobStatus(jobId: string): Promise<JobStatusResponse> {
  return request<JobStatusResponse>(`/code/jobs/${jobId}`)
}

/** Poll a job until it completes or fails, calling onTick with each status
 * update (useful for showing "Queued..." / "Running..." in the UI). */
export async function pollJob(
  jobId: string,
  options: { intervalMs?: number; timeoutMs?: number; onTick?: (status: JobStatusResponse) => void } = {},
): Promise<JobStatusResponse> {
  const intervalMs = options.intervalMs ?? 1000
  const timeoutMs = options.timeoutMs ?? 60000
  const startedAt = Date.now()

  while (true) {
    const status = await getJobStatus(jobId)
    options.onTick?.(status)

    if (status.status === 'completed' || status.status === 'failed') {
      return status
    }
    if (Date.now() - startedAt > timeoutMs) {
      throw new ApiError(408, 'Timed out waiting for the result. Please try again.')
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs))
  }
}

// -- Coding rounds (student-facing) ------------------------------------------

export function getRounds(): Promise<CodingRoundSummary[]> {
  return request<CodingRoundSummary[]>('/rounds')
}

export function startRound(roundId: string): Promise<RoundSessionPublic> {
  return request<RoundSessionPublic>(`/rounds/${roundId}/start`, { method: 'POST' })
}

export function getRoundSession(roundId: string): Promise<RoundSessionPublic> {
  return request<RoundSessionPublic>(`/rounds/${roundId}/session`)
}

export function finishRound(roundId: string): Promise<RoundSessionPublic> {
  return request<RoundSessionPublic>(`/rounds/${roundId}/submit`, { method: 'POST' })
}

// -- Coding rounds (admin management) ----------------------------------------

export interface CodingRoundInput {
  title: string
  description: string
  durationMinutes: number
  startTime: string
  endTime: string
  problemIds: string[]
  questionPoolConfiguration?: Partial<QuestionPoolConfig>
  assessmentConfiguration?: Partial<AssessmentConfig>
  resultConfiguration?: Partial<ResultConfig>
}

export function listRoundsAdmin(): Promise<CodingRoundAdminView[]> {
  return request<CodingRoundAdminView[]>('/admin/rounds')
}

export function getRoundAdmin(roundId: string): Promise<CodingRoundAdminView> {
  return request<CodingRoundAdminView>(`/admin/rounds/${roundId}`)
}

export function createRound(payload: CodingRoundInput): Promise<CodingRoundAdminView> {
  return request<CodingRoundAdminView>('/admin/rounds', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function updateRound(
  roundId: string,
  payload: Partial<CodingRoundInput> & { status?: string },
): Promise<CodingRoundAdminView> {
  return request<CodingRoundAdminView>(`/admin/rounds/${roundId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export function deleteRound(roundId: string): Promise<void> {
  return request<void>(`/admin/rounds/${roundId}`, { method: 'DELETE' })
}
