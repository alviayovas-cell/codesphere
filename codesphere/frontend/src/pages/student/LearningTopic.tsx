import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import * as api from '../../services/api'
import { ApiError } from '../../services/api'
import type { LearningTopic } from '../../types'

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
      <div className="mx-auto mt-16 max-w-2xl px-4">
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        <Link to="/student/learning" className="mt-4 inline-block text-sm underline">
          Back to modules
        </Link>
      </div>
    )
  }

  if (!topic) {
    return <div className="mx-auto mt-16 max-w-2xl px-4 text-sm text-gray-500 dark:text-gray-400">Loading...</div>
  }

  const embedUrl = topic.videoUrl ? toEmbedUrl(topic.videoUrl) : null

  return (
    <div className="mx-auto mt-16 max-w-2xl px-4">
      <Link to="/student/learning" className="text-sm text-gray-500 underline dark:text-gray-400">
        &larr; Back to modules
      </Link>

      <h1 className="mt-4 text-2xl font-semibold text-gray-900 dark:text-white">{topic.title}</h1>
      <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{topic.description}</p>

      {topic.videoUrl && (
        <div className="mt-4">
          {embedUrl ? (
            <div className="aspect-video w-full overflow-hidden rounded-md">
              <iframe
                src={embedUrl}
                title={topic.title}
                className="h-full w-full"
                allowFullScreen
              />
            </div>
          ) : (
            <a href={topic.videoUrl} target="_blank" rel="noreferrer" className="text-sm text-blue-600 underline">
              Watch reference video
            </a>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={toggleComplete}
        disabled={updating}
        className="mt-6 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-gray-900"
      >
        {topic.completed ? 'Mark as Incomplete' : 'Mark as Complete'}
      </button>
    </div>
  )
}
