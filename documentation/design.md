# LearnIQ — System Design Document

## 1. Project Overview

**Project Name:** LearnIQ

**Tagline:** AI-Powered Learning Intelligence

**Target Users:** Students (Classes 5–12), Teachers, and Admins

LearnIQ is an AI-powered learning intelligence platform that uses assessments to understand student performance, identify learning gaps, analyze mistakes, and recommend personalized learning activities.

Unlike a traditional quiz application, LearnIQ focuses on understanding **why a student is struggling and what they should learn next**.

---

# 2. Problem

Students often receive a score after completing a test, but a score alone does not explain:

* Which concepts they understand.
* Which concepts they are weak in.
* Why they made mistakes.
* What they should study next.
* Whether their understanding is improving.

Teachers also have difficulty identifying individual learning gaps when managing multiple students.

LearnIQ addresses this by converting assessment results into learning intelligence.

---

# 3. Product Vision

The goal of LearnIQ is to create a continuous learning system:

```text
Learn
  ↓
Practice
  ↓
Assess
  ↓
Analyze
  ↓
Identify Learning Gap
  ↓
Recommend
  ↓
Improve
  ↓
Reassess
```

The system should continuously use assessment evidence to improve the student's learning path.

---

# 4. Core Product Principle

> **The quiz is the data collection mechanism; the real product is the learning intelligence generated from it.**

A normal quiz system may produce:

```text
Score: 60%
```

LearnIQ aims to produce:

```text
Subject: Mathematics
Topic: Linear Equations

Accuracy: 60%

Possible learning gap:
Equation transposition

Recommended action:
Practice basic equation transformation

Next:
Reassessment
```

---

# 5. User Roles

## 5.1 Student

Students can:

* Register and log in.
* Select assessments.
* Answer questions.
* View results.
* Track learning progress.
* View learning gaps.
* Receive recommendations.
* Earn XP.
* Complete challenges.
* Unlock achievements.
* View rankings.
* Redeem digital rewards.

---

## 5.2 Teacher

Teachers can:

* View students.
* View student performance.
* View class analytics.
* Identify weak topics.
* Review common mistakes.
* Manage assessments where permitted.
* Monitor student improvement.

---

## 5.3 Admin

Admins can manage:

* Users
* Subjects
* Topics
* Questions
* Learning resources
* Achievements
* Challenges
* Rewards

---

# 6. System Architecture

LearnIQ follows a client-server architecture.

```text
                    LEARNIQ
                       |
          ┌────────────┴────────────┐
          |                         |
      Frontend                  Backend
          |                         |
     HTML/CSS/JS              Node.js/Express
          |                         |
          |                    Controllers
          |                         |
          |                       Routes
          |                         |
          |                    Middleware
          |                         |
          └────────────┬────────────┘
                       |
                    Supabase
                       |
                PostgreSQL Database
```

---

# 7. Technology Stack

## Frontend

* HTML5
* CSS3
* JavaScript
* Chart.js where required

## Backend

* Node.js
* Express.js

## Database

* Supabase PostgreSQL

## Authentication

Current project implementation:

* Supabase Auth for identity management, authentication, and secure password handling
* HttpOnly, SameSite=Lax session cookies (`learniq_access`, `learniq_refresh`)
* `auth.users` linked with `public.profiles` database table

## Development

* VS Code
* Git
* GitHub
* npm

---

# 8. Project Structure

The project structure is:

```text
screening1/
│
├── package.json
├── README.md
│
├── backend/
│   ├── package.json
│   ├── server.js
│   ├── .env
│   ├── .env.example
│   ├── schema.sql
│   ├── gamification-schema.sql
│   ├── profile-auth-migration.sql
│   │
│   ├── config/
│   │   └── supabaseClient.js
│   │
│   ├── constants/
│   │   └── gamification.js
│   │
│   ├── data/
│   │   └── gamification_store.json
│   │
│   ├── middleware/
│   │   └── auth.js
│   │
│   ├── routes/
│   │   ├── adminRoutes.js
│   │   ├── assessmentRoutes.js
│   │   ├── authRoutes.js
│   │   ├── studentRoutes.js
│   │   └── teacherRoutes.js
│   │
│   ├── services/
│   │   ├── aiService.js
│   │   ├── gamificationService.js
│   │   └── gamification/
│   │
│   ├── utils/
│   │   ├── userPresenter.js
│   │   └── validators.js
│   │
│   └── tests/
│
├── frontend/
│   ├── index.html
│   ├── style.css
│   ├── script.js
│   ├── achievements.css
│   ├── adaptive-quiz.css
│   ├── rankings.css
│   │
│   ├── assets/
│   │
│   └── js/
│       ├── admin.js
│       ├── app.js
│       ├── auth.js
│       ├── badges.js
│       ├── gamification.js
│       ├── quiz.js
│       ├── state.js
│       ├── teacher.js
│       └── ui.js
│
└── documentation/
    └── design.md
```

