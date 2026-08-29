import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'
import type { Difficulty, RoundStatus, SessionStatus, Verdict } from '../../types'

export function Badge({
  children,
  className,
  variant = 'neutral',
}: {
  children: ReactNode
  className?: string
  variant?: 'neutral' | 'primary' | 'success' | 'warning' | 'danger'
}) {
  const variants: Record<string, string> = {
    neutral: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
    primary: 'bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-300',
    success: 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300',
    warning: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
    danger: 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300',
  }
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium',
        variants[variant],
        className,
      )}
    >
      {children}
    </span>
  )
}

const difficultyVariant: Record<Difficulty, 'success' | 'warning' | 'danger'> = {
  easy: 'success',
  medium: 'warning',
  hard: 'danger',
}

export function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  return (
    <Badge variant={difficultyVariant[difficulty]} className="capitalize">
      {difficulty}
    </Badge>
  )
}

const verdictMeta: Record<Verdict, { label: string; variant: 'success' | 'warning' | 'danger' | 'neutral' }> = {
  pending: { label: 'Pending', variant: 'neutral' },
  accepted: { label: 'Accepted', variant: 'success' },
  wrong_answer: { label: 'Wrong Answer', variant: 'danger' },
  compilation_error: { label: 'Compilation Error', variant: 'danger' },
  runtime_error: { label: 'Runtime Error', variant: 'danger' },
  time_limit_exceeded: { label: 'Time Limit Exceeded', variant: 'warning' },
  internal_error: { label: 'Internal Error', variant: 'warning' },
}

export function VerdictBadge({ verdict }: { verdict: Verdict }) {
  const meta = verdictMeta[verdict]
  return <Badge variant={meta.variant}>{meta.label}</Badge>
}

export function verdictLabel(verdict: Verdict): string {
  return verdictMeta[verdict].label
}

const roundStatusMeta: Record<RoundStatus, { label: string; variant: 'success' | 'neutral' | 'warning' }> = {
  draft: { label: 'Draft', variant: 'neutral' },
  scheduled: { label: 'Scheduled', variant: 'success' },
  active: { label: 'Active', variant: 'success' },
  ended: { label: 'Ended', variant: 'neutral' },
}

export function RoundStatusBadge({ status }: { status: RoundStatus }) {
  const meta = roundStatusMeta[status]
  return <Badge variant={meta.variant}>{meta.label}</Badge>
}

const sessionStatusMeta: Record<
  SessionStatus,
  { label: string; variant: 'success' | 'neutral' | 'warning' | 'danger' | 'primary' }
> = {
  not_started: { label: 'Not Started', variant: 'neutral' },
  active: { label: 'In Progress', variant: 'success' },
  submitted: { label: 'Submitted', variant: 'primary' },
  expired: { label: 'Time Expired', variant: 'warning' },
  locked: { label: 'Locked', variant: 'danger' },
}

export function SessionStatusBadge({ status }: { status: SessionStatus }) {
  const meta = sessionStatusMeta[status]
  return <Badge variant={meta.variant}>{meta.label}</Badge>
}
