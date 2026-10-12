# LEARN-IQ

AI-Powered Classroom Learning Intelligence & Quiz Generator Platform.

## Features
- **Clean Dashboard**: Responsive overview with daily active streak and live class rank tracking.
- **AI Quiz Generator**: Generates subject-aligned quizzes using Google Gemini AI across Physics, Chemistry, Biology, Mathematics, and English.
- **Class Learning Map**: Visual DNA breakdown of concept mastery percentages and targeted teacher intervention tools.
- **Student Profile & Test Attendance**: Subject-wise test attendance counters and detailed timestamped assessment history.
- **Supabase Authentication & Database Integration**: User authentication, streak tracking, and leaderboard data persistence.

## Tech Stack
- **Frontend**: HTML5, Vanilla JavaScript, Custom CSS (Glassmorphism design system), FontAwesome, KaTeX
- **Backend**: Node.js, Express.js, `@google/genai` (Gemini API), `@supabase/supabase-js`

## AI quiz feedback

Question-level explanations and personalized improvement plans use Google Gemini from the backend. Set `GEMINI_API_KEY` in the backend environment to enable generated feedback; the key is never sent to the browser. If Gemini is unavailable, quiz scoring remains based on the answer key, existing question explanations are shown, and retry is offered when the service may recover.

Quiz submissions are associated with the authenticated Supabase user and stored in `quiz_submissions`. Profile XP, streaks, and quiz history are read from Supabase, so they are shared across that user's devices.

## Authentication and local development

Authentication uses Supabase Auth. The backend exchanges credentials with Supabase and keeps each browser's session in `HttpOnly`, `SameSite=Lax` cookies; access and refresh tokens are not stored in browser JavaScript storage. Refresh tokens are rotated by Supabase and refreshed by the backend. Cookies last up to 30 days, subject to the Supabase Auth session policy, and logging out revokes only that device's session.

Set `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` (or `SUPABASE_ANON_KEY`), and the server-only `SUPABASE_SECRET_KEY` in `backend/.env`. Never expose the secret key to the frontend. Production must use HTTPS and `NODE_ENV=production` so session cookies are marked `Secure`. Configure email confirmation and the allowed redirect/site URLs under Supabase **Authentication** settings; when confirmation is required, users confirm their email before signing in.

New self-service accounts are students. Teacher and admin access comes from the existing `profiles.role` value and must be assigned by a trusted administrator, not selected during public registration. For an existing Auth user, update only that account's profile role in the Supabase SQL editor, for example:

```sql
UPDATE public.profiles
SET role = 'teacher'
WHERE user_id = '<existing-auth-user-uuid>';
```

Use `admin` for an administrator account. The existing `profiles`, `quizzes`, and `quiz_submissions` tables are reused; existing user accounts and profile records are not deleted.

Before deploying the backend, apply [`backend/profile-auth-migration.sql`](./backend/profile-auth-migration.sql) in the Supabase SQL Editor. It adds the missing `profiles.user_id` link, associates legacy profiles to Auth users by email, and enables RLS without exposing profile data to anonymous clients. The backend uses the server-only Supabase key and enforces each request's user ID and role.

From the repository root, start the app and run backend tests with:

```powershell
cd backend
npm install
npm run dev
```

In another terminal, run `cd backend; npm test`. The application is served at `http://localhost:5000` by default.
