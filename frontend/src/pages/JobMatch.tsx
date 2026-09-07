import { useEffect, useState } from "react";

type JobDescription = {
  id: number;
  title: string;
  company_name: string | null;
};

type Resume = {
  id: number;
  file_name: string;
  ats_score: number;
};

type MatchResult = {
  overall_match_score: number;
  required_skill_match_score: number;
  preferred_skill_match_score: number;
  matched_skills: string[];
  missing_skills: string[];
  preferred_matched_skills: string[];
  preferred_missing_skills: string[];
  recommendations: string[];
};

type SkillGap = {
  skill: string;
  category: "critical" | "important" | "optional";
  priority: "high" | "medium" | "low";
  title?: string;
  duration?: string;
  reason: string;
  learning_action: string;
};

type RoadmapItem = {
  order: number;
  skill: string;
  category: string;
  priority: string;
  title: string;
  duration: string;
  topics: string[];
  project: string;
  milestone: string;
};

type AnalysisResponse = {
  job_description: JobDescription;
  resume: Resume;
  match: MatchResult;
  skill_gap_analysis: {
    total_gaps: number;
    critical_gap_count: number;
    important_gap_count: number;
    optional_gap_count: number;
    skill_gaps: SkillGap[];
    summary: string;
  };
  career_roadmap: {
    total_steps: number;
    roadmap: RoadmapItem[];
    summary: string;
  };
};

type ResumeOption = {
  id: number;
  file_name: string;
  ats_score: number;
};

const API_BASE_URL = "http://127.0.0.1:8001";

