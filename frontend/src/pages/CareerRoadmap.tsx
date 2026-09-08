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
  milestone?: string
  category?: string
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

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState('')

  const [completedTasks, setCompletedTasks] =
    useState<Record<string, boolean>>({})

  const [savingTask, setSavingTask] =
    useState<string | null>(null)

  // =========================================================
  // LOAD ROADMAP
  // =========================================================

  useEffect(() => {
    const token =
      localStorage.getItem('access_token')

    if (!token) {
      navigate('/login')
      return
    }

    fetchRoadmap()
  }, [navigate])

  // =========================================================
  // FETCH / AUTO-GENERATE ROADMAP
  // =========================================================

  async function fetchRoadmap() {
    try {
      setLoading(true)
      setError('')

      const token =
        localStorage.getItem('access_token')

      if (!token) {
        navigate('/login')
        return
      }

      // -------------------------------------------------------
      // STEP 1:
      // Try to load the existing roadmap.
      // -------------------------------------------------------

      const roadmapResponse =
        await fetch(
          'http://127.0.0.1:8001/api/career-roadmap',
          {
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          },
        )

      // -------------------------------------------------------
      // Authentication failure
      // -------------------------------------------------------

      if (
        roadmapResponse.status === 401
      ) {
        localStorage.removeItem(
          'access_token',
        )

        navigate('/login')
        return
      }

      let roadmapData: any = null

      if (roadmapResponse.ok) {
        roadmapData =
          await roadmapResponse.json()

        console.log(
          'Career Roadmap API response:',
          roadmapData,
        )
      }

      // -------------------------------------------------------
      // STEP 2:
      // Check whether the existing roadmap actually
      // contains weekly learning data.
      // -------------------------------------------------------

      const existingRoadmap =
        roadmapData &&
        Array.isArray(
          roadmapData.roadmap,
        )
          ? roadmapData.roadmap
          : []

      const roadmapNeedsGeneration =
        !roadmapResponse.ok ||
        existingRoadmap.length === 0

      // -------------------------------------------------------
      // STEP 3:
      // AUTOMATIC ROADMAP GENERATION
      //
      // The user does NOT need Swagger anymore.
      // -------------------------------------------------------

      if (roadmapNeedsGeneration) {
        console.log(
          'No usable roadmap found. Generating automatically...',
        )

        // -----------------------------------------------------
        // Get latest Job Description
        // -----------------------------------------------------

        const jdResponse =
          await fetch(
            'http://127.0.0.1:8001/api/job-descriptions',
            {
              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            },
          )

        if (
          jdResponse.status === 401
        ) {
          localStorage.removeItem(
            'access_token',
          )

          navigate('/login')
          return
        }

        if (!jdResponse.ok) {
          const errorData =
            await jdResponse
              .json()
              .catch(() => null)

          throw new Error(
            errorData?.detail ||
              `Unable to load job description. Server returned ${jdResponse.status}.`,
          )
        }

        const jobDescriptions =
          await jdResponse.json()

        if (
          !Array.isArray(
            jobDescriptions,
          ) ||
          jobDescriptions.length === 0
        ) {
          throw new Error(
            'Please analyze a job description before opening your Career Roadmap.',
          )
        }

        // Backend returns newest first.
        const latestJobDescription =
          jobDescriptions[0]

        // -----------------------------------------------------
        // Use saved duration when available.
        // Default = 4 weeks.
        // -----------------------------------------------------

        const savedDuration =
          Number(
            roadmapData?.duration_weeks,
          )

        const durationWeeks =
          savedDuration >= 1 &&
          savedDuration <= 12
            ? savedDuration
            : 4

        // -----------------------------------------------------
        // Generate roadmap.
        //
        // missing_skills is intentionally empty because the
        // backend calculates the official skill gaps from:
        //
        // Resume + Job Description
        // -----------------------------------------------------

        const generateResponse =
          await fetch(
            'http://127.0.0.1:8001/api/career-roadmap/generate',
            {
              method: 'POST',

              headers: {
                'Content-Type':
                  'application/json',

                Authorization:
                  `Bearer ${token}`,
              },

              body: JSON.stringify({
                target_role:
                  latestJobDescription.title ||
                  'Career Goal',

                company_name:
                  latestJobDescription.company_name ||
                  null,

                duration_weeks:
                  durationWeeks,

                missing_skills: [],
              }),
            },
          )

        if (
          generateResponse.status === 401
        ) {
          localStorage.removeItem(
            'access_token',
          )

          navigate('/login')
          return
        }

        if (!generateResponse.ok) {
          const errorData =
            await generateResponse
              .json()
              .catch(() => null)

          throw new Error(
            errorData?.detail ||
              `Unable to generate roadmap. Server returned ${generateResponse.status}.`,
          )
        }

        roadmapData =
          await generateResponse.json()

        console.log(
          'Automatically generated Career Roadmap:',
          roadmapData,
        )
      }

      // -------------------------------------------------------
      // STEP 4:
      // Extract weekly roadmap.
      // -------------------------------------------------------

      const roadmapWeeks: RoadmapWeek[] =
        Array.isArray(
          roadmapData?.roadmap,
        )
          ? roadmapData.roadmap
          : Array.isArray(
                roadmapData?.roadmap_data,
              )
            ? roadmapData.roadmap_data
            : []

      // -------------------------------------------------------
      // Safety check
      // -------------------------------------------------------

      if (
        roadmapWeeks.length === 0
      ) {
        throw new Error(
          'The roadmap could not be generated. Please analyze a job description and try again.',
        )
      }

      // -------------------------------------------------------
      // STEP 5:
      // Missing skills.
      // -------------------------------------------------------

      const missingSkills: string[] =
        Array.isArray(
          roadmapData?.missing_skills,
        ) &&
        roadmapData.missing_skills.length > 0
          ? roadmapData.missing_skills
          : Array.from(
              new Set(
                roadmapWeeks.flatMap(
                  (week) =>
                    Array.isArray(
                      week.skills,
                    )
                      ? week.skills
                      : [],
                ),
              ),
            )

      // -------------------------------------------------------
      // STEP 6:
      // Completed tasks from PostgreSQL.
      // -------------------------------------------------------

      const backendCompletedTasks =
        roadmapData?.completed_tasks &&
        typeof roadmapData.completed_tasks ===
          'object'
          ? roadmapData.completed_tasks
          : {}

      setCompletedTasks(
        backendCompletedTasks,
      )

      // -------------------------------------------------------
      // STEP 7:
      // Save roadmap into React state.
      // -------------------------------------------------------

      setRoadmap({
        id:
          roadmapData?.id ??
          0,

        target_role:
          roadmapData?.target_role ??
          'Career Goal',

        company_name:
          roadmapData?.company_name ??
          null,

        duration_weeks:
          roadmapData?.duration_weeks ??
          4,

        overall_progress:
          roadmapData?.overall_progress ??
          0,

        status:
          roadmapData?.status ??
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
        'Career Roadmap loading/generation error:',
        err,
      )

      setError(
        err instanceof Error
          ? err.message
          : 'Unable to load or generate career roadmap.',
      )
    } finally {
      setLoading(false)
    }
  }

  // =========================================================
  // TOGGLE TASK
  // =========================================================

  async function toggleTask(
    weekNumber: number,
    taskIndex: number,
  ) {
    const token =
      localStorage.getItem(
        'access_token',
      )

    if (!token) {
      navigate('/login')
      return
    }

    const key =
      `${weekNumber}-${taskIndex}`

    const newCompleted =
      !Boolean(
        completedTasks[key],
      )

    setSavingTask(key)
    setError('')

    try {
      const response =
        await fetch(
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
        if (
          response.status === 401
        ) {
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

      // -------------------------------------------------------
      // Update completed task state immediately.
      // -------------------------------------------------------

      setCompletedTasks(
        (previous) => ({
          ...previous,

          [key]:
            newCompleted,
        }),
      )

      // -------------------------------------------------------
      // Update backend progress.
      // -------------------------------------------------------

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

  const weeks =
    useMemo(() => {
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
  // =========================================================

  const progress =
    useMemo(() => {
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

      weeks.forEach(
        (week) => {
          const tasks =
            Array.isArray(
              week.tasks,
            )
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
        },
      )

      if (
        totalTasks === 0
      ) {
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
      Array.isArray(
        week.tasks,
      )
        ? week.tasks
        : []

    if (
      tasks.length === 0
    ) {
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

    if (
      value === 'high'
    ) {
      return 'border-red-500/20 bg-red-500/10 text-red-300'
    }

    if (
      value === 'medium'
    ) {
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
            Creating your personalized preparation plan.
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
                navigate('/dashboard')
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
            Analyze a target job to build your personalized roadmap.
          </p>

          <button
            onClick={() =>
              navigate('/dashboard')
            }
            className="mt-6 rounded-xl bg-cyan-500 px-6 py-3 font-semibold text-slate-950 transition hover:bg-cyan-400"
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

      {/* =====================================================
          HEADER
      ===================================================== */}

      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur">

        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">

          <div className="flex items-center gap-4">

            <button
              onClick={() =>
                navigate('/dashboard')
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

      {/* =====================================================
          MAIN
      ===================================================== */}

      <main className="mx-auto max-w-7xl px-6 py-8">

        {/* ===================================================
            HERO
        =================================================== */}

        <section className="relative overflow-hidden rounded-3xl border border-cyan-500/30 bg-gradient-to-br from-slate-900 via-slate-900 to-cyan-950/50 p-8 shadow-2xl">

          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl" />

          <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">

            <div className="flex-1">

              <div className="mb-5 inline-flex items-center rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-xs font-bold uppercase tracking-wide text-cyan-300">
                🚀 Personalized Career Plan
              </div>

              <h2 className="text-4xl font-black tracking-tight md:text-5xl">
                {roadmap.target_role}
              </h2>

              {roadmap.company_name && (
                <p className="mt-3 text-lg text-slate-400">
                  🎯 Target Company:{' '}
                  <span className="font-bold text-white">
                    {roadmap.company_name}
                  </span>
                </p>
              )}

              <div className="mt-7 flex flex-wrap gap-3">

                <div className="rounded-xl border border-slate-700 bg-slate-950/60 px-5 py-3">
                  <p className="text-xs text-slate-500">
                    Duration
                  </p>
                  <p className="mt-1 font-bold">
                    {roadmap.duration_weeks} Weeks
                  </p>
                </div>

                <div className="rounded-xl border border-slate-700 bg-slate-950/60 px-5 py-3">
                  <p className="text-xs text-slate-500">
                    Status
                  </p>
                  <p className="mt-1 font-bold capitalize">
                    {roadmap.status}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-700 bg-slate-950/60 px-5 py-3">
                  <p className="text-xs text-slate-500">
                    Skill Gaps
                  </p>
                  <p className="mt-1 font-bold text-red-300">
                    {roadmap.missing_skills.length}
                  </p>
                </div>

              </div>

            </div>

            {/* =================================================
                PROGRESS CIRCLE
            ================================================= */}

            <div className="flex justify-center lg:pr-8">

              <div className="relative flex h-40 w-40 items-center justify-center rounded-full border-[12px] border-slate-800">

                <div
                  className="absolute inset-[-12px] rounded-full"
                  style={{
                    background: `conic-gradient(#22d3ee ${progress}%, transparent ${progress}% 100%)`,
                    mask: 'radial-gradient(farthest-side, transparent calc(100% - 12px), #000 calc(100% - 11px))',
                    WebkitMask:
                      'radial-gradient(farthest-side, transparent calc(100% - 12px), #000 calc(100% - 11px))',
                  }}
                />

                <div className="text-center">

                  <div className="text-3xl font-black text-cyan-300">
                    {progress}%
                  </div>

                  <div className="text-xs uppercase tracking-wide text-slate-500">
                    Complete
                  </div>

                </div>

              </div>

            </div>

          </div>

        </section>

        {/* ===================================================
            SKILLS TO STRENGTHEN
        =================================================== */}

        <section className="mt-7 rounded-2xl border border-slate-800 bg-slate-900 p-6">

          <div className="flex items-center justify-between">

            <div>

              <h3 className="text-lg font-bold">
                🎯 Skills to Strengthen
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Skills identified from your target role.
              </p>

            </div>

            <div className="rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs font-bold text-red-300">
              {roadmap.missing_skills.length} Gaps
            </div>

          </div>

          {roadmap.missing_skills.length > 0 ? (

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

            <div className="mt-5 rounded-xl border border-green-500/10 bg-green-500/10 p-4 text-sm text-green-300">
              🎉 No major skill gaps detected!
            </div>

          )}

        </section>

        {/* ===================================================
            JOURNEY
        =================================================== */}

        <section className="mt-10">

          <div className="mb-6">

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

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-12 text-center">

              <div className="text-5xl">
                📭
              </div>

              <h3 className="mt-5 text-xl font-bold">
                Roadmap details not available
              </h3>

              <p className="mt-2 text-sm text-slate-500">
                The roadmap exists, but no weekly learning data was returned.
              </p>

              <button
                onClick={fetchRoadmap}
                className="mt-6 rounded-xl bg-cyan-500 px-5 py-3 font-bold text-slate-950"
              >
                Generate Again
              </button>

            </div>

          ) : (

            <div className="space-y-6">

              {weeks.map(
                (week) => {

                  const tasks =
                    Array.isArray(
                      week.tasks,
                    )
                      ? week.tasks
                      : []

                  const weekProgress =
                    getWeekProgress(
                      week,
                    )

                  return (
                    <article
                      key={week.week}
                      className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-xl"
                    >

                      {/* =========================================
                          WEEK HEADER
                      ========================================= */}

                      <div className="border-b border-slate-800 p-6">

                        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">

                          <div className="flex gap-4">

                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-cyan-500/10 text-lg font-black text-cyan-300">
                              {week.week}
                            </div>

                            <div>

                              <p className="text-xs font-bold uppercase tracking-wide text-cyan-400">
                                Week {week.week}
                              </p>

                              <h4 className="mt-1 text-xl font-black">
                                {week.title}
                              </h4>

                              <p className="mt-2 text-sm text-slate-400">
                                Focus:{' '}
                                <span className="font-semibold text-slate-300">
                                  {week.focus}
                                </span>
                              </p>

                            </div>

                          </div>

                          <div className="flex items-center gap-3">

                            <span
                              className={`rounded-full border px-3 py-1 text-xs font-bold capitalize ${getPriorityStyle(
                                week.priority,
                              )}`}
                            >
                              {week.priority} priority
                            </span>

                            <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-bold text-slate-400">
                              {weekProgress}% complete
                            </span>

                          </div>

                        </div>

                        {/* WEEK PROGRESS */}

                        <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-800">

                          <div
                            className="h-full rounded-full bg-cyan-400 transition-all duration-500"
                            style={{
                              width: `${weekProgress}%`,
                            }}
                          />

                        </div>

                        {/* SKILLS */}

                        {week.skills &&
                          week.skills.length > 0 && (

                            <div className="mt-5">

                              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                                Skills
                              </p>

                              <div className="flex flex-wrap gap-2">

                                {week.skills.map(
                                  (skill) => (
                                    <span
                                      key={skill}
                                      className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-300"
                                    >
                                      {skill}
                                    </span>
                                  ),
                                )}

                              </div>

                            </div>

                          )}

                      </div>

                      {/* =========================================
                          TOPICS
                      ========================================= */}

                      <div className="border-b border-slate-800 p-6">

                        <h5 className="mb-4 font-bold">
                          📖 Topics to Learn
                        </h5>

                        {tasks.length > 0 ? (

                          <div className="flex flex-wrap gap-2">

                            {tasks.map(
                              (
                                task,
                                index,
                              ) => (
                                <span
                                  key={`${week.week}-topic-${index}`}
                                  className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-400"
                                >
                                  {task}
                                </span>
                              ),
                            )}

                          </div>

                        ) : (

                          <p className="text-sm text-slate-500">
                            No topics available.
                          </p>

                        )}

                      </div>

                      {/* =========================================
                          PROJECT + MILESTONE
                      ========================================= */}

                      <div className="grid gap-4 border-b border-slate-800 p-6 md:grid-cols-2">

                        <div>

                          <h5 className="mb-3 font-bold text-cyan-300">
                            🛠️ Mini Project
                          </h5>

                          <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">

                            <p className="text-sm leading-6 text-slate-400">
                              {week.project ||
                                'Complete a practical project related to this week.'}
                            </p>

                          </div>

                        </div>

                        <div>

                          <h5 className="mb-3 font-bold text-green-300">
                            🏆 Milestone
                          </h5>

                          <div className="rounded-xl border border-green-500/10 bg-green-500/5 p-4">

                            <p className="text-sm leading-6 text-slate-400">
                              {week.milestone ||
                                'Complete the learning objectives for this week.'}
                            </p>

                          </div>

                        </div>

                      </div>

                      {/* =========================================
                          LEARNING TASKS
                      ========================================= */}

                      <div className="p-6">

                        <h5 className="mb-4 font-bold">
                          ✅ Learning Tasks
                        </h5>

                        {tasks.length > 0 ? (

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
                                    key={key}
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
                  )
                },
              )}

            </div>

          )}

        </section>

        {/* ===================================================
            CONTINUE PREPARATION
        =================================================== */}

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
                  navigate('/interview')
                }
                className="rounded-xl bg-purple-600 px-5 py-3 text-sm font-bold transition hover:bg-purple-500"
              >
                🎤 Practice Interview
              </button>

              <button
                onClick={() =>
                  navigate('/coding')
                }
                className="rounded-xl bg-green-600 px-5 py-3 text-sm font-bold transition hover:bg-green-500"
              >
                💻 Practice Coding
              </button>

              <button
                onClick={() =>
                  navigate('/readiness')
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