---

# 9. Frontend Architecture

The frontend is contained inside the `frontend/` folder and served statically by Express.

```text
frontend/
├── index.html
├── style.css
├── script.js
├── achievements.css
├── adaptive-quiz.css
├── rankings.css
└── js/
    ├── admin.js
    ├── app.js
    ├── auth.js
    ├── badges.js
    ├── gamification.js
    ├── quiz.js
    ├── state.js
    ├── teacher.js
    └── ui.js
```

## index.html

Responsible for:

* Page structure
* Login & Signup modals / forms
* Student Dashboard
* Assessment & Quiz interface
* Learning intelligence & DNA map interface
* Rankings & Leaderboards
* Rewards shop
* Challenges & Quests
* Teacher & Admin portals
* Profile & settings

## style.css & Modular CSS

Responsible for:

* Layout and responsive grid
* Glassmorphism and futuristic dark theme design system
* Component styling (Cards, Buttons, Modals, Progress bars)
* Modular styles: `achievements.css`, `adaptive-quiz.css`, `rankings.css`

## script.js & Modular JavaScript (`frontend/js/`)

Responsible for:

* User interaction and navigation
* API requests using credentials (`credentials: "same-origin"`)
* Session management and authentication state via HttpOnly cookies
* Assessment interaction and real-time AI scoring
* Teacher classroom intelligence & intervention generation
* Gamification (XP, coins, streaks, badges, leaderboard)

---

# 10. Backend Architecture

The backend follows an Express route-middleware-service architecture.

```text
Request
   ↓
Routes (backend/routes/*.js)
   ↓
Middleware (backend/middleware/auth.js)
   ↓
Services (backend/services/*.js)
   ↓
Supabase Client (backend/config/supabaseClient.js)
   ↓
Database (PostgreSQL / Supabase)
```

---

# 11. Server

`server.js` is the main backend entry point.

Responsibilities:

* Start Express application on `PORT` 5050 (configured in `backend/.env`).
* Load environment variables via `dotenv`.
* Security headers via Helmet (with Content Security Policy allowing required fonts and CDNs).
* CORS configuration with credentials support for allowed origins.
* Rate limiting for authentication (`/api/auth`) and AI quiz generation (`/api/assessments/generate`).
* Parse JSON payloads.
* Serve static frontend files from `../frontend`.
* Register API routes (`/api/assessments`, `/api/students`, `/api/teachers`, `/api/auth`, `/api/admin`).
* Health endpoints (`/health` and `/api/health`).
* SPA fallback for client-side routing.

Example flow:

```text
Browser
   ↓
http://localhost:5050
   ↓
Express
   ↓
frontend/index.html
```

---

# 12. Authentication Design

Authentication uses Supabase Auth with server-managed HttpOnly session cookies (`learniq_access`, `learniq_refresh`). Raw tokens are never stored in browser `localStorage` or exposed to client-side JavaScript.

## Registration

```text
Registration Form (Name, Email, Password, Role, Class)
       ↓
frontend/js/auth.js (handleAuthSubmit)
       ↓
POST /api/auth/signup
       ↓
backend/routes/authRoutes.js
       ↓
Validate Input (valid email, password >= 6 chars, name, class for students)
       ↓
Supabase Auth (authClient.auth.signUp / admin createUser fallback)
       ↓
Create Profile in public.profiles (user_id = auth.users.id)
       ↓
Issue HttpOnly Session Cookies (learniq_access, learniq_refresh)
       ↓
Return Sanitized User Session
       ↓
Frontend (state.currentUser updated)
```

Passwords are securely hashed and managed by Supabase Auth; passwords are never stored in plain text or in application-level profile tables.

---

## Login

```text
Login Form (Email, Password)
     ↓
frontend/js/auth.js (handleAuthSubmit)
     ↓
POST /api/auth/login
     ↓
backend/routes/authRoutes.js
     ↓
Validate with Supabase Auth (authClient.auth.signInWithPassword)
     ↓
Retrieve / Sync Profile from public.profiles
     ↓
Set HttpOnly Session Cookies (learniq_access, learniq_refresh)
     ↓
Return Sanitized User Profile
     ↓
Frontend (state.currentUser updated)
     ↓
Dashboard
```

