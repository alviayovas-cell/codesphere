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
