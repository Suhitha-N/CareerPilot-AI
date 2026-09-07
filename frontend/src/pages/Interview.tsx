import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const API_BASE_URL = 'http://127.0.0.1:8001'

type Resume = {
  id: number
  file_name: string
  ats_score: number
}

type JobDescription = {
  id: number
  title: string
  company_name?: string | null
}

type InterviewQuestion = {
  id: number
  interview_id: number
  question: string
  category: string
  expected_answer?: string | null
  user_answer?: string | null
  score?: number | null
  feedback?: string | null
  created_at: string
}

type Interview = {
  id: number
  user_id: number
  resume_id: number
  job_description_id: number
  interview_type: string
  difficulty: string
  status: string
  score?: number | null
  started_at?: string | null
  completed_at?: string | null
  created_at: string
  questions: InterviewQuestion[]
}

type EvaluationResult = {
  question_id: number
  score: number
  feedback: string
}

type FeedbackReport = {
  interview_id: number
  interview_type: string
  difficulty: string
  status: string
  completed_at?: string | null
  total_questions: number
  overall_score: number
  technical_score: number
  problem_solving_score: number
  communication_score: number
  resume_score: number
  strengths: string[]
  weak_areas: string[]
  recommendations: string[]
  practice_priorities: string[]
}

function scoreLabel(score: number) {
  if (score >= 85) return 'Excellent'
  if (score >= 75) return 'Strong'
  if (score >= 60) return 'Good'
  if (score >= 40) return 'Needs Practice'
  return 'Needs Improvement'
}

function scoreRingClass(score: number) {
  if (score >= 85) return 'text-emerald-400'
  if (score >= 70) return 'text-cyan-400'
  if (score >= 50) return 'text-amber-400'
  return 'text-red-400'
}

function scoreBarClass(score: number) {
  if (score >= 85) return 'bg-emerald-400'
  if (score >= 70) return 'bg-cyan-400'
  if (score >= 50) return 'bg-amber-400'
  return 'bg-red-400'
}

function ScoreRing({
  score,
  size = 'large',
}: {
  score: number
  size?: 'small' | 'large'
}) {
  const radius = size === 'large' ? 58 : 38
  const stroke = size === 'large' ? 8 : 6
  const circumference = 2 * Math.PI * radius
  const progress = (Math.max(0, Math.min(100, score)) / 100) * circumference

  return (
    <div
      className={
        size === 'large'
          ? 'relative w-40 h-40'
          : 'relative w-24 h-24'
      }
    >
      <svg
        className="w-full h-full -rotate-90"
        viewBox="0 0 140 140"
      >
        <circle
          cx="70"
          cy="70"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-slate-800"
        />

        <circle
          cx="70"
          cy="70"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          className={`${scoreRingClass(score)} transition-all duration-1000`}
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className={
            size === 'large'
              ? `text-4xl font-bold ${scoreRingClass(score)}`
              : `text-2xl font-bold ${scoreRingClass(score)}`
          }
        >
          {score}
        </span>

        <span className="text-slate-500 text-xs">
          / 100
        </span>
      </div>
    </div>
  )
}

