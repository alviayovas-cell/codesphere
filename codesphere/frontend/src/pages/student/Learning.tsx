import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import * as api from '../../services/api'
import { ApiError } from '../../services/api'
import type { LearningModule } from '../../types'

export default function Learning() {
  const [modules, setModules] = useState<LearningModule[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    api
      .getModules()
      .then(setModules)
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

  return (
    <div className="mx-auto mt-16 max-w-3xl px-4">
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">C Programming</h1>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Work through each module in order. Mark topics complete as you finish them.
      </p>

      {error && <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>}

      {modules === null && !error && (
        <p className="mt-6 text-sm text-gray-500 dark:text-gray-400">Loading...</p>
      )}

      {modules !== null && modules.length === 0 && (
        <p className="mt-6 text-sm text-gray-500 dark:text-gray-400">
          No learning modules are available yet. Check back soon.
        </p>
      )}

      <div className="mt-6 flex flex-col gap-6">
        {modules?.map((module) => (
          <div key={module.id} className="rounded-md border border-gray-200 p-4 dark:border-gray-800">
            <div className="flex items-baseline justify-between">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">{module.title}</h2>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {module.completedTopics}/{module.totalTopics} complete
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{module.description}</p>

            <ul className="mt-3 flex flex-col gap-2">
              {module.topics.map((topic) => (
                <li
                  key={topic.id}
                  className="flex items-center justify-between gap-3 rounded border border-gray-100 px-3 py-2 text-sm dark:border-gray-800"
                >
                  <label className="flex flex-1 items-center gap-2">
                    <input
                      type="checkbox"
                      checked={topic.completed}
                      onChange={() => toggleComplete(topic.id, topic.completed)}
                    />
                    <Link to={`/student/learning/topics/${topic.id}`} className="text-gray-800 dark:text-gray-200">
                      {topic.title}
                    </Link>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}
