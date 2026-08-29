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
