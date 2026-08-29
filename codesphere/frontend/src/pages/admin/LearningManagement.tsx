import { useCallback, useEffect, useState } from 'react'
import * as api from '../../services/api'
import { ApiError } from '../../services/api'
import type { LearningModule } from '../../types'
import PageHeader from '../../components/layout/PageHeader'
import Button from '../../components/ui/Button'
import { Input } from '../../components/ui/Field'
import { InlineError } from '../../components/ui/ErrorState'
import EmptyState from '../../components/ui/EmptyState'
import { SkeletonCard } from '../../components/ui/Skeleton'
import { BookIcon } from '../../components/ui/Icons'

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
  const [showModuleForm, setShowModuleForm] = useState(false)
  const [topicFormFor, setTopicFormFor] = useState<string | null>(null)
  const [newTopic, setNewTopic] = useState<TopicFormState>(emptyTopicForm)

  const load = useCallback(() => {
    setError(null)
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
      setShowModuleForm(false)
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
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        title="Learning Management"
        description="Create and manage C Programming modules and topics."
        actions={
          <Button variant="primary" onClick={() => setShowModuleForm((s) => !s)}>
            {showModuleForm ? 'Cancel' : 'New Module'}
          </Button>
        }
      />

      {error && <div className="mt-4"><InlineError message={error} /></div>}

      {showModuleForm && (
        <div className="mt-4 flex flex-col gap-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <h2 className="text-sm font-medium text-zinc-900 dark:text-white">New Module</h2>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="flex-1">
              <Input placeholder="Title" value={newModule.title} onChange={(e) => setNewModule({ ...newModule, title: e.target.value })} />
            </div>
            <div className="flex-1">
              <Input
                placeholder="Description"
                value={newModule.description}
                onChange={(e) => setNewModule({ ...newModule, description: e.target.value })}
              />
            </div>
            <div className="w-24">
              <Input placeholder="Order" type="number" value={newModule.order} onChange={(e) => setNewModule({ ...newModule, order: e.target.value })} />
            </div>
            <Button variant="primary" onClick={handleCreateModule} disabled={!newModule.title || !newModule.description}>
              Add
            </Button>
          </div>
        </div>
      )}

      {modules === null && !error && (
        <div className="mt-6 flex flex-col gap-4">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}

      {modules !== null && modules.length === 0 && (
        <div className="mt-6">
          <EmptyState icon={<BookIcon className="h-6 w-6" />} title="No learning modules yet." action={<Button variant="primary" onClick={() => setShowModuleForm(true)}>New Module</Button>} />
        </div>
      )}

      <div className="mt-6 flex flex-col gap-4">
        {modules?.map((module) => (
          <div key={module.id} className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-medium text-zinc-900 dark:text-white">
                  {module.order}. {module.title}
                </h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">{module.description}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button variant="ghost" size="sm" onClick={() => setTopicFormFor(topicFormFor === module.id ? null : module.id)}>
                  + Topic
                </Button>
                <Button variant="ghost" size="sm" className="text-red-600 dark:text-red-400" onClick={() => handleDeleteModule(module.id)}>
                  Delete
                </Button>
              </div>
            </div>

            {topicFormFor === module.id && (
              <div className="mt-3 flex flex-col gap-2 rounded-md border border-zinc-100 p-3 dark:border-zinc-800">
                <Input placeholder="Topic title" value={newTopic.title} onChange={(e) => setNewTopic({ ...newTopic, title: e.target.value })} />
                <Input placeholder="Description" value={newTopic.description} onChange={(e) => setNewTopic({ ...newTopic, description: e.target.value })} />
                <Input
                  placeholder="YouTube URL (optional)"
                  value={newTopic.videoUrl}
                  onChange={(e) => setNewTopic({ ...newTopic, videoUrl: e.target.value })}
                />
                <div className="w-24">
                  <Input placeholder="Order" type="number" value={newTopic.order} onChange={(e) => setNewTopic({ ...newTopic, order: e.target.value })} />
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  className="self-start"
                  onClick={() => handleCreateTopic(module.id)}
                  disabled={!newTopic.title || !newTopic.description}
                >
                  Save Topic
                </Button>
              </div>
            )}

            <ul className="mt-3 flex flex-col gap-1">
              {module.topics.map((topic) => (
                <li key={topic.id} className="flex items-center justify-between rounded-md border border-zinc-100 px-3 py-2 text-sm dark:border-zinc-800">
                  <span className="text-zinc-700 dark:text-zinc-300">
                    {topic.order}. {topic.title}
                  </span>
                  <Button variant="ghost" size="sm" className="text-red-600 dark:text-red-400" onClick={() => handleDeleteTopic(topic.id)}>
                    Delete
                  </Button>
                </li>
              ))}
              {module.topics.length === 0 && <li className="text-sm text-zinc-400 dark:text-zinc-500">No topics yet.</li>}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}