---

# 13. Protected Routes

Protected API requests authenticate via secure HttpOnly session cookies (`learniq_access` and `learniq_refresh`).

```text
Request (credentials: "same-origin" / Cookie header)
   ↓
backend/middleware/auth.js (authenticate)
   ↓
Read Cookie (learniq_access)
   ↓
Token Expired or Expiring Soon?
 ┌───────────────┴───────────────┐
Yes                             No
 ↓                               ↓
Refresh via Supabase Auth   Verify with Supabase Auth
(learniq_refresh)           (supabase.auth.getUser)
 ↓                               ↓
Rotate Session Cookies           Valid?
 └───────────────┬───────────────┘
                 ↓
               Valid?
         ┌───────┴───────┐
        No              Yes
        ↓                ↓
       401          Fetch/Verify Profile
                    (public.profiles)
                         ↓
                    Attach req.auth & Check Role
                    (requireRole)
                         ↓
                    Route Handler / Controller
                         ↓
                    Database
```

---

# 14. Current User Flow

On initial application load, the frontend checks for an active session by calling:

```text
GET /api/auth/session  (or GET /api/auth/me)
```

The backend resolves the session from the HttpOnly cookies, verifies the user with Supabase Auth, fetches the corresponding profile from `public.profiles`, and returns the user object.

The dashboard displays actual database information:

```text
Welcome back, Azeem

XP: 0
Streak: 0
Rank: 1
```

Values are fetched live from the database and not hard-coded.

---

# 15. Logout Design

Logout invalidates the device session on both the backend and client:

```text
Logout Button
      ↓
POST /api/auth/logout
      ↓
backend/routes/authRoutes.js
      ↓
Clear Session Cookies (learniq_access & learniq_refresh with Max-Age=0)
      ↓
Revoke Session in Supabase Auth (signOut({ scope: "local" }))
      ↓
Frontend resets state.currentUser
      ↓
Redirect to Landing / Login View
```

If the user attempts to access protected routes afterward, the backend rejects the unauthenticated request with a 401 response and prompts for login.

---

# 16. Database Design

The database contains the major entities required for the learning intelligence system:

```text
auth.users (managed by Supabase Auth)
profiles
quizzes
quiz_submissions
class_learning_maps
rewards
reward_redemptions
xp_transactions
challenges
student_challenges
```

---

# 17. User Data

User authentication identity is managed in Supabase Auth (`auth.users`), while application profile, educational tier, and gamification state reside in `public.profiles`.

Important fields in `public.profiles`:

```text
id (UUID, primary key)
user_id (UUID, references auth.users(id) ON DELETE CASCADE)
name (TEXT)
email (TEXT)
role (TEXT: student, teacher, admin)
class (INT: student grade 5-12)
xp (INT)
streak (INT)
rank (INT)
coins (INT)
active_avatar (TEXT)
equipped_frame (TEXT)
equipped_theme (TEXT)
equipped_title (TEXT)
created_at (TIMESTAMP WITH TIME ZONE)
```

Initial student values:

```text
xp = 0
streak = 0
rank = 1
coins = 50
```

The frontend displays:

```text
Rank: No rankings yet
```

when no ranking records exist yet.

---

# 18. Subject and Topic Structure

Learning content follows:

```text
Class
  ↓
Subject
  ↓
Topic
  ↓
Question
```

Example:

```text
Class 8
  ↓
Mathematics
  ↓
Linear Equations
  ↓
Question
```

---

# 19. Question Architecture

Each question contains information such as:

```text
Question ID
Class
Subject
Topic
Question Text
Option A
Option B
Option C
Option D
Correct Answer
Explanation
Difficulty
Created By
Created At
```

Difficulty levels:

* Easy
* Medium
* Hard
* HOTS

---

# 20. Assessment Architecture

Assessment flow:

```text
Student
   ↓
Select Class
   ↓
Select Subject
   ↓
Select Topic
   ↓
Select Difficulty
   ↓
Select Number of Questions
   ↓
Start Assessment
   ↓
Questions Retrieved from Database
   ↓
Student Answers
   ↓
Submit
   ↓
Calculate Result
   ↓
Store Attempt
   ↓
Analyze Performance
```

---

# 21. Assessment Data

Each assessment attempt can record:

* Student
* Class
* Subject
* Topic
* Difficulty
* Total questions
* Correct answers
* Wrong answers
* Score
* Percentage
* Status
* Time information

Individual answers can record:

