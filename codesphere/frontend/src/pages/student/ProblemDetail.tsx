import Editor from '@monaco-editor/react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useCountdown } from '../../hooks/useCountdown'
import { useTheme } from '../../context/ThemeContext'
import * as api from '../../services/api'
import { ApiError } from '../../services/api'
import type { JobStatus, ProblemPublic, RoundSessionPublic, RunCodeResult, SubmitCodeResult } from '../../types'
import Button from '../../components/ui/Button'
import { DifficultyBadge, VerdictBadge } from '../../components/ui/Badge'
import Tabs from '../../components/ui/Tabs'
import Spinner, { PageSpinner } from '../../components/ui/Spinner'
import ErrorState, { InlineError } from '../../components/ui/ErrorState'
import MobileEditorNotice from '../../components/coding/MobileEditorNotice'
import Timer from '../../components/coding/Timer'
import { ChevronLeftIcon, ExpandIcon } from '../../components/ui/Icons'
import { cn } from '../../lib/cn'

const DEFAULT_TEMPLATE = '#include <stdio.h>\n\nint main() {\n    \n    return 0;\n}\n'

function draftKey(problemId: string) {
  return `codesphere_code_draft_${problemId}`
}

type PanelTab = 'tests' | 'output' | 'errors'

export default function ProblemDetail() {
  const { problemId, roundId } = useParams<{ problemId: string; roundId?: string }>()
  const navigate = useNavigate()
  const { resolvedTheme } = useTheme()
  const [problem, setProblem] = useState<ProblemPublic | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [roundSession, setRoundSession] = useState<RoundSessionPublic | null>(null)

  const [code, setCode] = useState(DEFAULT_TEMPLATE)
  const [stdin, setStdin] = useState('')
  const [fullscreen, setFullscreen] = useState(false)
  const [tab, setTab] = useState<PanelTab>('tests')

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
        setTab('errors')
      } else {
        const result = finalStatus.result as RunCodeResult
        setRunResult(result)
        setTab(result.compileOutput || result.stderr ? 'errors' : 'output')
      }
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Could not run code.')
      setTab('errors')
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
        setTab('errors')
      } else {
        const result = finalStatus.result as SubmitCodeResult
        setSubmitResult(result)
        setTab(result.compileOutput ? 'errors' : 'output')
      }
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Could not submit code.')
      setTab('errors')
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
      <div className="mx-auto max-w-2xl px-4 py-6">
        <ErrorState message={loadError} />
        <Link to="/student/problems" className="mt-4 inline-block text-sm text-zinc-500 underline dark:text-zinc-400">
          Back to problems
        </Link>
      </div>
    )
  }

  if (!problem) return <PageSpinner />

  const compileError = runResult?.compileOutput || submitResult?.compileOutput
  const runtimeError = runResult?.stderr

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex flex-1 overflow-hidden">
        {/* Left: problem statement (hidden in fullscreen editor mode) */}
        {!fullscreen && (
          <div className="w-full overflow-y-auto border-r border-zinc-200 p-5 dark:border-zinc-800 md:w-[45%] lg:w-[40%]">
            {roundId ? (
              <button
                type="button"
                onClick={() => navigate(`/student/rounds/${roundId}`)}
                className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
              >
                <ChevronLeftIcon className="h-4 w-4" /> Back to round
              </button>
            ) : (
              <Link to="/student/problems" className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200">
                <ChevronLeftIcon className="h-4 w-4" /> Back to problems
              </Link>
            )}

            <div className="mt-3 flex items-center justify-between gap-3">
              <h1 className="text-lg font-semibold text-zinc-900 dark:text-white">{problem.title}</h1>
              <div className="flex shrink-0 items-center gap-2">
                {roundId && roundSession?.status === 'active' && <Timer seconds={remaining} />}
                <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{problem.marks} marks</span>
              </div>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <DifficultyBadge difficulty={problem.difficulty} />
              <span className="text-xs text-zinc-400 dark:text-zinc-500">{problem.topic}</span>
            </div>

            {roundLocked && (
              <div className="mt-3">
                <InlineError message={`This round is ${roundSession?.status} — submissions are no longer accepted.`} />
              </div>
            )}

            <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">{problem.description}</p>

            <div className="mt-4 grid gap-3">
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">Input Format</h2>
                <p className="mt-1 whitespace-pre-line text-sm text-zinc-600 dark:text-zinc-300">{problem.inputFormat}</p>
              </div>
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">Output Format</h2>
                <p className="mt-1 whitespace-pre-line text-sm text-zinc-600 dark:text-zinc-300">{problem.outputFormat}</p>
              </div>
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">Constraints</h2>
                <p className="mt-1 whitespace-pre-line text-sm text-zinc-600 dark:text-zinc-300">{problem.constraints}</p>
              </div>
            </div>

            {problem.examples.map((example, index) => (
              <div key={index} className="mt-3 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
                <p className="text-xs font-medium text-zinc-400 dark:text-zinc-500">Example {index + 1} — Input</p>
                <pre className="mt-1 whitespace-pre-wrap rounded bg-zinc-50 p-2 text-xs dark:bg-zinc-900">{example.input}</pre>
                <p className="mt-2 text-xs font-medium text-zinc-400 dark:text-zinc-500">Output</p>
                <pre className="mt-1 whitespace-pre-wrap rounded bg-zinc-50 p-2 text-xs dark:bg-zinc-900">{example.output}</pre>
              </div>
            ))}
          </div>
        )}

        {/* Right: editor - replaced with a notice below md, per spec */}
        <div className="hidden flex-1 flex-col md:flex">
          <div className="flex items-center justify-between border-b border-zinc-200 px-3 py-2 dark:border-zinc-800">
            <span className="rounded bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
              Language: C
            </span>
            <button
              type="button"
              onClick={() => setFullscreen((f) => !f)}
              className="rounded p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
              aria-label={fullscreen ? 'Exit fullscreen' : 'Fullscreen editor'}
              title={fullscreen ? 'Exit fullscreen' : 'Fullscreen editor'}
            >
              <ExpandIcon className="h-4 w-4" />
            </button>
          </div>

          <div className="h-[50%] min-h-[220px]">
            <Editor
              height="100%"
              defaultLanguage="c"
              theme={resolvedTheme === 'dark' ? 'vs-dark' : 'light'}
              value={code}
              onChange={(value) => setCode(value ?? '')}
              options={{ minimap: { enabled: false }, fontSize: 14 }}
            />
          </div>

          <div className="flex flex-1 flex-col overflow-hidden border-t border-zinc-200 dark:border-zinc-800">
            <Tabs
              tabs={[
                { id: 'tests', label: 'Test Cases' },
                { id: 'output', label: 'Output' },
                { id: 'errors', label: 'Errors', badge: compileError || runtimeError ? 1 : 0 },
              ]}
              active={tab}
              onChange={setTab}
            />

            <div className="scrollbar-thin flex-1 overflow-y-auto p-3">
              {tab === 'tests' && (
                <div className="flex flex-col gap-3">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                      Input (stdin)
                    </label>
                    <textarea
                      value={stdin}
                      onChange={(e) => setStdin(e.target.value)}
                      rows={4}
                      className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 font-mono text-sm text-zinc-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
                    />
                  </div>
                  {problem.publicTestCases.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                        Sample Test Cases
                      </p>
                      <div className="mt-1.5 flex flex-col gap-2">
                        {problem.publicTestCases.map((tc, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setStdin(tc.input)}
                            className="rounded-md border border-zinc-200 p-2 text-left text-xs hover:border-primary-300 dark:border-zinc-800 dark:hover:border-primary-800"
                          >
                            <p className="font-medium text-zinc-500 dark:text-zinc-400">Case {i + 1} (click to load)</p>
                            <pre className="mt-1 whitespace-pre-wrap text-zinc-700 dark:text-zinc-300">{tc.input}</pre>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {tab === 'output' && (
                <div>
                  {!runResult && !submitResult && (
                    <p className="text-sm text-zinc-400 dark:text-zinc-500">Run or submit your code to see output here.</p>
                  )}
                  {runResult && (
                    <div>
                      <div className="flex items-center gap-2">
                        <VerdictBadge verdict={runResult.verdict} />
                        {runResult.timeSeconds !== null && (
                          <span className="text-xs text-zinc-400 dark:text-zinc-500">
                            {runResult.timeSeconds}s{runResult.memoryKb !== null && ` · ${runResult.memoryKb} KB`}
                          </span>
                        )}
                      </div>
                      {runResult.stdout && (
                        <pre className="mt-2 whitespace-pre-wrap rounded bg-zinc-50 p-2 text-xs text-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
                          {runResult.stdout}
                        </pre>
                      )}
                    </div>
                  )}
                  {submitResult &&
                    (submitResult.verdict === 'pending' && submitResult.testCaseResults.length === 0 ? (
                      <div>
                        <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Submitted</p>
                        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                          Results for this round aren't shown until it's over.
                        </p>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-center gap-2">
                          <VerdictBadge verdict={submitResult.verdict} />
                          <span className="text-xs text-zinc-500 dark:text-zinc-400">
                            Score {submitResult.score} &middot; {submitResult.passedTests}/{submitResult.totalTests} test cases
                          </span>
                        </div>
                        <ul className="mt-3 flex flex-col gap-1">
                          {submitResult.testCaseResults.map((tc) => (
                            <li key={tc.index} className="flex items-center gap-2 text-sm">
                              <span
                                className={cn(
                                  'h-1.5 w-1.5 shrink-0 rounded-full',
                                  tc.verdict === 'accepted' ? 'bg-green-500' : 'bg-red-500',
                                )}
                              />
                              <span className="text-zinc-600 dark:text-zinc-300">
                                Test Case {tc.index}: {tc.verdict === 'accepted' ? 'Passed' : 'Failed'}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                </div>
              )}

              {tab === 'errors' && (
                <div>
                  {!compileError && !runtimeError && (
                    <p className="text-sm text-zinc-400 dark:text-zinc-500">No errors.</p>
                  )}
                  {compileError && (
                    <>
                      <p className="text-xs font-semibold uppercase tracking-wide text-red-500">Compilation Error</p>
                      <pre className="mt-1 whitespace-pre-wrap rounded bg-red-50 p-2 text-xs text-red-800 dark:bg-red-950 dark:text-red-200">
                        {compileError}
                      </pre>
                    </>
                  )}
                  {runtimeError && (
                    <>
                      <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-red-500">Runtime Error</p>
                      <pre className="mt-1 whitespace-pre-wrap rounded bg-red-50 p-2 text-xs text-red-800 dark:bg-red-950 dark:text-red-200">
                        {runtimeError}
                      </pre>
                    </>
                  )}
                </div>
              )}
            </div>

            {actionError && (
              <div className="border-t border-zinc-100 px-3 py-2 dark:border-zinc-800">
                <InlineError message={actionError} />
              </div>
            )}

            {/* Sticky action bar */}
            <div className="flex items-center justify-between gap-2 border-t border-zinc-200 px-3 py-2.5 dark:border-zinc-800">
              <span className="flex items-center gap-1.5 text-xs text-zinc-400 dark:text-zinc-500">
                {(running || submitting) && jobPhase && (
                  <>
                    <Spinner className="h-3 w-3" /> {jobPhaseLabel[jobPhase]}
                  </>
                )}
              </span>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={handleRun} disabled={running || submitting || roundLocked} loading={running}>
                  Run Code
                </Button>
                <Button variant="primary" onClick={handleSubmit} disabled={running || submitting || roundLocked} loading={submitting}>
                  Submit Code
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile: editor column replaced with a notice */}
        {!fullscreen && (
          <div className="flex flex-1 md:hidden">
            <MobileEditorNotice />
          </div>
        )}
      </div>
    </div>
  )
}
