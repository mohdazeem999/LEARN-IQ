# LearnIQ — System Design & Architecture Document

LearnIQ is an AI-powered classroom learning intelligence and adaptive quiz generation platform designed for students and educators. It integrates dynamic AI model generation via Google Gemini, real-time classroom analytics, Supabase authentication & database persistence, and an interactive frontend interface.

---

## 1. High-Level Architecture Overview

LearnIQ follows a lightweight, decoupled **Client-Server Single Page Application (SPA)** architecture:

```mermaid
flowchart TD
    subgraph Client ["Frontend Client (SPA)"]
        UI["HTML5 / Vanilla JS / Glassmorphism CSS"]
        State["Client State & LocalStorage Manager"]
        Router["DOM Page Switcher (showPage)"]
    end

    subgraph Backend ["Node.js / Express Backend (Port 5050)"]
        Server["Express Application Server (server.js)"]
        AuthRoutes["Auth Controller (/api/auth)"]
        AssessmentRoutes["Assessment Engine (/api/assessments)"]
        StudentRoutes["Gamification & Profile (/api/students)"]
        TeacherRoutes["Classroom Analytics (/api/teachers)"]
        AIService["AI Service Layer (aiService.js)"]
    end

    subgraph External ["External Services & APIs"]
        GeminiSDK["Google Gemini AI (gemini-flash-lite-latest / gemini-3.5-flash / gemini-3.8-flash)"]
        SupabaseDB["Supabase Cloud PostgreSQL & Auth"]
    end

    UI --> Router
    Router --> State
    State <-->|REST API / JSON| Server
    Server --> AuthRoutes
    Server --> AssessmentRoutes
    Server --> StudentRoutes
    Server --> TeacherRoutes
    
    AssessmentRoutes --> AIService
    TeacherRoutes --> AIService
    AIService <-->|@google/genai SDK / REST| GeminiSDK
    
    AuthRoutes <-->|Supabase JS Client| SupabaseDB
    StudentRoutes <-->|Supabase DB Queries| SupabaseDB
    AssessmentRoutes <-->|Persistence| SupabaseDB
```

---

## 2. Frontend Architecture & Design System

### 2.1 SPA Component Views
The frontend operates as a single-page app navigating between views via `showPage(pageId)` without full browser reloads:

| Page ID | Description & Features |
| :--- | :--- |
| `#landing` | Public marketing/hero section with platform feature breakdown and auth tabs. |
| `#dashboard` | Clean student/teacher overview displaying XP, daily streak, live rank, and compact missions grid. |
| `#generator` | Topic-driven AI quiz creation interface supporting custom subline topics and preset chips across subjects. |
| `#assessment` | Interactive timed quiz engine with progress bars, single-choice options, and countdown timer. |
| `#teacher-map` | **Class Learning Map**: Topic mastery DNA breakdown, critical learning gaps, and AI intervention plan generator. |
| `#rankings` | Dynamic class leaderboard sorted by earned XP. |
| `#profile` | Student profile overview with subject test attendance counters and date-stamped activity history log. |

### 2.2 Design System & Aesthetics
- **Theme**: Dark Glassmorphism with Cyberpunk neon accents (`#00f0ff` Cyan, `#8a2be2` Purple, `#00ff9d` Green).
- **Typography**: Inter / Outfit fonts with monospace countdown displays.
- **Micro-Animations**: Hover-glow triggers, animated progress meters, and modal popups.

---

## 3. Backend & API Service Layer

### 3.1 API Endpoints Schema

#### Authentication (`/api/auth`)
- `POST /api/auth/signup`: Registers a new user with Supabase Auth / local fallback.
- `POST /api/auth/login`: Authenticates existing credentials and returns a Bearer session token.
- `GET /api/auth/me`: Retrieves currently authenticated user profile.
- `POST /api/auth/logout`: Clears session token.

#### Assessments & AI (`/api/assessments`)
- `POST /api/assessments/generate`: Triggers `aiService.js` to create subject-aligned questions for specified grade, subject, and topic.
- `POST /api/assessments/submit`: Evaluates submitted user answers, calculates score percentage, assigns XP, categorizes mistake types, and generates AI feedback insights.

