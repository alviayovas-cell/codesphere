import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import * as api from '../../services/api'
import { ApiError } from '../../services/api'
import type { LearningModule } from '../../types'
import PageHeader from '../../components/layout/PageHeader'
import ProgressBar from '../../components/ui/ProgressBar'
import { CheckCircleIcon, PlayIcon } from '../../components/ui/Icons'
import { SkeletonCard } from '../../components/ui/Skeleton'
import EmptyState from '../../components/ui/EmptyState'
import ErrorState from '../../components/ui/ErrorState'
import { cn } from '../../lib/cn'

export default function Learning() {
  const [modules, setModules] = useState<LearningModule[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activeModuleId, setActiveModuleId] = useState<string | null>(null)

  const load = useCallback(() => {
    setError(null)
    api
      .getModules()
      .then((data) => {
        setModules(data)
        setActiveModuleId((current) => current ?? data.find((m) => m.completedTopics < m.totalTopics)?.id ?? data[0]?.id ?? null)
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load modules.'))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function toggleComplete(topicId: string, completed: boolean) {
    try {
      if (completed) {
        await api.unmarkTopicComplete(topicId)
      } else {
        await api.markTopicComplete(topicId)
      }
      load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not update progress.')
    }
  }

  const activeModule = modules?.find((m) => m.id === activeModuleId) ?? null

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader title="C Programming" description="Work through each module in order. Mark topics complete as you finish them." />

      {error && <div className="mt-4"><ErrorState message={error} onRetry={load} /></div>}

      {modules === null && !error && (
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}

      {modules !== null && modules.length === 0 && (
        <div className="mt-6">
          <EmptyState title="No learning modules are available yet." description="Check back soon." />
        </div>
      )}

      {modules !== null && modules.length > 0 && (
        <div className="mt-6 grid gap-6 lg:grid-cols-[280px_1fr]">
          {/* Roadmap */}
          <nav aria-label="Learning roadmap" className="flex flex-col">
            <ol className="relative flex flex-col">
              {modules.map((module, index) => (
                <li key={module.id} className="relative pb-1">
                  {index < modules.length - 1 && (
                    <span className="absolute left-[15px] top-8 h-[calc(100%-8px)] w-px bg-zinc-200 dark:bg-zinc-800" aria-hidden="true" />
                  )}
                  <button
                    type="button"
                    onClick={() => setActiveModuleId(module.id)}
                    className={cn(
                      'flex w-full items-start gap-3 rounded-md px-2 py-2 text-left transition-colors',
                      module.id === activeModuleId ? 'bg-primary-50 dark:bg-primary-950' : 'hover:bg-zinc-100 dark:hover:bg-zinc-900',
                    )}
                  >
                    <span
                      className={cn(
                        'z-10 mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold',
                        module.completedTopics === module.totalTopics && module.totalTopics > 0
                          ? 'border-green-500 bg-green-50 text-green-600 dark:bg-green-950 dark:text-green-400'
                          : module.id === activeModuleId
                            ? 'border-primary-600 bg-primary-600 text-white'
                            : 'border-zinc-300 bg-white text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400',
                      )}
                    >
                      {module.completedTopics === module.totalTopics && module.totalTopics > 0 ? (
                        <CheckCircleIcon className="h-4 w-4" />
                      ) : (
                        index + 1
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          'truncate text-sm font-medium',
                          module.id === activeModuleId ? 'text-primary-700 dark:text-primary-300' : 'text-zinc-800 dark:text-zinc-200',
                        )}
                      >
                        {module.title}
                      </p>
                      <p className="text-xs text-zinc-400 dark:text-zinc-500">
                        {module.completedTopics}/{module.totalTopics} lessons
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ol>
          </nav>

          {/* Selected module content */}
          {activeModule && (
            <div className="rounded-lg border border-zinc-200 p-5 dark:border-zinc-800">
              <div className="flex items-baseline justify-between gap-4">
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">{activeModule.title}</h2>
                <span className="shrink-0 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  {activeModule.completedTopics}/{activeModule.totalTopics} complete
                </span>
              </div>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{activeModule.description}</p>
              <ProgressBar
                percent={activeModule.totalTopics > 0 ? (activeModule.completedTopics / activeModule.totalTopics) * 100 : 0}
                className="mt-3"
              />

              <ul className="mt-5 flex flex-col divide-y divide-zinc-100 dark:divide-zinc-800">
                {activeModule.topics.map((topic) => (
                  <li key={topic.id} className="flex items-center gap-3 py-3">
                    <input
                      type="checkbox"
                      checked={topic.completed}
                      onChange={() => toggleComplete(topic.id, topic.completed)}
                      aria-label={`Mark "${topic.title}" as ${topic.completed ? 'incomplete' : 'complete'}`}
                      className="h-4 w-4 shrink-0 rounded border-zinc-300 text-primary-600 focus:ring-primary-500 dark:border-zinc-600"
                    />
                    <Link
                      to={`/student/learning/topics/${topic.id}`}
                      className="flex flex-1 items-center justify-between gap-2 text-sm"
                    >
                      <span className={cn(topic.completed ? 'text-zinc-400 line-through dark:text-zinc-600' : 'text-zinc-800 dark:text-zinc-200')}>
                        {topic.title}
                      </span>
                      <span className="flex items-center gap-1.5 text-xs text-zinc-400 dark:text-zinc-500">
                        {topic.videoUrl && <PlayIcon className="h-3.5 w-3.5" />}
                      </span>
                    </Link>
                  </li>
                ))}
                {activeModule.topics.length === 0 && (
                  <li className="py-4 text-sm text-zinc-400 dark:text-zinc-500">No topics in this module yet.</li>
                )}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
