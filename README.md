# 🚀 CareerPilot AI

### Intelligent Placement & Career Intelligence Platform

CareerPilot AI is an AI-powered placement preparation platform designed
to help students understand their job readiness, identify skill gaps,
practice interviews and coding, follow a personalized career roadmap,
and receive context-aware career guidance.

Instead of treating placement preparation as separate tools, CareerPilot
AI connects the complete preparation journey into one system:

``` text
Resume
  ↓
Resume Intelligence
  ↓
Target Job Analysis
  ↓
Job Match & Skill Gap Analysis
  ↓
Personalized Career Roadmap
  ↓
Mock Interview + Coding Assessment
  ↓
Placement Readiness
  ↓
AI Career Assistant
  ↓
Continuous Progress Tracking
```

------------------------------------------------------------------------

## ✨ Why CareerPilot AI?

Students often have to use different platforms for resume checking, job
matching, interview preparation, coding practice, and career planning.

CareerPilot AI brings these activities together and turns them into a
connected preparation workflow.

### Core goals

-   Analyze a student's resume and ATS readiness
-   Extract technical and professional skills
-   Compare a resume with a target job description
-   Identify missing and important skills
-   Generate a personalized learning roadmap
-   Conduct adaptive mock interviews
-   Evaluate coding submissions and test cases
-   Calculate an overall placement readiness score
-   Track readiness progress over time
-   Provide personalized AI career guidance
-   Maintain authenticated, user-scoped career data

------------------------------------------------------------------------

# 🎯 Key Features

  -----------------------------------------------------------------------
  Module                              What it does
  ----------------------------------- -----------------------------------
  📄 Resume Intelligence              Resume upload, parsing, ATS
                                      scoring, skill extraction,
                                      projects, education, experience and
                                      recommendations

  🎯 Job Match Intelligence           Compares resume skills with a
                                      target job and identifies skill
                                      gaps

  🗺️ Career Roadmap                   Converts skill gaps into a
                                      structured multi-week learning
                                      journey

  🎤 Adaptive AI Interview            Personalized technical/behavioral
                                      practice with difficulty adaptation
                                      and performance analysis

  💻 Coding Intelligence              Coding problems, submissions, test
                                      cases, evaluation and coding
                                      analytics

  📊 Placement Readiness              Combines multiple preparation
                                      signals into an overall readiness
                                      score

  📈 Progress Tracking                Stores readiness snapshots and
                                      visualizes improvement over time

  📅 Daily Learning                   Provides focused daily preparation
                                      tasks and progress

  🤖 CareerPilot AI Assistant         Context-aware career guidance based
                                      on resume, target job, skills,
                                      readiness and roadmap

  🔐 Authentication                   JWT-based authentication with
                                      protected user-specific resources

  🛡️ Secure Data Access               API ownership checks ensure users
                                      access their own career data
  -----------------------------------------------------------------------

------------------------------------------------------------------------

# 🧠 AI & Intelligence Layer

CareerPilot AI uses a local AI setup so the project can be developed and
demonstrated without depending on paid LLM APIs.

### Local AI

-   **Ollama**
-   **Llama 3.2 1B**
-   Python AI/service layer
-   Prompt-based career guidance
-   Context-aware responses

The AI assistant can use information from the user's preparation
profile, including:

``` text
Resume
Target Job
Skill Gaps
Placement Readiness
Interview Performance
Coding Progress
Career Roadmap
Daily Learning
```

This allows the assistant to provide recommendations that are connected
to the student's actual preparation state rather than generic career
advice.

------------------------------------------------------------------------

# 🏗️ System Architecture