#### Gamification & Profile (`/api/students`)
- `GET /api/students/profile`: Fetches student XP, streak, class, and badge data.
- `GET /api/students/leaderboard`: Ranks students descending by total XP.
- `POST /api/students/rewards/redeem`: Deducts XP for unlocked rewards.

#### Teacher Analytics (`/api/teachers`)
- `GET /api/teachers/class-map`: Returns class-wide concept mastery scores and student support lists.
- `POST /api/teachers/intervention`: Generates AI-guided remedial teaching plans for weak topics.

---

## 4. Artificial Intelligence Architecture (`aiService.js`)

The AI service utilizes a multi-tier fallback architecture to ensure 100% quiz generation availability:

```
                  ┌─────────────────────────────────────┐
                  │ Request Quiz Generation / Diagnosis │
                  └──────────────────┬──────────────────┘
                                     │
                          Is GEMINI_API_KEY set?
                                   / \
                                 Yes  No
                                 /     \
                                v       v
              ┌─────────────────────────────────────┐   ┌───────────────────────────┐
              │ Google GenAI SDK                    │   │ Offline Subject-Aligned   │
              │ model: gemini-flash-lite / 3.5-flash│   │ Template Engine Fallback  │
              └──────────┬──────────────────────────┘   └───────────────────────────┘
                         │
                 Did SDK succeed?
                        / \
                      Yes  No (Rate-limit / Net error)
                      /     \
                     v       v
           ┌────────────┐  ┌───────────────────────────┐
           │ JSON Output│  │ Direct REST Endpoint      │
           └────────────┘  │ model: gemini-flash-lite  │
                           └───────────────────────────┘
```

### 4.1 Subject & Grade Adaptation
- **Supported Subjects**: Mathematics, Physics, Chemistry, Biology, English.
- **Classes**: Grade 6 through Grade 12.
- **Fallback Engine**: Pre-built pedagogical logic generates topic-accurate questions if API limits are reached.

---

## 5. Data Model & Persistence

### 5.1 Supabase Schema Structure

```
[ users ]
  - id (uuid, PK)
  - email (text, unique)
  - full_name (text)
  - role ('student' | 'teacher')
  - class_level (text)
  - xp (integer, default 0)
  - streak (integer, default 0)
  - created_at (timestamp)

[ quiz_submissions ]
  - id (uuid, PK)
  - user_id (uuid, FK -> users.id)
  - subject (text)
  - topic (text)
  - score_percentage (integer)
  - correct_count (integer)
  - total_questions (integer)
  - xp_earned (integer)
  - ai_analysis (jsonb)
  - created_at (timestamp)
```

### 5.2 Client-Side State Persistence
In addition to Supabase sync, the browser maintains instant-load local storage keys:
- `learniq_token`: Authentication session token.
- `learniq_quiz_history`: Chronological array of attended subject tests.
- `learniq_streak_count`: Daily consecutive login count.
- `learniq_last_active_date`: Date string tracking daily activity.

---

## 6. Daily Streak & Attendance Analytics Logic

1. **Daily Streak Update**:
   - `updateDailyStreak()` compares `new Date().toDateString()` with `learniq_last_active_date`.
   - Increments streak counter if a new day is detected and logs current date.
2. **Subject Test Attendance Log**:
   - Every completed quiz records an assessment entry with `dateStr`, `timeStr`, `subject`, `topic`, `score %`, and `xpEarned`.
   - Profile counters (`#countMathTests`, `#countPhysicsTests`, etc.) instantly re-render attendance breakdowns.

---

## 7. Security & Environment Configuration

- **Environment File (`backend/.env`)**:
  - `PORT`: Server execution port (default `5050`).
  - `GEMINI_API_KEY`: API key for Google Gemini model generation.
  - `SUPABASE_URL`: Supabase project URL.
  - `SUPABASE_PUBLISHABLE_KEY` & `SUPABASE_SECRET_KEY`: Supabase API credentials.
- **Repository Safety**: `.gitignore` explicitly excludes `.env` secrets, node modules, and log files.
