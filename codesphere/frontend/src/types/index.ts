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

export interface QuestionPoolConfig {
  easyQuestions: number
  mediumQuestions: number
  hardQuestions: number
  randomizeOrder: boolean
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
  questionPoolConfiguration: QuestionPoolConfig
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
  maxViolations: number
}

export interface AutosavePublic {
  problemId: string
  code: string
  updatedAt: string
}

export type ActivityEventType =
  | 'visibility_hidden'
  | 'visibility_restored'
  | 'window_blur'
  | 'window_focus'
  | 'warning'
  | 'auto_submit'

export interface ActivityEventPublic {
  id: string
  sessionId: string
  eventType: ActivityEventType
  timestamp: string
  metadata: Record<string, unknown>
}

export interface SessionMonitorSummary {
  sessionId: string
  studentId: string
  studentName: string
  studentRegisterNumber: string
  status: SessionStatus
  violationCount: number
  startedAt: string
  expiresAt: string
}

export interface QuestionResultPublic {
  problemId: string
  title: string
  difficulty: Difficulty
  marks: number
  attempted: boolean
  verdict: Verdict | null
  score: number
  passedTests: number
  totalTests: number
}

export interface RoundResultSummary {
  roundId: string
  roundTitle: string
  status: SessionStatus
  completedAt: string | null
  totalMarks: number
  resultsAvailable: boolean
  score: number | null
  rank: number | null
  totalParticipants: number | null
}

export interface RoundResultDetail extends RoundResultSummary {
  questions: QuestionResultPublic[] | null
}

export interface LeaderboardEntry {
  rank: number
  studentId: string
  studentName: string
  studentRegisterNumber: string
  score: number
  totalMarks: number
  completedAt: string
  isYou: boolean
}

export interface LeaderboardResponse {
  resultsAvailable: boolean
  entries: LeaderboardEntry[]
}

export interface AdminRoundResultEntry {
  studentId: string
  studentName: string
  studentRegisterNumber: string
  status: SessionStatus
  score: number
  totalMarks: number
  rank: number | null
  violationCount: number
  completedAt: string | null
}

export interface OverviewStats {
  totalStudents: number
  totalProblems: number
  problemsAttempted: number
  totalSubmissions: number
  acceptedSubmissions: number
  overallPassRate: number
  activeRounds: number
  totalRounds: number
}

export interface SubmissionTrendPoint {
  date: string
  accepted: number
  other: number
}

export interface ProblemPerformance {
  problemId: string
  title: string
  difficulty: Difficulty
  topic: string
  attempts: number
  accepted: number
  passRate: number
  avgScore: number
}

export interface DifficultyPerformance {
  difficulty: Difficulty
  attempts: number
  accepted: number
  passRate: number
}

export interface TopicPerformance {
  topic: string
  attempts: number
  accepted: number
  passRate: number
}

export interface ModuleEngagement {
  moduleId: string
  title: string
  totalTopics: number
  studentsStarted: number
  avgCompletionPercent: number
}

export interface AnalyticsOverview {
  overview: OverviewStats
  submissionTrend: SubmissionTrendPoint[]
  difficultyBreakdown: DifficultyPerformance[]
  topicBreakdown: TopicPerformance[]
  problemPerformance: ProblemPerformance[]
  learningEngagement: ModuleEngagement[]
}
