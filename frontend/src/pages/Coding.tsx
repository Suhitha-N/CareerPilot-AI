import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

type Example = {
  input: string
  output: string
}

type CodingProblem = {
  id: number
  title: string
  description: string
  difficulty: string
  category: string
  input_format: string
  output_format: string
  constraints: string
  examples: Example[]
  starter_code: string
}

type TestResult = {
  passed: boolean
  actual: unknown
  expected: unknown
  error?: string
}

type SubmissionResult = {
  submission_id: number
  problem_id: number
  problem_title: string
  status: string
  score: number
  passed_tests: number
  total_tests: number
  execution_time_ms: number
  output: string
  test_results: TestResult[]
}

type CategoryPerformance = {
  category: string
  submissions: number
  average_score: number
  best_score: number
}

type CodingAnalytics = {
  overall_score: number
  test_accuracy: number
  execution_efficiency: number
  recent_performance: number
  consistency: number
  total_submissions: number
  accepted_submissions: number
  total_tests: number
  passed_tests: number
  strong_categories: string[]
  weak_categories: string[]
  category_performance: CategoryPerformance[]
  recommendations: string[]
}

function ScoreRing({
  score,
  size = 150,
}: {
  score: number
  size?: number
}) {
  const safeScore = Math.max(0, Math.min(100, Math.round(score)))

  const radius = 48
  const circumference = 2 * Math.PI * radius
  const offset =
    circumference - (safeScore / 100) * circumference

  const scoreClass =
    safeScore >= 80
      ? 'text-green-400'
      : safeScore >= 60
        ? 'text-yellow-400'
        : 'text-red-400'

  return (
    <div
      className="relative flex items-center justify-center"
      style={{
        width: size,
        height: size,
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 120 120"
        className="-rotate-90"
      >
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="10"
          className="text-slate-800"
        />

        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={
            safeScore >= 80
              ? 'text-green-500'
              : safeScore >= 60
                ? 'text-yellow-500'
                : 'text-red-500'
          }
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className={`text-4xl font-black ${scoreClass}`}
        >
          {safeScore}
        </span>

        <span className="text-xs text-slate-500">
          / 100
        </span>
      </div>
    </div>
  )
}

function MetricCard({
  icon,
  title,
  score,
  description,
}: {
  icon: string
  title: string
  score: number
  description: string
}) {
  const safeScore = Math.round(score)

  const barClass =
    safeScore >= 80
      ? 'bg-green-500'
      : safeScore >= 60
        ? 'bg-yellow-500'
        : 'bg-red-500'

  const scoreClass =
    safeScore >= 80
      ? 'text-green-400'
      : safeScore >= 60
        ? 'text-yellow-400'
        : 'text-red-400'

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">{icon}</span>

            <h3 className="text-sm font-semibold text-slate-200">
              {title}
            </h3>
          </div>

          <p className="mt-2 text-xs leading-5 text-slate-500">
            {description}
          </p>
        </div>

        <span
          className={`text-2xl font-black ${scoreClass}`}
        >
          {safeScore}%
        </span>
      </div>

      <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-800">
        <div
          className={`h-full rounded-full transition-all duration-700 ${barClass}`}
          style={{
            width: `${Math.max(
              0,
              Math.min(100, safeScore),
            )}%`,
          }}
        />
      </div>
    </div>
  )
}

function Coding() {
  const navigate = useNavigate()

  const [problems, setProblems] =
    useState<CodingProblem[]>([])

  const [selectedProblem, setSelectedProblem] =
    useState<CodingProblem | null>(null)

  const [code, setCode] = useState('')

  const [difficulty, setDifficulty] =
    useState('All')

  const [loading, setLoading] =
    useState(true)

  const [analyticsLoading, setAnalyticsLoading] =
    useState(true)

  const [submitting, setSubmitting] =
    useState(false)

  const [result, setResult] =
    useState<SubmissionResult | null>(null)

  const [analytics, setAnalytics] =
    useState<CodingAnalytics | null>(null)

  const [error, setError] = useState('')

  const [activeTab, setActiveTab] =
    useState<'practice' | 'analytics'>(
      'practice',
    )

  // ========================================================
  // AUTH + INITIAL LOAD
  // ========================================================

  useEffect(() => {
    const token =
      localStorage.getItem('access_token')

    if (!token) {
      navigate('/login')
      return
    }

    const loadProblems = async () => {
      try {
        const response = await fetch(
          'http://127.0.0.1:8001/api/coding/problems',
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        )

        if (!response.ok) {
          throw new Error(
            'Unable to load coding problems.',
          )
        }

        const data: CodingProblem[] =
          await response.json()

        setProblems(data)

        if (data.length > 0) {
          setSelectedProblem(data[0])
          setCode(data[0].starter_code)
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Unable to load coding problems.',
        )
      } finally {
        setLoading(false)
      }
    }

    loadProblems()
  }, [navigate])

  // ========================================================
  // LOAD ANALYTICS
  // ========================================================

  const loadAnalytics = async () => {
    const token =
      localStorage.getItem('access_token')

    if (!token) {
      navigate('/login')
      return
    }

    setAnalyticsLoading(true)

    try {
      const response = await fetch(
        'http://127.0.0.1:8001/api/coding/analytics',
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      )

      if (!response.ok) {
        throw new Error(
          'Unable to load coding analytics.',
        )
      }

      const data: CodingAnalytics =
        await response.json()

      setAnalytics(data)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to load coding analytics.',
      )
    } finally {
      setAnalyticsLoading(false)
    }
  }

  useEffect(() => {
    loadAnalytics()
  }, [])

  // ========================================================
  // PROBLEM SELECTION
  // ========================================================

  const selectProblem = (
    problem: CodingProblem,
  ) => {
    setSelectedProblem(problem)
    setCode(problem.starter_code)
    setResult(null)
    setError('')
    setActiveTab('practice')
  }

  // ========================================================
  // SUBMIT CODE
  // ========================================================

  const submitCode = async () => {
    const token =
      localStorage.getItem('access_token')

    if (!token) {
      navigate('/login')
      return
    }

    if (!selectedProblem) {
      return
    }

    if (!code.trim()) {
      setError(
        'Please write some code before submitting.',
      )
      return
    }

    setSubmitting(true)
    setError('')
    setResult(null)

    try {
      const response = await fetch(
        'http://127.0.0.1:8001/api/coding/submit',
        {
          method: 'POST',

          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },

          body: JSON.stringify({
            problem_id: selectedProblem.id,
            language: 'python',
            code,
          }),
        },
      )

      const data =
        await response.json()

      if (!response.ok) {
        throw new Error(
          data.detail ||
            'Unable to evaluate code.',
        )
      }

      setResult(data)

      // Refresh analytics after every submission.
      await loadAnalytics()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to evaluate code.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  // ========================================================
  // FILTERED PROBLEMS
  // ========================================================

  const filteredProblems =
    useMemo(() => {
      if (difficulty === 'All') {
        return problems
      }

      return problems.filter(
        (problem) =>
          problem.difficulty === difficulty,
      )
    }, [problems, difficulty])

  // ========================================================
  // DIFFICULTY STYLE
  // ========================================================

  const difficultyClass = (
    value: string,
  ) => {
    if (value === 'Easy') {
      return 'text-green-400 bg-green-500/10 border-green-500/20'
    }

    if (value === 'Medium') {
      return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20'
    }

    return 'text-red-400 bg-red-500/10 border-red-500/20'
  }

  // ========================================================
  // SCORE LABEL
  // ========================================================

  const scoreLabel = (score: number) => {
    if (score >= 90) {
      return 'Excellent'
    }

    if (score >= 80) {
      return 'Strong'
    }

    if (score >= 60) {
      return 'Developing'
    }

    return 'Needs Practice'
  }

  // ========================================================
  // LOADING
  // ========================================================

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-700 border-t-blue-500" />

          <p className="mt-4 text-slate-400">
            Loading coding assessment...
          </p>
        </div>
      </div>
    )
  }

  // ========================================================
  // PAGE
  // ========================================================

  return (
    <div className="min-h-screen bg-slate-950 text-white">

      {/* ================================================== */}
      {/* HEADER */}
      {/* ================================================== */}

      <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-950/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between px-5 py-4">

          <div className="flex items-center gap-4">

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-xl">
              💻
            </div>

            <div>
              <h1 className="text-lg font-bold">
                CareerPilot AI
              </h1>

              <p className="text-xs text-slate-500">
                Coding Intelligence
              </p>
            </div>

          </div>

          <button
            onClick={() =>
              navigate('/dashboard')
            }
            className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:border-slate-600 hover:bg-slate-900 hover:text-white"
          >
            ← Dashboard
          </button>

        </div>
      </header>

      {/* ================================================== */}
      {/* MAIN */}
      {/* ================================================== */}

      <main className="mx-auto max-w-[1600px] px-5 py-7">

        {/* ================================================= */}
        {/* HERO */}
        {/* ================================================= */}

        <section className="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950/30 p-7">

          <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />

          <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-center">

            <div>
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-blue-400">
                Technical Evaluation
              </p>

              <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
                Coding Intelligence
              </h2>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
                Practice real programming problems,
                evaluate your solutions, and track the
                coding skills that matter for placements.
              </p>
            </div>

            {analytics && (
              <div className="flex items-center gap-5 rounded-2xl border border-slate-800 bg-slate-950/70 p-4">

                <ScoreRing
                  score={analytics.overall_score}
                  size={105}
                />

                <div>
                  <p className="text-xs uppercase tracking-widest text-slate-600">
                    Coding Score
                  </p>

                  <p className="mt-1 text-lg font-bold">
                    {scoreLabel(
                      analytics.overall_score,
                    )}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    Based on your submissions
                  </p>
                </div>

              </div>
            )}

          </div>
        </section>

        {/* ================================================= */}
        {/* TABS */}
        {/* ================================================= */}

        <div className="mt-6 flex gap-2 border-b border-slate-800">

          <button
            onClick={() =>
              setActiveTab('practice')
            }
            className={`rounded-t-xl px-5 py-3 text-sm font-semibold transition ${
              activeTab === 'practice'
                ? 'bg-slate-900 text-blue-400'
                : 'text-slate-500 hover:text-white'
            }`}
          >
            💻 Practice
          </button>

          <button
            onClick={() =>
              setActiveTab('analytics')
            }
            className={`rounded-t-xl px-5 py-3 text-sm font-semibold transition ${
              activeTab === 'analytics'
                ? 'bg-slate-900 text-blue-400'
                : 'text-slate-500 hover:text-white'
            }`}
          >
            📊 Analytics
          </button>

        </div>

        {/* ================================================= */}
        {/* ANALYTICS TAB */}
        {/* ================================================= */}

        {activeTab === 'analytics' && (
          <section className="mt-6">

            {analyticsLoading ? (
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-12 text-center">
                <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-slate-700 border-t-blue-500" />

                <p className="mt-4 text-sm text-slate-500">
                  Analysing your coding performance...
                </p>
              </div>
            ) : analytics ? (
              <div className="space-y-5">

                {/* ========================================= */}
                {/* TOP ANALYTICS */}
                {/* ========================================= */}

                <div className="grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">

                  {/* Main Score */}

                  <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-800 bg-slate-900 p-7">

                    <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                      Overall Coding
                    </p>

                    <div className="mt-4">
                      <ScoreRing
                        score={
                          analytics.overall_score
                        }
                        size={180}
                      />
                    </div>

                    <p className="mt-3 text-sm font-semibold text-slate-300">
                      {scoreLabel(
                        analytics.overall_score,
                      )}
                    </p>

                    <p className="mt-1 text-center text-xs leading-5 text-slate-600">
                      Your score combines accuracy,
                      speed, recent performance and
                      consistency.
                    </p>

                  </div>

                  {/* Metrics */}

                  <div className="grid gap-4 md:grid-cols-2">

                    <MetricCard
                      icon="🎯"
                      title="Test Accuracy"
                      score={
                        analytics.test_accuracy
                      }
                      description="Percentage of test cases successfully solved."
                    />

                    <MetricCard
                      icon="⚡"
                      title="Execution Efficiency"
                      score={
                        analytics.execution_efficiency
                      }
                      description="How efficiently your submitted solutions execute."
                    />

                    <MetricCard
                      icon="📈"
                      title="Recent Performance"
                      score={
                        analytics.recent_performance
                      }
                      description="Average score across your latest submissions."
                    />

                    <MetricCard
                      icon="🔥"
                      title="Consistency"
                      score={
                        analytics.consistency
                      }
                      description="Percentage of submissions successfully accepted."
                    />

                  </div>

                </div>

                {/* ========================================= */}
                {/* STATS */}
                {/* ========================================= */}

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

                  <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                    <p className="text-xs uppercase tracking-widest text-slate-600">
                      Submissions
                    </p>

                    <p className="mt-2 text-3xl font-black">
                      {analytics.total_submissions}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      Total attempts
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                    <p className="text-xs uppercase tracking-widest text-slate-600">
                      Accepted
                    </p>

                    <p className="mt-2 text-3xl font-black text-green-400">
                      {analytics.accepted_submissions}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      Successful solutions
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                    <p className="text-xs uppercase tracking-widest text-slate-600">
                      Tests Passed
                    </p>

                    <p className="mt-2 text-3xl font-black text-blue-400">
                      {analytics.passed_tests}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      of {analytics.total_tests} test cases
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                    <p className="text-xs uppercase tracking-widest text-slate-600">
                      Success Rate
                    </p>

                    <p className="mt-2 text-3xl font-black text-yellow-400">
                      {analytics.total_submissions > 0
                        ? Math.round(
                            (analytics.accepted_submissions /
                              analytics.total_submissions) *
                              100,
                          )
                        : 0}
                      %
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      Accepted submissions
                    </p>
                  </div>

                </div>

                {/* ========================================= */}
                {/* CATEGORY ANALYSIS */}
                {/* ========================================= */}

                <div className="grid gap-5 lg:grid-cols-2">

                  {/* Strong */}

                  <div className="rounded-2xl border border-green-500/20 bg-slate-900 p-6">

                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-500/10">
                        🏆
                      </div>

                      <div>
                        <h3 className="font-bold">
                          Strong Categories
                        </h3>

                        <p className="text-xs text-slate-500">
                          Areas where you're performing well
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-2">

                      {analytics.strong_categories.length >
                      0 ? (
                        analytics.strong_categories.map(
                          (category) => (
                            <span
                              key={category}
                              className="rounded-full border border-green-500/20 bg-green-500/10 px-4 py-2 text-xs font-semibold text-green-400"
                            >
                              ✓ {category}
                            </span>
                          ),
                        )
                      ) : (
                        <p className="text-sm text-slate-600">
                          Keep practising to build
                          your strong areas.
                        </p>
                      )}

                    </div>

                  </div>

                  {/* Weak */}

                  <div className="rounded-2xl border border-yellow-500/20 bg-slate-900 p-6">

                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-500/10">
                        🎯
                      </div>

                      <div>
                        <h3 className="font-bold">
                          Focus Areas
                        </h3>

                        <p className="text-xs text-slate-500">
                          Categories that need more practice
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-2">

                      {analytics.weak_categories.length >
                      0 ? (
                        analytics.weak_categories.map(
                          (category) => (
                            <span
                              key={category}
                              className="rounded-full border border-yellow-500/20 bg-yellow-500/10 px-4 py-2 text-xs font-semibold text-yellow-400"
                            >
                              → {category}
                            </span>
                          ),
                        )
                      ) : (
                        <p className="text-sm text-slate-600">
                          No major weak categories
                          detected yet.
                        </p>
                      )}

                    </div>

                  </div>

                </div>

                {/* ========================================= */}
                {/* CATEGORY PERFORMANCE */}
                {/* ========================================= */}

                {analytics.category_performance.length >
                  0 && (
                  <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">

                    <div className="mb-6">
                      <h3 className="font-bold">
                        Category Performance
                      </h3>

                      <p className="mt-1 text-xs text-slate-500">
                        Performance breakdown across
                        coding topics
                      </p>
                    </div>

                    <div className="space-y-5">

                      {analytics.category_performance.map(
                        (category) => {
                          const score =
                            Math.round(
                              category.average_score,
                            )

                          return (
                            <div
                              key={category.category}
                            >

                              <div className="flex items-center justify-between">

                                <div>
                                  <p className="text-sm font-semibold text-slate-300">
                                    {category.category}
                                  </p>

                                  <p className="mt-1 text-xs text-slate-600">
                                    {category.submissions}{' '}
                                    submission
                                    {category.submissions !==
                                    1
                                      ? 's'
                                      : ''}{' '}
                                    • Best{' '}
                                    {
                                      category.best_score
                                    }
                                  </p>
                                </div>

                                <span
                                  className={`text-sm font-bold ${
                                    score >= 75
                                      ? 'text-green-400'
                                      : score >= 50
                                        ? 'text-yellow-400'
                                        : 'text-red-400'
                                  }`}
                                >
                                  {score}%
                                </span>

                              </div>

                              <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800">

                                <div
                                  className={`h-full rounded-full transition-all duration-700 ${
                                    score >= 75
                                      ? 'bg-green-500'
                                      : score >= 50
                                        ? 'bg-yellow-500'
                                        : 'bg-red-500'
                                  }`}
                                  style={{
                                    width: `${Math.max(
                                      0,
                                      Math.min(
                                        100,
                                        score,
                                      ),
                                    )}%`,
                                  }}
                                />

                              </div>

                            </div>
                          )
                        },
                      )}

                    </div>

                  </div>
                )}

                {/* ========================================= */}
                {/* AI RECOMMENDATIONS */}
                {/* ========================================= */}

                <div className="rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-slate-900 p-6">

                  <div className="flex items-center gap-3">

                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10 text-xl">
                      🤖
                    </div>

                    <div>
                      <h3 className="font-bold">
                        AI Coding Coach
                      </h3>

                      <p className="text-xs text-slate-500">
                        Personalized recommendations
                        based on your performance
                      </p>
                    </div>

                  </div>

                  <div className="mt-5 space-y-3">

                    {analytics.recommendations.map(
                      (recommendation, index) => (
                        <div
                          key={index}
                          className="flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-950/70 p-4"
                        >
                          <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-500/10 text-xs font-bold text-blue-400">
                            {index + 1}
                          </span>

                          <p className="text-sm leading-6 text-slate-300">
                            {recommendation}
                          </p>
                        </div>
                      ),
                    )}

                  </div>

                </div>

                {/* ========================================= */}
                {/* PRACTICE CTA */}
                {/* ========================================= */}

                <div className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-6 sm:flex-row">

                  <div>
                    <h3 className="font-bold">
                      Ready for another challenge?
                    </h3>

                    <p className="mt-1 text-sm text-slate-500">
                      Continue practising to increase
                      your placement readiness.
                    </p>
                  </div>

                  <button
                    onClick={() =>
                      setActiveTab('practice')
                    }
                    className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold transition hover:bg-blue-500"
                  >
                    Start Practising →
                  </button>

                </div>

              </div>
            ) : (
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-10 text-center">
                <div className="text-5xl">
                  📊
                </div>

                <h3 className="mt-4 font-bold">
                  No analytics yet
                </h3>

                <p className="mt-2 text-sm text-slate-500">
                  Submit a coding problem to start
                  building your performance profile.
                </p>

                <button
                  onClick={() =>
                    setActiveTab('practice')
                  }
                  className="mt-5 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold"
                >
                  Solve a Problem
                </button>
              </div>
            )}

          </section>
        )}

        {/* ================================================= */}
        {/* PRACTICE TAB */}
        {/* ================================================= */}

        {activeTab === 'practice' && (
          <>

            {/* ============================================= */}
            {/* PRACTICE SUMMARY */}
            {/* ============================================= */}

            <div className="mb-5 mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
                <p className="text-xs uppercase tracking-widest text-slate-600">
                  Problems
                </p>

                <p className="mt-1 text-2xl font-black text-blue-400">
                  {problems.length}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
                <p className="text-xs uppercase tracking-widest text-slate-600">
                  Coding Score
                </p>

                <p className="mt-1 text-2xl font-black text-green-400">
                  {analytics
                    ? Math.round(
                        analytics.overall_score,
                      )
                    : '--'}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
                <p className="text-xs uppercase tracking-widest text-slate-600">
                  Accuracy
                </p>

                <p className="mt-1 text-2xl font-black text-yellow-400">
                  {analytics
                    ? `${Math.round(
                        analytics.test_accuracy,
                      )}%`
                    : '--'}
                </p>
              </div>

              <button
                onClick={() =>
                  setActiveTab('analytics')
                }
                className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4 text-left transition hover:bg-blue-500/10"
              >
                <p className="text-xs uppercase tracking-widest text-blue-400">
                  Intelligence
                </p>

                <p className="mt-1 text-sm font-bold">
                  View Analytics →
                </p>
              </button>

            </div>

            {/* ============================================= */}
            {/* DIFFICULTY FILTER */}
            {/* ============================================= */}

            <div className="mb-5 flex flex-wrap items-center gap-2">

              <span className="mr-2 text-xs font-semibold uppercase tracking-widest text-slate-600">
                Difficulty
              </span>

              {[
                'All',
                'Easy',
                'Medium',
                'Hard',
              ].map((level) => (
                <button
                  key={level}
                  onClick={() =>
                    setDifficulty(level)
                  }
                  className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                    difficulty === level
                      ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                      : 'border-slate-700 bg-slate-900 text-slate-400 hover:border-slate-600 hover:text-white'
                  }`}
                >
                  {level}
                </button>
              ))}

            </div>

            {/* ============================================= */}
            {/* ERROR */}
            {/* ============================================= */}

            {error && (
              <div className="mb-5 flex items-start justify-between gap-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">

                <span>
                  {error}
                </span>

                <button
                  onClick={() =>
                    setError('')
                  }
                  className="text-red-500 hover:text-red-300"
                >
                  ×
                </button>

              </div>
            )}

            {/* ============================================= */}
            {/* CODING WORKSPACE */}
            {/* ============================================= */}

            <div className="grid min-h-[700px] gap-5 xl:grid-cols-[280px_minmax(0,1fr)_430px]">

              {/* =========================================== */}
              {/* PROBLEM BANK */}
              {/* =========================================== */}

              <aside className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">

                <div className="border-b border-slate-800 p-5">

                  <h3 className="font-bold">
                    Problem Bank
                  </h3>

                  <p className="mt-1 text-xs text-slate-500">
                    Choose a problem
                  </p>

                </div>

                <div className="max-h-[650px] overflow-y-auto p-3">

                  {filteredProblems.map(
                    (problem, index) => (
                      <button
                        key={problem.id}
                        onClick={() =>
                          selectProblem(problem)
                        }
                        className={`mb-2 w-full rounded-xl border p-4 text-left transition ${
                          selectedProblem?.id ===
                          problem.id
                            ? 'border-blue-500/50 bg-blue-500/10'
                            : 'border-transparent bg-slate-950 hover:border-slate-700'
                        }`}
                      >

                        <div className="flex items-start gap-3">

                          <span className="mt-0.5 text-xs text-slate-600">
                            {String(
                              index + 1,
                            ).padStart(2, '0')}
                          </span>

                          <div className="min-w-0 flex-1">

                            <p className="truncate text-sm font-semibold text-white">
                              {problem.title}
                            </p>

                            <div className="mt-2 flex flex-wrap gap-2">

                              <span
                                className={`rounded-full border px-2 py-0.5 text-[10px] ${difficultyClass(
                                  problem.difficulty,
                                )}`}
                              >
                                {problem.difficulty}
                              </span>

                              <span className="rounded-full border border-slate-700 px-2 py-0.5 text-[10px] text-slate-500">
                                {problem.category}
                              </span>

                            </div>

                          </div>

                        </div>

                      </button>
                    ),
                  )}

                  {filteredProblems.length ===
                    0 && (
                    <div className="p-5 text-center text-sm text-slate-500">
                      No problems found.
                    </div>
                  )}

                </div>

              </aside>

              {/* =========================================== */}
              {/* PROBLEM + EDITOR */}
              {/* =========================================== */}

              <section className="flex min-w-0 flex-col gap-5">

                {selectedProblem && (
                  <>

                    {/* Problem Description */}

                    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">

                      <div className="flex flex-wrap items-start justify-between gap-4">

                        <div>

                          <div className="flex flex-wrap items-center gap-3">

                            <h3 className="text-2xl font-black">
                              {selectedProblem.title}
                            </h3>

                            <span
                              className={`rounded-full border px-3 py-1 text-xs ${difficultyClass(
                                selectedProblem.difficulty,
                              )}`}
                            >
                              {selectedProblem.difficulty}
                            </span>

                          </div>

                          <p className="mt-2 text-xs text-slate-500">
                            {selectedProblem.category}
                          </p>

                        </div>

                        <span className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-500">
                          Python 3
                        </span>

                      </div>

                      <div className="mt-6 text-sm leading-7 text-slate-300">
                        {selectedProblem.description}
                      </div>

                      <div className="mt-6 grid gap-4 md:grid-cols-3">

                        <div className="rounded-xl bg-slate-950 p-4">

                          <p className="text-xs uppercase tracking-widest text-slate-600">
                            Input
                          </p>

                          <p className="mt-2 text-sm leading-6 text-slate-300">
                            {selectedProblem.input_format}
                          </p>

                        </div>

                        <div className="rounded-xl bg-slate-950 p-4">

                          <p className="text-xs uppercase tracking-widest text-slate-600">
                            Output
                          </p>

                          <p className="mt-2 text-sm leading-6 text-slate-300">
                            {selectedProblem.output_format}
                          </p>

                        </div>

                        <div className="rounded-xl bg-slate-950 p-4">

                          <p className="text-xs uppercase tracking-widest text-slate-600">
                            Constraints
                          </p>

                          <p className="mt-2 text-sm leading-6 text-slate-300">
                            {selectedProblem.constraints}
                          </p>

                        </div>

                      </div>

                      {/* Examples */}

                      <div className="mt-6">

                        <h4 className="mb-3 font-semibold">
                          Examples
                        </h4>

                        <div className="space-y-3">

                          {selectedProblem.examples.map(
                            (
                              example,
                              index,
                            ) => (
                              <div
                                key={index}
                                className="rounded-xl border border-slate-800 bg-slate-950 p-4"
                              >

                                <p className="text-xs text-slate-500">
                                  Example{' '}
                                  {index + 1}
                                </p>

                                <div className="mt-3 grid gap-3 md:grid-cols-2">

                                  <div>
                                    <p className="text-xs text-slate-600">
                                      Input
                                    </p>

                                    <pre className="mt-1 overflow-x-auto text-sm text-slate-300">
                                      {example.input}
                                    </pre>
                                  </div>

                                  <div>
                                    <p className="text-xs text-slate-600">
                                      Output
                                    </p>

                                    <pre className="mt-1 overflow-x-auto text-sm text-green-400">
                                      {example.output}
                                    </pre>
                                  </div>

                                </div>

                              </div>
                            ),
                          )}

                        </div>

                      </div>

                    </div>

                    {/* Code Editor */}

                    <div className="flex min-h-[450px] flex-1 flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">

                      <div className="flex items-center justify-between border-b border-slate-800 px-5 py-3">

                        <div className="flex items-center gap-3">

                          <span className="h-3 w-3 rounded-full bg-red-500/70" />
                          <span className="h-3 w-3 rounded-full bg-yellow-500/70" />
                          <span className="h-3 w-3 rounded-full bg-green-500/70" />

                          <span className="ml-2 text-sm text-slate-400">
                            solution.py
                          </span>

                        </div>

                        <span className="rounded-md border border-slate-800 px-2 py-1 text-[10px] text-slate-500">
                          Python 3
                        </span>

                      </div>

                      <textarea
                        value={code}
                        onChange={(event) =>
                          setCode(
                            event.target.value,
                          )
                        }
                        spellCheck={false}
                        className="min-h-[350px] flex-1 resize-none bg-slate-950 p-5 font-mono text-sm leading-6 text-slate-200 outline-none"
                      />

                      <div className="flex flex-col justify-between gap-3 border-t border-slate-800 p-4 sm:flex-row sm:items-center">

                        <p className="text-xs text-slate-600">
                          Your solution will be evaluated
                          against test cases.
                        </p>

                        <button
                          onClick={submitCode}
                          disabled={submitting}
                          className="rounded-xl bg-green-600 px-6 py-3 text-sm font-bold transition hover:bg-green-500 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {submitting
                            ? '⏳ Evaluating...'
                            : '▶ Submit Solution'}
                        </button>

                      </div>

                    </div>

                  </>
                )}

              </section>

              {/* =========================================== */}
              {/* EVALUATION */}
              {/* =========================================== */}

              <aside className="rounded-2xl border border-slate-800 bg-slate-900">

                <div className="border-b border-slate-800 p-5">

                  <h3 className="font-bold">
                    Evaluation
                  </h3>

                  <p className="mt-1 text-xs text-slate-500">
                    Submission results appear here
                  </p>

                </div>

                <div className="p-5">

                  {!result && (
                    <div className="flex min-h-[500px] flex-col items-center justify-center text-center">

                      <div className="text-6xl">
                        🧪
                      </div>

                      <h4 className="mt-5 font-semibold text-slate-300">
                        Ready to evaluate
                      </h4>

                      <p className="mt-2 max-w-xs text-sm leading-6 text-slate-600">
                        Write your solution and submit
                        it to see test results and your
                        coding score.
                      </p>

                    </div>
                  )}

                  {result && (
                    <div>

                      {/* Score */}

                      <div className="rounded-2xl border border-slate-800 bg-slate-950 p-6 text-center">

                        <p className="text-xs uppercase tracking-widest text-slate-600">
                          Submission Score
                        </p>

                        <p
                          className={`mt-2 text-6xl font-black ${
                            result.score === 100
                              ? 'text-green-400'
                              : result.score > 0
                                ? 'text-yellow-400'
                                : 'text-red-400'
                          }`}
                        >
                          {result.score}
                        </p>

                        <p className="mt-1 text-sm text-slate-600">
                          / 100
                        </p>

                        <div className="mt-4">

                          <span
                            className={`rounded-full border px-4 py-1.5 text-xs font-semibold ${
                              result.status ===
                              'Accepted'
                                ? 'border-green-500/30 bg-green-500/10 text-green-400'
                                : result.status ===
                                    'Partially Accepted'
                                  ? 'border-yellow-500/30 bg-yellow-500/10 text-yellow-400'
                                  : 'border-red-500/30 bg-red-500/10 text-red-400'
                            }`}
                          >
                            {result.status}
                          </span>

                        </div>

                      </div>

                      {/* Summary */}

                      <div className="mt-4 grid grid-cols-2 gap-3">

                        <div className="rounded-xl bg-slate-950 p-4">

                          <p className="text-xs text-slate-600">
                            Tests Passed
                          </p>

                          <p className="mt-1 text-xl font-bold text-green-400">
                            {result.passed_tests}

                            <span className="text-sm text-slate-600">
                              {' '}
                              /{' '}
                              {result.total_tests}
                            </span>
                          </p>

                        </div>

                        <div className="rounded-xl bg-slate-950 p-4">

                          <p className="text-xs text-slate-600">
                            Runtime
                          </p>

                          <p className="mt-1 text-xl font-bold text-blue-400">
                            {result.execution_time_ms}

                            <span className="text-sm text-slate-600">
                              {' '}
                              ms
                            </span>
                          </p>

                        </div>

                      </div>

                      {/* Test Cases */}

                      <div className="mt-6">

                        <h4 className="mb-3 font-semibold">
                          Test Cases
                        </h4>

                        <div className="space-y-2">

                          {result.test_results.map(
                            (
                              test,
                              index,
                            ) => (
                              <div
                                key={index}
                                className={`rounded-xl border p-4 ${
                                  test.passed
                                    ? 'border-green-500/20 bg-green-500/5'
                                    : 'border-red-500/20 bg-red-500/5'
                                }`}
                              >

                                <div className="flex items-center justify-between gap-3">

                                  <span className="text-sm font-medium">
                                    Test Case{' '}
                                    {index + 1}
                                  </span>

                                  <span
                                    className={
                                      test.passed
                                        ? 'text-green-400'
                                        : 'text-red-400'
                                    }
                                  >
                                    {test.passed
                                      ? '✓ Passed'
                                      : '✗ Failed'}
                                  </span>

                                </div>

                                <div className="mt-3 grid grid-cols-2 gap-3 text-xs">

                                  <div>

                                    <p className="text-slate-600">
                                      Expected
                                    </p>

                                    <p className="mt-1 break-all text-slate-400">
                                      {JSON.stringify(
                                        test.expected,
                                      )}
                                    </p>

                                  </div>

                                  <div>

                                    <p className="text-slate-600">
                                      Actual
                                    </p>

                                    <p className="mt-1 break-all text-slate-400">
                                      {test.error
                                        ? test.error
                                        : JSON.stringify(
                                            test.actual,
                                          )}
                                    </p>

                                  </div>

                                </div>

                              </div>
                            ),
                          )}

                        </div>

                      </div>

                      {/* Output */}

                      {result.output && (
                        <div className="mt-5 rounded-xl border border-red-500/20 bg-red-500/5 p-4">

                          <p className="text-xs font-semibold uppercase text-red-400">
                            Output
                          </p>

                          <pre className="mt-2 whitespace-pre-wrap text-xs leading-5 text-slate-400">
                            {result.output}
                          </pre>

                        </div>
                      )}

                      {/* View Analytics */}

                      <button
                        onClick={() =>
                          setActiveTab(
                            'analytics',
                          )
                        }
                        className="mt-5 w-full rounded-xl border border-blue-500/20 bg-blue-500/5 px-4 py-3 text-sm font-semibold text-blue-400 transition hover:bg-blue-500/10"
                      >
                        📊 View Coding Analytics
                      </button>

                    </div>
                  )}

                </div>

              </aside>

            </div>

          </>
        )}

      </main>

    </div>
  )
}

export default Coding