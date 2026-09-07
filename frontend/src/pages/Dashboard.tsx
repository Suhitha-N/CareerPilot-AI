import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

type User = {
  id: number
  name: string
  email: string
  role: string
}

type ReadinessData = {
  id?: number
  overall_score: number
  resume_score: number
  job_match_score: number
  interview_score: number
  coding_score: number
  skill_progress: number
  readiness_level: string
  strengths?: string[]
  recommendations?: string[]
  updated_at?: string
}

function Dashboard() {
  const navigate = useNavigate()

  const [user, setUser] = useState<User | null>(null)
  const [readiness, setReadiness] = useState<ReadinessData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('access_token')

    if (!token) {
      navigate('/login')
      return
    }

    const fetchDashboardData = async () => {
      try {
        // -------------------------------------------------
        // Fetch current user
        // -------------------------------------------------

        const userResponse = await fetch(
          'http://127.0.0.1:8001/api/users/me',
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        )

        if (!userResponse.ok) {
          localStorage.removeItem('access_token')
          navigate('/login')
          return
        }

        const userData = await userResponse.json()
        setUser(userData)

        // -------------------------------------------------
        // Fetch placement readiness
        // -------------------------------------------------

        const readinessResponse = await fetch(
          'http://127.0.0.1:8001/api/placement-readiness',
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        )

        if (readinessResponse.ok) {
          const readinessData = await readinessResponse.json()

          setReadiness({
            id: readinessData.id,
            overall_score: readinessData.overall_score ?? 0,
            resume_score: readinessData.resume_score ?? 0,
            job_match_score: readinessData.job_match_score ?? 0,
            interview_score: readinessData.interview_score ?? 0,
            coding_score: readinessData.coding_score ?? 0,
            skill_progress: readinessData.skill_progress ?? 0,
            readiness_level:
              readinessData.readiness_level ?? 'Getting Started',
            strengths: readinessData.strengths ?? [],
            recommendations: readinessData.recommendations ?? [],
            updated_at: readinessData.updated_at,
          })
        }
      } catch (error) {
        console.error('Dashboard loading error:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [navigate])

  const handleLogout = () => {
    localStorage.removeItem('access_token')
    navigate('/login')
  }

  // -------------------------------------------------------
  // Score helpers
  // -------------------------------------------------------

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-emerald-400'
    if (score >= 75) return 'text-green-400'
    if (score >= 60) return 'text-yellow-400'
    if (score >= 40) return 'text-orange-400'
    return 'text-red-400'
  }

  const getBarColor = (score: number) => {
    if (score >= 90) return 'bg-emerald-400'
    if (score >= 75) return 'bg-green-400'
    if (score >= 60) return 'bg-yellow-400'
    if (score >= 40) return 'bg-orange-400'
    return 'bg-red-400'
  }

  const getReadinessIcon = (level: string) => {
    if (level === 'Placement Ready') return '🏆'
    if (level === 'Interview Ready') return '🟢'
    if (level === 'On Track') return '🟢'
    if (level === 'Almost Ready') return '🟡'
    if (level === 'Building Skills') return '🟠'
    return '🔴'
  }

  const getPriority = useMemo(() => {
    if (!readiness) {
      return {
        title: 'Start your preparation',
        score: 0,
        route: '/readiness',
        description:
          'Complete your resume, job match, interview, and coding activities.',
      }
    }

    const scores = [
      {
        title: 'Resume Improvement',
        score: readiness.resume_score,
        route: '/resume',
        description: 'Improve your resume and ATS compatibility.',
      },
      {
        title: 'Job Matching',
        score: readiness.job_match_score,
        route: '/job-match',
        description: 'Improve your alignment with the target job.',
      },
      {
        title: 'Interview Preparation',
        score: readiness.interview_score,
        route: '/interview',
        description: 'Practice mock interviews and improve weak answers.',
      },
      {
        title: 'Coding Practice',
        score: readiness.coding_score,
        route: '/coding',
        description: 'Solve more coding problems and strengthen DSA skills.',
      },
      {
        title: 'Skill Development',
        score: readiness.skill_progress,
        route: '/career-roadmap',
        description: 'Continue your personalized career roadmap.',
      },
    ]

    return scores.reduce((lowest, current) =>
      current.score < lowest.score ? current : lowest,
    )
  }, [readiness])

  // -------------------------------------------------------
  // Loading
  // -------------------------------------------------------

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-slate-700 border-t-cyan-400" />

          <p className="text-slate-400">
            Loading your dashboard...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">

      {/* =================================================
          HEADER
      ================================================= */}

      <header className="border-b border-slate-800 bg-slate-900/80">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">

          <div>
            <h1 className="text-xl font-bold">
              CareerPilot AI
            </h1>

            <p className="text-xs text-slate-400">
              Intelligent Placement & Career Intelligence
            </p>
          </div>

          <div className="flex items-center gap-4">

            {user && (
              <div className="hidden text-right sm:block">
                <p className="text-sm font-medium text-white">
                  {user.name}
                </p>

                <p className="text-xs text-slate-400">
                  {user.email}
                </p>
              </div>
            )}

            <button
              onClick={handleLogout}
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:bg-slate-800"
            >
              Logout
            </button>

          </div>
        </div>
      </header>

      {/* =================================================
          MAIN
      ================================================= */}

      <main className="mx-auto max-w-7xl px-6 py-10">

        {/* =================================================
            WELCOME
        ================================================= */}

        <div className="mb-8">
          <p className="mb-2 text-sm font-medium uppercase tracking-wider text-cyan-400">
            Career Intelligence Dashboard
          </p>

          <h2 className="text-3xl font-bold">
            Welcome back
            {user?.name ? `, ${user.name}` : ''} 👋
          </h2>

          <p className="mt-2 text-slate-400">
            Track your placement preparation and focus on what matters most.
          </p>
        </div>

        {/* =================================================
            CORE METRICS
        ================================================= */}

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">

          {/* Resume */}

          <MetricCard
            title="Resume Score"
            score={readiness?.resume_score ?? 0}
            icon="📄"
            description="ATS & resume quality"
            color="blue"
            onClick={() => navigate('/resume')}
          />

          {/* Job Match */}

          <MetricCard
            title="Job Match"
            score={readiness?.job_match_score ?? 0}
            icon="🎯"
            description="Target job compatibility"
            color="cyan"
            onClick={() => navigate('/job-match')}
          />

          {/* Interview */}

          <MetricCard
            title="Interview"
            score={readiness?.interview_score ?? 0}
            icon="🎤"
            description="Interview performance"
            color="purple"
            onClick={() => navigate('/interview')}
          />

          {/* Coding */}

          <MetricCard
            title="Coding"
            score={readiness?.coding_score ?? 0}
            icon="💻"
            description="Coding performance"
            color="green"
            onClick={() => navigate('/coding')}
          />

        </div>

        {/* =================================================
            READINESS + PRIORITY
        ================================================= */}

        <section className="mt-8 grid gap-6 lg:grid-cols-3">

          {/* Overall Readiness */}

          <div className="relative overflow-hidden rounded-3xl border border-cyan-500/20 bg-gradient-to-br from-cyan-500/[0.08] via-slate-900 to-violet-500/[0.08] p-7 lg:col-span-2">

            <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-cyan-500/10 blur-3xl" />

            <div className="relative">

              <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-center">

                <div>
                  <p className="text-sm font-medium uppercase tracking-wider text-cyan-400">
                    AI Career Intelligence
                  </p>

                  <h3 className="mt-1 text-2xl font-bold">
                    Placement Readiness
                  </h3>

                  <p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">
                    Your combined placement preparation score based on
                    resume quality, job compatibility, interview performance,
                    coding ability, and skill progress.
                  </p>
                </div>

                <div className="text-center">

                  <div
                    className={`text-5xl font-black ${
                      getScoreColor(
                        readiness?.overall_score ?? 0,
                      )
                    }`}
                  >
                    {readiness?.overall_score ?? 0}
                  </div>

                  <p className="text-xs text-slate-500">
                    / 100
                  </p>

                  <p className="mt-2 text-sm font-semibold text-cyan-300">
                    {readiness
                      ? `${getReadinessIcon(
                          readiness.readiness_level,
                        )} ${readiness.readiness_level}`
                      : '🎯 Getting Started'}
                  </p>

                </div>

              </div>

              {/* Overall progress */}

              <div className="mt-7">

                <div className="mb-2 flex justify-between text-xs">
                  <span className="text-slate-500">
                    Overall preparation
                  </span>

                  <span className="font-semibold text-slate-300">
                    {readiness?.overall_score ?? 0}%
                  </span>
                </div>

                <div className="h-3 overflow-hidden rounded-full bg-slate-800">

                  <div
                    className={`h-full rounded-full transition-all duration-1000 ${getBarColor(
                      readiness?.overall_score ?? 0,
                    )}`}
                    style={{
                      width: `${readiness?.overall_score ?? 0}%`,
                    }}
                  />

                </div>

              </div>

              <button
                onClick={() => navigate('/readiness')}
                className="mt-6 rounded-xl bg-cyan-500 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-400 hover:shadow-lg hover:shadow-cyan-500/20"
              >
                View Full Readiness →
              </button>

            </div>
          </div>

          {/* Priority */}

          <div className="rounded-3xl border border-orange-500/20 bg-gradient-to-br from-slate-900 to-orange-500/[0.06] p-7">

            <div className="flex items-center justify-between">

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-500/10 text-xl">
                🔥
              </div>

              <span className="rounded-full border border-orange-500/20 bg-orange-500/10 px-3 py-1 text-xs font-semibold text-orange-300">
                HIGH PRIORITY
              </span>

            </div>

            <p className="mt-5 text-xs font-medium uppercase tracking-wider text-slate-500">
              Recommended focus
            </p>

            <h3 className="mt-2 text-xl font-bold">
              {getPriority.title}
            </h3>

            <div className="mt-4 flex items-end gap-2">

              <span
                className={`text-4xl font-black ${getScoreColor(
                  getPriority.score,
                )}`}
              >
                {getPriority.score}
              </span>

              <span className="mb-1 text-sm text-slate-500">
                / 100
              </span>

            </div>

            <p className="mt-3 text-sm leading-6 text-slate-400">
              {getPriority.description}
            </p>

            <button
              onClick={() => navigate(getPriority.route)}
              className="mt-5 w-full rounded-xl border border-orange-500/30 bg-orange-500/10 px-4 py-3 text-sm font-semibold text-orange-300 transition hover:bg-orange-500/20"
            >
              Improve This Area →
            </button>

          </div>

        </section>

        {/* =================================================
            PREPARATION BREAKDOWN
        ================================================= */}

        <section className="mt-10">

          <div className="mb-5 flex items-end justify-between">

            <div>
              <h3 className="text-xl font-semibold">
                Preparation Breakdown
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Your current performance across the placement journey.
              </p>
            </div>

          </div>

          <div className="grid gap-4 md:grid-cols-2">

            <ProgressMetric
              title="Resume Quality"
              score={readiness?.resume_score ?? 0}
              icon="📄"
              onClick={() => navigate('/resume')}
            />

            <ProgressMetric
              title="Job Compatibility"
              score={readiness?.job_match_score ?? 0}
              icon="🎯"
              onClick={() => navigate('/job-match')}
            />

            <ProgressMetric
              title="Interview Performance"
              score={readiness?.interview_score ?? 0}
              icon="🎤"
              onClick={() => navigate('/interview')}
            />

            <ProgressMetric
              title="Coding Performance"
              score={readiness?.coding_score ?? 0}
              icon="💻"
              onClick={() => navigate('/coding')}
            />

            <ProgressMetric
              title="Skill Progress"
              score={readiness?.skill_progress ?? 0}
              icon="📚"
              onClick={() => navigate('/career-roadmap')}
            />

          </div>

        </section>

        {/* =================================================
            STRENGTHS + RECOMMENDATION
        ================================================= */}

        <section className="mt-10 grid gap-6 lg:grid-cols-2">

          {/* Strengths */}

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">

            <div className="flex items-center gap-3">

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10">
                💪
              </div>

              <div>
                <h3 className="font-semibold">
                  Your Strengths
                </h3>

                <p className="text-xs text-slate-500">
                  Areas currently performing well
                </p>
              </div>

            </div>

            <div className="mt-5 space-y-3">

              {readiness?.strengths &&
              readiness.strengths.length > 0 ? (
                readiness.strengths.slice(0, 3).map(
                  (strength, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-3 rounded-xl border border-emerald-500/10 bg-emerald-500/[0.04] p-3"
                    >
                      <span className="mt-0.5 text-emerald-400">
                        ✓
                      </span>

                      <p className="text-sm text-slate-300">
                        {strength}
                      </p>
                    </div>
                  ),
                )
              ) : (
                <p className="text-sm leading-6 text-slate-500">
                  Complete more preparation activities to identify your
                  strongest areas.
                </p>
              )}

            </div>

          </div>

          {/* Recommendations */}

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">

            <div className="flex items-center gap-3">

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10">
                💡
              </div>

              <div>
                <h3 className="font-semibold">
                  AI Recommendations
                </h3>

                <p className="text-xs text-slate-500">
                  What you should work on next
                </p>
              </div>

            </div>

            <div className="mt-5 space-y-3">

              {readiness?.recommendations &&
              readiness.recommendations.length > 0 ? (
                readiness.recommendations.slice(0, 3).map(
                  (recommendation, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-3 rounded-xl border border-cyan-500/10 bg-cyan-500/[0.04] p-3"
                    >
                      <span className="mt-0.5 text-cyan-400">
                        →
                      </span>

                      <p className="text-sm text-slate-300">
                        {recommendation}
                      </p>
                    </div>
                  ),
                )
              ) : (
                <p className="text-sm leading-6 text-slate-500">
                  Your personalized recommendations will appear after
                  completing assessments.
                </p>
              )}

            </div>

          </div>

        </section>

        {/* =================================================
            PREPARATION TOOLS
        ================================================= */}

        <section className="mt-10">

          <h3 className="mb-5 text-xl font-semibold">
            Preparation Tools
          </h3>

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">

            {/* Resume */}

            <ToolCard
              icon="📄"
              title="Resume Analyzer"
              description="Analyze your resume, identify skills, and improve your ATS score."
              button="Analyze Resume"
              color="blue"
              onClick={() => navigate('/resume')}
            />

            {/* Job Match */}

            <ToolCard
              icon="🎯"
              title="Job Match Intelligence"
              description="Compare your resume with a job description and discover your career fit."
              button="Analyze Job Match"
              color="cyan"
              onClick={() => navigate('/job-match')}
            />

            {/* Interview */}

            <ToolCard
              icon="🎤"
              title="AI Mock Interview"
              description="Practice personalized technical and behavioral interviews."
              button="Start Interview"
              color="purple"
              onClick={() => navigate('/interview')}
            />

            {/* Coding */}

            <ToolCard
              icon="💻"
              title="Coding Assessment"
              description="Solve coding problems and evaluate your programming skills."
              button="Start Assessment"
              color="green"
              onClick={() => navigate('/coding')}
            />

            {/* Readiness */}

            <ToolCard
              icon="📊"
              title="Placement Readiness"
              description="Understand how prepared you are for real placement opportunities."
              button="View Readiness"
              color="yellow"
              onClick={() => navigate('/readiness')}
            />

            {/* Roadmap */}

            <ToolCard
              icon="🗺️"
              title="Career Roadmap"
              description="Follow your personalized career preparation plan and close your skill gaps."
              button="Open Roadmap"
              color="indigo"
              onClick={() => navigate('/career-roadmap')}
            />

          </div>

        </section>

        {/* =================================================
            AI ASSISTANT
        ================================================= */}

        <section className="mt-6">

          <div className="group relative overflow-hidden rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-slate-900 via-slate-900 to-cyan-500/[0.08] p-7 transition hover:border-cyan-400/50">

            <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-cyan-500/10 blur-3xl" />

            <div className="relative flex flex-col justify-between gap-6 md:flex-row md:items-center">

              <div>

                <div className="flex items-center gap-3">

                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-500/10 text-2xl">
                    🤖
                  </div>

                  <div>

                    <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">
                      AI Powered
                    </p>

                    <h3 className="text-xl font-bold">
                      CareerPilot AI Assistant
                    </h3>

                  </div>

                </div>

                <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-400">
                  Get personalized career guidance using your resume,
                  target job, skill gaps, readiness score, interviews,
                  coding progress, and roadmap.
                </p>

              </div>

              <button
                onClick={() => navigate('/assistant')}
                className="rounded-xl bg-cyan-500 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-400 hover:shadow-lg hover:shadow-cyan-500/20"
              >
                Ask CareerPilot AI →
              </button>

            </div>

          </div>

        </section>

      </main>
    </div>
  )
}


/* =========================================================
   METRIC CARD
========================================================= */

type MetricCardProps = {
  title: string
  score: number
  icon: string
  description: string
  color: string
  onClick: () => void
}

function MetricCard({
  title,
  score,
  icon,
  description,
  color,
  onClick,
}: MetricCardProps) {
  const getScoreColor = (value: number) => {
    if (value >= 90) return 'text-emerald-400'
    if (value >= 75) return 'text-green-400'
    if (value >= 60) return 'text-yellow-400'
    if (value >= 40) return 'text-orange-400'
    return 'text-red-400'
  }

  const borderClasses: Record<string, string> = {
    blue: 'hover:border-blue-500/50',
    cyan: 'hover:border-cyan-500/50',
    purple: 'hover:border-purple-500/50',
    green: 'hover:border-green-500/50',
  }

  return (
    <button
      onClick={onClick}
      className={`rounded-2xl border border-slate-800 bg-slate-900 p-6 text-left transition hover:-translate-y-1 hover:shadow-lg ${
        borderClasses[color] ?? 'hover:border-slate-600'
      }`}
    >
      <div className="flex items-center justify-between">

        <p className="text-sm text-slate-400">
          {title}
        </p>

        <span className="text-xl">
          {icon}
        </span>

      </div>

      <div className="mt-3 flex items-end gap-1">

        <span
          className={`text-4xl font-black ${getScoreColor(score)}`}
        >
          {score}
        </span>

        <span className="mb-1 text-sm text-slate-500">
          /100
        </span>

      </div>

      <p className="mt-2 text-xs text-slate-500">
        {description}
      </p>
    </button>
  )
}


/* =========================================================
   PROGRESS METRIC
========================================================= */

type ProgressMetricProps = {
  title: string
  score: number
  icon: string
  onClick: () => void
}

function ProgressMetric({
  title,
  score,
  icon,
  onClick,
}: ProgressMetricProps) {
  const getBarColor = (value: number) => {
    if (value >= 90) return 'bg-emerald-400'
    if (value >= 75) return 'bg-green-400'
    if (value >= 60) return 'bg-yellow-400'
    if (value >= 40) return 'bg-orange-400'
    return 'bg-red-400'
  }

  return (
    <button
      onClick={onClick}
      className="rounded-2xl border border-slate-800 bg-slate-900 p-5 text-left transition hover:border-slate-600"
    >
      <div className="flex items-center justify-between">

        <div className="flex items-center gap-3">

          <span className="text-lg">
            {icon}
          </span>

          <span className="text-sm font-medium text-slate-300">
            {title}
          </span>

        </div>

        <span className="text-sm font-bold text-slate-200">
          {score}%
        </span>

      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-800">

        <div
          className={`h-full rounded-full transition-all duration-700 ${getBarColor(
            score,
          )}`}
          style={{
            width: `${score}%`,
          }}
        />

      </div>

    </button>
  )
}


/* =========================================================
   TOOL CARD
========================================================= */

type ToolCardProps = {
  icon: string
  title: string
  description: string
  button: string
  color: string
  onClick: () => void
}

function ToolCard({
  icon,
  title,
  description,
  button,
  color,
  onClick,
}: ToolCardProps) {
  const buttonClasses: Record<string, string> = {
    blue: 'bg-blue-600 hover:bg-blue-500',
    cyan: 'bg-cyan-600 hover:bg-cyan-500',
    purple: 'bg-purple-600 hover:bg-purple-500',
    green: 'bg-green-600 hover:bg-green-500',
    yellow: 'bg-yellow-500 text-slate-950 hover:bg-yellow-400',
    indigo: 'bg-indigo-600 hover:bg-indigo-500',
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 transition hover:-translate-y-1 hover:border-slate-600">

      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-800 text-xl">
        {icon}
      </div>

      <h4 className="mt-5 text-lg font-semibold">
        {title}
      </h4>

      <p className="mt-2 min-h-[48px] text-sm leading-6 text-slate-400">
        {description}
      </p>

      <button
        onClick={onClick}
        className={`mt-5 rounded-lg px-4 py-2 text-sm font-semibold transition ${
          buttonClasses[color] ?? 'bg-slate-700 hover:bg-slate-600'
        }`}
      >
        {button}
      </button>

    </div>
  )
}


export default Dashboard