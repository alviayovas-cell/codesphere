import Editor from '@monaco-editor/react'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useCountdown } from '../../hooks/useCountdown'
import { useTheme } from '../../context/ThemeContext'
import * as api from '../../services/api'
import { ApiError } from '../../services/api'
import type { JobStatus, ProblemPublic, RoundSessionPublic, RunCodeResult, SubmitCodeResult } from '../../types'
import { DEFAULT_LANGUAGE, LANGUAGES, LANGUAGE_LIST, type LanguageId } from '../../lib/languages'
import Button from '../../components/ui/Button'
import { DifficultyBadge, VerdictBadge } from '../../components/ui/Badge'
import Tabs from '../../components/ui/Tabs'
import Spinner, { PageSpinner } from '../../components/ui/Spinner'
import ErrorState, { InlineError } from '../../components/ui/ErrorState'
import Modal from '../../components/ui/Modal'
import MobileEditorNotice from '../../components/coding/MobileEditorNotice'
import Timer from '../../components/coding/Timer'
import { AlertIcon, ChevronLeftIcon, ExpandIcon } from '../../components/ui/Icons'
import { cn } from '../../lib/cn'

const AUTOSAVE_INTERVAL_MS = 12000
// Debounced save after the student stops typing, on top of the periodic
// save above - keeps the server copy (and therefore the admin monitoring
// view) close to current without firing a request per keystroke.
const AUTOSAVE_DEBOUNCE_MS = 2000

const lockedStatusMessage: Record<string, string> = {
  submitted: 'You have submitted this round — this problem is now read-only.',
  expired: 'Time expired for this round — this problem is now read-only.',
  locked: 'Your assessment was submitted automatically according to the assessment policy.',
}

function draftKey(problemId: string, language: LanguageId) {
  return `codesphere_code_draft_${problemId}_${language}`
}

function langKey(problemId: string) {
  return `codesphere_code_lang_${problemId}`
}

type PanelTab = 'tests' | 'output' | 'errors'