``` text
                    ┌──────────────────────────┐
                    │       React Frontend      │
                    │   TypeScript + Tailwind   │
                    └────────────┬─────────────┘
                                 │ REST API
                                 ▼
                    ┌──────────────────────────┐
                    │       FastAPI Backend     │
                    │   Authentication + APIs   │
                    └────────────┬─────────────┘
                                 │
              ┌──────────────────┼──────────────────┐
              │                  │                  │
              ▼                  ▼                  ▼
      ┌─────────────┐    ┌──────────────┐    ┌──────────────┐
      │ PostgreSQL  │    │ AI Services  │    │ File Parsing │
      │   Database  │    │   Ollama     │    │ PDF / DOCX   │
      └─────────────┘    └──────────────┘    └──────────────┘
                                 │
                                 ▼
                       ┌──────────────────┐
                       │ Career Intelligence│
                       │ Resume / JD / AI   │
                       │ Interview / Coding │
                       │ Readiness / Roadmap│
                       └──────────────────┘
```

------------------------------------------------------------------------

# 🛠️ Technology Stack

## Frontend

-   React
-   TypeScript
-   Tailwind CSS
-   React Router
-   Vite

## Backend

-   Python
-   FastAPI
-   Uvicorn
-   Pydantic
-   SQLAlchemy

## Database

-   PostgreSQL
-   Alembic migrations

## AI / NLP

-   Ollama
-   Llama 3.2
-   Resume text extraction
-   Job-description skill extraction
-   Rule-based skill normalization
-   Context-aware AI assistance

## Authentication & Security

-   JWT authentication
-   Argon2 password hashing
-   Role-based access concepts
-   User-scoped database queries
-   Protected API endpoints
-   File type and size validation
-   Restricted coding execution

## DevOps / Development

-   Docker
-   Docker Compose
-   Git
-   Environment-based configuration

------------------------------------------------------------------------

# 🔐 Security

Security was considered at the API and data-access level.

### Authentication

Users authenticate through JWT tokens.

``` text
Register
   ↓
Login
   ↓
JWT Access Token
   ↓
Authenticated API Requests
```

Passwords are hashed using Argon2 rather than stored as plain text.

### Authorization

User-owned resources are scoped to the authenticated user.

Examples include:

-   Resumes
-   Job descriptions
-   Interviews
-   Interview questions/results
-   Coding submissions
-   Placement readiness
-   Career roadmaps
-   Daily learning tasks
-   AI assistant context

### Resume Upload Protection

The resume workflow includes:

-   PDF/DOCX validation
-   File-size limits
-   UUID-based storage names
-   Server-side parsing
-   User ownership association

### Coding Execution

The coding module uses a restricted Python execution approach with:

-   AST restrictions
-   blocked dangerous operations
-   restricted built-ins
-   isolated Python execution flags
-   execution timeout

> The coding runner is intended for a student project/development
> environment and is not presented as a production-grade security
> sandbox.

------------------------------------------------------------------------

# 📸 Application Screenshots

## 1. Authentication

### Create Account

Students can create their CareerPilot AI profile before starting their
placement journey.

![CareerPilot AI Register](docs/screenshots/01-register.png)

### Login

Authenticated users can securely sign in and continue their preparation
journey.

![CareerPilot AI Login](docs/screenshots/02-login.png)

------------------------------------------------------------------------

# 📊 2. Career Intelligence Dashboard

The dashboard acts as the central control panel for placement
preparation.

It summarizes:

-   Resume score
-   Job match
-   Interview performance
-   Coding performance
-   Placement readiness
-   Recommended focus
-   Preparation tools
-   CareerPilot AI Assistant

### Dashboard Overview

![CareerPilot AI Dashboard
Overview](docs/screenshots/03-dashboard-overview.png)

### Preparation Tools & AI Assistant

![CareerPilot AI Dashboard
Tools](docs/screenshots/04-dashboard-tools.png)

------------------------------------------------------------------------

# 📄 3. Resume Intelligence

CareerPilot AI analyzes the uploaded resume and extracts useful career
information.

### Resume Upload

The resume analyzer supports PDF and DOCX uploads and evaluates areas
such as:

-   ATS score
-   Skills
-   Projects
-   Education
-   Certifications
-   Suggestions

![Resume Intelligence Upload](docs/screenshots/05-resume-upload.png)

### Resume Analysis Results

The results page presents an ATS breakdown and extracted candidate
information.

