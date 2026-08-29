export type UserRole = 'student' | 'admin'

export interface User {
  id: string
  name: string
  email: string
  registerNumber: string
  class: string
  role: UserRole
  mustChangePassword: boolean
}

export interface LearningTopic {
  id: string
  moduleId: string
  title: string
  description: string
  videoUrl: string | null
  order: number
  completed: boolean
}

export interface LearningModule {
  id: string
  title: string
  description: string
  order: number
  language: string
  topics: LearningTopic[]
  completedTopics: number
  totalTopics: number
}

export interface ModuleProgress {
  moduleId: string
  moduleTitle: string
  completedTopics: number
  totalTopics: number
}

export interface ProgressSummary {
  completedTopics: number
  totalTopics: number
  modules: ModuleProgress[]
}

export type Difficulty = 'easy' | 'medium' | 'hard'
export type TestCaseVisibility = 'public' | 'hidden'

export interface ProblemExample {
  input: string
  output: string
  explanation: string | null
}

export interface ProblemSummary {
  id: string
  title: string
  slug: string
  difficulty: Difficulty
  topic: string
  language: string
  marks: number
}

export interface TestCasePublic {
  input: string
  expectedOutput: string
}

export interface ProblemPublic {
  id: string
  title: string
  slug: string
  description: string
  inputFormat: string
  outputFormat: string
  constraints: string
  examples: ProblemExample[]
  difficulty: Difficulty
  topic: string
  language: string
  marks: number
  publicTestCases: TestCasePublic[]
}

export interface TestCaseAdminView {
  id: string
  problemId: string
  input: string
  expectedOutput: string
  visibility: TestCaseVisibility
}

export interface ProblemAdminView extends ProblemPublic {
  testCases: TestCaseAdminView[]
}

export type Verdict =
  | 'pending'
  | 'accepted'
  | 'wrong_answer'
  | 'compilation_error'
  | 'runtime_error'
  | 'time_limit_exceeded'
  | 'internal_error'

export interface RunCodeResult {
  verdict: Verdict
  stdout: string
  stderr: string
  compileOutput: string
  statusDescription: string
  timeSeconds: number | null
  memoryKb: number | null
}

export interface TestCaseResult {
  index: number
  verdict: Verdict
}

export interface SubmitCodeResult {
  submissionId: string
  verdict: Verdict
  score: number
  passedTests: number
  totalTests: number
  testCaseResults: TestCaseResult[]
  compileOutput: string
}

export type JobStatus = 'queued' | 'processing' | 'completed' | 'failed'

export interface JobEnqueuedResponse {
  jobId: string
  status: JobStatus
}

export interface JobStatusResponse {
  jobId: string
  status: JobStatus
  result: RunCodeResult | SubmitCodeResult | null
  error: string | null
}

export type RoundStatus = 'draft' | 'scheduled' | 'active' | 'ended'
export type SessionStatus = 'not_started' | 'active' | 'submitted' | 'expired' | 'locked'

export interface CodingRoundSummary {
  id: string
  title: string
  description: string
  durationMinutes: number
  startTime: string
  endTime: string
  questionCount: number
  totalMarks: number
  hasStartedWindow: boolean
  hasEnded: boolean
  studentStatus: SessionStatus | null
}

export interface AssessmentConfig {
  gracePeriodSeconds: number
  maxViolations: number
  autoSubmitEnabled: boolean
}

export interface ResultConfig {
  showResultsDuringRound: boolean
  showTestCaseCount: boolean
  showScoreImmediately: boolean
}

export interface CodingRoundAdminView {
  id: string
  title: string
  description: string
  durationMinutes: number
  startTime: string
  endTime: string
  status: RoundStatus
  problemIds: string[]
  assessmentConfiguration: AssessmentConfig
  resultConfiguration: ResultConfig
}

export interface AssignedQuestion {
  problemId: string
  difficulty: Difficulty
  order: number
}

export interface RoundSessionPublic {
  id: string
  roundId: string
  status: SessionStatus
  startedAt: string
  expiresAt: string
  remainingSeconds: number
  assignedQuestions: AssignedQuestion[]
  violationCount: number
}
