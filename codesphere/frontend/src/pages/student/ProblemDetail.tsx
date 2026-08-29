import Editor from '@monaco-editor/react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { formatCountdown, useCountdown } from '../../hooks/useCountdown'
import * as api from '../../services/api'
import { ApiError } from '../../services/api'
import type { JobStatus, ProblemPublic, RoundSessionPublic, RunCodeResult, SubmitCodeResult, Verdict } from '../../types'

const DEFAULT_TEMPLATE = '#include <stdio.h>\n\nint main() {\n    \n    return 0;\n}\n'

const verdictLabel: Record<Verdict, string> = {
  pending: 'Pending',
  accepted: 'Accepted',
  wrong_answer: 'Wrong Answer',
  compilation_error: 'Compilation Error',
  runtime_error: 'Runtime Error',
  time_limit_exceeded: 'Time Limit Exceeded',
  internal_error: 'Internal Error',
}

const verdictColor: Record<Verdict, string> = {
  pending: 'text-gray-500',
  accepted: 'text-green-600 dark:text-green-400',
  wrong_answer: 'text-red-600 dark:text-red-400',
  compilation_error: 'text-red-600 dark:text-red-400',
  runtime_error: 'text-red-600 dark:text-red-400',
  time_limit_exceeded: 'text-amber-600 dark:text-amber-400',
  internal_error: 'text-amber-600 dark:text-amber-400',
}

function draftKey(problemId: string) {
  return `codesphere_code_draft_${problemId}`
}