* Question
* Student answer
* Correct answer
* Whether answer was correct
* Time taken

---

# 22. Learning Intelligence

The learning intelligence layer analyzes assessment data.

Conceptual flow:

```text
Assessment
     ↓
Answers
     ↓
Performance Analysis
     ↓
Mistake Analysis
     ↓
Learning Progress
     ↓
Learning Gap
     ↓
Recommendation
```

---

# 23. Mistake Intelligence

Possible mistake classifications:

```text
Concept Gap
Calculation Error
Careless Mistake
Misunderstanding
Knowledge Gap
Unknown
```

The system should only assign a specific mistake type when sufficient evidence exists.

Otherwise:

```text
Unknown
```

can be used.

---

# 24. Learning Progress

Learning progress can be maintained at topic level.

Example:

```text
Mathematics
     ↓
Linear Equations
     ↓
Accuracy
Mastery
Attempts
Last Attempt
```

This allows the platform to identify concepts that need additional practice.

---

# 25. Recommendation System

Recommendations are based on learning evidence.

Types:

```text
Practice
Revision
Concept
Assessment
Project
```

Example:

```text
Learning Gap:
Linear Equation Transposition

Recommendation:
Practice basic transposition questions

Reason:
Recent assessment shows repeated errors.

Priority:
High
```

---

# 26. Gamification Architecture

LearnIQ uses XP-based gamification.

Students may earn XP through:

* Assessments
* Challenges
* Achievements
* Streaks
* Learning activities

XP transactions are stored separately so changes can be tracked.

---

# 27. Ranking Architecture

Possible ranking categories:

* Overall
* Most Improved
* Consistency
* Concept Mastery
* Subject
* Challenges

A new student without ranking data should see:

```text
No rankings yet
```

rather than fake ranking information.

---

# 28. Achievement Architecture

Achievements provide recognition for learning milestones.

Example:

```text
First Assessment
7-Day Streak
Concept Master
Improvement Milestone
```

Student achievement records connect users with achievements.

---

# 29. Challenge Architecture

Challenges may contain:

* Title
* Description
* Requirement
* XP reward
* Start date
* End date

Student progress is stored separately.

---

# 30. Reward Architecture

LearnIQ uses digital rewards.

Rewards can have:

* Name
* Description
* XP cost
* Availability
* Status

When a student redeems a reward:

```text
Student
 ↓
Redeem Reward
 ↓
Check XP
 ↓
Deduct XP
 ↓
Create Reward Record
 ↓
Create XP Transaction
```

---

# 31. Teacher Architecture

Teacher dashboard receives information from backend APIs.

```text
Teacher
   ↓
Teacher Dashboard
   ↓
Student Data
   ↓
Performance Analytics
   ↓
Learning Gaps
   ↓
Common Mistakes
```

Teachers can use this information to understand areas where students need additional support.

---

# 32. Admin Architecture

Admin controls platform content.

```text
Admin
 ↓
Subjects
Topics
Questions
Resources
Achievements
Challenges
Rewards
Users
```

---

# 33. UI/UX Design

The visual design follows:

**Dark + Futuristic + Glassmorphism**

Main design characteristics:

* Dark background
* Glass-effect cards
* Modern navigation
* Rounded components
* Subtle animations
* Clear information hierarchy
* Responsive layouts

The interface should work on:

* Desktop
* Tablet
* Mobile

---

# 34. Demo Data Policy

During development, some features may temporarily use sample data.

Any such information must be visibly labelled:

```text
DEMO DATA
```

Fake data must not be presented as actual student information.

---

# 35. Security Design

Security requirements include:

* Supabase Auth managed authentication and secure password hashing.
* HttpOnly, SameSite=Lax session cookies (`learniq_access`, `learniq_refresh`), marked `Secure` in production.
* No access/refresh tokens stored in browser `localStorage` or `sessionStorage`.
* Protected backend routes validated through `backend/middleware/auth.js`.
* Role-based authorization (`student`, `teacher`, `admin`) via `requireRole`.
* Security headers configured via Helmet including Content Security Policy (CSP).
* Rate limiting on sensitive routes (`/api/auth` limiter: 30 requests/15m; `/api/assessments/generate`: 10 requests/1m).
* Environment variables for all secrets (`SUPABASE_SECRET_KEY`, `GEMINI_API_KEY`).
* Server-only Supabase service keys never exposed to client-side code.
* No real `.env` file committed to version control.
* PostgreSQL Row Level Security (RLS) on database tables.
* Input validation on all incoming request payloads.

---

# 36. Environment Configuration

