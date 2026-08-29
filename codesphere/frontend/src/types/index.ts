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
