import { cn } from '../../lib/cn'

export type QuestionState = 'current' | 'attempted' | 'submitted' | 'not_attempted'

interface QuestionNavigatorProps {
  count: number
  current: number
  states: QuestionState[]
  onSelect: (index: number) => void
}

const stateClass: Record<QuestionState, string> = {
  current: 'border-primary-600 bg-primary-600 text-white',
  submitted: 'border-green-500 bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300',
  attempted: 'border-amber-400 bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  not_attempted: 'border-zinc-300 bg-white text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300',
}

export default function QuestionNavigator({ count, current, states, onSelect }: QuestionNavigatorProps) {
  return (
    <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Question navigation">
      {Array.from({ length: count }).map((_, i) => (
        <button
          key={i}
          type="button"
          role="tab"
          aria-selected={i === current}
          aria-label={`Question ${i + 1}, ${states[i]?.replace('_', ' ')}`}
          onClick={() => onSelect(i)}
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-md border text-xs font-semibold transition-colors',
            stateClass[states[i] ?? 'not_attempted'],
          )}
        >
          {i + 1}
        </button>
      ))}
    </div>
  )
}
