import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

type ReadinessData = {
  id: number
  user_id?: number
  overall_score: number
  resume_score: number
  job_match_score: number
  interview_score: number
  coding_score: number
  skill_progress: number
  readiness_level: string
  strengths?: string[]
  recommendations?: string[]
  candidate_skills?: string[]
  updated_at?: string
}

type HistoryRecord = {
  id: number
  overall_score: number
  resume_score: number
  job_match_score: number
  interview_score: number
  coding_score: number
  skill_progress: number
  readiness_level: string
  created_at: string
}

type HistoryResponse = {
  history: HistoryRecord[]
}

type RoadmapData = {
  overall_progress: number
}

type DailyPlanData = {
  progress: number
  total_tasks?: number
  completed_tasks?: number
}

function getScoreColor(score: number) {
  if (score >= 75) return 'text-emerald-400'
  if (score >= 60) return 'text-yellow-400'
  if (score >= 40) return 'text-orange-400'
  return 'text-red-400'
}

function getProgressColor(score: number) {
  if (score >= 75) return 'bg-emerald-400'
  if (score >= 60) return 'bg-yellow-400'
  if (score >= 40) return 'bg-orange-400'
  return 'bg-red-400'
}

function getLevelIcon(level: string) {
  if (level === 'Placement Ready') return '🏆'
  if (level === 'Interview Ready') return '🟢'
  if (level === 'Almost Ready') return '🟡'
  if (level === 'Building Skills') return '🟠'
  return '🔴'
}

function getLevelDescription(level: string) {
  if (level === 'Placement Ready') {
    return 'Excellent! You are strongly prepared for placement opportunities.'
  }

  if (level === 'Interview Ready') {
    return 'You are ready to start attending technical interviews.'
  }

  if (level === 'Almost Ready') {
    return 'You are close. Focus on your weaker areas to become interview ready.'
  }

  if (level === 'Building Skills') {
    return 'You are making progress. Continue strengthening your core skills.'
  }

  return 'Start building your resume, technical skills, and interview confidence.'
}

function formatDate(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return 'Unknown'
  }

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
}

function formatDateTime(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return 'Unknown'
  }

  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function scoreDifference(history: HistoryRecord[]) {
  if (history.length < 2) return 0

  const first = history[0].overall_score
  const latest = history[history.length - 1].overall_score

  return latest - first
}

