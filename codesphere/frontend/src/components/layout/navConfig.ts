import type { ComponentType, SVGProps } from 'react'
import {
  BookIcon,
  ChartIcon,
  ClockIcon,
  CodeIcon,
  DashboardIcon,
  MonitorIcon,
  TrophyIcon,
  UsersIcon,
} from '../ui/Icons'

export interface NavItem {
  label: string
  to: string
  icon: ComponentType<SVGProps<SVGSVGElement>>
}

export const studentNav: NavItem[] = [
  { label: 'Dashboard', to: '/student/dashboard', icon: DashboardIcon },
  { label: 'Learn', to: '/student/learning', icon: BookIcon },
  { label: 'Practice', to: '/student/problems', icon: CodeIcon },
  { label: 'Coding Rounds', to: '/student/rounds', icon: ClockIcon },
  { label: 'Leaderboard', to: '/student/leaderboard', icon: TrophyIcon },
  { label: 'Results', to: '/student/results', icon: ChartIcon },
]

export const adminNav: NavItem[] = [
  { label: 'Overview', to: '/admin/dashboard', icon: DashboardIcon },
  { label: 'Students', to: '/admin/students', icon: UsersIcon },
  { label: 'Learning', to: '/admin/learning', icon: BookIcon },
  { label: 'Problems', to: '/admin/problems', icon: CodeIcon },
  { label: 'Coding Rounds', to: '/admin/rounds', icon: ClockIcon },
  { label: 'Monitoring', to: '/admin/monitoring', icon: MonitorIcon },
  { label: 'Analytics', to: '/admin/analytics', icon: ChartIcon },
]