Real credentials are stored locally in:

```text
backend/.env
```

The repository template contains:

```text
backend/.env.example
```

Example:

```env
PORT=5050
NODE_ENV=development
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_PUBLISHABLE_KEY=your_publishable_key
SUPABASE_SECRET_KEY=your_service_role_or_secret_key
GEMINI_API_KEY=your_gemini_api_key
ALLOWED_ORIGINS=http://localhost:5050
```

Real credentials must never be committed to GitHub.

---

# 37. API Architecture

Main API groups:

```text
/api/auth
/api/assessments
/api/students
/api/teachers
/api/admin
```

Authentication:

```text
POST /api/auth/signup
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/session
GET  /api/auth/me
```

Assessment:

```text
GET  /api/assessments
GET  /api/assessments/:id
POST /api/assessments/generate
POST /api/assessments/submit
POST /api/assessments/feedback/retry
```

Students & Gamification:

```text
GET  /api/students/profile
GET  /api/students/leaderboard
GET  /api/students/challenges
POST /api/students/challenges/claim
GET  /api/students/rewards
POST /api/students/rewards/redeem
GET  /api/students/badges
POST /api/students/badges/toggle
```

Teachers:

```text
GET  /api/teachers/class-map
POST /api/teachers/intervention
```

Admin:

```text
GET  /api/admin/overview
GET  /api/admin/users
POST /api/admin/role
```

---

# 38. Error Handling

The backend should return clear responses for:

* Missing or invalid input payload
* Invalid email or password credentials
* Duplicate email on registration
* Expired or missing session cookies
* Unauthorized role access (403)
* Rate limit exceeded (429)
* Database or third-party service errors (500/503)

Example:

```json
{
  "success": false,
  "message": "Invalid email or password"
}
```

---

# 39. Testing Strategy

The project must be tested through real workflows.

## Authentication Test

```text
Register
 ↓
Check database
 ↓
Login
 ↓
Dashboard
 ↓
Logout
 ↓
Dashboard blocked
```

## Persistence Test

```text
Register
 ↓
Stop server
 ↓
Restart server
 ↓
Login
 ↓
User still exists
```

## Multi-user Test

```text
Student A
Student B
 ↓
Verify private data isolation
```

## Fresh Clone Test

```text
git clone
 ↓
npm install
 ↓
configure .env
 ↓
npm run dev
 ↓
Application works
```

---

# 40. Evidence and Documentation

Development reports must distinguish between:

**Completed and tested**

**Implemented but not tested**

**Planned**

GitHub evidence should use actual commit links.

Commit history can be checked using:

```bash
git log --oneline
```

LinkedIn evidence should use the URL of the specific post rather than only the profile.

Deployment status should be reported honestly.

---

# 41. AI Usage

AI tools may assist development.

AI-generated work must be disclosed.

Examples of AI assistance:

* Initial code generation
* Debugging assistance
* Architecture suggestions
* Documentation assistance
* Error explanation

Developer contributions should also be documented, including:

* Configuration
* Database setup
* Testing
* Debugging
* Integration
* Code modifications
* Verification

The developer should understand and be able to explain submitted code.

---

# 42. End-to-End System Flow

The complete system can be represented as:

```text
                 LEARNIQ
                    |
                    ↓
              Authentication
                    |
             ┌──────┴──────┐
             ↓             ↓
          Student        Teacher
             |
             ↓
        Dashboard
             |
             ↓
       Select Assessment
             |
             ↓
         Questions
             |
             ↓
          Answers
             |
             ↓
        Assessment Result
             |
             ↓
      Learning Intelligence
             |
       ┌─────┴─────┐
       ↓           ↓
 Learning Gap   Progress
       |
       ↓
Recommendation
       |
       ↓
Practice
       |
       ↓
Reassessment
       |
       ↓
Improvement
       |
       ↓
XP / Achievement / Ranking
```

---

# 43. Definition of Done

The core system is considered ready when:

* Authentication works.
* User data is stored in the database.
* Login works.
* Logout works.
* Dashboard displays the real user.
* Fake user information is removed.
* Protected routes work.
* Assessment questions come from the database.
* Assessment submissions work.
* Results are stored.
* Learning progress is stored.
* Project can be installed from a fresh clone.
* README provides complete setup instructions.
* Environment secrets are protected.
* Testing evidence is collected.
* AI assistance is disclosed.
* The complete application flow can be explained.

---

# 44. Final Design Principle

LearnIQ is designed around one central idea:

> **Assessment should not only measure learning. It should generate intelligence that improves learning.**