The analysis includes:

-   Overall ATS score
-   Section scores
-   Technical skills
-   Projects
-   Experience
-   Education
-   Certifications
-   Achievements
-   Professional summary

![Resume Analysis Results](docs/screenshots/06-resume-results.png)

------------------------------------------------------------------------

# 🎯 4. Job Match Intelligence

Students can select a resume and provide a target job title, company and
job description.

CareerPilot AI then compares the candidate profile with the target role.

The workflow identifies:

``` text
Resume Skills
      +
Job Requirements
      ↓
Skill Matching
      ↓
Missing Skills
      ↓
Skill Gap Analysis
      ↓
Career Recommendations
```

![Job Match Intelligence](docs/screenshots/07-job-match.png)

------------------------------------------------------------------------

# 🎤 5. Adaptive AI Mock Interview

The interview module creates personalized practice sessions based on the
candidate's resume and target role.

### Interview Configuration

Users can select:

-   Resume
-   Target job
-   Interview type
-   Starting difficulty

![AI Mock Interview
Configuration](docs/screenshots/08-interview-setup.png)

### Interview Performance Report

After the interview, CareerPilot AI provides:

-   Overall interview score
-   Category performance
-   Strengths
-   Improvement areas
-   Personalized recommendations
-   Question-by-question analysis
-   Weakest areas for the next practice session

![AI Mock Interview Performance
Report](docs/screenshots/09-interview-report.png)

------------------------------------------------------------------------

# 💻 6. Coding Intelligence

The coding assessment module provides a coding-practice environment
with:

-   Problem bank
-   Difficulty filtering
-   Code editor
-   Test cases
-   Submission evaluation
-   Coding score
-   Accuracy
-   Coding analytics

![Coding Assessment](docs/screenshots/10-coding-assessment.png)

------------------------------------------------------------------------

# 🗺️ 7. Personalized Career Roadmap

CareerPilot AI converts identified skill gaps into a structured learning
journey.

The roadmap contains:

-   Target role
-   Target company
-   Duration
-   Skill gaps
-   Weekly learning goals
-   Skills to strengthen
-   Topics to learn
-   Projects
-   Milestones
-   Completion tracking

Example workflow:

``` text
9 Skill Gaps
     ↓
Priority Analysis
     ↓
Learning Topics
     ↓
Weekly Plan
     ↓
Projects + Milestones
     ↓
Progress Tracking
```

![Personalized Career Roadmap](docs/screenshots/11-career-roadmap.png)

------------------------------------------------------------------------

# 📊 8. Placement Readiness

Placement Readiness combines multiple signals into a single preparation
score.

The dashboard tracks:

-   Resume
-   Job Match
-   Interview
-   Coding
-   Skill Progress

The system also stores historical readiness snapshots so students can
see whether their preparation is improving.

![Placement Readiness](docs/screenshots/12-placement-readiness.png)

------------------------------------------------------------------------

# 🤖 9. CareerPilot AI Assistant

The CareerPilot AI Assistant acts as a personalized career coach.

Students can ask questions such as:

-   What should I do today?
-   What skills am I missing?
-   Why is my readiness score low?
-   What should I study this week?
-   Give me interview preparation tips.
-   What is my highest priority?

The assistant can connect its guidance to the student's preparation
context.

![CareerPilot AI Assistant](docs/screenshots/13-ai-assistant.png)

------------------------------------------------------------------------

# 📈 10. Final Dashboard Progress

After completing different preparation activities, the dashboard
reflects the updated career intelligence profile.

The final dashboard provides a quick view of:

-   Resume performance
-   Job compatibility
-   Interview performance
-   Coding performance
-   Placement readiness
-   Recommended improvement area

![Final CareerPilot AI
Dashboard](docs/screenshots/14-final-dashboard.png)

------------------------------------------------------------------------

# 🔄 End-to-End User Journey

