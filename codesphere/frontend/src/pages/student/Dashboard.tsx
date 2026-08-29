import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import * as api from '../../services/api'
import type { LearningModule, ProgressSummary } from '../../types'

export default function StudentDashboard() {
  const { user } = useAuth()
  const [progress, setProgress] = useState<ProgressSummary | null>(null)
  const [modules, setModules] = useState<LearningModule[] | null>(null)

  useEffect(() => {
    api.getProgress().then(setProgress).catch(() => setProgress(null))
    api.getModules().then(setModules).catch(() => setModules(null))
  }, [])

  const percent =
    progress && progress.totalTopics > 0
      ? Math.round((progress.completedTopics / progress.totalTopics) * 100)
      : 0

  const nextTopic = modules
    ?.flatMap((module) => module.topics.map((topic) => ({ module, topic })))
    .find(({ topic }) => !topic.completed)

  return (
    <div className="mx-auto mt-16 max-w-3xl px-4">
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Welcome, {user?.name}</h1>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        {user?.registerNumber} &middot; {user?.class}
      </p>

      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Learning Progress
        </h2>
        {progress ? (
          <div className="mt-2">
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
              <div className="h-full bg-gray-900 dark:bg-white" style={{ width: `${percent}%` }} />
            </div>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
              {progress.completedTopics} of {progress.totalTopics} topics completed ({percent}%)
            </p>
          </div>
        ) : (
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Loading...</p>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Continue Learning
        </h2>
        {modules === null ? (
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Loading...</p>
        ) : nextTopic ? (
          <Link
            to={`/student/learning/topics/${nextTopic.topic.id}`}
            className="mt-2 block rounded-md border border-gray-200 p-4 hover:border-gray-400 dark:border-gray-800 dark:hover:border-gray-600"
          >
            <p className="text-xs text-gray-500 dark:text-gray-400">{nextTopic.module.title}</p>
            <p className="text-gray-900 dark:text-white">{nextTopic.topic.title}</p>
          </Link>
        ) : (
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            You've completed every available topic. Nice work!
          </p>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Available Modules
        </h2>
        <Link to="/student/learning" className="mt-2 inline-block text-sm text-blue-600 underline">
          Browse all C Programming modules &rarr;
        </Link>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Upcoming Coding Rounds
        </h2>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Coming in a later phase.</p>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Recent Activity
        </h2>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Coming in a later phase.</p>
      </section>
    </div>
  )
}