export default function JobMatch() {
  const [resumes, setResumes] = useState<ResumeOption[]>([]);
  const [resumeId, setResumeId] = useState("");
  const [title, setTitle] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [description, setDescription] = useState("");

  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);

  const [loadingResumes, setLoadingResumes] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);

  const [error, setError] = useState("");

  useEffect(() => {
    loadResumes();
  }, []);

  async function loadResumes() {
    setLoadingResumes(true);
    setError("");

    try {
      const token = localStorage.getItem("access_token");

      if (!token) {
        throw new Error("Please log in again.");
      }

      const response = await fetch(`${API_BASE_URL}/api/resumes`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Unable to load resumes.");
      }

      const data = await response.json();

      setResumes(Array.isArray(data) ? data : []);

      if (Array.isArray(data) && data.length > 0) {
        setResumeId(String(data[0].id));
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load resumes.",
      );
    } finally {
      setLoadingResumes(false);
    }
  }

  async function analyzeJob() {
    setError("");
    setAnalysis(null);

    if (!resumeId) {
      setError("Please select a resume.");
      return;
    }

    if (title.trim().length < 2) {
      setError("Please enter a valid job title.");
      return;
    }

    if (description.trim().length < 20) {
      setError("Please enter at least 20 characters of job description.");
      return;
    }

    setAnalyzing(true);

    try {
      const token = localStorage.getItem("access_token");

      if (!token) {
        throw new Error("Please log in again.");
      }

      const createResponse = await fetch(
        `${API_BASE_URL}/api/job-descriptions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            title: title.trim(),
            company_name: companyName.trim() || null,
            description_text: description.trim(),
          }),
        },
      );

      if (!createResponse.ok) {
        const data = await createResponse.json().catch(() => null);

        throw new Error(
          data?.detail || "Unable to analyze the job description.",
        );
      }

      const jobDescription = await createResponse.json();

      const matchResponse = await fetch(
        `${API_BASE_URL}/api/job-descriptions/${jobDescription.id}/match/${resumeId}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!matchResponse.ok) {
        const data = await matchResponse.json().catch(() => null);

        throw new Error(
          data?.detail || "Unable to match the resume with the job.",
        );
      }

      const result: AnalysisResponse = await matchResponse.json();

      setAnalysis(result);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while analyzing the job.",
      );
    } finally {
      setAnalyzing(false);
    }
  }

  function scoreLabel(score: number) {
    if (score >= 80) return "Excellent";
    if (score >= 60) return "Good";
    if (score >= 40) return "Needs Improvement";
    return "Low Match";
  }

  function categoryClass(category: string) {
    if (category === "critical") {
      return "bg-red-100 text-red-700";
    }

    if (category === "important") {
      return "bg-yellow-100 text-yellow-700";
    }

    return "bg-green-100 text-green-700";
  }

  function priorityClass(priority: string) {
    if (priority === "high") {
      return "bg-red-50 text-red-600";
    }

    if (priority === "medium") {
      return "bg-yellow-50 text-yellow-700";
    }

    return "bg-green-50 text-green-700";
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              CareerPilot AI
            </h1>
            <p className="text-sm text-slate-500">
              Intelligent Job Match Analysis
            </p>
          </div>

          <a
            href="/dashboard"
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
          >
            Dashboard
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-8 px-6 py-10">
        <section>
          <h2 className="text-3xl font-bold text-slate-900">
            Analyze Your Job Match
          </h2>

          <p className="mt-2 max-w-2xl text-slate-600">
            Compare your resume against a target job and discover the exact
            skills you need to become job-ready.
          </p>
        </section>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Select Resume
              </label>

              <select
                value={resumeId}
                onChange={(event) => setResumeId(event.target.value)}
                disabled={loadingResumes || analyzing}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              >
                <option value="">
                  {loadingResumes
                    ? "Loading resumes..."
                    : "Select a resume"}
                </option>

                {resumes.map((resume) => (
                  <option key={resume.id} value={resume.id}>
                    {resume.file_name} — ATS {resume.ats_score}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Job Title
              </label>

              <input
                type="text"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="e.g. Python Backend Developer"
                disabled={analyzing}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Company Name
              </label>

              <input
                type="text"
                value={companyName}
                onChange={(event) => setCompanyName(event.target.value)}
                placeholder="e.g. TechNova"
                disabled={analyzing}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Job Description
              </label>

              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Paste the complete job description here..."
                rows={9}
                disabled={analyzing}
                className="w-full resize-y rounded-xl border border-slate-300 px-4 py-3 text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={analyzeJob}
              disabled={analyzing || loadingResumes}
              className="rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {analyzing ? "Analyzing..." : "Analyze Job Match"}
            </button>
          </div>
        </section>

        {analysis && (
          <>
            <section className="grid gap-5 md:grid-cols-3">
              <div className="rounded-2xl bg-indigo-600 p-6 text-white shadow-sm">
                <p className="text-sm font-medium text-indigo-100">
                  Overall Match
                </p>

                <div className="mt-3 flex items-end gap-2">
                  <span className="text-5xl font-bold">
                    {analysis.match.overall_match_score}%
                  </span>
                </div>

                <p className="mt-2 text-sm text-indigo-100">
                  {scoreLabel(analysis.match.overall_match_score)}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-sm font-medium text-slate-500">
                  Required Skills
                </p>

                <p className="mt-3 text-4xl font-bold text-slate-900">
                  {analysis.match.required_skill_match_score}%
                </p>

                <p className="mt-2 text-sm text-slate-500">
                  Core job requirements matched
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-sm font-medium text-slate-500">
                  Resume ATS Score
                </p>

                <p className="mt-3 text-4xl font-bold text-slate-900">
                  {analysis.resume.ats_score}
                </p>

                <p className="mt-2 text-sm text-slate-500">
                  From your uploaded resume
                </p>
              </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-xl font-bold text-slate-900">
                  Skills You Have
                </h3>

                <div className="mt-5 flex flex-wrap gap-2">
                  {analysis.match.matched_skills.map((skill) => (
                    <span
                      key={skill}
                      className="rounded-full bg-green-100 px-3 py-1.5 text-sm font-medium text-green-700"
                    >
                      ✓ {skill}
                    </span>
                  ))}

                  {analysis.match.preferred_matched_skills.map((skill) => (
                    <span
                      key={`preferred-${skill}`}
                      className="rounded-full bg-blue-100 px-3 py-1.5 text-sm font-medium text-blue-700"
                    >
                      ✓ {skill}
                    </span>
                  ))}

                  {analysis.match.matched_skills.length === 0 &&
                    analysis.match.preferred_matched_skills.length === 0 && (
                      <p className="text-sm text-slate-500">
                        No matching skills identified.
                      </p>
                    )}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-xl font-bold text-slate-900">
                  Missing Skills
                </h3>

                <div className="mt-5 flex flex-wrap gap-2">
                  {analysis.match.missing_skills.map((skill) => (
                    <span
                      key={skill}
                      className="rounded-full bg-red-100 px-3 py-1.5 text-sm font-medium text-red-700"
                    >
                      ! {skill}
                    </span>
                  ))}

                  {analysis.match.preferred_missing_skills.map((skill) => (
                    <span
                      key={`preferred-missing-${skill}`}
                      className="rounded-full bg-yellow-100 px-3 py-1.5 text-sm font-medium text-yellow-700"
                    >
                      {skill}
                    </span>
                  ))}

                  {analysis.match.missing_skills.length === 0 &&
                    analysis.match.preferred_missing_skills.length === 0 && (
                      <p className="text-sm text-slate-500">
                        No skill gaps identified.
                      </p>
                    )}
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">
                    Skill Gap Analysis
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    {analysis.skill_gap_analysis.summary}
                  </p>
                </div>

                <div className="flex gap-2">
                  <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
                    {analysis.skill_gap_analysis.critical_gap_count} Critical
                  </span>

                  <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                    {analysis.skill_gap_analysis.optional_gap_count} Optional
                  </span>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                {analysis.skill_gap_analysis.skill_gaps.map((gap) => (
                  <div
                    key={gap.skill}
                    className="rounded-xl border border-slate-200 p-5"
                  >
                    <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                      <div>
                        <h4 className="text-lg font-bold text-slate-900">
                          {gap.skill}
                        </h4>

                        <p className="mt-1 text-sm text-slate-500">
                          {gap.reason}
                        </p>
                      </div>

                      <div className="flex gap-2">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${categoryClass(
                            gap.category,
                          )}`}
                        >
                          {gap.category}
                        </span>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${priorityClass(
                            gap.priority,
                          )}`}
                        >
                          {gap.priority} priority
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 rounded-lg bg-slate-50 p-4">
                      <p className="text-sm font-semibold text-slate-700">
                        Recommended Action
                      </p>

                      <p className="mt-1 text-sm leading-6 text-slate-600">
                        {gap.learning_action}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div>
                <h3 className="text-2xl font-bold text-slate-900">
                  Personalized Career Roadmap
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  {analysis.career_roadmap.summary}
                </p>
              </div>

              <div className="mt-8 space-y-6">
                {analysis.career_roadmap.roadmap.map((item) => (
                  <div
                    key={`${item.order}-${item.skill}`}
                    className="relative rounded-2xl border border-slate-200 p-6"
                  >
                    <div className="flex flex-col gap-5 md:flex-row">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-lg font-bold text-indigo-700">
                        {item.order}
                      </div>

                      <div className="flex-1">
                        <div className="flex flex-col justify-between gap-3 md:flex-row">
                          <div>
                            <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">
                              {item.skill}
                            </p>

                            <h4 className="mt-1 text-xl font-bold text-slate-900">
                              {item.title}
                            </h4>
                          </div>

                          <span className="h-fit rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-600">
                            {item.duration}
                          </span>
                        </div>

                        <div className="mt-5">
                          <p className="text-sm font-semibold text-slate-700">
                            Topics to Learn
                          </p>

                          <div className="mt-3 flex flex-wrap gap-2">
                            {item.topics.map((topic) => (
                              <span
                                key={topic}
                                className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700"
                              >
                                {topic}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="mt-5 grid gap-4 md:grid-cols-2">
                          <div className="rounded-xl bg-indigo-50 p-4">
                            <p className="text-sm font-semibold text-indigo-800">
                              Hands-on Project
                            </p>

                            <p className="mt-1 text-sm leading-6 text-indigo-700">
                              {item.project}
                            </p>
                          </div>

                          <div className="rounded-xl bg-green-50 p-4">
                            <p className="text-sm font-semibold text-green-800">
                              Milestone
                            </p>

                            <p className="mt-1 text-sm leading-6 text-green-700">
                              {item.milestone}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {analysis.match.recommendations.length > 0 && (
              <section className="rounded-2xl border border-indigo-100 bg-indigo-50 p-6">
                <h3 className="text-xl font-bold text-indigo-900">
                  Career Recommendations
                </h3>

                <ul className="mt-4 space-y-2">
                  {analysis.match.recommendations.map((recommendation) => (
                    <li
                      key={recommendation}
                      className="text-sm leading-6 text-indigo-800"
                    >
                      • {recommendation}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}