export default function ProblemDetail() {
  const { problemId, roundId } = useParams<{ problemId: string; roundId?: string }>()
  const navigate = useNavigate()
  const [problem, setProblem] = useState<ProblemPublic | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [roundSession, setRoundSession] = useState<RoundSessionPublic | null>(null)

  const [code, setCode] = useState(DEFAULT_TEMPLATE)
  const [stdin, setStdin] = useState('')

  const [running, setRunning] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [jobPhase, setJobPhase] = useState<JobStatus | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [runResult, setRunResult] = useState<RunCodeResult | null>(null)
  const [submitResult, setSubmitResult] = useState<SubmitCodeResult | null>(null)

  useEffect(() => {
    if (!problemId) return
    api
      .getProblem(problemId)
      .then((p) => {
        setProblem(p)
        setStdin(p.publicTestCases[0]?.input ?? '')
        try {
          const saved = localStorage.getItem(draftKey(problemId))
          if (saved) setCode(saved)
        } catch {
          // localStorage unavailable - fall back to the default template.
        }
      })
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : 'Failed to load problem.'))
  }, [problemId])

  useEffect(() => {
    if (!problemId) return
    try {
      localStorage.setItem(draftKey(problemId), code)
    } catch {
      // Ignore storage failures (private browsing, quota, etc.) - not critical.
    }
  }, [problemId, code])

  useEffect(() => {
    if (!roundId) return
    api.getRoundSession(roundId).then(setRoundSession).catch(() => setRoundSession(null))
  }, [roundId])

  const remaining = useCountdown(roundSession?.remainingSeconds ?? 0)
  const roundLocked = roundSession !== null && roundSession.status !== 'active'

  async function handleRun() {
    if (!problemId) return
    setActionError(null)
    setSubmitResult(null)
    setRunResult(null)
    setRunning(true)
    setJobPhase('queued')
    try {
      const { jobId } = await api.runCode(problemId, code, stdin)
      const finalStatus = await api.pollJob(jobId, { onTick: (s) => setJobPhase(s.status) })
      if (finalStatus.status === 'failed') {
        setActionError(finalStatus.error ?? 'The run job failed.')
      } else {
        setRunResult(finalStatus.result as RunCodeResult)
      }
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Could not run code.')
    } finally {
      setRunning(false)
      setJobPhase(null)
    }
  }

  async function handleSubmit() {
    if (!problemId) return
    setActionError(null)
    setRunResult(null)
    setSubmitResult(null)
    setSubmitting(true)
    setJobPhase('queued')
    try {
      const { jobId } = await api.submitCode(problemId, code, roundId)
      const finalStatus = await api.pollJob(jobId, { onTick: (s) => setJobPhase(s.status) })
      if (finalStatus.status === 'failed') {
        setActionError(finalStatus.error ?? 'The submit job failed.')
      } else {
        setSubmitResult(finalStatus.result as SubmitCodeResult)
      }
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Could not submit code.')
    } finally {
      setSubmitting(false)
      setJobPhase(null)
    }
  }

  const jobPhaseLabel: Record<JobStatus, string> = {
    queued: 'Queued...',
    processing: 'Executing...',
    completed: 'Done',
    failed: 'Failed',
  }

  if (loadError) {
    return (
      <div className="mx-auto mt-16 max-w-2xl px-4">
        <p className="text-sm text-red-600 dark:text-red-400">{loadError}</p>
        <Link to="/student/problems" className="mt-4 inline-block text-sm underline">
          Back to problems
        </Link>
      </div>
    )
  }

  if (!problem) {
    return <div className="mx-auto mt-16 max-w-2xl px-4 text-sm text-gray-500 dark:text-gray-400">Loading...</div>
  }

  return (
    <div className="flex h-[calc(100vh-65px)] flex-col">
      <div className="flex flex-1 flex-col overflow-hidden md:flex-row">
        {/* Left: problem statement */}
        <div className="w-full overflow-y-auto border-b border-gray-200 p-4 dark:border-gray-800 md:w-1/2 md:border-b-0 md:border-r">
          {roundId ? (
            <button
              type="button"
              onClick={() => navigate(`/student/rounds/${roundId}`)}
              className="text-sm text-gray-500 underline dark:text-gray-400"
            >
              &larr; Back to round
            </button>
          ) : (
            <Link to="/student/problems" className="text-sm text-gray-500 underline dark:text-gray-400">
              &larr; Back to problems
            </Link>
          )}

          <div className="mt-3 flex items-baseline justify-between">
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">{problem.title}</h1>
            <div className="flex items-center gap-2">
              {roundId && roundSession?.status === 'active' && (
                <span className="rounded bg-gray-900 px-2 py-0.5 font-mono text-xs text-white dark:bg-white dark:text-gray-900">
                  {formatCountdown(remaining)}
                </span>
              )}
              <span className="text-sm text-gray-500 dark:text-gray-400">{problem.marks} marks</span>
            </div>
          </div>
          {roundLocked && (
            <p className="mt-1 text-sm text-amber-600 dark:text-amber-400">
              This round is {roundSession?.status} — submissions are no longer accepted.
            </p>
          )}
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {problem.topic} &middot; <span className="capitalize">{problem.difficulty}</span>
          </p>

          <p className="mt-4 whitespace-pre-line text-sm text-gray-800 dark:text-gray-200">{problem.description}</p>

          <div className="mt-4 grid gap-3">
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Input Format
              </h2>
              <p className="mt-1 whitespace-pre-line text-sm text-gray-700 dark:text-gray-300">
                {problem.inputFormat}
              </p>
            </div>
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Output Format
              </h2>
              <p className="mt-1 whitespace-pre-line text-sm text-gray-700 dark:text-gray-300">
                {problem.outputFormat}
              </p>
            </div>
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Constraints
              </h2>
              <p className="mt-1 whitespace-pre-line text-sm text-gray-700 dark:text-gray-300">
                {problem.constraints}
              </p>
            </div>
          </div>

          {problem.examples.map((example, index) => (
            <div key={index} className="mt-3 rounded-md border border-gray-200 p-3 dark:border-gray-800">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Input</p>
              <pre className="mt-1 whitespace-pre-wrap rounded bg-gray-50 p-2 text-xs dark:bg-gray-900">
                {example.input}
              </pre>
              <p className="mt-2 text-xs font-medium text-gray-500 dark:text-gray-400">Output</p>
              <pre className="mt-1 whitespace-pre-wrap rounded bg-gray-50 p-2 text-xs dark:bg-gray-900">
                {example.output}
              </pre>
            </div>
          ))}
        </div>

        {/* Right: editor */}
        <div className="flex w-full flex-1 flex-col md:w-1/2">
          <div className="flex items-center justify-between border-b border-gray-200 px-3 py-2 dark:border-gray-800">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Language: C</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleRun}
                disabled={running || submitting || roundLocked}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 disabled:opacity-50 dark:border-gray-700 dark:text-gray-200"
              >
                {running ? (jobPhase ? jobPhaseLabel[jobPhase] : 'Running...') : 'Run Code'}
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={running || submitting || roundLocked}
                className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-gray-900"
              >
                {submitting ? (jobPhase ? jobPhaseLabel[jobPhase] : 'Submitting...') : 'Submit Code'}
              </button>
            </div>
          </div>

          <div className="h-[45%] min-h-[200px]">
            <Editor
              height="100%"
              defaultLanguage="c"
              theme="vs-dark"
              value={code}
              onChange={(value) => setCode(value ?? '')}
              options={{ minimap: { enabled: false }, fontSize: 14 }}
            />
          </div>

          <div className="flex flex-1 flex-col overflow-y-auto border-t border-gray-200 dark:border-gray-800">
            <div className="p-3">
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Input
              </label>
              <textarea
                value={stdin}
                onChange={(e) => setStdin(e.target.value)}
                rows={3}
                className="mt-1 w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 font-mono text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              />
            </div>

            {actionError && (
              <p className="px-3 pb-2 text-sm text-red-600 dark:text-red-400">{actionError}</p>
            )}

            {runResult && (
              <div className="border-t border-gray-100 p-3 dark:border-gray-800">
                <p className={`text-sm font-semibold ${verdictColor[runResult.verdict]}`}>
                  {verdictLabel[runResult.verdict]}
                  {runResult.timeSeconds !== null && (
                    <span className="ml-2 text-xs font-normal text-gray-500 dark:text-gray-400">
                      {runResult.timeSeconds}s
                      {runResult.memoryKb !== null && ` · ${runResult.memoryKb} KB`}
                    </span>
                  )}
                </p>
                {runResult.compileOutput && (
                  <>
                    <p className="mt-2 text-xs font-medium text-gray-500 dark:text-gray-400">Compilation Error</p>
                    <pre className="mt-1 whitespace-pre-wrap rounded bg-red-50 p-2 text-xs text-red-800 dark:bg-red-950 dark:text-red-200">
                      {runResult.compileOutput}
                    </pre>
                  </>
                )}
                {runResult.stdout && (
                  <>
                    <p className="mt-2 text-xs font-medium text-gray-500 dark:text-gray-400">Output</p>
                    <pre className="mt-1 whitespace-pre-wrap rounded bg-gray-50 p-2 text-xs dark:bg-gray-900">
                      {runResult.stdout}
                    </pre>
                  </>
                )}
                {runResult.stderr && (
                  <>
                    <p className="mt-2 text-xs font-medium text-gray-500 dark:text-gray-400">Runtime Error</p>
                    <pre className="mt-1 whitespace-pre-wrap rounded bg-red-50 p-2 text-xs text-red-800 dark:bg-red-950 dark:text-red-200">
                      {runResult.stderr}
                    </pre>
                  </>
                )}
              </div>
            )}

            {submitResult && submitResult.verdict === 'pending' && submitResult.testCaseResults.length === 0 ? (
              <div className="border-t border-gray-100 p-3 dark:border-gray-800">
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Submitted</p>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Results for this round aren't shown until it's over.
                </p>
              </div>
            ) : (
              submitResult && (
                <div className="border-t border-gray-100 p-3 dark:border-gray-800">
                  <p className={`text-sm font-semibold ${verdictColor[submitResult.verdict]}`}>
                    {verdictLabel[submitResult.verdict]}
                  </p>
                  <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">
                    Score: {submitResult.score} &middot; Passed {submitResult.passedTests}/{submitResult.totalTests}{' '}
                    test cases
                  </p>
                  {submitResult.compileOutput && (
                    <pre className="mt-2 whitespace-pre-wrap rounded bg-red-50 p-2 text-xs text-red-800 dark:bg-red-950 dark:text-red-200">
                      {submitResult.compileOutput}
                    </pre>
                  )}
                  <ul className="mt-2 flex flex-col gap-1">
                    {submitResult.testCaseResults.map((tc) => (
                      <li key={tc.index} className={`text-sm ${verdictColor[tc.verdict]}`}>
                        Test Case {tc.index}: {tc.verdict === 'accepted' ? 'Passed' : verdictLabel[tc.verdict]}
                      </li>
                    ))}
                  </ul>
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
