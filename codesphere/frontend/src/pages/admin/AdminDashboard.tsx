import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import * as api from '../../services/api'
import type { CodingRoundAdminView, ProblemSummary, User } from '../../types'
import StatCard from '../../components/dashboard/StatCard'
import { SkeletonStatRow } from '../../components/ui/Skeleton'
import { Badge } from '../../components/ui/Badge'
import { BookIcon, ClockIcon, CodeIcon, UsersIcon } from '../../components/ui/Icons'

export default function AdminDashboard() {
  const { user } = useAuth()
  const [students, setStudents] = useState<User[] | null>(null)
  const [problems, setProblems] = useState<ProblemSummary[] | null>(null)
  const [rounds, setRounds] = useState<CodingRoundAdminView[] | null>(null)

  useEffect(() => {
    api.listStudents().then(setStudents).catch(() => setStudents(null))
    api.getProblems().then(setProblems).catch(() => setProblems(null))
    api.listRoundsAdmin().then(setRounds).catch(() => setRounds(null))
  }, [])

  const activeRounds = rounds?.filter((r) => r.status === 'scheduled').length
  const loaded = students !== null && problems !== null && rounds !== null

  const quickLinks = [
    { to: '/admin/students', label: 'Manage Students', icon: UsersIcon, description: 'Import via CSV, reset passwords' },
    { to: '/admin/learning', label: 'Manage Learning Content', icon: BookIcon, description: 'Modules and topics' },
    { to: '/admin/problems', label: 'Manage Problems', icon: CodeIcon, description: 'Problem bank and test cases' },
    { to: '/admin/rounds', label: 'Manage Coding Rounds', icon: ClockIcon, description: 'Create and publish rounds' },
  ]

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-white sm:text-2xl">Welcome, {user?.name}</h1>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Here's what's happening across CodeSphere.</p>

      <section className="mt-6">
        {!loaded ? (
          <SkeletonStatRow />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Total Students" value={students?.length ?? 0} icon={UsersIcon} accent="primary" />
            <StatCard label="Total Problems" value={problems?.length ?? 0} icon={CodeIcon} accent="success" />
            <StatCard label="Total Rounds" value={rounds?.length ?? 0} icon={ClockIcon} accent="secondary" />
            <StatCard label="Published Rounds" value={activeRounds ?? 0} icon={ClockIcon} accent="warning" />
          </div>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Quick Actions</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {quickLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="flex items-center gap-3 rounded-lg border border-zinc-200 p-4 transition-colors hover:border-primary-300 dark:border-zinc-800 dark:hover:border-primary-800"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary-50 text-primary-600 dark:bg-primary-950 dark:text-primary-400">
                <link.icon className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-medium text-zinc-900 dark:text-white">{link.label}</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">{link.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {rounds && rounds.length > 0 && (
        <section className="mt-8">
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Recent Coding Rounds</h2>
            <Link to="/admin/rounds" className="text-xs font-medium text-primary-600 hover:underline dark:text-primary-400">
              View all
            </Link>
          </div>
          <div className="mt-3 flex flex-col gap-2">
            {rounds.slice(0, 3).map((round) => (
              <div key={round.id} className="flex items-center justify-between rounded-lg border border-zinc-200 p-3.5 dark:border-zinc-800">
                <div>
                  <p className="text-sm font-medium text-zinc-900 dark:text-white">{round.title}</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">{round.problemIds.length} problems in pool</p>
                </div>
                <Badge variant={round.status === 'scheduled' ? 'success' : 'neutral'}>{round.status}</Badge>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
