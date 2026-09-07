import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

type RoadmapWeek = {
  week: number
  title: string
  focus: string
  priority: string
  skills: string[]
  tasks: string[]
  project: string
  completed: boolean
}

type RoadmapResponse = {
  id: number
  target_role: string
  company_name: string | null
  duration_weeks: number
  overall_progress: number
  status: string
  missing_skills: string[]
  roadmap: RoadmapWeek[]
  completed_tasks: Record<string, boolean>
}

function CareerRoadmap() {
  const navigate = useNavigate()

  const [roadmap, setRoadmap] =
    useState<RoadmapResponse | null>(null)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [completedTasks, setCompletedTasks] =
    useState<Record<string, boolean>>({})

  const [savingTask, setSavingTask] = useState<string | null>(null)

  // =========================================================
  // LOAD ROADMAP
  // =========================================================

  useEffect(() => {
    const token = localStorage.getItem('access_token')

    if (!token) {
      navigate('/login')
      return
    }

    fetchRoadmap()
  }, [navigate])

  // =========================================================
  // FETCH ROADMAP FROM BACKEND
  // =========================================================

  async function fetchRoadmap() {
    try {
      setLoading(true)
      setError('')

      const token = localStorage.getItem('access_token')

      if (!token) {
        navigate('/login')
        return
      }

      const response = await fetch(
        'http://127.0.0.1:8001/api/career-roadmap',
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      )

      if (!response.ok) {
        if (response.status === 404) {
          setError(
            'No career roadmap found. Please generate your roadmap first.',
          )
        } else if (response.status === 401) {
          localStorage.removeItem('access_token')
          navigate('/login')
        } else {
          setError(
            `Failed to load roadmap. Server returned ${response.status}.`,
          )
        }

        return
      }

      const data = await response.json()

      console.log(
        'Career Roadmap API response:',
        data,
      )

      // -----------------------------------------------------
      // ROADMAP WEEKS
      // -----------------------------------------------------

      const roadmapWeeks: RoadmapWeek[] =
        Array.isArray(data.roadmap)
          ? data.roadmap
          : Array.isArray(data.roadmap_data)
            ? data.roadmap_data
            : []

      // -----------------------------------------------------
      // MISSING SKILLS
      // -----------------------------------------------------

      const missingSkills: string[] =
        Array.isArray(data.missing_skills) &&
        data.missing_skills.length > 0
          ? data.missing_skills
          : Array.from(
              new Set(
                roadmapWeeks.flatMap((week) =>
                  Array.isArray(week.skills)
                    ? week.skills
                    : [],
                ),
              ),
            )

      // -----------------------------------------------------
      // IMPORTANT
      //
      // Completed tasks now come from PostgreSQL.
      // No localStorage is used.
      // -----------------------------------------------------

      const backendCompletedTasks =
        data.completed_tasks &&
        typeof data.completed_tasks === 'object'
          ? data.completed_tasks
          : {}

      setCompletedTasks(
        backendCompletedTasks,
      )

      // -----------------------------------------------------
      // SET ROADMAP
      // -----------------------------------------------------

      setRoadmap({
        id: data.id ?? 0,

        target_role:
          data.target_role ??
          'Career Goal',

        company_name:
          data.company_name ??
          null,

        duration_weeks:
          data.duration_weeks ??
          4,

        overall_progress:
          data.overall_progress ??
          0,

        status:
          data.status ??
          'active',

        missing_skills:
          missingSkills,

        roadmap:
          roadmapWeeks,

        completed_tasks:
          backendCompletedTasks,
      })
    } catch (err) {
      console.error(
        'Career Roadmap loading error:',
        err,
      )

      setError(
        err instanceof Error
          ? err.message
          : 'Unable to load career roadmap.',
      )
    } finally {
      setLoading(false)
    }
  }

  // =========================================================
  // TOGGLE ROADMAP TASK
  // =========================================================

  async function toggleTask(
    weekNumber: number,
    taskIndex: number,
  ) {
    const token = localStorage.getItem(
      'access_token',
    )

    if (!token) {
      navigate('/login')
      return
    }

    const key = `${weekNumber}-${taskIndex}`

    const newCompleted =
      !Boolean(completedTasks[key])

    setSavingTask(key)
    setError('')

    try {
      const response = await fetch(
        'http://127.0.0.1:8001/api/career-roadmap/tasks',
        {
          method: 'PUT',

          headers: {
            'Content-Type':
              'application/json',

            Authorization:
              `Bearer ${token}`,
          },

          body: JSON.stringify({
            week: weekNumber,

            task_index:
              taskIndex,

            completed:
              newCompleted,
          }),
        },
      )

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem(
            'access_token',
          )

          navigate('/login')

          return
        }

        const errorData =
          await response
            .json()
            .catch(() => null)

        throw new Error(
          errorData?.detail ||
            'Unable to update roadmap task.',
        )
      }

      const data =
        await response.json()

      console.log(
        'Roadmap task update:',
        data,
      )

      // -----------------------------------------------------
      // Update completed task state
      // -----------------------------------------------------

      setCompletedTasks(
        (previous) => ({
          ...previous,

          [key]:
            newCompleted,
        }),
      )

      // -----------------------------------------------------
      // Update roadmap progress from backend
      // -----------------------------------------------------

      setRoadmap(
        (previous) => {
          if (!previous) {
            return previous
          }

          return {
            ...previous,

            overall_progress:
              data.overall_progress ??
              previous.overall_progress,

            status:
              data.status ??
              previous.status,

            completed_tasks:
              data.completed_tasks ??
              {
                ...previous.completed_tasks,

                [key]:
                  newCompleted,
              },
          }
        },
      )
    } catch (err) {
      console.error(
        'Career Roadmap task update failed:',
        err,
      )

      setError(
        err instanceof Error
          ? err.message
          : 'Unable to update roadmap task.',
      )
    } finally {
      setSavingTask(null)
    }
  }

  // =========================================================
  // WEEKS
  // =========================================================

  const weeks = useMemo(() => {
    if (!roadmap) {
      return []
    }

    return Array.isArray(
      roadmap.roadmap,
    )
      ? roadmap.roadmap
      : []
  }, [roadmap])

  // =========================================================
  // OVERALL PROGRESS
  //
  // Calculated locally for instant UI response.
  // Backend remains the source of truth.
  // =========================================================

  const progress = useMemo(() => {
    if (
      !roadmap ||
      weeks.length === 0
    ) {
      return (
        roadmap?.overall_progress ??
        0
      )
    }

    let totalTasks = 0
    let completed = 0

    weeks.forEach((week) => {
      const tasks =
        Array.isArray(week.tasks)
          ? week.tasks
          : []

      totalTasks +=
        tasks.length

      tasks.forEach(
        (_, index) => {
          if (
            completedTasks[
              `${week.week}-${index}`
            ]
          ) {
            completed++
          }
        },
      )
    })

    if (totalTasks === 0) {
      return (
        roadmap.overall_progress
      )
    }

    return Math.round(
      (completed /
        totalTasks) *
        100,
    )
  }, [
    roadmap,
    weeks,
    completedTasks,
  ])

  // =========================================================
  // WEEK PROGRESS
  // =========================================================

  function getWeekProgress(
    week: RoadmapWeek,
  ) {
    const tasks =
      Array.isArray(week.tasks)
        ? week.tasks
        : []

    if (tasks.length === 0) {
      return 0
    }

    const completed =
      tasks.filter(
        (_, index) =>
          completedTasks[
            `${week.week}-${index}`
          ],
      ).length

    return Math.round(
      (completed /
        tasks.length) *
        100,
    )
  }

  // =========================================================
  // PRIORITY STYLE
  // =========================================================

  function getPriorityStyle(
    priority: string,
  ) {
    const value =
      priority?.toLowerCase()

    if (value === 'high') {
      return 'border-red-500/20 bg-red-500/10 text-red-300'
    }

    if (value === 'medium') {
      return 'border-yellow-500/20 bg-yellow-500/10 text-yellow-300'
    }

    return 'border-green-500/20 bg-green-500/10 text-green-300'
  }

  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">

        <div className="text-center">

          <div className="mx-auto mb-5 h-12 w-12 animate-spin rounded-full border-4 border-slate-700 border-t-cyan-400" />

          <h2 className="text-xl font-bold">
            Building your Career Roadmap...
          </h2>

          <p className="mt-2 text-sm text-slate-400">
            Loading your personalized preparation plan.
          </p>

        </div>

      </div>
    )
  }

  // =========================================================
  // ERROR
  // =========================================================

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">

        <div className="w-full max-w-lg rounded-3xl border border-slate-800 bg-slate-900 p-8 text-center shadow-2xl">

          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10 text-3xl">
            ⚠️
          </div>

          <h2 className="text-2xl font-bold">
            Career Roadmap Unavailable
          </h2>

          <p className="mt-3 text-slate-400">
            {error}
          </p>

          <div className="mt-6 flex justify-center gap-3">

            <button
              onClick={fetchRoadmap}
              className="rounded-xl bg-cyan-500 px-5 py-3 font-semibold text-slate-950 transition hover:bg-cyan-400"
            >
              Try Again
            </button>

            <button
              onClick={() =>
                navigate(
                  '/dashboard',
                )
              }
              className="rounded-xl border border-slate-700 px-5 py-3 font-semibold text-slate-300 transition hover:bg-slate-800"
            >
              Dashboard
            </button>

          </div>

        </div>

      </div>
    )
  }

  // =========================================================
  // NO ROADMAP
  // =========================================================

  if (!roadmap) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">

        <div className="text-center">

          <div className="text-6xl">
            🗺️
          </div>

          <h2 className="mt-5 text-2xl font-bold">
            No Career Roadmap
          </h2>

          <p className="mt-2 text-slate-400">
            Generate a roadmap from your target job first.
          </p>

          <button
            onClick={() =>
              navigate(
                '/dashboard',
              )
            }
            className="mt-6 rounded-xl bg-cyan-500 px-6 py-3 font-semibold text-slate-950"
          >
            Back to Dashboard
          </button>

        </div>

      </div>
    )
  }

  // =========================================================
  // MAIN UI
  // =========================================================

  return (
    <div className="min-h-screen bg-slate-950 text-white">

      {/* =================================================
          HEADER
      ================================================= */}

      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur">

        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">

          <div className="flex items-center gap-4">

            <button
              onClick={() =>
                navigate(
                  '/dashboard',
                )
              }
              className="rounded-xl border border-slate-700 px-3 py-2 text-slate-300 transition hover:bg-slate-800"
            >
              ←
            </button>

            <div>

              <h1 className="text-xl font-bold">
                Career Roadmap
              </h1>

              <p className="text-xs text-slate-400">
                AI-powered personalized career plan
              </p>

            </div>

          </div>

          <button
            onClick={fetchRoadmap}
            className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-slate-800"
          >
            ↻ Refresh
          </button>

        </div>

      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">

        {/* =================================================
            HERO
        ================================================= */}

        <section className="relative overflow-hidden rounded-3xl border border-cyan-500/20 bg-gradient-to-br from-cyan-500/[0.10] via-slate-900 to-violet-500/[0.10] p-8 shadow-2xl">

          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />

          <div className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-violet-500/10 blur-3xl" />

          <div className="relative grid gap-8 lg:grid-cols-[1fr_260px] lg:items-center">

            <div>

              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-4 py-2 text-xs font-bold uppercase tracking-wider text-cyan-300">
                🚀 Personalized Career Plan
              </div>

              <h2 className="text-3xl font-black md:text-4xl">
                {roadmap.target_role}
              </h2>

              {roadmap.company_name && (
                <p className="mt-3 text-lg text-slate-400">

                  🎯 Target Company:{' '}

                  <span className="font-semibold text-white">
                    {roadmap.company_name}
                  </span>

                </p>
              )}

              <div className="mt-6 flex flex-wrap gap-3">

                <div className="rounded-xl border border-slate-700 bg-slate-900/60 px-5 py-3">

                  <p className="text-xs text-slate-500">
                    Duration
                  </p>

                  <p className="mt-1 font-bold">
                    {roadmap.duration_weeks}{' '}
                    Weeks
                  </p>

                </div>

                <div className="rounded-xl border border-slate-700 bg-slate-900/60 px-5 py-3">

                  <p className="text-xs text-slate-500">
                    Status
                  </p>

                  <p className="mt-1 font-bold capitalize">
                    {roadmap.status}
                  </p>

                </div>

                <div className="rounded-xl border border-slate-700 bg-slate-900/60 px-5 py-3">

                  <p className="text-xs text-slate-500">
                    Skill Gaps
                  </p>

                  <p className="mt-1 font-bold text-red-300">
                    {roadmap.missing_skills.length}
                  </p>

                </div>

              </div>

            </div>

            {/* PROGRESS */}

            <div className="flex justify-center">

              <div className="relative flex h-48 w-48 items-center justify-center rounded-full">

                <div
                  className="absolute inset-0 rounded-full"
                  style={{
                    background:
                      `conic-gradient(#22d3ee ${progress * 3.6}deg, #1e293b 0deg)`,
                  }}
                />

                <div className="relative flex h-40 w-40 flex-col items-center justify-center rounded-full bg-slate-950">

                  <span className="text-4xl font-black text-cyan-300">
                    {progress}%
                  </span>

                  <span className="mt-1 text-xs uppercase tracking-wider text-slate-500">
                    Complete
                  </span>

                </div>

              </div>

            </div>

          </div>

        </section>

        {/* =================================================
            SKILL GAPS
        ================================================= */}

        <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">

          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">

            <div>

              <h3 className="text-xl font-bold">
                🎯 Skills to Strengthen
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Skills identified from your target role.
              </p>

            </div>

            <span className="w-fit rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1 text-xs font-bold text-red-300">
              {roadmap.missing_skills.length}{' '}
              Gaps
            </span>

          </div>

          {roadmap.missing_skills.length >
          0 ? (

            <div className="mt-5 flex flex-wrap gap-3">

              {roadmap.missing_skills.map(
                (skill) => (
                  <span
                    key={skill}
                    className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-300"
                  >
                    {skill}
                  </span>
                ),
              )}

            </div>

          ) : (

            <p className="mt-5 rounded-xl bg-green-500/10 p-4 text-sm text-green-300">
              🎉 No major skill gaps detected!
            </p>

          )}

        </section>

        {/* =================================================
            JOURNEY
        ================================================= */}

        <section className="mt-10">

          <div className="mb-7">

            <p className="text-xs font-bold uppercase tracking-widest text-cyan-400">
              Your Journey
            </p>

            <h3 className="mt-2 text-2xl font-black">
              📚 {roadmap.duration_weeks}-Week Learning Journey
            </h3>

            <p className="mt-2 text-sm text-slate-400">
              Complete each task and build the recommended projects.
            </p>

          </div>

          {weeks.length === 0 ? (

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center">

              <div className="text-5xl">
                📭
              </div>

              <h3 className="mt-4 text-xl font-bold">
                Roadmap details not available
              </h3>

              <p className="mt-2 text-sm text-slate-500">
                The roadmap exists, but no weekly learning data was returned.
              </p>

            </div>

          ) : (

            <div className="space-y-8">

              {weeks.map(
                (week, index) => {

                  const currentProgress =
                    getWeekProgress(
                      week,
                    )

                  const tasks =
                    Array.isArray(
                      week.tasks,
                    )
                      ? week.tasks
                      : []

                  const skills =
                    Array.isArray(
                      week.skills,
                    )
                      ? week.skills
                      : []

                  return (

                    <div
                      key={`${week.week}-${index}`}
                      className="relative"
                    >

                      {/* TIMELINE */}

                      {index <
                        weeks.length -
                          1 && (

                        <div className="absolute left-7 top-16 hidden h-[calc(100%+2rem)] w-px bg-gradient-to-b from-cyan-500/50 to-slate-800 md:block" />

                      )}

                      <article className="relative rounded-2xl border border-slate-800 bg-slate-900 shadow-xl transition duration-300 hover:border-cyan-500/30">

                        {/* WEEK HEADER */}

                        <div className="border-b border-slate-800 p-6">

                          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

                            <div className="flex items-start gap-4">

                              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-cyan-500/10 text-sm font-black text-cyan-300">
                                W{week.week}
                              </div>

                              <div>

                                <div className="mb-2 flex flex-wrap items-center gap-2">

                                  <span
                                    className={`rounded-full border px-3 py-1 text-xs font-bold ${getPriorityStyle(
                                      week.priority,
                                    )}`}
                                  >
                                    {week.priority ||
                                      'Medium'}{' '}
                                    Priority
                                  </span>

                                </div>

                                <h4 className="text-xl font-bold">
                                  {week.title ||
                                    `Week ${week.week}`}
                                </h4>

                                <p className="mt-1 text-sm text-slate-500">
                                  Focus:{' '}
                                  {week.focus ||
                                    'Career Development'}
                                </p>

                              </div>

                            </div>

                            {/* WEEK PROGRESS */}

                            <div className="w-full lg:w-56">

                              <div className="mb-2 flex justify-between text-xs">

                                <span className="text-slate-500">
                                  Week Progress
                                </span>

                                <span className="font-bold text-cyan-300">
                                  {currentProgress}%
                                </span>

                              </div>

                              <div className="h-2 overflow-hidden rounded-full bg-slate-800">

                                <div
                                  className="h-full rounded-full bg-cyan-400 transition-all duration-500"
                                  style={{
                                    width:
                                      `${currentProgress}%`,
                                  }}
                                />

                              </div>

                            </div>

                          </div>

                        </div>

                        {/* SKILLS + PROJECT */}

                        <div className="grid gap-6 p-6 lg:grid-cols-2">

                          {/* SKILLS */}

                          <div>

                            <h5 className="mb-3 font-bold">
                              🧩 Skills
                            </h5>

                            <div className="flex flex-wrap gap-2">

                              {skills.length >
                              0 ? (

                                skills.map(
                                  (
                                    skill,
                                  ) => (

                                    <span
                                      key={
                                        skill
                                      }
                                      className="rounded-lg border border-indigo-500/20 bg-indigo-500/10 px-3 py-2 text-xs font-semibold text-indigo-300"
                                    >
                                      {skill}
                                    </span>

                                  ),
                                )

                              ) : (

                                <span className="text-sm text-slate-500">
                                  No skills listed.
                                </span>

                              )}

                            </div>

                          </div>

                          {/* PROJECT */}

                          <div>

                            <h5 className="mb-3 font-bold">
                              🛠️ Mini Project
                            </h5>

                            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">

                              <p className="text-sm leading-6 text-slate-400">
                                {week.project ||
                                  'Complete a practical project related to this week.'}
                              </p>

                            </div>

                          </div>

                        </div>

                        {/* TASKS */}

                        <div className="border-t border-slate-800 p-6">

                          <h5 className="mb-4 font-bold">
                            ✅ Learning Tasks
                          </h5>

                          {tasks.length >
                          0 ? (

                            <div className="grid gap-3 md:grid-cols-2">

                              {tasks.map(
                                (
                                  task,
                                  taskIndex,
                                ) => {

                                  const key =
                                    `${week.week}-${taskIndex}`

                                  const completed =
                                    !!completedTasks[
                                      key
                                    ]

                                  const isSaving =
                                    savingTask ===
                                    key

                                  return (

                                    <label
                                      key={
                                        key
                                      }
                                      className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${
                                        completed
                                          ? 'border-green-500/20 bg-green-500/10'
                                          : 'border-slate-800 bg-slate-950 hover:border-cyan-500/30'
                                      } ${
                                        isSaving
                                          ? 'opacity-60'
                                          : ''
                                      }`}
                                    >

                                      <input
                                        type="checkbox"
                                        checked={
                                          completed
                                        }
                                        disabled={
                                          isSaving
                                        }
                                        onChange={() =>
                                          toggleTask(
                                            week.week,
                                            taskIndex,
                                          )
                                        }
                                        className="mt-1 h-4 w-4 accent-cyan-400"
                                      />

                                      <span
                                        className={`text-sm leading-5 ${
                                          completed
                                            ? 'text-green-300 line-through'
                                            : 'text-slate-400'
                                        }`}
                                      >
                                        {task}
                                      </span>

                                      {isSaving && (
                                        <span className="ml-auto text-xs text-cyan-300">
                                          Saving...
                                        </span>
                                      )}

                                    </label>

                                  )
                                },
                              )}

                            </div>

                          ) : (

                            <p className="text-sm text-slate-500">
                              No learning tasks available for this week.
                            </p>

                          )}

                        </div>

                      </article>

                    </div>

                  )
                },
              )}

            </div>

          )}

        </section>

        {/* =================================================
            BOTTOM ACTIONS
        ================================================= */}

        <section className="mt-10 rounded-2xl border border-slate-800 bg-slate-900 p-6">

          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">

            <div>

              <h3 className="text-xl font-bold">
                🔥 Continue Your Placement Preparation
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Combine your roadmap with interview and coding practice.
              </p>

            </div>

            <div className="flex flex-wrap gap-3">

              <button
                onClick={() =>
                  navigate(
                    '/interview',
                  )
                }
                className="rounded-xl bg-purple-600 px-5 py-3 text-sm font-bold transition hover:bg-purple-500"
              >
                🎤 Practice Interview
              </button>

              <button
                onClick={() =>
                  navigate(
                    '/coding',
                  )
                }
                className="rounded-xl bg-green-600 px-5 py-3 text-sm font-bold transition hover:bg-green-500"
              >
                💻 Practice Coding
              </button>

              <button
                onClick={() =>
                  navigate(
                    '/readiness',
                  )
                }
                className="rounded-xl bg-yellow-500 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-yellow-400"
              >
                📊 View Readiness
              </button>

            </div>

          </div>

        </section>

      </main>

    </div>
  )
}

export default CareerRoadmap