export default function ProblemDetail() {
  const { problemId, roundId } = useParams<{ problemId: string; roundId?: string }>()
  const navigate = useNavigate()
  const { resolvedTheme } = useTheme()
  const [problem, setProblem] = useState<ProblemPublic | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [roundSession, setRoundSession] = useState<RoundSessionPublic | null>(null)

  const [code, setCode] = useState(LANGUAGES[DEFAULT_LANGUAGE].defaultTemplate)
  const [language, setLanguage] = useState<LanguageId>(DEFAULT_LANGUAGE)
  const [fullscreen, setFullscreen] = useState(false)
  const [tab, setTab] = useState<PanelTab>('tests')

  const [running, setRunning] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [jobPhase, setJobPhase] = useState<JobStatus | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [runResult, setRunResult] = useState<RunCodeResult | null>(null)
  const [submitResult, setSubmitResult] = useState<SubmitCodeResult | null>(null)
  const [violationWarning, setViolationWarning] = useState<{ count: number; max: number } | null>(null)

  // Refs so interval/event-listener closures always see the latest values
  // without needing to be re-registered on every keystroke.
  const codeRef = useRef(code)
  codeRef.current = code
  const languageRef = useRef(language)
  languageRef.current = language
  const roundSessionRef = useRef(roundSession)
  roundSessionRef.current = roundSession

  useEffect(() => {
    if (!problemId) return
    api
      .getProblem(problemId)
      .then(async (p) => {
        setProblem(p)

        if (roundId) {
          // Round context: the server-side autosave is the source of
          // truth for restoring work after a refresh (spec section 15),
          // not localStorage.
          try {
            const saved = await api.getAutosave(roundId, problemId)
            if (saved) {
              setLanguage(saved.language as LanguageId)
              setCode(saved.code)
            }
          } catch {
            // No autosave yet, or session not found - keep the default template/language.
          }
        } else {
          try {
            const storedLanguage = localStorage.getItem(langKey(problemId)) as LanguageId | null
            const initialLanguage = storedLanguage && storedLanguage in LANGUAGES ? storedLanguage : DEFAULT_LANGUAGE
            setLanguage(initialLanguage)
            const saved = localStorage.getItem(draftKey(problemId, initialLanguage))
            setCode(saved ?? LANGUAGES[initialLanguage].defaultTemplate)
          } catch {
            // localStorage unavailable - fall back to the default template/language.
          }
        }
      })
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : 'Failed to load problem.'))
  }, [problemId, roundId])

  // Practice mode: keep the existing localStorage draft behavior, now
  // scoped per-language so switching languages doesn't clobber another
  // language's in-progress draft for the same problem.
  useEffect(() => {
    if (!problemId || roundId) return
    try {
      localStorage.setItem(draftKey(problemId, language), code)
    } catch {
      // Ignore storage failures (private browsing, quota, etc.) - not critical.
    }
  }, [problemId, roundId, language, code])

  /** Called when the student picks a different language: switches the
   * active language and loads that language's own saved draft (server
   * autosave in round mode, localStorage in practice mode), falling back
   * to that language's default template if nothing was saved yet. Round
   * mode has a single autosave slot per (session, problem) - switching
   * languages there means starting fresh unless the target language
   * happens to be the one already saved. */
  async function handleLanguageChange(newLanguage: LanguageId) {
    setLanguage(newLanguage)
    if (!problemId) return
    if (roundId) {
      try {
        const saved = await api.getAutosave(roundId, problemId)
        setCode(saved && saved.language === newLanguage ? saved.code : LANGUAGES[newLanguage].defaultTemplate)
      } catch {
        setCode(LANGUAGES[newLanguage].defaultTemplate)
      }
    } else {
      try {
        localStorage.setItem(langKey(problemId), newLanguage)
        const saved = localStorage.getItem(draftKey(problemId, newLanguage))
        setCode(saved ?? LANGUAGES[newLanguage].defaultTemplate)
      } catch {
        setCode(LANGUAGES[newLanguage].defaultTemplate)
      }
    }
  }

  useEffect(() => {
    if (!roundId) return
    api.getRoundSession(roundId).then(setRoundSession).catch(() => setRoundSession(null))
  }, [roundId])

  const remaining = useCountdown(roundSession?.remainingSeconds ?? 0)
  const roundLocked = roundSession !== null && roundSession.status !== 'active'

  // Round mode: periodic autosave + a final save on unmount (covers
  // "save on problem change" - navigating away unmounts this page).
  useEffect(() => {
    if (!roundId || !problemId) return

    function save() {
      if (roundSessionRef.current?.status !== 'active') return
      api.autosaveCode(roundId!, problemId!, codeRef.current, languageRef.current).catch(() => {
        // Best-effort - a failed autosave shouldn't interrupt the student.
      })
    }

    const interval = setInterval(save, AUTOSAVE_INTERVAL_MS)
    return () => {
      clearInterval(interval)
      save()
    }
  }, [roundId, problemId])

  // Round mode: debounced save ~2s after the last edit (additive to the
  // periodic/unmount/visibility/pre-submit saves - none of those change).
  useEffect(() => {
    if (!roundId || !problemId) return
    if (roundSessionRef.current?.status !== 'active') return
    const timer = setTimeout(() => {
      api.autosaveCode(roundId, problemId, codeRef.current, languageRef.current).catch(() => {})
    }, AUTOSAVE_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [code, roundId, problemId])

  // Round mode: Page Visibility API monitoring (spec section 16).
  // `visibilitychange` is the sole trigger reported to the server for
  // violation purposes - window blur/focus deliberately aren't listened to
  // here: they fire alongside visibilitychange for the same physical tab
  // switch (a permission prompt or devtools can also blur the window
  // without actually leaving the tab), and reporting both would double-
  // count one switch as two violations. The server is still the sole
  // authority on violation counts and auto-submit/lock; this only reflects
  // whatever it decides back into the UI - but it decides IMMEDIATELY on
  // the hidden event now, not retroactively on return, so a switch of any
  // length (even under a second) is recorded and warned about the instant
  // the student comes back.
  useEffect(() => {
    if (!roundId) return
    let graceTimer: ReturnType<typeof setTimeout> | null = null

    // Explicit state machine (ACTIVE -> TAB_HIDDEN -> POTENTIAL_VIOLATION ->
    // TAB_VISIBLE -> WARNING_SHOWN -> ACTIVE), tracked synchronously so a
    // second visibilitychange firing before the first one's network
    // round-trip resolves can't send a duplicate report for the same
    // continuous hidden period - the actual detection instant is the
    // `visibilitychange` callback invocation itself (synchronous with the
    // browser event, no artificial delay), not anything network-bound.
    type TabState = 'active' | 'tab_hidden' | 'tab_visible'
    let tabState: TabState = 'active'

    function clearGraceTimer() {
      if (graceTimer !== null) {
        clearTimeout(graceTimer)
        graceTimer = null
      }
    }

    async function onHidden() {
      if (tabState === 'tab_hidden') return // already recorded this hidden period - ignore a duplicate event
      tabState = 'tab_hidden' // -> POTENTIAL_VIOLATION
      if (roundSessionRef.current?.status !== 'active') return
      const previousCount = roundSessionRef.current.violationCount
      const graceSeconds = roundSessionRef.current.gracePeriodSeconds

      // Immediate, unconditional violation - see the module comment above.
      // Exactly one request for this hidden period; nothing repeats while
      // the tab stays hidden (no polling).
      try {
        const updated = await api.recordActivity(roundId!, 'visibility_hidden')
        setRoundSession(updated)
        if (updated.violationCount > previousCount && updated.status === 'active') {
          // State set now, but this modal is only ever actually seen once
          // the student returns and the tab repaints - satisfies "warn
          // immediately on return" without needing a separate pending flag.
          setViolationWarning({ count: updated.violationCount, max: updated.maxViolations })
        }
      } catch {
        // Monitoring is a policy control, not a guarantee - don't block the student on a failed report.
      }

      // Grace period governs ONLY prolonged-absence auto-submit, entirely
      // separate from the violation recorded above. If the student is
      // still away when this fires, the server re-verifies and decides.
      if (graceSeconds > 0) {
        graceTimer = setTimeout(() => {
          if (document.visibilityState === 'hidden') {
            api.checkProlongedAbsence(roundId!).then(setRoundSession).catch(() => {})
          }
        }, graceSeconds * 1000)
      }
    }

    async function onVisible() {
      clearGraceTimer()
      if (tabState !== 'tab_hidden') return // nothing to close out - ignore a duplicate/spurious event
      tabState = 'tab_visible' // -> WARNING_SHOWN (the warning, if any, is already queued from onHidden)
      if (roundSessionRef.current?.status === 'active') {
        try {
          const updated = await api.recordActivity(roundId!, 'visibility_restored')
          setRoundSession(updated)
        } catch {
          // Best-effort audit log entry (records visibleAt/durationMs) - not required for correctness.
        }
      }
      tabState = 'active' // -> ACTIVE, ready for the next switch
    }

    function onVisibilityChange() {
      // Page Visibility API is the sole detection mechanism - the browser
      // delivers this event as soon as it changes the document's
      // visibility state, so the callback below runs at that instant, not
      // after any timeout.
      if (document.hidden) onHidden()
      else onVisible()
    }

    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
      clearGraceTimer()
    }
  }, [roundId])

  // Belt-and-suspenders duplicate-click guard: the buttons are already
  // `disabled` while running/submitting, but that disable only takes
  // effect after React commits the state update, leaving a brief window
  // where a second click before re-render could still fire a second
  // request. These refs make the guard synchronous.
  const runInFlightRef = useRef(false)
  const submitInFlightRef = useRef(false)

  /** Maps a request error to a clear, specific message and, for a round
   * session that turned out to no longer be active (locked/expired/
   * submitted - e.g. an auto-submit happened while this tab sat idle),
   * refreshes roundSession so the UI immediately reflects it (disabling
   * the buttons, showing the right locked-reason message) instead of
   * leaving stale state that makes a correctly-rejected request look like
   * a silent failure. */
  async function describeActionError(err: unknown): Promise<string> {
    if (err instanceof ApiError) {
      if (err.status === 401) {
        navigate('/login')
        return 'Your session has expired. Please log in again.'
      }
      if (roundId && (err.status === 409 || err.status === 404)) {
        try {
          setRoundSession(await api.getRoundSession(roundId))
        } catch {
          // Best-effort refresh - the error message below still applies either way.
        }
      }
      if (err.status === 0) {
        return 'Unable to connect to the server. Please try again.'
      }
      return err.message
    }
    return 'Something went wrong. Please try again.'
  }

  async function handleRun() {
    if (!problemId || runInFlightRef.current) return
    runInFlightRef.current = true
    setActionError(null)
    setSubmitResult(null)
    setRunResult(null)
    setRunning(true)
    setJobPhase('queued')
    try {
      const { jobId } = await api.runCode(problemId, code, language)
      const finalStatus = await api.pollJob(jobId, { onTick: (s) => setJobPhase(s.status), timeoutMs: 145000 })
      if (finalStatus.status === 'failed') {
        setActionError(finalStatus.error ?? 'Run failed. Please try again.')
        setTab('errors')
      } else {
        const result = finalStatus.result as RunCodeResult
        setRunResult(result)
        setTab(
          result.verdict === 'compilation_error' || result.verdict === 'runtime_error'
            ? 'errors'
            : 'output',
        )
      }
    } catch (err) {
      setActionError(await describeActionError(err))
      setTab('errors')
    } finally {
      setRunning(false)
      setJobPhase(null)
      runInFlightRef.current = false
    }
  }

  async function handleSubmit() {
    if (!problemId || submitInFlightRef.current) return
    submitInFlightRef.current = true
    setActionError(null)
    setRunResult(null)
    setSubmitResult(null)
    setSubmitting(true)
    setJobPhase('queued')
    if (roundId) {
      // Save before final submission (spec section 15) - best-effort, doesn't block the submit itself.
      await api.autosaveCode(roundId, problemId, code, language).catch(() => {})
    }
    try {
      const { jobId } = await api.submitCode(problemId, code, roundId, language)
      const finalStatus = await api.pollJob(jobId, { onTick: (s) => setJobPhase(s.status), timeoutMs: 145000 })
      if (finalStatus.status === 'failed') {
        setActionError(finalStatus.error ?? 'Submission failed. Please try again.')
        setTab('errors')
      } else {
        const result = finalStatus.result as SubmitCodeResult
        setSubmitResult(result)
        setTab(result.verdict === 'compilation_error' ? 'errors' : 'output')
      }
    } catch (err) {
      setActionError(await describeActionError(err))
      setTab('errors')
    } finally {
      setSubmitting(false)
      setJobPhase(null)
      submitInFlightRef.current = false
    }
  }

  const jobPhaseLabel: Record<JobStatus, string> = {
    queued: 'Queued...',
    processing: running ? 'Running...' : 'Submitting...',
    completed: 'Done',
    failed: 'Failed',
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-6">
        <ErrorState message={loadError} />
        <Link to="/student/problems" className="mt-4 inline-block text-sm text-slate-500 underline dark:text-slate-400">
          Back to problems
        </Link>
      </div>
    )
  }

  if (!problem) return <PageSpinner />

  // Judge0 returns compiler *warnings* in compileOutput even when the
  // build succeeds, so only treat it as an error when the verdict actually
  // says so - otherwise it's just a warning, and shouldn't masquerade as
  // "Compilation Error" next to an Accepted/Wrong Answer badge.
  const isCompileError =
    runResult?.verdict === 'compilation_error' || submitResult?.verdict === 'compilation_error'
  const compileOutput = runResult?.compileOutput || submitResult?.compileOutput
  const compileError = isCompileError ? compileOutput : undefined
  const compilerWarnings = !isCompileError ? compileOutput : undefined
  const runtimeError = runResult?.verdict === 'runtime_error' ? runResult?.stderr : undefined

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex flex-1 overflow-hidden">
        {/* Left: problem statement (hidden in fullscreen editor mode) */}
        {!fullscreen && (
          <div className="w-full overflow-y-auto border-r border-slate-200 p-5 dark:border-slate-800 md:w-[45%] lg:w-[40%]">
            {roundId ? (
              <button
                type="button"
                onClick={async () => {
                  if (problemId && roundSessionRef.current?.status === 'active') {
                    await api.autosaveCode(roundId, problemId, codeRef.current, languageRef.current).catch(() => {})
                  }
                  navigate(`/student/rounds/${roundId}`)
                }}
                className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              >
                <ChevronLeftIcon className="h-4 w-4" /> Back to round
              </button>
            ) : (
              <Link to="/student/problems" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
                <ChevronLeftIcon className="h-4 w-4" /> Back to problems
              </Link>
            )}

            <div className="mt-3 flex items-center justify-between gap-3">
              <h1 className="text-lg font-semibold text-slate-900 dark:text-white">{problem.title}</h1>
              <div className="flex shrink-0 items-center gap-2">
                {roundId && roundSession?.status === 'active' && <Timer seconds={remaining} />}
                <span className="text-sm font-medium text-slate-500 dark:text-slate-400">{problem.marks} marks</span>
              </div>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <DifficultyBadge difficulty={problem.difficulty} />
              <span className="text-xs text-slate-400 dark:text-slate-500">{problem.topic}</span>
            </div>

            {roundLocked && (
              <div className="mt-3">
                <InlineError
                  message={
                    lockedStatusMessage[roundSession?.status ?? ''] ??
                    'This round is no longer active — submissions are no longer accepted.'
                  }
                />
              </div>
            )}

            <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-slate-700 dark:text-slate-300">{problem.description}</p>

            <div className="mt-4 grid gap-3">
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">Input Format</h2>
                <p className="mt-1 whitespace-pre-line text-sm text-slate-600 dark:text-slate-300">{problem.inputFormat}</p>
              </div>
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">Output Format</h2>
                <p className="mt-1 whitespace-pre-line text-sm text-slate-600 dark:text-slate-300">{problem.outputFormat}</p>
              </div>
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">Constraints</h2>
                <p className="mt-1 whitespace-pre-line text-sm text-slate-600 dark:text-slate-300">{problem.constraints}</p>
              </div>
            </div>

            {problem.examples.map((example, index) => (
              <div key={index} className="mt-3 rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                <p className="text-xs font-medium text-slate-400 dark:text-slate-500">Example {index + 1} — Input</p>
                <pre className="mt-1 whitespace-pre-wrap rounded bg-slate-50 p-2 text-xs dark:bg-slate-900">{example.input}</pre>
                <p className="mt-2 text-xs font-medium text-slate-400 dark:text-slate-500">Output</p>
                <pre className="mt-1 whitespace-pre-wrap rounded bg-slate-50 p-2 text-xs dark:bg-slate-900">{example.output}</pre>
              </div>
            ))}
          </div>
        )}

        {/* Right: editor - replaced with a notice below md, per spec */}
        <div className="hidden flex-1 flex-col md:flex">
          <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2 dark:border-slate-800">
            <select
              value={language}
              onChange={(e) => handleLanguageChange(e.target.value as LanguageId)}
              disabled={roundLocked || running || submitting}
              aria-label="Programming language"
              className="rounded border border-slate-200 bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              {LANGUAGE_LIST.map((lang) => (
                <option key={lang.id} value={lang.id}>
                  {lang.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setFullscreen((f) => !f)}
              className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
              aria-label={fullscreen ? 'Exit fullscreen' : 'Fullscreen editor'}
              title={fullscreen ? 'Exit fullscreen' : 'Fullscreen editor'}
            >
              <ExpandIcon className="h-4 w-4" />
            </button>
          </div>

          <div className="h-[50%] min-h-[220px]">
            <Editor
              height="100%"
              language={LANGUAGES[language].monacoId}
              theme={resolvedTheme === 'dark' ? 'vs-dark' : 'light'}
              value={code}
              onChange={(value) => setCode(value ?? '')}
              options={{ minimap: { enabled: false }, fontSize: 14 }}
            />
          </div>

          <div className="flex flex-1 flex-col overflow-hidden border-t border-slate-200 dark:border-slate-800">
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
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Run Code checks your solution against these sample test cases. Submit Code additionally
                    runs hidden test cases and records your score.
                  </p>
                  {problem.publicTestCases.length === 0 ? (
                    <p className="text-sm text-slate-400 dark:text-slate-500">
                      This problem has no sample test cases — use Submit Code to have your solution graded.
                    </p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {problem.publicTestCases.map((tc, i) => {
                        const caseResult = runResult?.testCaseResults.find((r) => r.index === i + 1)
                        return (
                          <div
                            key={i}
                            className="rounded-md border border-slate-200 p-2 text-xs dark:border-slate-800"
                          >
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-slate-500 dark:text-slate-400">Case {i + 1}</p>
                              {caseResult && (
                                <span
                                  className={cn(
                                    'flex items-center gap-1 font-medium',
                                    caseResult.verdict === 'accepted'
                                      ? 'text-emerald-600 dark:text-emerald-400'
                                      : 'text-red-600 dark:text-red-400',
                                  )}
                                >
                                  <span
                                    className={cn(
                                      'h-1.5 w-1.5 rounded-full',
                                      caseResult.verdict === 'accepted' ? 'bg-emerald-500' : 'bg-red-500',
                                    )}
                                  />
                                  {caseResult.verdict === 'accepted' ? 'Passed' : 'Failed'}
                                </span>
                              )}
                            </div>
                            <p className="mt-1.5 text-[11px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
                              Input
                            </p>
                            <pre className="mt-0.5 whitespace-pre-wrap text-slate-700 dark:text-slate-300">{tc.input}</pre>
                            <p className="mt-1.5 text-[11px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
                              Expected Output
                            </p>
                            <pre className="mt-0.5 whitespace-pre-wrap text-slate-700 dark:text-slate-300">
                              {tc.expectedOutput}
                            </pre>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {tab === 'output' && (
                <div>
                  {!runResult && !submitResult && (
                    <p className="text-sm text-slate-400 dark:text-slate-500">Run or submit your code to see output here.</p>
                  )}
                  {runResult && (
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <VerdictBadge verdict={runResult.verdict} />
                        {runResult.totalTests > 0 && (
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            {runResult.passedTests}/{runResult.totalTests} sample test cases passed
                          </span>
                        )}
                        {runResult.timeSeconds !== null && (
                          <span className="text-xs text-slate-400 dark:text-slate-500">
                            {runResult.timeSeconds}s{runResult.memoryKb !== null && ` · ${runResult.memoryKb} KB`}
                          </span>
                        )}
                      </div>
                      {runResult.testCaseResults.length > 0 && (
                        <ul className="mt-3 flex flex-col gap-1">
                          {runResult.testCaseResults.map((tc) => (
                            <li key={tc.index} className="flex items-center gap-2 text-sm">
                              <span
                                className={cn(
                                  'h-1.5 w-1.5 shrink-0 rounded-full',
                                  tc.verdict === 'accepted' ? 'bg-emerald-500' : 'bg-red-500',
                                )}
                              />
                              <span className="text-slate-600 dark:text-slate-300">
                                Test Case {tc.index}: {tc.verdict === 'accepted' ? 'Passed' : 'Failed'}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                      {runResult.stdout && (
                        <>
                          <p className="mt-3 text-[11px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
                            Your Output
                          </p>
                          <pre className="mt-1 whitespace-pre-wrap rounded bg-slate-50 p-2 text-xs text-slate-800 dark:bg-slate-900 dark:text-slate-200">
                            {runResult.stdout}
                          </pre>
                        </>
                      )}
                    </div>
                  )}
                  {submitResult &&
                    (submitResult.verdict === 'pending' && submitResult.testCaseResults.length === 0 ? (
                      <div>
                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Submitted</p>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                          Results for this round aren't shown until it's over.
                        </p>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-center gap-2">
                          <VerdictBadge verdict={submitResult.verdict} />
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            Score {submitResult.score} &middot; {submitResult.passedTests}/{submitResult.totalTests} test cases
                          </span>
                        </div>
                        <ul className="mt-3 flex flex-col gap-1">
                          {submitResult.testCaseResults.map((tc) => (
                            <li key={tc.index} className="flex items-center gap-2 text-sm">
                              <span
                                className={cn(
                                  'h-1.5 w-1.5 shrink-0 rounded-full',
                                  tc.verdict === 'accepted' ? 'bg-emerald-500' : 'bg-red-500',
                                )}
                              />
                              <span className="text-slate-600 dark:text-slate-300">
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
                  {!compileError && !runtimeError && !compilerWarnings && (
                    <p className="text-sm text-slate-400 dark:text-slate-500">No errors.</p>
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
                  {compilerWarnings && (
                    <>
                      <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-amber-500">Compiler Warnings</p>
                      <pre className="mt-1 whitespace-pre-wrap rounded bg-amber-50 p-2 text-xs text-amber-800 dark:bg-amber-950 dark:text-amber-200">
                        {compilerWarnings}
                      </pre>
                    </>
                  )}
                </div>
              )}
            </div>

            {actionError && (
              <div className="border-t border-slate-100 px-3 py-2 dark:border-slate-800">
                <InlineError message={actionError} />
              </div>
            )}

            {/* Sticky action bar */}
            <div className="flex items-center justify-between gap-2 border-t border-slate-200 px-3 py-2.5 dark:border-slate-800">
              <span className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
                {(running || submitting) && jobPhase && (
                  <span className="flex items-center gap-1.5 text-info-600 dark:text-info-400">
                    <Spinner className="h-3 w-3" /> {jobPhaseLabel[jobPhase]}
                  </span>
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

      <Modal
        open={violationWarning !== null}
        onClose={() => setViolationWarning(null)}
        title="Assessment warning"
        footer={
          <Button variant="primary" onClick={() => setViolationWarning(null)}>
            I understand
          </Button>
        }
      >
        <div className="flex gap-3">
          <AlertIcon className="h-5 w-5 shrink-0 text-amber-500" />
          <div>
            <p>
              You left the assessment window. This has been recorded as violation{' '}
              <span className="font-semibold text-slate-900 dark:text-white">
                {violationWarning?.count} of {violationWarning?.max}
              </span>
              .
            </p>
            <p className="mt-2">
              Leaving the window again after the allowed limit will automatically submit your current answers and
              lock this assessment.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  )
}
