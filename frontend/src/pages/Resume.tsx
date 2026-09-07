import { useState } from 'react'
import type { ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'

type Analysis = {
  summary?: string | string[]
  skills?: Record<string, unknown> | string[]
  projects?: unknown[]
  experience?: unknown[]
  education?: unknown
  certifications?: unknown
  achievements?: unknown
}

type ResumeResult = {
  message: string
  resume_id: number
  profile_id: number
  file_name: string
  file_type: string
  ats_score: number
  ats_breakdown: Record<string, number>
  ats_suggestions: string[]
  analysis: Analysis
}

function Resume() {
  const navigate = useNavigate()

  const [file, setFile] = useState<File | null>(null)
  const [result, setResult] = useState<ResumeResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0] ?? null

    setError('')
    setResult(null)

    if (!selectedFile) {
      setFile(null)
      return
    }

    const extension = selectedFile.name
      .substring(selectedFile.name.lastIndexOf('.'))
      .toLowerCase()

    if (!['.pdf', '.docx'].includes(extension)) {
      setFile(null)
      setError('Only PDF and DOCX files are supported.')
      return
    }

    if (selectedFile.size > 5 * 1024 * 1024) {
      setFile(null)
      setError('File size must be 5 MB or less.')
      return
    }

    setFile(selectedFile)
  }

  const handleUpload = async () => {
    const token = localStorage.getItem('access_token')

    if (!token) {
      navigate('/login')
      return
    }

    if (!file) {
      setError('Please select a resume first.')
      return
    }

    setLoading(true)
    setError('')
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch(
        'http://127.0.0.1:8001/api/resumes/upload',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        },
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data.detail || 'Unable to analyze resume.',
        )
      }

      setResult(data)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Something went wrong while analyzing the resume.',
      )
    } finally {
      setLoading(false)
    }
  }

  const renderValue = (value: unknown): string => {
    if (typeof value === 'string') {
      return value
    }

    if (Array.isArray(value)) {
      return value
        .map((item) =>
          typeof item === 'string'
            ? item
            : JSON.stringify(item),
        )
        .join(', ')
    }

    if (value && typeof value === 'object') {
      return Object.entries(value as Record<string, unknown>)
        .map(([key, item]) => `${key}: ${renderValue(item)}`)
        .join(' • ')
    }

    return 'Not detected'
  }

  const renderList = (value: unknown) => {
    if (!value) {
      return (
        <p className="text-sm text-slate-500">
          No information detected.
        </p>
      )
    }

    if (Array.isArray(value)) {
      return (
        <div className="space-y-3">
          {value.map((item, index) => (
            <div
              key={index}
              className="rounded-xl border border-slate-800 bg-slate-950 p-4"
            >
              <p className="text-sm leading-6 text-slate-300">
                {renderValue(item)}
              </p>
            </div>
          ))}
        </div>
      )
    }

    return (
      <p className="text-sm leading-7 text-slate-300">
        {renderValue(value)}
      </p>
    )
  }

  const getScoreLabel = (score: number) => {
    if (score >= 85) return 'Excellent'
    if (score >= 70) return 'Strong'
    if (score >= 50) return 'Needs Improvement'
    return 'Weak'
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">

      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/80">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">

          <div>
            <h1 className="text-xl font-bold">
              CareerPilot AI
            </h1>

            <p className="text-xs text-slate-400">
              Resume Intelligence
            </p>
          </div>

          <button
            onClick={() => navigate('/dashboard')}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:bg-slate-800"
          >
            ← Dashboard
          </button>

        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-10">

        {/* Title */}
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-wider text-blue-400">
            AI Resume Intelligence
          </p>

          <h2 className="mt-2 text-4xl font-bold">
            Analyze your resume
          </h2>

          <p className="mt-3 max-w-2xl text-slate-400">
            Upload your resume and let CareerPilot AI extract your
            profile, evaluate ATS readiness, and identify areas for
            improvement.
          </p>
        </div>

        {/* Upload Card */}
        <section className="rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">

          <div className="grid gap-8 lg:grid-cols-2">

            <div>
              <h3 className="text-xl font-semibold">
                Upload Resume
              </h3>

              <p className="mt-2 text-sm text-slate-400">
                Supported formats: PDF and DOCX
              </p>

              <label className="mt-6 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-700 bg-slate-950 px-6 py-12 text-center transition hover:border-blue-500 hover:bg-slate-900">

                <div className="text-5xl">
                  📄
                </div>

                <p className="mt-4 font-semibold">
                  {file
                    ? file.name
                    : 'Choose your resume'}
                </p>

                <p className="mt-2 text-sm text-slate-500">
                  Click here to browse your files
                </p>

                <input
                  type="file"
                  accept=".pdf,.docx"
                  onChange={handleFileChange}
                  className="hidden"
                />

              </label>

              {file && (
                <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">
                        {file.name}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>

                    <span className="rounded-full bg-green-500/10 px-3 py-1 text-xs text-green-400">
                      Ready
                    </span>
                  </div>
                </div>
              )}

              {error && (
                <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
                  {error}
                </div>
              )}

              <button
                onClick={handleUpload}
                disabled={!file || loading}
                className="mt-6 w-full rounded-xl bg-blue-600 px-5 py-3 font-semibold transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading
                  ? 'Analyzing Resume...'
                  : 'Analyze Resume with AI'}
              </button>
            </div>

            {/* Features */}
            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-6">

              <h3 className="text-lg font-semibold">
                What CareerPilot AI analyzes
              </h3>

              <div className="mt-6 space-y-4">

                {[
                  ['📊', 'ATS Score', 'Measure resume readiness.'],
                  ['🧠', 'Skills', 'Extract technical and professional skills.'],
                  ['💼', 'Projects', 'Identify projects and experience.'],
                  ['🎓', 'Education', 'Extract educational background.'],
                  ['🏆', 'Certifications', 'Detect certifications and achievements.'],
                  ['💡', 'Suggestions', 'Find areas that can be improved.'],
                ].map(([icon, title, description]) => (
                  <div
                    key={title}
                    className="flex gap-4 rounded-xl border border-slate-800 bg-slate-900 p-4"
                  >
                    <div className="text-2xl">
                      {icon}
                    </div>

                    <div>
                      <p className="font-medium">
                        {title}
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        {description}
                      </p>
                    </div>
                  </div>
                ))}

              </div>

            </div>

          </div>

        </section>

        {/* Results */}
        {result && (
          <section className="mt-10 space-y-6">

            {/* Result Header */}
            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-8">

              <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">

                <div>
                  <p className="text-sm text-slate-400">
                    Analysis complete
                  </p>

                  <h3 className="mt-2 text-2xl font-bold">
                    {result.file_name}
                  </h3>

                  <p className="mt-2 text-sm text-green-400">
                    ✓ Resume successfully analyzed
                  </p>
                </div>

                <div className="text-center">

                  <div className="flex h-32 w-32 items-center justify-center rounded-full border-8 border-blue-500/30 bg-slate-950">

                    <div>
                      <p className="text-4xl font-bold text-blue-400">
                        {result.ats_score}
                      </p>

                      <p className="text-xs text-slate-500">
                        / 100
                      </p>
                    </div>

                  </div>

                  <p className="mt-3 font-semibold">
                    {getScoreLabel(result.ats_score)}
                  </p>

                  <p className="text-xs text-slate-500">
                    ATS Resume Score
                  </p>

                </div>

              </div>

            </div>

            {/* ATS Breakdown */}
            {result.ats_breakdown &&
              Object.keys(result.ats_breakdown).length > 0 && (
                <div className="rounded-3xl border border-slate-800 bg-slate-900 p-8">

                  <h3 className="text-xl font-semibold">
                    ATS Score Breakdown
                  </h3>

                  <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">

                    {Object.entries(result.ats_breakdown).map(
                      ([key, value]) => (
                        <div
                          key={key}
                          className="rounded-2xl border border-slate-800 bg-slate-950 p-5"
                        >
                          <div className="flex justify-between">

                            <p className="text-sm capitalize text-slate-400">
                              {key.replace(/_/g, ' ')}
                            </p>

                            <p className="font-bold text-blue-400">
                              {value}
                            </p>

                          </div>

                          <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-800">
                            <div
                              className="h-full rounded-full bg-blue-500"
                              style={{
                                width: `${Math.min(
                                  Math.max(Number(value), 0),
                                  100,
                                )}%`,
                              }}
                            />
                          </div>

                        </div>
                      ),
                    )}

                  </div>

                </div>
              )}

            {/* Suggestions */}
            {result.ats_suggestions?.length > 0 && (
              <div className="rounded-3xl border border-slate-800 bg-slate-900 p-8">

                <h3 className="text-xl font-semibold">
                  💡 Improvement Suggestions
                </h3>

                <div className="mt-5 space-y-3">

                  {result.ats_suggestions.map(
                    (suggestion, index) => (
                      <div
                        key={index}
                        className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-4 text-sm text-slate-300"
                      >
                        <span className="mr-2 font-bold text-yellow-400">
                          {index + 1}.
                        </span>

                        {suggestion}
                      </div>
                    ),
                  )}

                </div>

              </div>
            )}

            {/* Profile */}
            <div className="grid gap-6 lg:grid-cols-2">

              {/* Summary */}
              <div className="rounded-3xl border border-slate-800 bg-slate-900 p-7">

                <h3 className="text-xl font-semibold">
                  🧠 Professional Summary
                </h3>

                <div className="mt-5">
                  {renderList(result.analysis?.summary)}
                </div>

              </div>

              {/* Skills */}
              <div className="rounded-3xl border border-slate-800 bg-slate-900 p-7">

                <h3 className="text-xl font-semibold">
                  ⚡ Detected Skills
                </h3>

                <div className="mt-5">
                  {result.analysis?.skills ? (
                    <div className="flex flex-wrap gap-2">

                      {Array.isArray(result.analysis.skills)
                        ? result.analysis.skills.map(
                            (skill, index) => (
                              <span
                                key={index}
                                className="rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1.5 text-sm text-blue-300"
                              >
                                {renderValue(skill)}
                              </span>
                            ),
                          )
                        : Object.entries(
                            result.analysis.skills,
                          ).flatMap(
                            ([category, skills]) => {
                              if (Array.isArray(skills)) {
                                return skills.map(
                                  (skill, index) => (
                                    <span
                                      key={`${category}-${index}`}
                                      className="rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1.5 text-sm text-blue-300"
                                    >
                                      {renderValue(skill)}
                                    </span>
                                  ),
                                )
                              }

                              return [
                                <span
                                  key={category}
                                  className="rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1.5 text-sm text-blue-300"
                                >
                                  {category}: {renderValue(skills)}
                                </span>,
                              ]
                            },
                          )}

                    </div>
                  ) : (
                    <p className="text-sm text-slate-500">
                      No skills detected.
                    </p>
                  )}
                </div>

              </div>

              {/* Projects */}
              <div className="rounded-3xl border border-slate-800 bg-slate-900 p-7">

                <h3 className="text-xl font-semibold">
                  💼 Projects
                </h3>

                <div className="mt-5">
                  {renderList(result.analysis?.projects)}
                </div>

              </div>

              {/* Experience */}
              <div className="rounded-3xl border border-slate-800 bg-slate-900 p-7">

                <h3 className="text-xl font-semibold">
                  🏢 Experience
                </h3>

                <div className="mt-5">
                  {renderList(result.analysis?.experience)}
                </div>

              </div>

              {/* Education */}
              <div className="rounded-3xl border border-slate-800 bg-slate-900 p-7">

                <h3 className="text-xl font-semibold">
                  🎓 Education
                </h3>

                <div className="mt-5">
                  {renderList(result.analysis?.education)}
                </div>

              </div>

              {/* Certifications */}
              <div className="rounded-3xl border border-slate-800 bg-slate-900 p-7">

                <h3 className="text-xl font-semibold">
                  🏆 Certifications
                </h3>

                <div className="mt-5">
                  {renderList(result.analysis?.certifications)}
                </div>

              </div>

              {/* Achievements */}
              <div className="rounded-3xl border border-slate-800 bg-slate-900 p-7 lg:col-span-2">

                <h3 className="text-xl font-semibold">
                  🚀 Achievements
                </h3>

                <div className="mt-5">
                  {renderList(result.analysis?.achievements)}
                </div>

              </div>

            </div>

          </section>
        )}

      </main>
    </div>
  )
}

export default Resume
