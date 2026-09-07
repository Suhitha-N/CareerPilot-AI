import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";


// =========================================================
// TYPES
// =========================================================

type Message = {
  id: number;
  role: "assistant" | "user";
  content: string;
};


type AssistantContext = {
  user?: {
    name?: string;
    role?: string;
  };

  roadmap?: {
    exists?: boolean;
    progress?: number;
    target_role?: string | null;
    company_name?: string | null;
  };
};


type AssistantResponse = {
  answer: string;
  context?: AssistantContext;
};


type DailyTask = {
  id: number;
  duration: string;
  task: string;
  completed: boolean;
};


type DailyPlan = {
  weakestArea: string;
  weakestScore: number;
  skills: string[];
  tasks: DailyTask[];
  totalMinutes: number;
  roadmapProgress: number;
};


// =========================================================
// SUGGESTIONS
// =========================================================

const suggestions = [
  "What should I do today?",
  "What skills am I missing?",
  "Why is my readiness score 71?",
  "What should I study this week?",
  "Give me interview preparation tips",
  "What is my highest priority?",
];


// =========================================================
// DAILY PLAN PARSER
// =========================================================

function parseDailyPlan(
  content: string
): DailyPlan | null {

  if (
    !content
      .toLowerCase()
      .includes("personalized careerpilot plan for today")
  ) {
    return null;
  }


  // -------------------------------------------------------
  // Main Priority
  // -------------------------------------------------------

  const priorityMatch = content.match(
    /Main Priority:\s*([^(\n]+)\s*\((\d+)%\)/i
  );


  if (!priorityMatch) {
    return null;
  }


  const weakestArea =
    priorityMatch[1].trim();


  const weakestScore =
    Number(priorityMatch[2]);


  // -------------------------------------------------------
  // Skill Focus
  // -------------------------------------------------------

  const skillMatch = content.match(
    /Skill Focus:\s*([\s\S]*?)(?=\n|📝|$)/i
  );


  const skills = skillMatch
    ? skillMatch[1]
        .split(",")
        .map((skill) => skill.trim())
        .filter(Boolean)
    : [];


  // -------------------------------------------------------
  // Today's Activities
  // -------------------------------------------------------

  const activitiesMatch = content.match(
    /Today's Activities:\s*([\s\S]*?)(?=\n\s*Total Time:|$)/i
  );


  const tasks: DailyTask[] = [];


  if (activitiesMatch) {

    const activityText =
      activitiesMatch[1];


    const activityItems =
      activityText
        .split(/(?=\d+\.\s*\[)/)
        .map((item) => item.trim())
        .filter(Boolean);


    activityItems.forEach(
      (item, index) => {

        const match = item.match(
          /^\d+\.\s*\[([^\]]+)\]\s*([\s\S]+)$/
        );


        if (match) {

          tasks.push({
            id: index,
            duration: match[1].trim(),
            task: match[2]
              .replace(/\s+/g, " ")
              .trim(),
            completed: false,
          });

        }
      }
    );
  }


  // -------------------------------------------------------
  // Total Time
  // -------------------------------------------------------

  const totalMatch = content.match(
    /Total Time:\s*(\d+)\s*minutes/i
  );


  const totalMinutes =
    totalMatch
      ? Number(totalMatch[1])
      : 0;


  // -------------------------------------------------------
  // Roadmap Progress
  // -------------------------------------------------------

  const roadmapMatch = content.match(
    /Roadmap Progress:\s*(\d+)%/i
  );


  const roadmapProgress =
    roadmapMatch
      ? Number(roadmapMatch[1])
      : 0;


  return {
    weakestArea,
    weakestScore,
    skills,
    tasks,
    totalMinutes,
    roadmapProgress,
  };
}


// =========================================================
// PRIORITY LABEL
// =========================================================

function getPriorityLabel(
  score: number
) {

  if (score < 60) {

    return {
      label: "HIGH PRIORITY",
      className:
        "border-red-400/20 bg-red-400/10 text-red-300",
    };

  }


  if (score < 75) {

    return {
      label: "MEDIUM PRIORITY",
      className:
        "border-amber-400/20 bg-amber-400/10 text-amber-300",
    };

  }


  return {
    label: "ON TRACK",
    className:
      "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
  };
}


// =========================================================
// DAILY PLAN CARD
// =========================================================

function DailyPlanCard({
  plan,
  completedTasks,
  toggleTask,
  savingTask,
}: {
  plan: DailyPlan;
  completedTasks: boolean[];
  toggleTask: (index: number) => void;
  savingTask: boolean;
}) {

  const completedCount =
    completedTasks.filter(Boolean).length;


  const totalTasks =
    plan.tasks.length;


  const taskProgress =
    totalTasks === 0
      ? 0
      : Math.round(
          (completedCount / totalTasks) * 100
        );


  const priority =
    getPriorityLabel(
      plan.weakestScore
    );


  return (
    <div className="mt-3 w-full max-w-[92%] overflow-hidden rounded-3xl border border-cyan-500/20 bg-gradient-to-br from-[#0c1d35] via-[#0b1427] to-[#11152b] shadow-2xl shadow-cyan-950/20">

      {/* HEADER */}

      <div className="border-b border-slate-800 px-5 py-5">

        <div className="flex items-start justify-between gap-4">

          <div className="flex items-center gap-3">

            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/10 text-2xl">
              🎯
            </div>

            <div>

              <p className="text-xs font-semibold uppercase tracking-widest text-cyan-400">
                CareerPilot AI
              </p>

              <h3 className="mt-1 text-xl font-extrabold text-white">
                Today's Career Plan
              </h3>

            </div>

          </div>


          <span
            className={`rounded-full border px-3 py-1.5 text-[10px] font-bold tracking-wide ${priority.className}`}
          >
            {priority.label}
          </span>

        </div>

      </div>


      {/* CONTENT */}

      <div className="p-5">

        {/* MAIN PRIORITY */}

        <div className="rounded-2xl border border-slate-800 bg-[#0f172a]/80 p-4">

          <div className="flex items-center justify-between">

            <div>

              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                Main Priority
              </p>

              <h4 className="mt-1 text-lg font-bold text-white">
                🔥 {plan.weakestArea}
              </h4>

            </div>


            <div className="text-right">

              <p className="text-2xl font-extrabold text-cyan-400">
                {plan.weakestScore}%
              </p>

              <p className="text-[10px] text-slate-500">
                current score
              </p>

            </div>

          </div>


          <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-800">

            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-700"
              style={{
                width: `${Math.min(
                  plan.weakestScore,
                  100
                )}%`,
              }}
            />

          </div>

        </div>


        {/* SKILLS */}

        {plan.skills.length > 0 && (

          <div className="mt-5">

            <div className="mb-3 flex items-center gap-2">

              <span className="text-lg">
                📚
              </span>

              <h4 className="text-sm font-bold text-white">
                Skill Focus
              </h4>

            </div>


            <div className="flex flex-wrap gap-2">

              {plan.skills.map(
                (skill, index) => (

                  <span
                    key={`${skill}-${index}`}
                    className="rounded-full border border-purple-400/20 bg-purple-400/10 px-3 py-1.5 text-xs font-semibold text-purple-300"
                  >
                    {skill}
                  </span>

                )
              )}

            </div>

          </div>

        )}


        {/* TASKS */}

        <div className="mt-6">

          <div className="mb-3 flex items-center justify-between">

            <div className="flex items-center gap-2">

              <span className="text-lg">
                📝
              </span>

              <h4 className="text-sm font-bold text-white">
                Today's Tasks
              </h4>

            </div>


            <div className="flex items-center gap-2">

              {savingTask && (

                <span className="text-[10px] text-cyan-400">
                  Saving...
                </span>

              )}

              <span className="text-xs font-semibold text-cyan-400">
                {completedCount}/{totalTasks}
              </span>

            </div>

          </div>


          {/* PROGRESS */}

          <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-slate-800">

            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all duration-500"
              style={{
                width: `${taskProgress}%`,
              }}
            />

          </div>


          {/* TASK LIST */}

          <div className="space-y-2">

            {plan.tasks.map(
              (task, index) => {

                const completed =
                  completedTasks[index] ??
                  false;


                return (

                  <button
                    key={task.id}
                    onClick={() =>
                      toggleTask(index)
                    }
                    disabled={savingTask}
                    className={`group flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition ${
                      completed
                        ? "border-emerald-500/20 bg-emerald-500/5"
                        : "border-slate-800 bg-[#0f172a] hover:border-cyan-500/30 hover:bg-cyan-500/5"
                    } ${
                      savingTask
                        ? "cursor-wait opacity-80"
                        : ""
                    }`}
                  >

                    {/* CHECKBOX */}

                    <div
                      className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg border text-sm font-bold transition ${
                        completed
                          ? "border-emerald-400 bg-emerald-400 text-slate-950"
                          : "border-slate-600 bg-slate-900 text-transparent group-hover:border-cyan-400"
                      }`}
                    >
                      ✓
                    </div>


                    {/* TASK */}

                    <div className="min-w-0 flex-1">

                      <p
                        className={`text-sm leading-5 ${
                          completed
                            ? "text-slate-500 line-through"
                            : "text-slate-200"
                        }`}
                      >
                        {task.task}
                      </p>

                    </div>


                    {/* DURATION */}

                    <span
                      className={`flex-shrink-0 rounded-lg px-2 py-1 text-[10px] font-bold ${
                        completed
                          ? "bg-emerald-400/10 text-emerald-400"
                          : "bg-cyan-400/10 text-cyan-400"
                      }`}
                    >
                      ⏱ {task.duration}
                    </span>

                  </button>

                );
              }
            )}

          </div>

        </div>


        {/* STATS */}

        <div className="mt-6 grid grid-cols-2 gap-3">

          <div className="rounded-2xl border border-slate-800 bg-[#0f172a] p-4">

            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Study Time
            </p>

            <p className="mt-1 text-xl font-extrabold text-white">

              ⏱️ {plan.totalMinutes}

              <span className="ml-1 text-xs font-medium text-slate-500">
                min
              </span>

            </p>

          </div>


          <div className="rounded-2xl border border-slate-800 bg-[#0f172a] p-4">

            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Today's Progress
            </p>

            <p className="mt-1 text-xl font-extrabold text-emerald-400">
              {taskProgress}%
            </p>

          </div>

        </div>


        {/* ROADMAP */}

        <div className="mt-4 rounded-2xl border border-blue-400/10 bg-blue-400/5 p-4">

          <div className="flex items-center justify-between">

            <div className="flex items-center gap-2">

              <span>
                🗺️
              </span>

              <span className="text-xs font-semibold text-slate-300">
                Career Roadmap
              </span>

            </div>

            <span className="text-sm font-bold text-blue-400">
              {plan.roadmapProgress}%
            </span>

          </div>


          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800">

            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-700"
              style={{
                width: `${Math.min(
                  plan.roadmapProgress,
                  100
                )}%`,
              }}
            />

          </div>

        </div>


        {/* COMPLETION */}

        {taskProgress === 100 &&
          totalTasks > 0 && (

            <div className="mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-center">

              <div className="text-2xl">
                🎉
              </div>

              <p className="mt-1 text-sm font-bold text-emerald-300">
                Today's plan completed!
              </p>

              <p className="mt-1 text-xs text-emerald-400/70">
                Excellent work. Keep building
                your placement readiness.
              </p>

            </div>

          )}

      </div>

    </div>
  );
}


// =========================================================
// MAIN ASSISTANT
// =========================================================

export default function Assistant() {

  const navigate = useNavigate();


  // =======================================================
  // INITIAL MESSAGE
  // =======================================================

  const [messages, setMessages] =
    useState<Message[]>([
      {
        id: 1,
        role: "assistant",
        content:
          "Hi! I'm CareerPilot AI 🤖. I'm your personal career assistant. Ask me about your resume, skill gaps, interviews, coding preparation, readiness score, or career roadmap.",
      },
    ]);


  // =======================================================
  // INPUT
  // =======================================================

  const [input, setInput] =
    useState("");


  // =======================================================
  // TYPING
  // =======================================================

  const [isTyping, setIsTyping] =
    useState(false);


  // =======================================================
  // SAVING TASK
  // =======================================================

  const [savingTask, setSavingTask] =
    useState(false);


  // =======================================================
  // COMPLETED DAILY PLAN TASKS
  // =======================================================

  const [completedPlanTasks, setCompletedPlanTasks] =
    useState<Record<string, boolean[]>>({});

  const [dailyPlanTaskIds, setDailyPlanTaskIds] =
    useState<Record<string, number[]>>({});

  // =======================================================
  // LOAD TODAY'S DAILY PLAN FROM POSTGRESQL
  // =======================================================

  useEffect(() => {
    const loadDailyPlan = async () => {
      try {
        const token = localStorage.getItem("access_token");

        if (!token) {
          return;
        }

        const response = await fetch(
          "http://127.0.0.1:8001/api/daily-plan",
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error("Unable to load today's Daily Plan.");
        }

        const data = await response.json();

        const tasks = Array.isArray(data.tasks)
          ? data.tasks
          : [];

        setCompletedPlanTasks({
          today: tasks.map(
            (task: { completed: boolean }) => Boolean(task.completed)
          ),
        });

        setDailyPlanTaskIds({
          today: tasks.map(
            (task: { id: number }) => task.id
          ),
        });
      } catch (error) {
        console.error(
          "Unable to load Daily Plan from PostgreSQL:",
          error
        );
      }
    };

    loadDailyPlan();
  }, []);

  // =======================================================
  // SAVE / SYNC GENERATED DAILY PLAN TO POSTGRESQL
  // =======================================================

  const syncDailyPlan = async (
    plan: DailyPlan
  ) => {
    const token = localStorage.getItem("access_token");

    if (!token || plan.tasks.length === 0) {
      return;
    }

    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };

    const existingResponse = await fetch(
      "http://127.0.0.1:8001/api/daily-plan",
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!existingResponse.ok) {
      throw new Error("Unable to check today's Daily Plan.");
    }

    const existing = await existingResponse.json();
    const existingTasks = Array.isArray(existing.tasks)
      ? existing.tasks
      : [];

    const samePlan =
      existingTasks.length === plan.tasks.length &&
      existingTasks.every(
        (task: { task_text: string; duration: string }, index: number) =>
          task.task_text === plan.tasks[index].task &&
          task.duration === plan.tasks[index].duration
      );

    let savedTasks = existingTasks;

    if (!samePlan) {
      const createResponse = await fetch(
        "http://127.0.0.1:8001/api/daily-plan",
        {
          method: "POST",
          headers,
          body: JSON.stringify(
            plan.tasks.map((task, index) => ({
              task_index: index,
              task_text: task.task,
              duration: task.duration,
            }))
          ),
        }
      );

      if (!createResponse.ok) {
        const errorData = await createResponse.json().catch(() => null);
        throw new Error(
          errorData?.detail ||
            "Unable to save today's Daily Plan."
        );
      }

      const created = await createResponse.json();
      savedTasks = Array.isArray(created.tasks)
        ? created.tasks
        : [];
    }

    setCompletedPlanTasks({
      today: savedTasks.map(
        (task: { completed: boolean }) => Boolean(task.completed)
      ),
    });

    setDailyPlanTaskIds({
      today: savedTasks.map(
        (task: { id: number }) => task.id
      ),
    });
  };

  // =======================================================
  // TOGGLE DAILY TASK
  // =======================================================

  const toggleTask = async (
    _messageId: number,
    taskIndex: number,
    totalTasks: number
  ) => {
    if (savingTask) {
      return;
    }

    const taskId = dailyPlanTaskIds.today?.[taskIndex];

    if (!taskId) {
      console.error("Daily Plan task ID is unavailable.");
      return;
    }

    const current =
      completedPlanTasks.today ??
      new Array(totalTasks).fill(false);

    const newCompleted = !Boolean(current[taskIndex]);

    setSavingTask(true);

    try {
      const token = localStorage.getItem("access_token");

      if (!token) {
        throw new Error("Please login again.");
      }

      const response = await fetch(
        `http://127.0.0.1:8001/api/daily-plan/tasks/${taskId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            completed: newCompleted,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(
          errorData?.detail ||
            "Unable to update Daily Plan task."
        );
      }

      const updated = [...current];
      updated[taskIndex] = newCompleted;

      setCompletedPlanTasks({
        today: updated,
      });
    } catch (error) {
      console.error(
        "Unable to save Daily Plan task:",
        error
      );
    } finally {
      setSavingTask(false);
    }
  };


  // =======================================================
  // ASK QUESTION
  // =======================================================

  const askQuestion = async (
    question: string
  ) => {

    if (
      !question.trim() ||
      isTyping
    ) {
      return;
    }


    const userMessage: Message = {
      id: Date.now(),
      role: "user",
      content: question,
    };


    setMessages(
      (previous) => [
        ...previous,
        userMessage,
      ]
    );


    setInput("");
    setIsTyping(true);


    try {

      const token =
        localStorage.getItem(
          "access_token"
        );


      if (!token) {

        throw new Error(
          "Please login again."
        );

      }


      const response =
        await fetch(
          "http://127.0.0.1:8001/api/assistant/chat",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",

              Authorization:
                `Bearer ${token}`,
            },

            body: JSON.stringify({
              message: question,
            }),
          }
        );


      let data: AssistantResponse;


      try {

        data =
          await response.json();

      } catch {

        throw new Error(
          "Invalid response from CareerPilot backend."
        );

      }


      if (!response.ok) {

        throw new Error(
          data?.answer ||
          "Unable to get a response from CareerPilot AI."
        );

      }


      const assistantMessage: Message = {
        id: Date.now() + 1,
        role: "assistant",
        content: data.answer,
      };

      const dailyPlan = parseDailyPlan(data.answer);

      if (dailyPlan) {
        try {
          await syncDailyPlan(dailyPlan);
        } catch (planError) {
          console.error(
            "Daily Plan synchronization failed:",
            planError
          );
        }
      }


      setMessages(
        (previous) => [
          ...previous,
          assistantMessage,
        ]
      );

    } catch (error) {

      const errorMessage =
        error instanceof Error
          ? error.message
          : "Something went wrong while connecting to CareerPilot AI.";


      const assistantMessage: Message = {
        id: Date.now() + 1,
        role: "assistant",
        content:
          `⚠️ ${errorMessage}`,
      };


      setMessages(
        (previous) => [
          ...previous,
          assistantMessage,
        ]
      );

    } finally {

      setIsTyping(false);

    }

  };


  // =======================================================
  // SUBMIT
  // =======================================================

  const handleSubmit = (
    e: React.FormEvent
  ) => {

    e.preventDefault();

    askQuestion(input);

  };


  // =======================================================
  // RENDER
  // =======================================================

  return (

    <div className="min-h-screen bg-[#020617] text-white">


      {/* ===================================================
          HEADER
         =================================================== */}

      <header className="sticky top-0 z-20 border-b border-slate-800 bg-[#071021]/95 backdrop-blur">

        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">

          <div className="flex items-center gap-3">

            <button
              onClick={() =>
                navigate("/dashboard")
              }
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700 bg-slate-900 text-slate-300 transition hover:border-cyan-400 hover:text-cyan-400"
            >
              ←
            </button>


            <div>

              <h1 className="text-lg font-bold">
                CareerPilot AI
              </h1>

              <p className="text-xs text-slate-400">
                Your intelligent career assistant
              </p>

            </div>

          </div>


          <div className="flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1.5">

            <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-400" />

            <span className="text-xs font-medium text-cyan-300">
              AI Assistant
            </span>

          </div>

        </div>

      </header>


      {/* ===================================================
          MAIN
         =================================================== */}

      <main className="mx-auto flex max-w-5xl flex-col px-4 py-8">


        {/* =================================================
            HERO
           ================================================= */}

        <section className="mb-6 overflow-hidden rounded-3xl border border-cyan-500/20 bg-gradient-to-br from-[#0b1d35] via-[#10172b] to-[#17102b] p-7 shadow-2xl shadow-cyan-950/20">

          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">

            <div>

              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-300">
                🤖 PERSONAL AI CAREER COACH
              </div>


              <h2 className="text-3xl font-extrabold tracking-tight md:text-4xl">
                Ask CareerPilot
              </h2>


              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                Get personalized guidance about
                your resume, target role, skill
                gaps, interviews, coding
                preparation, readiness score,
                and career roadmap.
              </p>

            </div>


            <div className="hidden h-24 w-24 items-center justify-center rounded-3xl border border-cyan-400/20 bg-cyan-400/10 text-5xl md:flex">
              🧠
            </div>

          </div>

        </section>


        {/* =================================================
            SUGGESTIONS
           ================================================= */}

        <section className="mb-5">

          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Try asking
          </p>


          <div className="grid gap-2 sm:grid-cols-2">

            {suggestions.map(
              (question) => (

                <button
                  key={question}
                  onClick={() =>
                    askQuestion(question)
                  }
                  disabled={isTyping}
                  className="rounded-xl border border-slate-800 bg-[#0f172a] px-4 py-3 text-left text-sm text-slate-300 transition hover:border-cyan-500/50 hover:bg-cyan-500/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                >

                  <span className="mr-2 text-cyan-400">
                    ✦
                  </span>

                  {question}

                </button>

              )
            )}

          </div>

        </section>


        {/* =================================================
            CHAT
           ================================================= */}

        <section className="flex min-h-[560px] flex-col overflow-hidden rounded-3xl border border-slate-800 bg-[#0b1222] shadow-xl">


          {/* CHAT HEADER */}

          <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">

            <div className="flex items-center gap-3">

              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 text-lg">
                🤖
              </div>


              <div>

                <h3 className="text-sm font-bold">
                  CareerPilot AI
                </h3>

                <p className="text-xs text-slate-500">
                  Personalized career intelligence
                </p>

              </div>

            </div>


            <div className="hidden items-center gap-2 sm:flex">

              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />

              <span className="text-[11px] text-emerald-400">
                Profile Connected
              </span>

            </div>

          </div>


          {/* =================================================
              MESSAGES
             ================================================= */}

          <div className="flex-1 space-y-5 overflow-y-auto p-5">

            {messages.map(
              (message) => {

                const dailyPlan =
                  message.role === "assistant"
                    ? parseDailyPlan(
                        message.content
                      )
                    : null;


                // ------------------------------------------------
                // DAILY PLAN
                // ------------------------------------------------

                if (dailyPlan) {

                  const completed =
                    completedPlanTasks.today ??
                    new Array(
                      dailyPlan.tasks.length
                    ).fill(false);


                  return (

                    <div
                      key={message.id}
                      className="flex justify-start"
                    >

                      <DailyPlanCard
                        plan={dailyPlan}
                        completedTasks={
                          completed
                        }
                        savingTask={
                          savingTask
                        }
                        toggleTask={(
                          taskIndex
                        ) =>
                          toggleTask(
                            message.id,
                            taskIndex,
                            dailyPlan.tasks.length
                          )
                        }
                      />

                    </div>

                  );

                }


                // ------------------------------------------------
                // NORMAL MESSAGE
                // ------------------------------------------------

                return (

                  <div
                    key={message.id}
                    className={`flex ${
                      message.role === "user"
                        ? "justify-end"
                        : "justify-start"
                    }`}
                  >

                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6 ${
                        message.role === "user"
                          ? "rounded-br-md bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-950/20"
                          : "rounded-bl-md border border-slate-800 bg-[#111b30] text-slate-300"
                      }`}
                    >

                      {message.role ===
                        "assistant" && (

                        <div className="mb-2 flex items-center gap-2">

                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-cyan-400/10 text-xs">
                            🤖
                          </span>

                          <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">
                            CareerPilot
                          </span>

                        </div>

                      )}


                      <div className="whitespace-pre-line">
                        {message.content}
                      </div>

                    </div>

                  </div>

                );

              }
            )}


            {/* =================================================
                TYPING INDICATOR
               ================================================= */}

            {isTyping && (

              <div className="flex justify-start">

                <div className="rounded-2xl rounded-bl-md border border-slate-800 bg-[#111b30] px-5 py-4">

                  <div className="mb-2 text-[10px] font-semibold text-cyan-400">
                    CareerPilot is thinking...
                  </div>


                  <div className="flex gap-1.5">

                    <span className="h-2 w-2 animate-bounce rounded-full bg-cyan-400" />

                    <span
                      className="h-2 w-2 animate-bounce rounded-full bg-cyan-400"
                      style={{
                        animationDelay:
                          "150ms",
                      }}
                    />

                    <span
                      className="h-2 w-2 animate-bounce rounded-full bg-cyan-400"
                      style={{
                        animationDelay:
                          "300ms",
                      }}
                    />

                  </div>

                </div>

              </div>

            )}

          </div>


          {/* =================================================
              INPUT
             ================================================= */}

          <form
            onSubmit={handleSubmit}
            className="border-t border-slate-800 bg-[#080f1d] p-4"
          >

            <div className="flex items-center gap-2 rounded-2xl border border-slate-700 bg-[#0f172a] p-2 transition focus-within:border-cyan-500/60">

              <input
                value={input}
                onChange={(e) =>
                  setInput(
                    e.target.value
                  )
                }
                placeholder="Ask anything about your career..."
                className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm text-white outline-none placeholder:text-slate-600"
              />


              <button
                type="submit"
                disabled={
                  !input.trim() ||
                  isTyping
                }
                className="rounded-xl bg-cyan-500 px-5 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Ask →
              </button>

            </div>


            <div className="mt-2 flex items-center justify-center gap-2 text-[11px] text-slate-600">

              <span>
                🔒
              </span>

              <span>
                CareerPilot uses your profile
                to personalize responses.
              </span>

            </div>

          </form>

        </section>

      </main>

    </div>
  );
}