``` text
┌────────────────────┐
│ Create Account     │
└─────────┬──────────┘
          ↓
┌────────────────────┐
│ Login              │
└─────────┬──────────┘
          ↓
┌────────────────────┐
│ Upload Resume      │
└─────────┬──────────┘
          ↓
┌────────────────────┐
│ Resume Intelligence│
│ ATS + Skills       │
└─────────┬──────────┘
          ↓
┌────────────────────┐
│ Select Target Job  │
└─────────┬──────────┘
          ↓
┌────────────────────┐
│ Job Match Analysis │
└─────────┬──────────┘
          ↓
┌────────────────────┐
│ Identify Skill Gaps│
└─────────┬──────────┘
          ↓
┌────────────────────┐
│ Career Roadmap     │
└─────────┬──────────┘
          ↓
     ┌────┴────┐
     ↓         ↓
┌─────────┐ ┌─────────┐
│Interview│ │ Coding  │
└────┬────┘ └────┬────┘
     └──────┬────┘
            ↓
┌────────────────────┐
│ Placement Readiness│
└─────────┬──────────┘
          ↓
┌────────────────────┐
│ AI Career Assistant│
└─────────┬──────────┘
          ↓
┌────────────────────┐
│ Continuous Progress│
└────────────────────┘
```

------------------------------------------------------------------------

# 🗄️ Main Data Model

The backend stores separate entities for the major placement workflows.

``` text
Users
 │
 ├── Resumes
 │     └── Resume Profiles
 │
 ├── Job Descriptions
 │
 ├── Interviews
 │     └── Interview Questions
 │
 ├── Coding Submissions
 │
 ├── Placement Readiness
 │     └── Readiness History
 │
 ├── Career Roadmaps
 │
 └── Daily Plan Tasks
```

This structure keeps user career data organized while allowing each
preparation module to contribute to the overall readiness profile.

------------------------------------------------------------------------

# 📁 Project Structure

``` text
ai-placement-platform/
│
├── backend/
│   └── app/
│       ├── api/
│       │   ├── career_roadmap.py
│       │   ├── coding.py
│       │   ├── interviews.py
│       │   ├── job_descriptions.py
│       │   ├── placement_readiness.py
│       │   └── routes/
│       │       ├── assistant.py
│       │       ├── auth.py
│       │       ├── daily_plan.py
│       │       ├── resumes.py
│       │       └── users.py
│       │
│       ├── core/
│       │   ├── database.py
│       │   ├── dependencies.py
│       │   └── security.py
│       │
│       ├── models/
│       ├── schemas/
│       ├── services/
│       │   ├── ai_service.py
│       │   ├── jd_analyzer.py
│       │   ├── roadmap_generator.py
│       │   └── skill_gap_analyzer.py
│       └── main.py
│
├── database/
│   └── migrations/
│       └── versions/
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   └── ...
│   ├── package.json
│   └── vite.config.ts
│
├── docs/
│   └── screenshots/
│
├── docker-compose.yml
├── .env
├── .gitignore
└── README.md
```

------------------------------------------------------------------------

# ⚙️ Local Setup

## Prerequisites

Install:

-   Python 3.11+
-   Node.js
-   npm
-   PostgreSQL or Docker
-   Docker Desktop
-   Ollama
-   Git

------------------------------------------------------------------------

## 1. Clone the repository

``` bash
git clone <YOUR_GITHUB_REPOSITORY_URL>
cd ai-placement-platform
```

------------------------------------------------------------------------

## 2. Start PostgreSQL

Using Docker Compose:

``` bash
docker compose up -d postgres
```

Verify the container:

``` bash
docker ps
```

------------------------------------------------------------------------

## 3. Backend setup

Create and activate the Python virtual environment:

### Windows PowerShell

``` powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
```

Install dependencies:

``` powershell
pip install -r backend/requirements.txt
```

Run database migrations:

``` powershell
alembic upgrade head
```

Start FastAPI:

``` powershell
uvicorn backend.app.main:app --reload --port 8001
```

Backend API:

``` text
http://localhost:8001
```

Swagger documentation:

``` text
http://localhost:8001/docs
```

