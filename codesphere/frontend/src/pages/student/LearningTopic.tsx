import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import * as api from '../../services/api'
import { ApiError } from '../../services/api'
import type { LearningTopic } from '../../types'
import Button from '../../components/ui/Button'
import ErrorState from '../../components/ui/ErrorState'
import { PageSpinner } from '../../components/ui/Spinner'
import { ChevronLeftIcon } from '../../components/ui/Icons'

function toEmbedUrl(url: string): string | null {
  const watchMatch = url.match(/[?&]v=([\w-]{6,})/)
  if (watchMatch) return `https://www.youtube.com/embed/${watchMatch[1]}`
  const shortMatch = url.match(/youtu\.be\/([\w-]{6,})/)
  if (shortMatch) return `https://www.youtube.com/embed/${shortMatch[1]}`
  return null
}

export default function LearningTopicPage() {
  const { topicId } = useParams<{ topicId: string }>()
  const [topic, setTopic] = useState<LearningTopic | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [updating, setUpdating] = useState(false)

  const load = useCallback(() => {
    if (!topicId) return
    setError(null)
    api
      .getTopic(topicId)
      .then(setTopic)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load topic.'))
  }, [topicId])

  useEffect(() => {
    load()
  }, [load])

  async function toggleComplete() {
    if (!topic) return
    setUpdating(true)
    try {
      if (topic.completed) {
        await api.unmarkTopicComplete(topic.id)
      } else {
        await api.markTopicComplete(topic.id)
      }
      load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not update progress.')
    } finally {
      setUpdating(false)
    }
  }

  if (error) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-6">
        <ErrorState message={error} onRetry={load} />
        <Link to="/student/learning" className="mt-4 inline-block text-sm text-zinc-500 underline dark:text-zinc-400">
          Back to modules
        </Link>
      </div>
    )
  }

  if (!topic) return <PageSpinner />

  const embedUrl = topic.videoUrl ? toEmbedUrl(topic.videoUrl) : null

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <Link
        to="/student/learning"
        className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
      >
        <ChevronLeftIcon className="h-4 w-4" /> Back to modules
      </Link>

      <h1 className="mt-4 text-2xl font-semibold text-zinc-900 dark:text-white">{topic.title}</h1>
      <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">{topic.description}</p>

      {topic.videoUrl && (
        <div className="mt-5">
          {embedUrl ? (
            <div className="aspect-video w-full overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
              <iframe src={embedUrl} title={topic.title} className="h-full w-full" allowFullScreen />
            </div>
          ) : (
            <a href={topic.videoUrl} target="_blank" rel="noreferrer" className="text-sm text-primary-600 underline dark:text-primary-400">
              Watch reference video
            </a>
          )}
        </div>
      )}

      <Button variant={topic.completed ? 'secondary' : 'primary'} loading={updating} onClick={toggleComplete} className="mt-6">
        {topic.completed ? 'Mark as Incomplete' : 'Mark as Complete'}
      </Button>
    </div>
  )
}