export default function Readiness() {
  const navigate = useNavigate()

  const [data, setData] = useState<ReadinessData | null>(null)
  const [history, setHistory] = useState<HistoryRecord[]>([])
  const [roadmap, setRoadmap] = useState<RoadmapData | null>(null)
  const [dailyPlan, setDailyPlan] = useState<DailyPlanData | null>(null)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [animatedScore, setAnimatedScore] = useState(0)

  useEffect(() => {
    const token = localStorage.getItem('access_token')

    if (!token) {
      navigate('/login')
      return
    }

    async function loadData() {
      try {
        setLoading(true)
        setError('')

        const headers = {
          Authorization: `Bearer ${token}`,
        }

        const [
          readinessResponse,
          historyResponse,
          roadmapResponse,
          dailyPlanResponse,
        ] = await Promise.all([
          fetch(
            'http://localhost:8001/api/placement-readiness',
            { headers },
          ),

          fetch(
            'http://localhost:8001/api/placement-readiness/history',
            { headers },
          ),

          fetch(
            'http://localhost:8001/api/career-roadmap',
            { headers },
          ),

          fetch(
            'http://localhost:8001/api/daily-plan',
            { headers },
          ),
        ])

        /*
         * If any authenticated endpoint returns 401,
         * send the user back to login.
         */
        if (
          readinessResponse.status === 401 ||
          historyResponse.status === 401 ||
          roadmapResponse.status === 401 ||
          dailyPlanResponse.status === 401
        ) {
          localStorage.removeItem('access_token')
          navigate('/login')
          return
        }

        /*
         * Readiness is the main endpoint.
         * If this fails, show a proper error screen.
         */
        if (!readinessResponse.ok) {
          throw new Error(
            'Unable to load placement readiness.',
          )
        }

        const readinessResult =
          await readinessResponse.json()

        /*
         * Normalize the backend response.
         *
         * This prevents the page from crashing if optional
         * fields such as candidate_skills are missing.
         */
        const safeReadiness: ReadinessData = {
          id: Number(readinessResult.id ?? 0),

          user_id:
            readinessResult.user_id !== undefined
              ? Number(readinessResult.user_id)
              : undefined,

          overall_score: Number(
            readinessResult.overall_score ?? 0,
          ),

          resume_score: Number(
            readinessResult.resume_score ?? 0,
          ),

          job_match_score: Number(
            readinessResult.job_match_score ?? 0,
          ),

          interview_score: Number(
            readinessResult.interview_score ?? 0,
          ),

          coding_score: Number(
            readinessResult.coding_score ?? 0,
          ),

          skill_progress: Number(
            readinessResult.skill_progress ?? 0,
          ),

          readiness_level:
            typeof readinessResult.readiness_level === 'string'
              ? readinessResult.readiness_level
              : 'Getting Started',

          strengths: Array.isArray(
            readinessResult.strengths,
          )
            ? readinessResult.strengths.filter(
                (item: unknown): item is string =>
                  typeof item === 'string',
              )
            : [],

          recommendations: Array.isArray(
            readinessResult.recommendations,
          )
            ? readinessResult.recommendations.filter(
                (item: unknown): item is string =>
                  typeof item === 'string',
              )
            : [],

          candidate_skills: Array.isArray(
            readinessResult.candidate_skills,
          )
            ? readinessResult.candidate_skills.filter(
                (item: unknown): item is string =>
                  typeof item === 'string',
              )
            : [],

          updated_at:
            typeof readinessResult.updated_at === 'string'
              ? readinessResult.updated_at
              : undefined,
        }

        setData(safeReadiness)

        /*
         * History is optional.
         */
        if (historyResponse.ok) {
          const historyResult: HistoryResponse =
            await historyResponse.json()

          setHistory(
            Array.isArray(historyResult.history)
              ? historyResult.history
              : [],
          )
        } else {
          setHistory([])
        }

        /*
         * Roadmap is optional.
         */
        if (roadmapResponse.ok) {
          const roadmapResult =
            await roadmapResponse.json()

          setRoadmap({
            overall_progress: Number(
              roadmapResult?.overall_progress ?? 0,
            ),
          })
        } else {
          setRoadmap(null)
        }

        /*
         * Daily plan is optional.
         */
        if (dailyPlanResponse.ok) {
          const dailyPlanResult =
            await dailyPlanResponse.json()

          setDailyPlan({
            progress: Number(
              dailyPlanResult?.progress ?? 0,
            ),
            total_tasks:
              dailyPlanResult?.total_tasks !== undefined
                ? Number(dailyPlanResult.total_tasks)
                : undefined,
            completed_tasks:
              dailyPlanResult?.completed_tasks !== undefined
                ? Number(dailyPlanResult.completed_tasks)
                : undefined,
          })
        } else {
          setDailyPlan(null)
        }
      } catch (err) {
        console.error('Placement readiness error:', err)

        setError(
          err instanceof Error
            ? err.message
            : 'Something went wrong while loading readiness.',
        )
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [navigate])

  /*
   * Animate the main readiness score.
   */
  useEffect(() => {
    if (!data) return

    setAnimatedScore(0)

    const target = Math.max(
      0,
      Math.min(100, Number(data.overall_score) || 0),
    )

    let current = 0

    const interval = window.setInterval(() => {
      current += 1

      if (current >= target) {
        setAnimatedScore(target)
        window.clearInterval(interval)
      } else {
        setAnimatedScore(current)
      }
    }, 15)

    return () => window.clearInterval(interval)
  }, [data])

  const growth = useMemo(
    () => scoreDifference(history),
    [history],
  )

  const latestHistory = history.length
    ? history[history.length - 1]
    : null

  const previousHistory =
    history.length >= 2
      ? history[history.length - 2]
      : null

  /*
   * Loading screen
   */
  if (loading) {
    return (
      <div className="min-h-screen bg-[#050816] text-white">
        <div className="mx-auto flex min-h-screen max-w-7xl items-center justify-center px-6">
          <div className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-slate-700 border-t-cyan-400" />

            <p className="text-sm text-slate-400">
              Calculating your placement readiness...
            </p>
          </div>
        </div>
      </div>
    )
  }

  /*
   * Error screen
   */
  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#050816] text-white">
        <div className="mx-auto max-w-4xl px-6 py-20">
          <div className="rounded-3xl border border-red-500/20 bg-red-500/5 p-8 text-center">
            <div className="mb-4 text-4xl">
              ⚠️
            </div>

            <h2 className="text-xl font-bold">
              Unable to load readiness
            </h2>

            <p className="mt-2 text-sm text-slate-400">
              {error || 'No readiness data available.'}
            </p>

            <button
              onClick={() => window.location.reload()}
              className="mt-6 rounded-xl bg-cyan-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  const score = Math.max(
    0,
    Math.min(100, Number(data.overall_score) || 0),
  )

  const scoreDegrees = (animatedScore / 100) * 360

  const strengths = data.strengths ?? []
  const recommendations = data.recommendations ?? []
  const candidateSkills = data.candidate_skills ?? []

  return (
    <div className="min-h-screen bg-[#050816] text-white">

      {/* =====================================================
          HEADER
         ===================================================== */}

      <header className="border-b border-slate-800/80 bg-[#070b17]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-cyan-400">
              CareerPilot AI
            </p>

            <h1 className="mt-1 text-2xl font-black tracking-tight">
              Placement Readiness
            </h1>

            <p className="mt-1 text-sm text-slate-400">
              Your AI-powered preparation intelligence
            </p>
          </div>

          <button
            onClick={() => navigate('/dashboard')}
            className="rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:border-cyan-500/50 hover:text-white"
          >
            ← Dashboard
          </button>

        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">

        {/* =====================================================
            HERO
           ===================================================== */}

        <section className="relative overflow-hidden rounded-3xl border border-cyan-500/20 bg-gradient-to-br from-cyan-500/10 via-blue-500/5 to-transparent p-8 shadow-2xl shadow-cyan-950/20">

          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />

          <div className="relative grid gap-10 lg:grid-cols-[300px_1fr] lg:items-center">

            {/* Score ring */}

            <div className="flex justify-center">

              <div
                className="relative flex h-64 w-64 items-center justify-center rounded-full"
                style={{
                  background: `conic-gradient(
                    rgb(34 211 238) ${scoreDegrees}deg,
                    rgb(30 41 59) ${scoreDegrees}deg
                  )`,
                }}
              >

                <div className="flex h-52 w-52 flex-col items-center justify-center rounded-full bg-[#080d1c]">

                  <span className="text-6xl font-black tracking-tight">
                    {animatedScore}
                  </span>

                  <span className="mt-1 text-sm font-medium text-slate-500">
                    / 100
                  </span>

                  <span
                    className={`mt-3 text-sm font-bold ${getScoreColor(score)}`}
                  >
                    {getLevelIcon(data.readiness_level)}{' '}
                    {data.readiness_level}
                  </span>

                </div>

              </div>

            </div>

            {/* Hero text */}

            <div>

              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1.5 text-xs font-semibold text-cyan-300">
                ✦ AI Readiness Intelligence
              </div>

              <h2 className="max-w-2xl text-3xl font-black tracking-tight sm:text-4xl">
                {score >= 75
                  ? 'You are moving toward interview success.'
                  : score >= 60
                    ? 'You are getting close to interview readiness.'
                    : 'Your placement journey is building momentum.'}
              </h2>

              <p className="mt-4 max-w-2xl leading-7 text-slate-400">
                {getLevelDescription(
                  data.readiness_level,
                )}
              </p>

              {/* Growth badge */}

              <div className="mt-6 flex flex-wrap gap-3">

                <div className="rounded-xl border border-slate-800 bg-[#0b1222] px-4 py-3">
                  <p className="text-xs text-slate-500">
                    Historical Growth
                  </p>

                  <p
                    className={`mt-1 text-lg font-bold ${
                      growth > 0
                        ? 'text-emerald-400'
                        : growth < 0
                          ? 'text-red-400'
                          : 'text-slate-300'
                    }`}
                  >
                    {growth > 0
                      ? `↑ +${growth}`
                      : growth < 0
                        ? `↓ ${growth}`
                        : '— 0'}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-800 bg-[#0b1222] px-4 py-3">
                  <p className="text-xs text-slate-500">
                    Snapshots
                  </p>

                  <p className="mt-1 text-lg font-bold text-white">
                    {history.length}
                  </p>
                </div>

                {latestHistory && (
                  <div className="rounded-xl border border-slate-800 bg-[#0b1222] px-4 py-3">
                    <p className="text-xs text-slate-500">
                      Last Updated
                    </p>

                    <p className="mt-1 text-sm font-bold text-white">
                      {formatDateTime(
                        latestHistory.created_at,
                      )}
                    </p>
                  </div>
                )}

              </div>
            </div>

          </div>
        </section>

        {/* =====================================================
            CORE METRICS
           ===================================================== */}

        <section className="mt-8">

          <div className="mb-4">
            <h2 className="text-lg font-bold">
              Core Performance
            </h2>

            <p className="text-sm text-slate-500">
              The five signals driving your readiness score
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">

            {[
              {
                name: 'Resume',
                score: data.resume_score,
                icon: '📄',
              },
              {
                name: 'Job Match',
                score: data.job_match_score,
                icon: '🎯',
              },
              {
                name: 'Interview',
                score: data.interview_score,
                icon: '🎤',
              },
              {
                name: 'Coding',
                score: data.coding_score,
                icon: '💻',
              },
              {
                name: 'Skills',
                score: data.skill_progress,
                icon: '🧠',
              },
            ].map((metric) => (

              <div
                key={metric.name}
                className="rounded-2xl border border-slate-800 bg-[#0b1222] p-5 transition hover:-translate-y-1 hover:border-cyan-500/30"
              >

                <div className="flex items-center justify-between">

                  <span className="text-xl">
                    {metric.icon}
                  </span>

                  <span
                    className={`text-xl font-black ${getScoreColor(metric.score)}`}
                  >
                    {metric.score}
                  </span>

                </div>

                <p className="mt-4 text-sm font-semibold text-slate-200">
                  {metric.name}
                </p>

                <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800">

                  <div
                    className={`h-full rounded-full transition-all ${getProgressColor(metric.score)}`}
                    style={{
                      width: `${Math.max(
                        0,
                        Math.min(
                          100,
                          Number(metric.score) || 0,
                        ),
                      )}%`,
                    }}
                  />

                </div>

              </div>

            ))}

          </div>

        </section>

        {/* =====================================================
            READINESS HISTORY
           ===================================================== */}

        <section className="mt-8 rounded-3xl border border-slate-800 bg-[#0b1222] p-6 shadow-xl">

          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">

            <div>

              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400">
                Progress Tracking
              </p>

              <h2 className="mt-1 text-xl font-black">
                📈 Readiness Growth
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Your readiness score over time
              </p>

            </div>

            {previousHistory && latestHistory && (
              <div className="rounded-xl border border-slate-800 bg-[#080d1c] px-4 py-3">

                <p className="text-xs text-slate-500">
                  Latest Change
                </p>

                <p
                  className={`mt-1 text-sm font-bold ${
                    latestHistory.overall_score >=
                    previousHistory.overall_score
                      ? 'text-emerald-400'
                      : 'text-red-400'
                  }`}
                >
                  {latestHistory.overall_score >=
                  previousHistory.overall_score
                    ? '↑'
                    : '↓'}{' '}

                  {Math.abs(
                    latestHistory.overall_score -
                      previousHistory.overall_score,
                  )}{' '}

                  points
                </p>

              </div>
            )}

          </div>

          {history.length === 0 ? (

            <div className="mt-6 rounded-2xl border border-dashed border-slate-700 p-10 text-center">

              <div className="text-4xl">
                📊
              </div>

              <h3 className="mt-4 font-bold">
                No history yet
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                Your readiness snapshots will appear here as
                CareerPilot tracks your progress.
              </p>

            </div>

          ) : (

            <div className="mt-8">

              {/* Chart */}

              <div className="relative h-80 overflow-hidden rounded-2xl border border-slate-800 bg-[#080d1c] p-5">

                {/* Horizontal grid */}

                <div className="pointer-events-none absolute inset-x-5 top-5 bottom-12 flex flex-col justify-between">

                  {[100, 75, 50, 25, 0].map(
                    (value) => (

                      <div
                        key={value}
                        className="flex items-center gap-3"
                      >

                        <span className="w-7 text-right text-[10px] text-slate-600">
                          {value}
                        </span>

                        <div className="h-px flex-1 bg-slate-800/80" />

                      </div>

                    ),
                  )}

                </div>

                {/* Chart points */}

                <div className="absolute inset-x-14 top-5 bottom-12">

                  {history.map((item, index) => {

                    const left =
                      history.length === 1
                        ? 50
                        : (index /
                            (history.length - 1)) *
                          100

                    const safeScore = Math.max(
                      0,
                      Math.min(
                        100,
                        Number(item.overall_score) || 0,
                      ),
                    )

                    const top = 100 - safeScore

                    return (

                      <div
                        key={item.id}
                        className="absolute"
                        style={{
                          left: `${left}%`,
                          top: `${top}%`,
                          transform:
                            'translate(-50%, -50%)',
                        }}
                      >

                        <div className="group relative">

                          <div className="h-4 w-4 rounded-full border-4 border-cyan-300 bg-cyan-500 shadow-lg shadow-cyan-500/40" />

                          <div className="pointer-events-none absolute bottom-7 left-1/2 hidden w-32 -translate-x-1/2 rounded-xl border border-slate-700 bg-[#0b1222] p-3 text-center shadow-xl group-hover:block">

                            <p className="text-lg font-black text-cyan-300">
                              {item.overall_score}
                            </p>

                            <p className="text-[10px] text-slate-500">
                              {formatDateTime(
                                item.created_at,
                              )}
                            </p>

                          </div>

                        </div>

                      </div>

                    )
                  })}

                  {/* Connecting line segments */}

                  {history.length > 1 &&
                    history.slice(1).map(
                      (item, index) => {

                        const previous =
                          history[index]

                        const previousScore =
                          Math.max(
                            0,
                            Math.min(
                              100,
                              Number(
                                previous.overall_score,
                              ) || 0,
                            ),
                          )

                        const currentScore =
                          Math.max(
                            0,
                            Math.min(
                              100,
                              Number(
                                item.overall_score,
                              ) || 0,
                            ),
                          )

                        const x1 =
                          (index /
                            (history.length - 1)) *
                          100

                        const x2 =
                          ((index + 1) /
                            (history.length - 1)) *
                          100

                        const y1 =
                          100 - previousScore

                        const y2 =
                          100 - currentScore

                        const dx = x2 - x1
                        const dy = y2 - y1

                        const lineLength = Math.sqrt(
                          dx * dx + dy * dy,
                        )

                        const angle =
                          Math.atan2(dy, dx) *
                          (180 / Math.PI)

                        return (

                          <div
                            key={`line-${item.id}`}
                            className="absolute h-0.5 origin-left rounded-full bg-cyan-400"
                            style={{
                              left: `${x1}%`,
                              top: `${y1}%`,
                              width: `${lineLength}%`,
                              transform: `rotate(${angle}deg)`,
                            }}
                          />

                        )
                      },
                    )}

                </div>

                {/* X axis labels */}

                <div className="absolute bottom-3 left-14 right-5 flex justify-between">

                  {history.map((item) => (

                    <span
                      key={`date-${item.id}`}
                      className="text-[10px] text-slate-600"
                    >
                      {formatDate(item.created_at)}
                    </span>

                  ))}

                </div>

              </div>

              {/* History list */}

              <div className="mt-5 grid gap-3">

                {history
                  .slice()
                  .reverse()
                  .map((item, index) => (

                    <div
                      key={`history-row-${item.id}`}
                      className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-[#080d1c] p-4 sm:flex-row sm:items-center sm:justify-between"
                    >

                      <div className="flex items-center gap-3">

                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-lg">
                          {index === 0
                            ? '⚡'
                            : '📊'}
                        </div>

                        <div>

                          <p className="text-sm font-bold">
                            {item.readiness_level}
                          </p>

                          <p className="text-xs text-slate-500">
                            {formatDateTime(
                              item.created_at,
                            )}
                          </p>

                        </div>

                      </div>

                      <div className="flex flex-wrap gap-4 text-xs">

                        <span>
                          Overall{' '}
                          <strong className="text-cyan-300">
                            {item.overall_score}
                          </strong>
                        </span>

                        <span>
                          Skills{' '}
                          <strong className="text-slate-300">
                            {item.skill_progress}
                          </strong>
                        </span>

                        <span>
                          Interview{' '}
                          <strong className="text-slate-300">
                            {item.interview_score}
                          </strong>
                        </span>

                        <span>
                          Coding{' '}
                          <strong className="text-slate-300">
                            {item.coding_score}
                          </strong>
                        </span>

                      </div>

                    </div>

                  ))}

              </div>

            </div>

          )}

        </section>

        {/* =====================================================
            LEARNING PROGRESS
           ===================================================== */}

        <section className="mt-8 grid gap-5 md:grid-cols-2">

          {/* Career Roadmap */}

          <div className="rounded-3xl border border-slate-800 bg-[#0b1222] p-6">

            <div className="flex items-center justify-between">

              <div>

                <p className="text-xs uppercase tracking-wider text-slate-500">
                  Career Roadmap
                </p>

                <h3 className="mt-1 text-lg font-bold">
                  Learning Progress
                </h3>

              </div>

              <span className="text-2xl">
                🗺️
              </span>

            </div>

            <div className="mt-6 flex items-end justify-between">

              <span className="text-4xl font-black">
                {roadmap?.overall_progress ?? 0}%
              </span>

              <span className="text-xs text-slate-500">
                Roadmap completion
              </span>

            </div>

            <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-800">

              <div
                className="h-full rounded-full bg-cyan-400 transition-all"
                style={{
                  width: `${Math.max(
                    0,
                    Math.min(
                      100,
                      Number(
                        roadmap?.overall_progress ?? 0,
                      ),
                    ),
                  )}%`,
                }}
              />

            </div>

            <button
              onClick={() =>
                navigate('/career-roadmap')
              }
              className="mt-5 text-sm font-semibold text-cyan-400 hover:text-cyan-300"
            >
              Continue roadmap →
            </button>

          </div>

          {/* Daily Learning */}

          <div className="rounded-3xl border border-slate-800 bg-[#0b1222] p-6">

            <div className="flex items-center justify-between">

              <div>

                <p className="text-xs uppercase tracking-wider text-slate-500">
                  Daily Learning
                </p>

                <h3 className="mt-1 text-lg font-bold">
                  Today's Progress
                </h3>

              </div>

              <span className="text-2xl">
                ⚡
              </span>

            </div>

            <div className="mt-6 flex items-end justify-between">

              <span className="text-4xl font-black">
                {dailyPlan?.progress ?? 0}%
              </span>

              <span className="text-xs text-slate-500">
                Today's plan
              </span>

            </div>

            <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-800">

              <div
                className="h-full rounded-full bg-emerald-400 transition-all"
                style={{
                  width: `${Math.max(
                    0,
                    Math.min(
                      100,
                      Number(
                        dailyPlan?.progress ?? 0,
                      ),
                    ),
                  )}%`,
                }}
              />

            </div>

            <button
              onClick={() =>
                navigate('/assistant')
              }
              className="mt-5 text-sm font-semibold text-emerald-400 hover:text-emerald-300"
            >
              Continue today's plan →
            </button>

          </div>

        </section>

        {/* =====================================================
            STRENGTHS + RECOMMENDATIONS
           ===================================================== */}

        <section className="mt-8 grid gap-5 lg:grid-cols-2">

          {/* Strengths */}

          <div className="rounded-3xl border border-emerald-500/10 bg-[#0b1222] p-6">

            <div className="flex items-center gap-3">

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10">
                💪
              </div>

              <div>

                <h2 className="font-bold">
                  Your Strengths
                </h2>

                <p className="text-xs text-slate-500">
                  Areas where you're performing well
                </p>

              </div>

            </div>

            <div className="mt-5 space-y-3">

              {strengths.length === 0 ? (

                <div className="rounded-xl border border-dashed border-slate-700 bg-[#080d1c] p-4 text-sm text-slate-500">
                  Strength insights will appear as you complete more activities.
                </div>

              ) : (

                strengths.map(
                  (strength, index) => (

                    <div
                      key={`${strength}-${index}`}
                      className="rounded-xl border border-slate-800 bg-[#080d1c] p-4 text-sm text-slate-300"
                    >

                      <span className="mr-2 text-emerald-400">
                        ✓
                      </span>

                      {strength}

                    </div>

                  ),
                )

              )}

            </div>

          </div>

          {/* Recommendations */}

          <div className="rounded-3xl border border-orange-500/10 bg-[#0b1222] p-6">

            <div className="flex items-center gap-3">

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10">
                🎯
              </div>

              <div>

                <h2 className="font-bold">
                  Recommended Focus
                </h2>

                <p className="text-xs text-slate-500">
                  Actions that can improve your score
                </p>

              </div>

            </div>

            <div className="mt-5 space-y-3">

              {recommendations.length === 0 ? (

                <div className="rounded-xl border border-dashed border-slate-700 bg-[#080d1c] p-4 text-sm text-slate-500">
                  Recommendations will appear as CareerPilot analyzes your progress.
                </div>

              ) : (

                recommendations.map(
                  (recommendation, index) => (

                    <div
                      key={`${recommendation}-${index}`}
                      className="rounded-xl border border-slate-800 bg-[#080d1c] p-4 text-sm text-slate-300"
                    >

                      <span className="mr-2 text-orange-400">
                        →
                      </span>

                      {recommendation}

                    </div>

                  ),
                )

              )}

            </div>

          </div>

        </section>

        {/* =====================================================
            DETECTED SKILLS
           ===================================================== */}

        <section className="mt-8 rounded-3xl border border-slate-800 bg-[#0b1222] p-6">

          <div className="flex items-center justify-between">

            <div>

              <h2 className="font-bold">
                Detected Skills
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Skills extracted from your latest resume
              </p>

            </div>

            <span className="rounded-full bg-cyan-500/10 px-3 py-1 text-xs font-bold text-cyan-300">
              {candidateSkills.length} skills
            </span>

          </div>

          <div className="mt-5 flex flex-wrap gap-2">

            {candidateSkills.length === 0 ? (

              <div className="w-full rounded-xl border border-dashed border-slate-700 bg-[#080d1c] p-5 text-center text-sm text-slate-500">
                No detected skills are available in the current readiness response.
              </div>

            ) : (

              candidateSkills.map(
                (skill, index) => (

                  <span
                    key={`${skill}-${index}`}
                    className="rounded-full border border-slate-700 bg-[#080d1c] px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:border-cyan-500/40 hover:text-cyan-300"
                  >
                    {skill}
                  </span>

                ),
              )

            )}

          </div>

        </section>

        {/* =====================================================
            ACTION AREA
           ===================================================== */}

        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

          <button
            onClick={() => navigate('/resume')}
            className="group rounded-2xl border border-slate-800 bg-[#0b1222] p-5 text-left transition hover:-translate-y-1 hover:border-cyan-500/30"
          >

            <span className="text-2xl">
              📄
            </span>

            <h3 className="mt-4 font-bold">
              Improve Resume
            </h3>

            <p className="mt-1 text-xs text-slate-500">
              Optimize your ATS performance
            </p>

            <span className="mt-4 block text-xs font-semibold text-cyan-400">
              Open Resume →
            </span>

          </button>

          <button
            onClick={() =>
              navigate('/job-match')
            }
            className="group rounded-2xl border border-slate-800 bg-[#0b1222] p-5 text-left transition hover:-translate-y-1 hover:border-cyan-500/30"
          >

            <span className="text-2xl">
              🎯
            </span>

            <h3 className="mt-4 font-bold">
              Improve Job Match
            </h3>

            <p className="mt-1 text-xs text-slate-500">
              Find and close skill gaps
            </p>

            <span className="mt-4 block text-xs font-semibold text-cyan-400">
              Analyze Match →
            </span>

          </button>

          <button
            onClick={() =>
              navigate('/interview')
            }
            className="group rounded-2xl border border-slate-800 bg-[#0b1222] p-5 text-left transition hover:-translate-y-1 hover:border-cyan-500/30"
          >

            <span className="text-2xl">
              🎤
            </span>

            <h3 className="mt-4 font-bold">
              Practice Interview
            </h3>

            <p className="mt-1 text-xs text-slate-500">
              Improve technical confidence
            </p>

            <span className="mt-4 block text-xs font-semibold text-cyan-400">
              Start Interview →
            </span>

          </button>

          <button
            onClick={() =>
              navigate('/coding')
            }
            className="group rounded-2xl border border-slate-800 bg-[#0b1222] p-5 text-left transition hover:-translate-y-1 hover:border-cyan-500/30"
          >

            <span className="text-2xl">
              💻
            </span>

            <h3 className="mt-4 font-bold">
              Practice Coding
            </h3>

            <p className="mt-1 text-xs text-slate-500">
              Strengthen problem-solving skills
            </p>

            <span className="mt-4 block text-xs font-semibold text-cyan-400">
              Open Coding →
            </span>

          </button>

        </section>

        {/* =====================================================
            AI CTA
           ===================================================== */}

        <section className="mt-8 overflow-hidden rounded-3xl border border-cyan-500/20 bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-purple-500/10 p-8 text-center">

          <div className="text-4xl">
            🤖
          </div>

          <h2 className="mt-4 text-2xl font-black">
            Let CareerPilot guide your next move.
          </h2>

          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-400">
            Ask the AI assistant what to study, what to
            practice, and how to improve your placement
            readiness score.
          </p>

          <button
            onClick={() =>
              navigate('/assistant')
            }
            className="mt-6 rounded-xl bg-cyan-500 px-6 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-cyan-500/20 transition hover:bg-cyan-400"
          >
            Open CareerPilot AI →
          </button>

        </section>

      </main>
    </div>
  )
}