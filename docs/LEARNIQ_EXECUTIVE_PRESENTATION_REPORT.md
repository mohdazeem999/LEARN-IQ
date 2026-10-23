# LearnIQ — AI-Powered Learning Intelligence Platform
## Comprehensive Technical Audit, Architecture Blueprint & Manager Presentation Guide

**Repository:** `mohdazeem999/LEARN-IQ`  
**Generated Presentation File:** [`LearnIQ_Manager_Presentation.pptx`](file:///c:/Users/2025s/Desktop/screening1/LearnIQ_Manager_Presentation.pptx)  
**Verification Date:** October 2026  
**Audit Standard:** 100% Codebase-Verified (Zero Imagined APIs or Unverified Claims)

---

## Executive Summary

LearnIQ is an AI-powered classroom learning intelligence and adaptive evaluation platform. It replaces blunt percentage grades with root-cause cognitive diagnostics. When a student attempts an assessment, LearnIQ does not merely tally right and wrong answers; it analyzes the student's selected option against pedagogical principles to classify the cognitive mechanism of failure: **Conceptual Error**, **Calculation Error**, **Misinterpretation**, or **Careless Error**.

Simultaneously, student performance is aggregated into a live **Classroom Learning Map** for teachers, identifying class-wide concept gaps and generating automated 5-minute remedial lesson plans and mini-quizzes.

---

## 1. System Architecture Blueprint

```text
                                  LEARNIQ PLATFORM
                                         │
        ┌────────────────────────────────┼────────────────────────────────┐
        ▼                                ▼                                ▼
   STUDENT ROLE                    TEACHER ROLE                      ADMIN ROLE
 (Class 5-12 Scope,             (Classroom Learning Maps,        (User Management,
  Adaptive Quizzing,             Targeted Interventions,          Role Elevation,
  Gamification, Rewards)         Class Analytics)                 Platform Telemetry)
        │                                │                                │
        └────────────────────────────────┼────────────────────────────────┘
                                         ▼
                     FRONTEND SINGLE PAGE APPLICATION (SPA)
                     Vanilla HTML5 + Custom CSS3 Glassmorphism
                     Reactive State Engine + Chart.js Engine
                                         │
                    HTTPS Requests + HttpOnly Session Cookies
                                         │
                                         ▼
                       EXPRESS.JS REST API & GATEWAY (Port 5050)
        ┌────────────────────────────────┼────────────────────────────────┐
        ▼                                ▼                                ▼
  SECURITY LAYER                   AUTH MIDDLEWARE                  RATE LIMITERS
  - Helmet CSP Directives         - Cookie Resolution              - Auth: 30 req/15m
  - CORS Origin Whitelist         - Token Expiry & Rotation        - AI Gen: 10 req/1m
  - RFC 4122 UUID Validation      - requireRole() RBAC             - Anti-Cheat: 3s Cooldown
        └────────────────────────────────┼────────────────────────────────┘
                                         ▼
                                BUSINESS LOGIC LAYER
        ┌────────────────────────────────┼────────────────────────────────┐
        ▼                                ▼                                ▼
  ASSESSMENT SERVICE            GAMIFICATION SERVICE               ADMIN & TEACHER
  - Prompt Construction          - 15-Tier Level Math               - Directory Telemetry
  - Schema Enforcement           - XP Calculation & Bonus           - Dynamic Role API
  - Pedagogical Fallback         - LearnCoins & Reward Shop         - Class Concept Presets
        │                                │                                │
        ├────────────────────────────────┼────────────────────────────────┘
        ▼                                ▼
  AI INTELLIGENCE ENGINE            PERSISTENCE ENGINE
  - Google GenAI SDK                - Supabase Cloud PostgreSQL
    (Gemini Flash Models)           - Supabase Auth (Local Scope Signout)
  - Cognitive Error Classifier      - Row Level Security (RLS)
  - Remedial Lesson Planner         - Local Atomic JSON Store (Audit Logs)
```

---

## 2. Technology Stack (Verified in Codebase)

| Layer | Technology / Library | Version / Details | Verification Source |
| :--- | :--- | :--- | :--- |
| **Frontend** | Vanilla HTML5 / CSS3 | Custom Glassmorphic Dark Design System | `frontend/style.css`, `frontend/index.html` |
| **Frontend Scripts** | Vanilla JavaScript (ES6+) | Modular controllers: auth, quiz, teacher, admin | `frontend/js/*.js`, `frontend/script.js` |
| **Analytics Engine** | Chart.js | Minified local distribution in assets | `frontend/assets/chart.min.js` |
| **Typography & Icons**| Google Fonts (Inter) & Font Awesome | Version 6.5.2 via Cloudflare CDN | `frontend/index.html` |
| **Backend Runtime** | Node.js | v20.0.0+ | `backend/package.json` |
| **Web Framework** | Express.js | v4.19.2 | `backend/package.json`, `backend/server.js` |
| **Security Headers** | Helmet | v8.3.0 (Configured CSP whitelists) | `backend/server.js` |
| **Traffic Control** | express-rate-limit | v8.7.1 (IP-based windows on auth and AI) | `backend/server.js` |
| **AI SDK** | `@google/genai` | v2.27.0 (Official Google GenAI SDK) | `backend/package.json`, `backend/services/aiService.js` |
| **AI Models** | Google Gemini Flash | `gemini-flash-lite-latest`, `gemini-3.5-flash-lite` | `backend/services/aiService.js` |
| **Database & Auth** | Supabase Cloud | `@supabase/supabase-js` v2.117.2 | `backend/config/supabaseClient.js` |
| **Testing** | Node.js Test Runner | Native `node:test` and `node:assert/strict` | `backend/tests/*.test.js` (19/19 Pass) |

---

## 3. User Roles & Access Control Matrix

| Capability / Resource | Student | Teacher | Administrator |
| :--- | :---: | :---: | :---: |
| Self-service registration with mandatory Class | Yes (Class 5–12) | Optional | No (Admin assigned) |
| Generate and attempt adaptive quizzes | Yes (Own class only) | Yes | Yes |
| View question-level cognitive feedback & remediation | Yes | Yes | Yes |
| XP, LearnCoins, Level progression, Avatars | Yes | Profile view | Profile view |
| Daily Challenges & Reward Vault redemptions | Yes | No | Yes |
| View Classroom Learning Map & concept DNA | No (403 Forbidden) | Yes | Yes |
| Generate AI remedial lesson plans & mini-quizzes | No (403 Forbidden) | Yes | Yes |
| Access Admin Dashboard & user directory | No (403 Forbidden) | No (403 Forbidden) | Yes |
| Promote user roles (Student ↔ Teacher ↔ Admin) | No (403 Forbidden) | No (403 Forbidden) | Yes |

---

## 4. Authentication & Zero-Trust Security Implementation

1. **HttpOnly Cookie Tokens:** The backend stores session access and refresh tokens in `learniq_access` and `learniq_refresh` cookies (`Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000`). Tokens are never stored in browser `localStorage` or `sessionStorage`, mitigating XSS credential theft.
2. **Dynamic Secure Flags:** In production (`NODE_ENV === 'production'`) or when `x-forwarded-proto === 'https'`, cookies are strictly marked `Secure`.
3. **Silent Token Rotation:** `middleware/auth.js` inspects the JWT payload's `exp` claim. If within 60 seconds of expiration, it invokes `authClient.auth.refreshSession()` and sets fresh cookies seamlessly.
4. **Strict Student Class Scoping:** In `routes/assessmentRoutes.js`, student requests verify that `classLevel` matches the authenticated user's assigned class (`req.auth.user.classNumber`). Cross-grade generation attempts trigger `403 Forbidden`.
5. **RFC 4122 UUID Sanitization:** All database operations on IDs pass through `isValidUUID()`. Malformed strings or PostgREST injection attempts (e.g. `user_id.eq.admin`) are immediately rejected.
6. **Rate Limiting & Anti-Cheat:**
   - Sensitive auth endpoints: max 30 requests per 15 minutes per IP.
   - AI generation: max 10 requests per minute per IP.
   - Quiz submission cooldown: minimum 3-second throttle enforced in `gamificationService.js` to prevent automated script spamming.

---

## 5. Database Schema & Relational Design

The database operates on Supabase PostgreSQL with Row Level Security (RLS) enabled:

### Key Tables
1. **`public.profiles`**: Linked to `auth.users(id)` via cascading foreign key. Stores user metadata (`name`, `email`, `role`, `class`, `xp`, `streak`, `coins`, `rank`, `active_avatar`).
2. **`public.quizzes`**: Stores generated assessments with title, subject, class_level, difficulty, and `questions` (JSONB storing options, answer keys, concepts, and explanations).
3. **`public.quiz_submissions`**: Stores historical assessment attempts (`score_percentage`, `correct_count`, `xp_earned`, `coins_earned`, `ai_insight`, `mistake_categories` JSONB, `concept_stats` JSONB).
4. **`public.xp_transactions`**: Audit trail of every XP grant with student ID, amount, source (`quiz_completion`, `streak_milestone`), and timestamp.
5. **`public.student_achievements`**: Records unlocked badges with unique constraint `(student_id, achievement_id)`.
6. **`public.class_learning_maps`**: Aggregates classroom concept mastery percentages and status labels (`Strong`, `Moderate`, `Needs Practice`, `Critical Learning Gap`).
7. **`public.reward_items` & `public.reward_redemptions`**: Catalog of avatar borders, background themes, and titles, alongside student purchase audit logs.

---

## 6. AI Quiz Generation & Learning Intelligence Engine

### AI Prompting Strategy (`backend/services/aiService.js`)
- Enforces strict role prompt: `"You are an expert master educator and curriculum author."`
- Strict subject isolation: Questions must align 100% with the specified Subject and Topic; cross-subject pollution is barred.
- Output mode: `responseMimeType: "application/json"`.

### 3-Tier Resilient Fallback Pipeline
1. **Google GenAI SDK:** Calls active Gemini models (`gemini-flash-lite-latest`, `gemini-3.5-flash-lite`, `gemini-3.8-flash`).
2. **Direct HTTPS REST Fallback:** If the SDK encounters network or environment issues, an internal HTTPS request executes against the Google Generative Language REST endpoint.
3. **Curriculum Fallback Engine:** If API quotas are exhausted or internet connectivity is lost, a deterministic template engine generates grade-aligned questions across Physics, Chemistry, Biology, Mathematics, and English.

### Cognitive Error Classification Engine
When an incorrect answer is submitted:
1. The backend builds a contextual prompt with the question, options, selected option, and official solution.
2. Mistake categories:
   - **Conceptual Error:** Misunderstanding of core laws or definitions.
   - **Calculation Error:** Arithmetic, formula substitution, or sign errors.
   - **Misinterpretation:** Misreading question conditions or overlooking negation.
   - **Careless Error:** Elementary slip-up (only assigned if confidence >= 0.7).
   - If confidence is ambiguous, defaults safely to `"Mistake type not confidently identified"`.
3. Output includes a step-by-step solution, explanation of why the chosen option failed, an actionable tip, and a targeted practice problem.

---

## 7. Gamification & Student Retention Engine

- **15-Tier Level Curve:** Level 1 Explorer (0 XP) through Level 15 Supreme Luminary (17,500+ XP) with infinite scalable tiers (+3,000 XP per tier beyond Level 15).
- **XP Formula:** `Base (+20) + (Correct * 5) + Perfect Score Bonus (+30) + Comeback Improvement (+25) + Weak Topic Practice (+25) + Streak Milestone Bonuses`.
- **LearnCoins Economy:** Earned alongside XP; spent in the Rewards Vault to purchase avatar frames (Cyber Neon, Golden Scholar), themes (Matrix, Deep Space), titles (Math Prodigy, AI Pioneer), and Streak Freeze Shields.
- **Daily Quests:** 4 auto-generated daily missions reset daily to drive retention.

---

## 8. Feature Implementation Audit Matrix

| Feature Module | Implementation Status | Code Locations | Notes / Verified Details |
| :--- | :---: | :--- | :--- |
| **Authentication & Sessions** | **100% Completed** | `backend/middleware/auth.js`, `backend/routes/authRoutes.js` | Cookie-based JWT exchange, auto token rotation, guest guards. |
| **Multi-Role RBAC** | **100% Completed** | `backend/middleware/auth.js`, `frontend/js/app.js` | Strict server enforcement for student, teacher, and admin. |
| **AI Quiz Generation** | **100% Completed** | `backend/services/aiService.js`, `backend/routes/assessmentRoutes.js` | Gemini Flash SDK + REST fallback + 5-subject template bank. |
| **Learning Intelligence** | **100% Completed** | `backend/services/aiService.js`, `frontend/script.js` | 4-category cognitive error engine with confidence gates. |
| **Gamification Engine** | **100% Completed** | `backend/services/gamificationService.js`, `backend/services/gamification/*` | 15 levels, XP math, LearnCoins, 12 badges, streak tracker. |
| **Admin Management** | **100% Completed** | `backend/routes/adminRoutes.js`, `frontend/js/admin.js` | Telemetry overview, user table, dynamic role promotion API. |
| **Teacher Interventions** | **100% Completed** | `backend/routes/teacherRoutes.js`, `frontend/js/teacher.js` | 5-minute remedial lesson plans and 3-question mini-drills. |
| **Class Learning Map** | **Partially Completed** | `backend/routes/teacherRoutes.js`, `backend/constants/curriculum.js` | Uses Supabase data; falls back to curriculum presets when grades lack quiz history. |
| **KaTeX Formula Display** | **Partially Completed** | `frontend/index.html`, `frontend/script.js` | KaTeX styles loaded; complex formula rendering active on select math questions. |
| **LMS Integration (LTI 1.3)** | **Future Roadmap** | Planned | Integration with Canvas, Moodle, and Google Classroom. |
| **Vector RAG Embeddings** | **Future Roadmap** | Planned | pgvector indexing of NCERT and state board textbooks. |

---

## 9. Comprehensive Manager Presentation Slide Outline

The presentation file [`LearnIQ_Manager_Presentation.pptx`](file:///c:/Users/2025s/Desktop/screening1/LearnIQ_Manager_Presentation.pptx) contains 20 widescreen (16:9) slides formatted with dark executive styling and full speaker notes:

- **Slide 1:** Title — LearnIQ: AI-Powered Learning Intelligence Platform
- **Slide 2:** Problem Statement — The Diagnostic Blindspot in Modern Education
- **Slide 3:** Product Solution — LearnIQ's Continuous Learning Intelligence Loop
- **Slide 4:** User Roles & Permissions — Verified Multi-Role Access Control (RBAC)
- **Slide 5:** System Architecture — High-Level Full-Stack Engineering Blueprint
- **Slide 6:** Technology Stack — Codebase-Verified Production Stack
- **Slide 7:** Security Architecture — Cookie-Based Authentication & Zero-Trust Security
- **Slide 8:** Student Journey — From Setup to Cognitive Evaluation
- **Slide 9:** AI Quiz Generation — Prompt Construction & 3-Tier Fallback Engine
- **Slide 10:** Learning Intelligence — Pedagogical Error Classification & Remediation
- **Slide 11:** Gamification Engine — 15 Levels, XP Math & Reward Vault
- **Slide 12:** Teacher Intelligence — Class Learning Map & 5-Minute Interventions
- **Slide 13:** Admin System — Platform Telemetry & User Management
- **Slide 14:** Database Architecture — Supabase PostgreSQL Schema & RLS
- **Slide 15:** Technical Flow — Step-by-Step Lifecycle of a Quiz Submission
- **Slide 16:** Implementation Status — Honest Verification Matrix (Completed vs Planned)
- **Slide 17:** Engineering Quality — 19/19 Unit Tests, Anti-Cheat & Reliability
- **Slide 18:** Demo Script — Walkthrough: What I Show → What Happens → Why It Matters
- **Slide 19:** Strategic Roadmap — Institutional Scaling & Textbook RAG
- **Slide 20:** Executive Conclusion — Key Value Takeaways & Pilot Readiness

---

## 10. Manager Q&A Defense Guide

### Q1: What problem does LearnIQ solve?
**Answer:** Traditional quizzes score correctness (e.g. 6/10) but fail to identify the cognitive reason for failure. LearnIQ diagnoses *why* a student failed—categorizing errors into Conceptual, Calculation, Misinterpretation, or Careless errors—while giving teachers real-time classroom concept heatmaps.

### Q2: What makes LearnIQ different from a standard LMS (like Canvas, Moodle, or Google Forms)?
**Answer:** Standard LMS quiz modules serve static, identical questions and only check if option A matches option B. LearnIQ generates curriculum-aligned questions on demand, performs cognitive mistake classification, gives step-by-step remediation, and automatically generates 5-minute remedial lesson plans for teachers.

### Q3: How is this different from simply using ChatGPT?
**Answer:** ChatGPT is an unconstrained chatbot without curriculum boundaries, classroom state, or evaluation tracking. LearnIQ is a structured institutional platform: it forces JSON schemas, isolates subject topics, validates class level restrictions, enforces anti-cheat cooldowns, logs XP and streaks to a database, and aggregates class-wide learning gaps for teachers.

### Q4: How is student data protected?
**Answer:** We follow zero-trust security principles. Session tokens are held in `HttpOnly`, `SameSite=Lax` cookies, protecting them from browser XSS attacks. All database queries use RFC 4122 UUID validation to prevent SQL/PostgREST injection. Passwords are encrypted inside Supabase Auth, and user profiles are protected by Row Level Security.

### Q5: What happens if the Gemini AI service is unavailable or rate-limited?
**Answer:** We engineered a 3-tier fallback architecture. If the Google GenAI SDK fails, it attempts a direct REST endpoint. If internet or API quotas fail, it activates our deterministic curriculum template engine, serving curated questions across Physics, Chemistry, Biology, Math, and English so students never experience broken tests.

### Q6: How does the system prevent student cheating or spamming?
**Answer:** Answer verification happens strictly on the backend; the client never receives the answer key beforehand. Furthermore, `gamificationService.js` enforces a 3-second submission cooldown between attempts, and Express rate limiters restrict authentication and AI requests per IP.

### Q7: What are the strongest features of the project right now?
**Answer:** 
1. The **Cognitive Error Classification Engine** that explains the derivation and provides targeted practice for missed questions.
2. The **Zero-Trust Security Architecture** using HttpOnly cookie sessions and class-level role boundaries.
3. The **Resilient Dual-Engine AI Pipeline** backed by 19 automated tests that pass consistently.
