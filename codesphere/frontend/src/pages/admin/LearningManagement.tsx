import { useCallback, useEffect, useState } from 'react'
import * as api from '../../services/api'
import { ApiError } from '../../services/api'
import type { LearningModule } from '../../types'

interface ModuleFormState {
  title: string
  description: string
  order: string
}

interface TopicFormState {
  title: string
  description: string
  videoUrl: string
  order: string
}

const emptyModuleForm: ModuleFormState = { title: '', description: '', order: '' }
const emptyTopicForm: TopicFormState = { title: '', description: '', videoUrl: '', order: '' }

export default function LearningManagement() {
  const [modules, setModules] = useState<LearningModule[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [newModule, setNewModule] = useState<ModuleFormState>(emptyModuleForm)
  const [topicFormFor, setTopicFormFor] = useState<string | null>(null)
  const [newTopic, setNewTopic] = useState<TopicFormState>(emptyTopicForm)

  const load = useCallback(() => {
    api
      .getModules()
      .then(setModules)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load modules.'))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function handleCreateModule() {
    setError(null)
    try {
      await api.createModule({
        title: newModule.title,
        description: newModule.description,
        order: Number(newModule.order) || (modules?.length ?? 0) + 1,
      })
      setNewModule(emptyModuleForm)
      load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create module.')
    }
  }

  async function handleDeleteModule(moduleId: string) {
    setError(null)
    try {
      await api.deleteModule(moduleId)
      load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not delete module.')
    }
  }

  async function handleCreateTopic(moduleId: string) {
    setError(null)
    try {
      await api.createTopic(moduleId, {
        title: newTopic.title,
        description: newTopic.description,
        videoUrl: newTopic.videoUrl || null,
        order: Number(newTopic.order) || 1,
      })
      setNewTopic(emptyTopicForm)
      setTopicFormFor(null)
      load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create topic.')
    }
  }

  async function handleDeleteTopic(topicId: string) {
    setError(null)
    try {
      await api.deleteTopic(topicId)
      load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not delete topic.')
    }
  }

  return (
    <div className="mx-auto mt-16 max-w-3xl px-4 pb-16">
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Learning Management</h1>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Create and manage C Programming modules and topics.
      </p>

      {error && <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="mt-6 rounded-md border border-gray-200 p-4 dark:border-gray-800">
        <h2 className="text-sm font-medium text-gray-900 dark:text-white">New Module</h2>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <input
            placeholder="Title"
            value={newModule.title}
            onChange={(e) => setNewModule({ ...newModule, title: e.target.value })}
            className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
          />
          <input
            placeholder="Description"
            value={newModule.description}
            onChange={(e) => setNewModule({ ...newModule, description: e.target.value })}
            className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
          />
          <input
            placeholder="Order"
            type="number"
            value={newModule.order}
            onChange={(e) => setNewModule({ ...newModule, order: e.target.value })}
            className="w-24 rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
          />
          <button
            type="button"
            onClick={handleCreateModule}
            disabled={!newModule.title || !newModule.description}
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-gray-900"
          >
            Add
          </button>
        </div>
      </div>

      {modules === null && !error && (
        <p className="mt-6 text-sm text-gray-500 dark:text-gray-400">Loading...</p>
      )}

      <div className="mt-6 flex flex-col gap-4">
        {modules?.map((module) => (
          <div key={module.id} className="rounded-md border border-gray-200 p-4 dark:border-gray-800">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">
                  {module.order}. {module.title}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{module.description}</p>
              </div>
              <div className="flex shrink-0 gap-2 text-sm">
                <button
                  type="button"
                  onClick={() => setTopicFormFor(topicFormFor === module.id ? null : module.id)}
                  className="text-blue-600 underline"
                >
                  + Topic
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteModule(module.id)}
                  className="text-red-600 underline"
                >
                  Delete
                </button>
              </div>
            </div>

            {topicFormFor === module.id && (
              <div className="mt-3 flex flex-col gap-2 rounded border border-gray-100 p-3 dark:border-gray-800">
                <input
                  placeholder="Topic title"
                  value={newTopic.title}
                  onChange={(e) => setNewTopic({ ...newTopic, title: e.target.value })}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                />
                <input
                  placeholder="Description"
                  value={newTopic.description}
                  onChange={(e) => setNewTopic({ ...newTopic, description: e.target.value })}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                />
                <input
                  placeholder="YouTube URL (optional)"
                  value={newTopic.videoUrl}
                  onChange={(e) => setNewTopic({ ...newTopic, videoUrl: e.target.value })}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                />
                <input
                  placeholder="Order"
                  type="number"
                  value={newTopic.order}
                  onChange={(e) => setNewTopic({ ...newTopic, order: e.target.value })}
                  className="w-24 rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => handleCreateTopic(module.id)}
                  disabled={!newTopic.title || !newTopic.description}
                  className="self-start rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-gray-900"
                >
                  Save Topic
                </button>
              </div>
            )}

            <ul className="mt-3 flex flex-col gap-1">
              {module.topics.map((topic) => (
                <li
                  key={topic.id}
                  className="flex items-center justify-between rounded border border-gray-100 px-3 py-2 text-sm dark:border-gray-800"
                >
                  <span>
                    {topic.order}. {topic.title}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDeleteTopic(topic.id)}
                    className="text-red-600 underline"
                  >
                    Delete
                  </button>
                </li>
              ))}
              {module.topics.length === 0 && (
                <li className="text-sm text-gray-400 dark:text-gray-500">No topics yet.</li>
              )}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}