function Interview() {
  const navigate = useNavigate()

  const [resumes, setResumes] = useState<Resume[]>([])
  const [jobs, setJobs] = useState<JobDescription[]>([])

  const [resumeId, setResumeId] = useState('')
  const [jobId, setJobId] = useState('')
  const [interviewType, setInterviewType] = useState('technical')
  const [difficulty, setDifficulty] = useState('medium')

  const [interview, setInterview] = useState<Interview | null>(null)

  const [currentQuestionIndex, setCurrentQuestionIndex] =
    useState(0)

  const [answer, setAnswer] = useState('')

  const [evaluation, setEvaluation] =
    useState<EvaluationResult | null>(null)

  const [feedbackReport, setFeedbackReport] =
    useState<FeedbackReport | null>(null)

  const [loading, setLoading] = useState(false)
  const [starting, setStarting] = useState(false)
  const [loadingFeedback, setLoadingFeedback] = useState(false)

  const [error, setError] = useState('')

  const token = localStorage.getItem('access_token')

  useEffect(() => {
    if (!token) {
      navigate('/login')
      return
    }

    loadData()
  }, [token, navigate])

  async function loadData() {
    try {
      setLoading(true)
      setError('')

      const [resumeResponse, jobResponse] =
        await Promise.all([
          fetch(`${API_BASE_URL}/api/resumes`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }),

          fetch(`${API_BASE_URL}/api/job-descriptions`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }),
        ])

      if (!resumeResponse.ok) {
        throw new Error('Failed to load resumes.')
      }

      if (!jobResponse.ok) {
        throw new Error('Failed to load job descriptions.')
      }

      const resumeData = await resumeResponse.json()
      const jobData = await jobResponse.json()

      setResumes(resumeData)
      setJobs(jobData)

      if (resumeData.length > 0) {
        setResumeId(String(resumeData[0].id))
      }

      if (jobData.length > 0) {
        setJobId(String(jobData[0].id))
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Something went wrong.',
      )
    } finally {
      setLoading(false)
    }
  }

  async function startInterview() {
    if (!resumeId || !jobId) {
      setError(
        'Please select a resume and job description.',
      )
      return
    }

    try {
      setStarting(true)
      setError('')
      setFeedbackReport(null)

      const createResponse = await fetch(
        `${API_BASE_URL}/api/interviews`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            resume_id: Number(resumeId),
            job_description_id: Number(jobId),
            interview_type: interviewType,
            difficulty,
          }),
        },
      )

      if (!createResponse.ok) {
        const data = await createResponse.json()

        throw new Error(
          data.detail ||
            'Failed to create interview.',
        )
      }

      const createdInterview: Interview =
        await createResponse.json()

      const startResponse = await fetch(
        `${API_BASE_URL}/api/interviews/${createdInterview.id}/start`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      )

      if (!startResponse.ok) {
        const data = await startResponse.json()

        throw new Error(
          data.detail ||
            'Failed to start interview.',
        )
      }

      const startedInterview: Interview =
        await startResponse.json()

      setInterview(startedInterview)
      setCurrentQuestionIndex(0)
      setAnswer('')
      setEvaluation(null)
      setFeedbackReport(null)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to start interview.',
      )
    } finally {
      setStarting(false)
    }
  }

  async function submitAnswer() {
    if (!interview) return

    const currentQuestion =
      interview.questions[currentQuestionIndex]

    if (!currentQuestion) return

    if (!answer.trim()) {
      setError(
        'Please enter an answer before submitting.',
      )
      return
    }

    try {
      setLoading(true)
      setError('')

      const response = await fetch(
        `${API_BASE_URL}/api/interviews/${interview.id}/questions/${currentQuestion.id}/answer`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            answer: answer.trim(),
          }),
        },
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data.detail ||
            'Failed to evaluate answer.',
        )
      }

      setEvaluation(data)

      setInterview((previous) => {
        if (!previous) return previous

        const updatedQuestions =
          previous.questions.map(
            (question) =>
              question.id === currentQuestion.id
                ? {
                    ...question,
                    user_answer: answer.trim(),
                    score: data.score,
                    feedback: data.feedback,
                  }
                : question,
          )

        return {
          ...previous,
          questions: updatedQuestions,
        }
      })

      /*
       * Refresh the interview because the backend may have
       * generated a new adaptive question.
       */
      const interviewResponse = await fetch(
        `${API_BASE_URL}/api/interviews/${interview.id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      )

      if (interviewResponse.ok) {
        const refreshedInterview =
          await interviewResponse.json()

        setInterview(refreshedInterview)
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to submit answer.',
      )
    } finally {
      setLoading(false)
    }
  }

  async function nextQuestion() {
    if (!interview) return

    if (
      currentQuestionIndex <
      interview.questions.length - 1
    ) {
      setCurrentQuestionIndex(
        (previous) => previous + 1,
      )

      setAnswer('')
      setEvaluation(null)
      setError('')

      return
    }

    await completeInterview()
  }

  async function completeInterview() {
    if (!interview) return

    try {
      setLoading(true)
      setError('')

      const response = await fetch(
        `${API_BASE_URL}/api/interviews/${interview.id}/complete`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data.detail ||
            'Failed to complete interview.',
        )
      }

      setInterview(data)
      await loadFeedbackReport(data.id)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to complete interview.',
      )
    } finally {
      setLoading(false)
    }
  }

  async function loadFeedbackReport(
    interviewId: number,
  ) {
    try {
      setLoadingFeedback(true)

      const response = await fetch(
        `${API_BASE_URL}/api/interviews/${interviewId}/feedback`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data.detail ||
            'Failed to load interview feedback.',
        )
      }

      setFeedbackReport(data)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to load feedback report.',
      )
    } finally {
      setLoadingFeedback(false)
    }
  }

  function resetInterview() {
    setInterview(null)
    setCurrentQuestionIndex(0)
    setAnswer('')
    setEvaluation(null)
    setFeedbackReport(null)
    setError('')
  }

  function practiceWeakAreas() {
    resetInterview()

    setTimeout(() => {
      const weak =
        feedbackReport?.practice_priorities?.[0]

      if (weak) {
        setError(
          `Recommended focus: ${weak}. Start a new interview and choose a higher difficulty after reviewing this area.`,
        )
      }
    }, 0)
  }

  const currentQuestion =
    interview?.questions[currentQuestionIndex] ??
    null

  const answeredCount = useMemo(() => {
    if (!interview) return 0

    return interview.questions.filter(
      (question) =>
        question.user_answer !== null &&
        question.user_answer !== undefined,
    ).length
  }, [interview])

  /*
   * ==========================================================
   * LOADING
   * ==========================================================
   */

  if (
    loading &&
    !interview &&
    resumes.length === 0 &&
    jobs.length === 0
  ) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />

          <p className="text-slate-400">
            Loading interview setup...
          </p>
        </div>
      </div>
    )
  }

  /*
   * ==========================================================
   * COMPLETED — AI FEEDBACK REPORT
   * ==========================================================
   */

  if (interview?.status === 'completed') {
    const report = feedbackReport

    return (
      <div className="min-h-screen bg-slate-950 text-white overflow-x-hidden">
        {/* Background */}
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute -top-32 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
          <div className="absolute top-1/2 right-0 w-80 h-80 bg-violet-500/10 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 py-8">

          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-10">
            <div>
              <p className="text-cyan-400 text-sm font-semibold tracking-[0.2em]">
                CAREERPILOT AI
              </p>

              <h1 className="text-3xl md:text-5xl font-bold mt-2">
                Interview Performance Report
              </h1>

              <p className="text-slate-400 mt-3">
                Your personalized AI-powered interview analysis
                is ready.
              </p>
            </div>

            <button
              onClick={() =>
                navigate('/dashboard')
              }
              className="px-5 py-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition"
            >
              ← Dashboard
            </button>
          </div>

          {error && (
            <div className="mb-6 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 px-5 py-4">
              {error}
            </div>
          )}

          {loadingFeedback && (
            <div className="mb-6 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 px-5 py-4 text-indigo-300">
              Generating your interview intelligence report...
            </div>
          )}

          {!report ? (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-10 text-center">
              <div className="text-5xl mb-5">🤖</div>

              <h2 className="text-2xl font-bold">
                Feedback Report
              </h2>

              <p className="text-slate-400 mt-2 mb-7">
                Your interview is complete, but the detailed
                report could not be loaded yet.
              </p>

              <button
                onClick={() =>
                  loadFeedbackReport(interview.id)
                }
                className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-semibold"
              >
                Generate Report
              </button>
            </div>
          ) : (
            <>
              {/* ==================================================
                  HERO SCORE
                 ================================================== */}

              <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-6 mb-8">

                {/* Main score */}
                <div className="relative overflow-hidden bg-slate-900 border border-white/10 rounded-3xl p-8 md:p-10">
                  <div className="absolute top-0 right-0 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl" />

                  <div className="relative flex flex-col md:flex-row items-center gap-8">

                    <ScoreRing
                      score={report.overall_score}
                      size="large"
                    />

                    <div className="text-center md:text-left">
                      <p className="text-slate-400 text-sm uppercase tracking-wider">
                        Overall Interview Score
                      </p>

                      <h2 className="text-3xl md:text-4xl font-bold mt-2">
                        {scoreLabel(
                          report.overall_score,
                        )}
                      </h2>

                      <p className="text-slate-400 mt-3 max-w-xl">
                        Your score is calculated from your
                        evaluated answers across technical,
                        problem-solving, communication, and
                        resume-focused questions.
                      </p>

                      <div className="flex flex-wrap justify-center md:justify-start gap-3 mt-5">
                        <span className="px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-sm">
                          {report.total_questions} Questions
                        </span>

                        <span className="px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-sm capitalize">
                          {report.difficulty}
                        </span>

                        <span className="px-3 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 text-sm capitalize">
                          {report.interview_type}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick stats */}
                <div className="grid grid-cols-2 gap-4">

                  <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
                    <p className="text-slate-500 text-sm">
                      Questions
                    </p>

                    <p className="text-4xl font-bold mt-3">
                      {report.total_questions}
                    </p>

                    <p className="text-slate-400 text-sm mt-2">
                      Evaluated responses
                    </p>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
                    <p className="text-slate-500 text-sm">
                      Status
                    </p>

                    <p className="text-2xl font-bold mt-3 text-emerald-400">
                      Completed
                    </p>

                    <p className="text-slate-400 text-sm mt-2">
                      Interview finished
                    </p>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
                    <p className="text-slate-500 text-sm">
                      Strongest Area
                    </p>

                    <p className="text-xl font-bold mt-3">
                      {[
                        ['Technical', report.technical_score],
                        ['Problem Solving', report.problem_solving_score],
                        ['Communication', report.communication_score],
                        ['Resume', report.resume_score],
                      ].sort(
                        (a, b) =>
                          Number(b[1]) -
                          Number(a[1]),
                      )[0]?.[0] ?? '—'}
                    </p>

                    <p className="text-slate-400 text-sm mt-2">
                      Best-performing category
                    </p>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
                    <p className="text-slate-500 text-sm">
                      Focus Area
                    </p>

                    <p className="text-xl font-bold mt-3 text-amber-400">
                      {report.practice_priorities[0] ??
                        'Keep practicing'}
                    </p>

                    <p className="text-slate-400 text-sm mt-2">
                      Highest-value improvement
                    </p>
                  </div>
                </div>
              </div>

              {/* ==================================================
                  CATEGORY PERFORMANCE
                 ================================================== */}

              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-7 md:p-8 mb-8">

                <div className="flex items-center justify-between mb-7">
                  <div>
                    <p className="text-indigo-400 text-sm font-semibold">
                      PERFORMANCE BREAKDOWN
                    </p>

                    <h2 className="text-2xl font-bold mt-1">
                      Category Performance
                    </h2>
                  </div>

                  <span className="text-slate-500 text-sm">
                    AI analysis
                  </span>
                </div>

                <div className="grid md:grid-cols-2 gap-6">

                  {[
                    {
                      name: 'Technical Knowledge',
                      score: report.technical_score,
                      icon: '💻',
                      description:
                        'Technical concepts and role-specific knowledge',
                    },
                    {
                      name: 'Problem Solving',
                      score: report.problem_solving_score,
                      icon: '🧠',
                      description:
                        'Reasoning, debugging and analytical thinking',
                    },
                    {
                      name: 'Communication',
                      score: report.communication_score,
                      icon: '🎤',
                      description:
                        'Clarity, confidence and answer structure',
                    },
                    {
                      name: 'Resume & Projects',
                      score: report.resume_score,
                      icon: '📄',
                      description:
                        'Ability to explain projects and experience',
                    },
                  ].map((item) => (
                    <div
                      key={item.name}
                      className="rounded-2xl bg-slate-800/60 border border-slate-700/60 p-5"
                    >
                      <div className="flex items-center gap-4">

                        <div className="text-3xl">
                          {item.icon}
                        </div>

                        <div className="flex-1">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <h3 className="font-semibold">
                                {item.name}
                              </h3>

                              <p className="text-xs text-slate-500 mt-1">
                                {item.description}
                              </p>
                            </div>

                            <span
                              className={`font-bold ${scoreRingClass(
                                item.score,
                              )}`}
                            >
                              {item.score}
                            </span>
                          </div>

                          <div className="mt-4 h-2 rounded-full bg-slate-700 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${scoreBarClass(
                                item.score,
                              )} transition-all duration-1000`}
                              style={{
                                width: `${item.score}%`,
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ==================================================
                  STRENGTHS + WEAK AREAS
                 ================================================== */}

              <div className="grid lg:grid-cols-2 gap-6 mb-8">

                {/* Strengths */}
                <div className="bg-slate-900 border border-emerald-500/10 rounded-3xl p-7">

                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-11 h-11 rounded-xl bg-emerald-500/10 flex items-center justify-center text-xl">
                      💪
                    </div>

                    <div>
                      <h2 className="text-xl font-bold">
                        Your Strengths
                      </h2>

                      <p className="text-slate-500 text-sm">
                        What you did well
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {report.strengths.length > 0 ? (
                      report.strengths.map(
                        (strength, index) => (
                          <div
                            key={index}
                            className="flex gap-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10 p-4"
                          >
                            <span className="text-emerald-400">
                              ✓
                            </span>

                            <p className="text-slate-300 text-sm leading-relaxed">
                              {strength}
                            </p>
                          </div>
                        ),
                      )
                    ) : (
                      <p className="text-slate-500">
                        Keep practicing to build stronger
                        interview patterns.
                      </p>
                    )}
                  </div>
                </div>

                {/* Weak Areas */}
                <div className="bg-slate-900 border border-amber-500/10 rounded-3xl p-7">

                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-11 h-11 rounded-xl bg-amber-500/10 flex items-center justify-center text-xl">
                      🎯
                    </div>

                    <div>
                      <h2 className="text-xl font-bold">
                        Improvement Areas
                      </h2>

                      <p className="text-slate-500 text-sm">
                        Where you can improve
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {report.weak_areas.length > 0 ? (
                      report.weak_areas.map(
                        (area, index) => (
                          <div
                            key={index}
                            className="flex gap-3 rounded-xl bg-amber-500/5 border border-amber-500/10 p-4"
                          >
                            <span className="text-amber-400">
                              !
                            </span>

                            <p className="text-slate-300 text-sm leading-relaxed">
                              {area}
                            </p>
                          </div>
                        ),
                      )
                    ) : (
                      <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/10 p-4 text-emerald-300 text-sm">
                        No major weak area detected.
                        Excellent consistency!
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ==================================================
                  RECOMMENDATIONS
                 ================================================== */}

              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-7 md:p-8 mb-8">

                <div className="mb-7">
                  <p className="text-cyan-400 text-sm font-semibold">
                    AI COACHING
                  </p>

                  <h2 className="text-2xl font-bold mt-1">
                    Personalized Recommendations
                  </h2>

                  <p className="text-slate-500 mt-2">
                    Follow these actions to improve your next
                    interview.
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  {report.recommendations.map(
                    (recommendation, index) => (
                      <div
                        key={index}
                        className="flex gap-4 p-5 rounded-2xl bg-slate-800/70 border border-slate-700"
                      >
                        <div className="w-9 h-9 shrink-0 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center font-bold">
                          {index + 1}
                        </div>

                        <p className="text-slate-300 leading-relaxed text-sm">
                          {recommendation}
                        </p>
                      </div>
                    ),
                  )}
                </div>
              </div>

              {/* ==================================================
                  PRACTICE PRIORITIES
                 ================================================== */}

              <div className="bg-gradient-to-br from-indigo-500/10 via-slate-900 to-cyan-500/10 border border-indigo-500/20 rounded-3xl p-7 md:p-8 mb-8">

                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">

                  <div>
                    <p className="text-indigo-300 text-sm font-semibold">
                      NEXT PRACTICE SESSION
                    </p>

                    <h2 className="text-2xl font-bold mt-1">
                      Focus on Your Weakest Areas
                    </h2>

                    <p className="text-slate-400 mt-2 max-w-2xl">
                      Your next interview should prioritize
                      the areas where your current performance
                      is lowest.
                    </p>
                  </div>

                  <button
                    onClick={practiceWeakAreas}
                    className="shrink-0 px-6 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 transition font-semibold shadow-lg shadow-indigo-500/20"
                  >
                    Practice Weak Areas →
                  </button>
                </div>

                <div className="flex flex-wrap gap-3 mt-6">
                  {report.practice_priorities.map(
                    (priority, index) => (
                      <div
                        key={priority}
                        className="px-4 py-2 rounded-full bg-slate-900/80 border border-slate-700 text-sm"
                      >
                        <span className="text-indigo-400 font-semibold mr-2">
                          #{index + 1}
                        </span>

                        {priority}
                      </div>
                    ),
                  )}
                </div>
              </div>

              {/* ==================================================
                  QUESTION REVIEW
                 ================================================== */}

              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-7 md:p-8 mb-8">

                <div className="mb-7">
                  <p className="text-violet-400 text-sm font-semibold">
                    ANSWER REVIEW
                  </p>

                  <h2 className="text-2xl font-bold mt-1">
                    Question-by-Question Analysis
                  </h2>
                </div>

                <div className="space-y-4">
                  {interview.questions.map(
                    (question, index) => (
                      <details
                        key={question.id}
                        className="group rounded-2xl bg-slate-800/60 border border-slate-700 overflow-hidden"
                      >
                        <summary className="cursor-pointer list-none p-5">
                          <div className="flex items-center gap-4">

                            <div
                              className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center font-bold ${
                                (question.score ?? 0) >= 75
                                  ? 'bg-emerald-500/10 text-emerald-400'
                                  : (question.score ?? 0) >= 50
                                    ? 'bg-amber-500/10 text-amber-400'
                                    : 'bg-red-500/10 text-red-400'
                              }`}
                            >
                              {index + 1}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2 mb-1">
                                <span className="text-xs text-indigo-300 bg-indigo-500/10 px-2 py-1 rounded-full">
                                  {question.category}
                                </span>
                              </div>

                              <p className="font-medium text-slate-200">
                                {question.question}
                              </p>
                            </div>

                            <div className="text-right">
                              <p
                                className={`text-xl font-bold ${scoreRingClass(
                                  question.score ?? 0,
                                )}`}
                              >
                                {question.score ?? 0}
                              </p>

                              <p className="text-xs text-slate-500">
                                score
                              </p>
                            </div>
                          </div>
                        </summary>

                        <div className="border-t border-slate-700 p-5 space-y-4">

                          <div>
                            <p className="text-xs uppercase tracking-wider text-slate-500 mb-2">
                              Your Answer
                            </p>

                            <p className="text-slate-300 text-sm leading-relaxed">
                              {question.user_answer ||
                                'No answer recorded.'}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs uppercase tracking-wider text-slate-500 mb-2">
                              AI Feedback
                            </p>

                            <p className="text-slate-300 text-sm leading-relaxed">
                              {question.feedback ||
                                'No feedback available.'}
                            </p>
                          </div>
                        </div>
                      </details>
                    ),
                  )}
                </div>
              </div>

              {/* ==================================================
                  FINAL ACTIONS
                 ================================================== */}

              <div className="flex flex-col sm:flex-row justify-center gap-4 pb-10">

                <button
                  onClick={resetInterview}
                  className="px-7 py-3.5 rounded-xl bg-white text-slate-950 font-semibold hover:bg-slate-200 transition"
                >
                  Start Another Interview
                </button>

                <button
                  onClick={() =>
                    navigate('/readiness')
                  }
                  className="px-7 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 transition font-semibold"
                >
                  View Placement Readiness
                </button>

                <button
                  onClick={() =>
                    navigate('/dashboard')
                  }
                  className="px-7 py-3.5 rounded-xl border border-slate-700 hover:bg-slate-800 transition font-semibold"
                >
                  Dashboard
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    )
  }

  /*
   * ==========================================================
   * ACTIVE INTERVIEW
   * ==========================================================
   */

  if (interview && currentQuestion) {
    const progress =
      ((currentQuestionIndex + 1) /
        interview.questions.length) *
      100

    return (
      <div className="min-h-screen bg-slate-950 text-white">
        <div className="max-w-5xl mx-auto px-6 py-8">

          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <button
              onClick={() =>
                navigate('/dashboard')
              }
              className="text-slate-300 hover:text-white transition"
            >
              ← Dashboard
            </button>

            <div className="flex items-center gap-3 text-sm">
              <span className="px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-300">
                {interview.interview_type}
              </span>

              <span className="text-slate-500">
                •
              </span>

              <span className="text-slate-400 capitalize">
                {interview.difficulty}
              </span>
            </div>
          </div>

          {/* Progress */}
          <div className="mb-8">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-slate-300">
                Question {currentQuestionIndex + 1} of{' '}
                {interview.questions.length}
              </span>

              <span className="text-slate-400">
                {Math.round(progress)}%
              </span>
            </div>

            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 transition-all duration-500"
                style={{
                  width: `${progress}%`,
                }}
              />
            </div>
          </div>

          {/* Interview card */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl">

            <div className="flex flex-wrap items-center gap-3 mb-6">
              <span className="px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-300 text-sm">
                {currentQuestion.category}
              </span>

              <span className="text-slate-500 text-sm">
                Question #{currentQuestion.id}
              </span>

              <span className="ml-auto text-xs text-slate-500">
                {answeredCount} answered
              </span>
            </div>

            <h1 className="text-2xl md:text-3xl font-bold leading-relaxed mb-8">
              {currentQuestion.question}
            </h1>

            {!evaluation ? (
              <>
                <textarea
                  value={answer}
                  onChange={(event) =>
                    setAnswer(event.target.value)
                  }
                  placeholder="Type your answer here..."
                  rows={10}
                  className="w-full rounded-2xl bg-slate-800 border border-slate-700 px-5 py-4 text-white placeholder-slate-500 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 resize-none transition"
                />

                {error && (
                  <div className="mt-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 px-4 py-3">
                    {error}
                  </div>
                )}

                <div className="flex justify-end mt-6">
                  <button
                    onClick={submitAnswer}
                    disabled={loading}
                    className="px-7 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 font-semibold transition"
                  >
                    {loading
                      ? 'Evaluating...'
                      : 'Submit Answer'}
                  </button>
                </div>
              </>
            ) : (
              <div className="space-y-6">

                {/* User answer */}
                <div className="rounded-2xl bg-slate-800 p-6">
                  <p className="text-slate-400 text-sm mb-2">
                    Your Answer
                  </p>

                  <p className="text-slate-200 leading-relaxed whitespace-pre-wrap">
                    {answer}
                  </p>
                </div>

                {/* AI evaluation */}
                <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-6">

                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-indigo-300 text-sm font-semibold">
                        AI EVALUATION
                      </p>

                      <h2 className="text-xl font-semibold mt-1">
                        Answer Feedback
                      </h2>
                    </div>

                    <div
                      className={`text-3xl font-bold ${scoreRingClass(
                        evaluation.score,
                      )}`}
                    >
                      {evaluation.score}/100
                    </div>
                  </div>

                  <p className="text-slate-300 leading-relaxed">
                    {evaluation.feedback}
                  </p>
                </div>

                {error && (
                  <div className="rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 px-4 py-3">
                    {error}
                  </div>
                )}

                <div className="flex justify-end">
                  <button
                    onClick={nextQuestion}
                    disabled={loading}
                    className="px-7 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 font-semibold transition"
                  >
                    {currentQuestionIndex <
                    interview.questions.length - 1
                      ? 'Next Question →'
                      : 'Complete Interview'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  /*
   * ==========================================================
   * SETUP SCREEN
   * ==========================================================
   */

  return (
    <div className="min-h-screen bg-slate-950 text-white overflow-hidden">

      {/* Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />

        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-10">

        <button
          onClick={() =>
            navigate('/dashboard')
          }
          className="mb-8 text-slate-300 hover:text-white transition"
        >
          ← Back to Dashboard
        </button>

        {/* Hero */}
        <div className="mb-10">

          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-sm mb-5">
            <span>🤖</span>
            Adaptive AI Interview
          </div>

          <h1 className="text-4xl md:text-6xl font-bold mb-4">
            AI Mock Interview
          </h1>

          <p className="text-slate-400 text-lg max-w-3xl">
            Practice personalized interview questions based
            on your resume, target role, skills, and
            performance.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 px-4 py-3">
            {error}
          </div>
        )}

        {/* Feature cards */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">

          <div className="rounded-2xl bg-slate-900/70 border border-slate-800 p-5">
            <div className="text-2xl mb-3">
              🎯
            </div>

            <h3 className="font-semibold">
              Personalized
            </h3>

            <p className="text-sm text-slate-500 mt-1">
              Questions adapt to your target job and skills.
            </p>
          </div>

          <div className="rounded-2xl bg-slate-900/70 border border-slate-800 p-5">
            <div className="text-2xl mb-3">
              🧠
            </div>

            <h3 className="font-semibold">
              Adaptive Difficulty
            </h3>

            <p className="text-sm text-slate-500 mt-1">
              Strong answers unlock harder questions.
            </p>
          </div>

          <div className="rounded-2xl bg-slate-900/70 border border-slate-800 p-5">
            <div className="text-2xl mb-3">
              📊
            </div>

            <h3 className="font-semibold">
              AI Performance Report
            </h3>

            <p className="text-sm text-slate-500 mt-1">
              Get strengths, weaknesses and next actions.
            </p>
          </div>
        </div>

        {/* Setup */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl">

          <div className="mb-8">
            <h2 className="text-2xl font-bold">
              Configure Your Interview
            </h2>

            <p className="text-slate-500 mt-2">
              Select the resume and role you want to practice
              for.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">

            {/* Resume */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Resume
              </label>

              <select
                value={resumeId}
                onChange={(event) =>
                  setResumeId(event.target.value)
                }
                className="w-full rounded-xl bg-slate-800 border border-slate-700 px-4 py-3 text-white outline-none focus:border-indigo-500 transition"
              >
                <option value="">
                  Select a resume
                </option>

                {resumes.map((resume) => (
                  <option
                    key={resume.id}
                    value={resume.id}
                  >
                    {resume.file_name} — ATS{' '}
                    {resume.ats_score}
                  </option>
                ))}
              </select>
            </div>

            {/* Job */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Target Job
              </label>

              <select
                value={jobId}
                onChange={(event) =>
                  setJobId(event.target.value)
                }
                className="w-full rounded-xl bg-slate-800 border border-slate-700 px-4 py-3 text-white outline-none focus:border-indigo-500 transition"
              >
                <option value="">
                  Select a job
                </option>

                {jobs.map((job) => (
                  <option
                    key={job.id}
                    value={job.id}
                  >
                    {job.title}
                    {job.company_name
                      ? ` — ${job.company_name}`
                      : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Interview type */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Interview Type
              </label>

              <select
                value={interviewType}
                onChange={(event) =>
                  setInterviewType(
                    event.target.value,
                  )
                }
                className="w-full rounded-xl bg-slate-800 border border-slate-700 px-4 py-3 text-white outline-none focus:border-indigo-500 transition"
              >
                <option value="technical">
                  Technical
                </option>

                <option value="hr">
                  HR
                </option>

                <option value="mixed">
                  Mixed
                </option>

                <option value="behavioral">
                  Behavioral
                </option>
              </select>
            </div>

            {/* Difficulty */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Starting Difficulty
              </label>

              <select
                value={difficulty}
                onChange={(event) =>
                  setDifficulty(
                    event.target.value,
                  )
                }
                className="w-full rounded-xl bg-slate-800 border border-slate-700 px-4 py-3 text-white outline-none focus:border-indigo-500 transition"
              >
                <option value="easy">
                  Easy
                </option>

                <option value="medium">
                  Medium
                </option>

                <option value="hard">
                  Hard
                </option>

                <option value="advanced">
                  Advanced
                </option>
              </select>
            </div>
          </div>

          {/* Warnings */}
          {resumes.length === 0 && (
            <div className="mt-6 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-300 px-4 py-3">
              Please upload a resume before starting an
              interview.
            </div>
          )}

          {jobs.length === 0 && (
            <div className="mt-3 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-300 px-4 py-3">
              Please create a job description before
              starting an interview.
            </div>
          )}

          {/* Start */}
          <div className="flex justify-end mt-8">

            <button
              onClick={startInterview}
              disabled={
                starting ||
                !resumeId ||
                !jobId
              }
              className="px-8 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 font-semibold transition shadow-lg shadow-indigo-500/20"
            >
              {starting
                ? 'Starting Interview...'
                : 'Start Adaptive Interview →'}
            </button>

          </div>
        </div>
      </div>
    </div>
  )
}

export default Interview