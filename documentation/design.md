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

* bcryptjs for password hashing
* JWT for authentication
* `app_users` database table

## Development

* VS Code
* Git
* GitHub
* npm

---

# 8. Project Structure

The target project structure is:

```text
project/
│
├── package.json
├── server.js
├── .env
├── .env.example
├── README.md
├── DESIGN.md
│
├── controllers/
│   ├── authController.js
│   ├── assessmentController.js
│   ├── studentController.js
│   └── teacherController.js
│
├── routes/
│   ├── authRoutes.js
│   ├── assessmentRoutes.js
│   ├── studentRoutes.js
│   └── teacherRoutes.js
│
├── middleware/
│   └── authMiddleware.js
│
├── config/
│   └── supabase.js
│
├── database/
│   └── schema.sql
│
└── public/
    ├── index.html
    ├── style.css
    └── script.js
```

---

# 9. Frontend Architecture

The frontend is contained inside the `public/` folder.

```text
public/
├── index.html
├── style.css
└── script.js
```

## index.html

Responsible for:

* Page structure
* Login
* Registration
* Dashboard
* Assessment interface
* Learning intelligence interface
* Rankings
* Rewards
* Challenges
* Profile/settings

## style.css

Responsible for:

* Layout
* Responsive design
* Glassmorphism
* Dark theme
* Buttons
* Cards
* Navigation
* Assessment styling
* Dashboard components

## script.js

Responsible for:

* User interaction
* Navigation
* API requests
* Authentication state
* Assessment interaction
* Dashboard data
* UI updates

---

# 10. Backend Architecture

The backend follows a basic MVC-style separation.

```text
Request
   ↓
Route
   ↓
Middleware
   ↓
Controller
   ↓
Supabase
   ↓
Database
```

---

# 11. Server

`server.js` is the main backend entry point.

Responsibilities:

* Start Express.
* Load environment variables.
* Enable CORS.
* Parse JSON.
* Serve frontend files.
* Register API routes.
* Start the server.

Example flow:

```text
Browser
   ↓
http://localhost:5000
   ↓
Express
   ↓
public/index.html
```

---

# 12. Authentication Design

Authentication follows this flow:

## Registration

```text
Registration Form
       ↓
JavaScript
       ↓
POST /api/auth/register
       ↓
authRoutes.js
       ↓
authController.js
       ↓
Validate Input
       ↓
bcrypt.hash()
       ↓
Supabase
       ↓
app_users
```

A password is never stored as plain text.

---

## Login

```text
Login Form
     ↓
POST /api/auth/login
     ↓
authRoutes.js
     ↓
authController.js
     ↓
Find User
     ↓
bcrypt.compare()
     ↓
Generate JWT
     ↓
Return Token
     ↓
Frontend
     ↓
Dashboard
```

---

# 13. Protected Routes

Protected API requests require a valid JWT.

```text
Request
   ↓
Authorization Header
   ↓
authMiddleware.js
   ↓
JWT Verification
   ↓
Valid?
 ┌───┴───┐
No      Yes
↓        ↓
401     Controller
         ↓
      Database
```

---

# 14. Current User Flow

After login, the frontend obtains the authenticated user's information.

The dashboard should display actual database information.

Example:

```text
Welcome back, Azeem

XP: 0
Streak: 0
Rank: No rankings yet
```

These values must not be hard-coded.

---

# 15. Logout Design

Logout should:

```text
Logout Button
      ↓
Remove authentication token
      ↓
Clear user state
      ↓
Redirect to Login
```

If the user tries to access the dashboard afterward, the application should redirect them back to login.

---

# 16. Database Design

The database contains the major entities required for the learning intelligence system.

```text
app_users
profiles
subjects
topics
questions
quiz_attempts
quiz_answers
learning_progress
learning_mistakes
learning_recommendations
achievements
student_achievements
challenges
student_challenges
rewards
student_rewards
xp_transactions
```

---

# 17. User Data

`app_users` stores authentication and basic user information.

Important fields:

```text
id
name
email
password_hash
role
class
xp
streak
rank
created_at
```

Initial student values:

```text
xp = 0
streak = 0
rank = NULL
```

The frontend displays:

```text
Rank: No rankings yet
```

when no ranking exists.

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

* Password hashing.
* JWT verification.
* Protected routes.
* Role-based authorization.
* Environment variables for secrets.
* No real `.env` file in GitHub.
* No password hashes returned to frontend.
* Database access controls.
* Input validation.

---

# 36. Environment Configuration

Real credentials are stored locally in:

```text
.env
```

The repository contains only:

```text
.env.example
```

Example:

```env
PORT=5000
SUPABASE_URL=your_url_here
SUPABASE_ANON_KEY=your_key_here
JWT_SECRET=your_secret_here
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
/api/subjects
/api/topics
```

Authentication:

```text
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/me
```

Assessment:

```text
GET  /api/assessments
GET  /api/assessments/:id
POST /api/assessments/submit
```

---

# 38. Error Handling

The backend should return clear responses for:

* Missing input
* Invalid credentials
* Duplicate email
* Invalid token
* Unauthorized access
* Database errors
* Invalid question
* Invalid assessment

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