------------------------------------------------------------------------

# 🤖 4. Ollama Setup

Install Ollama and make sure the local Ollama service is running.

Pull the model:

``` bash
ollama pull llama3.2:1b
```

Verify:

``` bash
ollama list
```

CareerPilot AI can then use the local model without requiring a paid
OpenAI API key.

------------------------------------------------------------------------

# 💻 5. Frontend Setup

Open a second terminal:

``` powershell
cd frontend
npm install
npm run dev
```

The Vite development server will normally be available at:

``` text
http://localhost:5173
```

------------------------------------------------------------------------

# 🔑 Environment Variables

Create a `.env` file using your local configuration.

Example:

``` env
POSTGRES_DB=ai_placement
POSTGRES_USER=placement_user
POSTGRES_PASSWORD=your_local_password
POSTGRES_PORT=5433

DATABASE_URL=postgresql+psycopg2://placement_user:your_local_password@localhost:5433/ai_placement

JWT_SECRET_KEY=your_long_random_secret
```

> Never commit `.env` or real secrets to GitHub.

------------------------------------------------------------------------

# 🧪 Testing

The project can be tested through:

### Frontend

``` bash
npm run build
```

### Backend

``` bash
uvicorn backend.app.main:app --reload --port 8001
```

### API

Open:

``` text
http://localhost:8001/docs
```

and verify the protected endpoints using an authenticated JWT.

------------------------------------------------------------------------

# 📌 Important API Areas

``` text
/api/auth
/api/users
/api/resumes
/api/job-descriptions
/api/career-roadmap
/api/interviews
/api/coding
/api/placement-readiness
/api/daily-plan
/api/assistant
```

------------------------------------------------------------------------

# 🌟 Project Highlights

CareerPilot AI demonstrates several practical software-engineering
concepts in one application:

-   Full-stack application development
-   REST API design
-   React + TypeScript frontend engineering
-   Python FastAPI backend
-   PostgreSQL database design
-   Database migrations with Alembic
-   JWT authentication
-   Password hashing with Argon2
-   Role-aware application design
-   Resume document processing
-   NLP-style skill extraction
-   Skill normalization and gap analysis
-   Local LLM integration using Ollama
-   AI-assisted career recommendations
-   Adaptive interview logic
-   Coding evaluation
-   Progress analytics
-   Personalized roadmap generation
-   Docker-based development
-   Git version control

------------------------------------------------------------------------

# 🔮 Future Enhancements

Potential future improvements include:

-   Production-grade isolated coding sandbox
-   More programming languages for coding assessments
-   Voice-based AI interviews
-   Resume version comparison
-   Advanced vector-based RAG retrieval
-   Company-specific interview intelligence
-   Recruiter and administrator dashboards
-   Placement analytics for colleges
-   Notifications and reminders
-   Deployment to cloud infrastructure
-   More advanced recommendation models

------------------------------------------------------------------------

# 🎓 Use Case

CareerPilot AI is primarily designed for:

-   Final-year students
-   College placement preparation
-   Job seekers
-   Technical interview preparation
-   Resume improvement
-   Skill-gap identification
-   Personalized learning

It can also serve as a foundation for a larger college placement
intelligence platform.

------------------------------------------------------------------------

# 🏆 Project Outcome

CareerPilot AI transforms placement preparation from a collection of
disconnected activities into a single measurable journey.

``` text
Understand your profile
        ↓
Understand your target job
        ↓
Find the gaps
        ↓
Learn what matters
        ↓
Practice
        ↓
Measure readiness
        ↓
Improve
        ↓
Repeat
```

The goal is simple:

> **Help students understand where they are, what they are missing, and
> what they should do next to become placement ready.**

------------------------------------------------------------------------

# 👩‍💻 Author

**\[Your Name\]**

B.Tech --- Computer Science Engineering

CareerPilot AI --- Intelligent Placement & Career Intelligence Platform

------------------------------------------------------------------------

## ⭐ If you find this project useful

Give the repository a ⭐ and feel free to explore the implementation.
