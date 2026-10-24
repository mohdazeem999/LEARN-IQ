# LearnIQ - Issue Investigation & Root Cause Map (ISSUE_MAP.md)

This document provides a comprehensive root cause analysis, file references, APIs, and database tables for the 9 identified issues across LearnIQ (Classes 5-12; Student, Teacher, Admin roles).

---

## Issue I1: Not responsive (desktop/landscape only)
* **Root Cause & Hypothesis:**
  * **Breakpoint Disconnect:** In `frontend/style.css`, `.sidebar` is defined with fixed width `260px` and `.main-content` has `margin-left: 260px; width: calc(100% - 260px)`. Responsive drawer collapse is set at `@media (max-width: 850px)`. Tablet portrait viewports (768px–834px) experience overlapping containers, compressed cards, and horizontal clipping.
  * **Rigid / Fixed Widths:** Modals (`#authModal`, `#challengeTaskModal`, `#diagnosisModal`) use fixed `width: 500px` / `width: 520px` without fluid `max-width: 95vw` constraints.
  * **Missing Overflow Protection:** Tables (`#testHistoryLogContainer`, admin user management, rankings) and topbar search (`width: min(420px, 42vw)`) lack `overflow-x: auto` wrappers, breaking mobile rendering below 600px.
* **Files:**
  * `frontend/style.css` (lines 58–75, 260–295, 1618–1740, 2555–2660)
  * `frontend/rankings.css` (lines 20–25, 120–150)
  * `frontend/adaptive-quiz.css` (lines 50–65, 568–585)
  * `frontend/index.html` (modal wrappers and container definitions)
* **APIs Involved:** None (Pure CSS & responsive layout structure).
* **Database Tables:** None.

---

## Issue I2: Tablet/mobile nav menu stuck over page
* **Root Cause & Hypothesis:**
  * **Missing Dismiss on Navigation:** In `frontend/script.js` (and `frontend/js/ui.js`), `toggleSidebar()` toggles `sidebar.classList.toggle("open")`. However, when a navigation item in `.sidebar` is tapped, `showPage(pageId)` activates the target view but never removes the `.open` class.
  * **No Backdrop / Dismissal Overlay:** No overlay element exists to catch outside taps.
  * **No Close Button:** `.sidebar` has no dedicated close button on mobile/tablet viewports.
  * **High Z-Index Layering:** `.sidebar` retains `transform: translateX(0)` with `position: fixed; z-index: 100`, permanently covering the page content.
* **Files:**
  * `frontend/script.js` (lines 123–176)
  * `frontend/js/ui.js` (lines 32–40, 68–95)
  * `frontend/index.html` (lines 45–145, 187–193)
  * `frontend/style.css` (lines 1636–1650)
* **APIs Involved:** None (Client-side DOM event handling).
* **Database Tables:** None.

---

## Issue I3: Rankings show other-class/unknown names (e.g. Arjun) and show when logged out
* **Root Cause & Hypothesis:**
  * **Unfiltered Cross-Class Query:** In `backend/routes/studentRoutes.js` (`GET /api/students/leaderboard`), the database query is:
    ```javascript
    supabase.from("profiles")
      .select("user_id, id, name, xp, streak, class, role")
      .eq("role", "student")
      .order("xp", { ascending: false })
      .limit(25);
    ```
    It performs no filtering by class. Students from Class 5 through Class 12 (including existing database users like Arjun) appear together on the class ranking board.
  * **Unauthenticated Access & Premature Fetching:** `GET /api/students/leaderboard` is defined before the `router.use(authenticate)` middleware, making it completely public. In `frontend/script.js`, `loadLeaderboard()` is invoked when logged out and populates the leaderboard UI for unauthenticated visitors instead of enforcing student authentication and class-specific isolation ("Track your progress against your classmates").
* **Files:**
  * `backend/routes/studentRoutes.js` (lines 8–46)
  * `frontend/script.js` (lines 1800–1945)
  * `frontend/js/gamification.js` (lines 510–615)
  * `frontend/index.html` (lines 1625–1672)
* **APIs Involved:**
  * `GET /api/students/leaderboard`
* **Database Tables:**
  * `public.profiles`

---

## Issue I4: Class vs semester/other labels; wrong class/subject/topic/difficulty/count passed to quiz generation
* **Root Cause & Hypothesis:**
  * **Conflicting Terminology:** UI forms alternate between "Class", "Grade", "Standard", and preset chips with hardcoded class levels (e.g., chips in `quickTopicChips` hardcode `classLevel: "10"`, `"6"`, `"11"`).
  * **Overwriting Student's Class:** In `frontend/script.js`, `setTopic(topic, subject, classLevel)` explicitly sets:
    `if (classLevel) document.getElementById("genClass").value = classLevel;`
    This overrides the student's assigned class with preset chips.
  * **Hardcoded Subject Overwrite:** `practiceLearningTopic(topic)` (lines 1412–1421) forcibly sets:
    `subject.value = "Mathematics"; onSubjectChange();`
    This clobbers whatever subject (e.g., Science, English) the student was practicing.
  * **Forced Fallback on 403:** In `backend/routes/assessmentRoutes.js` (lines 20–31), when a student requests a quiz for a different class than their authenticated profile class, the backend responds with `403 Forbidden`. The frontend catches this error and falls back to generating a 2-question placeholder mock quiz.
* **Files:**
  * `frontend/index.html` (lines 425–435, 493–560, 2400–2415)
  * `frontend/script.js` (lines 184–265, 1412–1440)
  * `frontend/js/quiz.js` (lines 10–100)
  * `backend/routes/assessmentRoutes.js` (lines 15–70)
  * `backend/services/aiService.js` (quiz generation prompts & curriculum rules)
* **APIs Involved:**
  * `POST /api/assessments/generate`
* **Database Tables:**
  * `public.quizzes`, `public.profiles`

---

## Issue I5: 5-minute timer auto-starts on class select
* **Root Cause & Hypothesis:**
  * **Automatic Execution in Page Switcher:** In `frontend/script.js`, lines 154–155 state:
    ```javascript
    if (pageId === "assessment" && (!currentQuiz || currentQuestionIdx === 0)) {
        startQuiz(currentQuiz || defaultQuiz);
    }
    ```
    Inside `startQuiz(quiz)` (line 409):
    `startTimer(300); // 5 minutes overall timer`
  * Whenever navigation to the assessment view occurs (via topic select, class select, or clicking Adaptive Quiz in sidebar/dashboard), `startQuiz()` auto-executes immediately, starting the 300-second (5-minute) timer without awaiting user initiation or confirmation.
  * **Leaked Intervals:** Previous timer intervals (`quizTimerInterval`, `questionTimerInterval`) were not cleared upon leaving the assessment page, creating orphaned background timers.
* **Files:**
  * `frontend/script.js` (lines 154–155, 400–425)
  * `frontend/js/quiz.js` (lines 235–270)
  * `frontend/index.html` (lines 70–76, 1160–1165)
* **APIs Involved:** None (Client-side timing and view lifecycle).
* **Database Tables:** None.

---

## Issue I6: Adaptive Quiz appears without user action
* **Root Cause & Hypothesis:**
  * **Direct View Mounting Without Confirmation:** In `frontend/script.js`, navigating to `assessment` immediately renders `defaultQuiz` (Class 10 Linear Equations) and mounts the question options, rather than displaying an introductory "Start Assessment" state or awaiting quiz generation parameters.
  * **Auto-Routing Side Effects:** Diagnostic modal close (`closeDiagnosisModal()`) and topic clicks in the intelligence view invoke `showPage("assessment")` or `showPage("generator")` with immediate transition paths that launch quizzes unexpectedly.
* **Files:**
  * `frontend/script.js` (lines 154–155, 350–358, 925–945, 1420–1430)
  * `frontend/js/quiz.js` (lines 190–200, 520–530)
  * `frontend/index.html` (lines 1200–1250)
* **APIs Involved:**
  * `GET /api/assessments/adaptive`, `POST /api/assessments/generate`
* **Database Tables:**
  * `public.quizzes`

---

## Issue I7: Challenge opens as auto-completed with fake XP/score
* **Root Cause & Hypothesis:**
  * **Property Name Mismatch (`problem` vs `taskQuestions`):** In `backend/services/gamificationService.js`, the daily challenge items in `CLASS_CHALLENGES` store interactive questions in property `taskQuestions: [{ q: "...", options: [...], correct: 1, explanation: "..." }]`. In `frontend/script.js`, `openChallengeTask` and `verifyAndClaimChallenge` check `c.problem`:
    ```javascript
    if (c.problem && selectedChallengeOption === null) return;
    if (c.problem && selectedChallengeOption !== c.problem.correctIndex) ...
    ```
    Because `c.problem` is `undefined`, the question never renders into the modal, and ALL verification checks are bypassed. The user can click "Complete & Claim" and immediately receive XP and rewards without solving anything.
  * **Hardcoded UI Defaults:** `frontend/index.html` contains static hardcoded values (`overviewStreakDays` = "3 Days", `overviewTotalXpAvailable` = "+200 XP", `overviewClassBadge` = "Class 10 Quests").
  * **Stale Pre-completed State in Store:** `backend/data/gamification_store.json` holds legacy records with pre-completed status (`completed: true, claimed: true, current: 6`).
* **Files:**
  * `backend/services/gamificationService.js` (lines 210–590)
  * `frontend/script.js` (lines 1239–1377)
  * `frontend/js/gamification.js` (lines 205–340)
  * `frontend/index.html` (lines 1535–1615)
  * `backend/data/gamification_store.json`
* **APIs Involved:**
  * `GET /api/students/challenges`, `POST /api/students/challenges/claim`
* **Database Tables:**
  * `public.student_achievements`, `public.xp_transactions`, `public.profiles`

---

## Issue I8: Learning Intelligence shows Math topics under Science
* **Root Cause & Hypothesis:**
  * **Static Hardcoded HTML Rows:** In `frontend/index.html` (lines 1441–1462), `<div id="subjectTopicsList">` contains four hardcoded `<article class="mastery-row">` elements:
    - Fractions (92%, Strong)
    - Algebra (71%, Developing)
    - Linear Equations (54%, Needs Practice)
    - Geometry (84%, Strong)
  * **Superficial Subject Filter:** In `frontend/script.js` (lines 1442–1457), `selectLearningSubject(subject)` is called when `<select id="learningSubjectSelect">` changes. It merely updates `nameEl.textContent = subject;` and toggles container visibility. It NEVER fetches, filters, or populates topics dynamically for the selected subject. When a user picks "Science", the heading says "Science" but the list beneath continues to display the static Math topics.
* **Files:**
  * `frontend/index.html` (lines 1380–1475)
  * `frontend/script.js` (lines 1442–1506)
  * `frontend/js/gamification.js` (lines 370–415)
  * `backend/routes/studentRoutes.js` (profile/gamification endpoints)
* **APIs Involved:**
  * `GET /api/students/profile`, `GET /api/students/history`
* **Database Tables:**
  * `public.quiz_submissions` (`mistake_categories`, `concept_stats`, `score_percentage`)

---

## Issue I9: Profile quiz count shows 2 after 1 quiz
* **Root Cause & Hypothesis:**
  * **Runtime Exception Triggers Fallback Duplication:** In `frontend/script.js`, inside `finishQuiz()`:
    1. Line 595: `logQuizAttendance(currentQuiz, data.analysis)` executes successfully, unshifting an entry into `studentQuizHistory` (count becomes 1).
    2. Line 596: `if (data.submission) await loadStudentHistory();` is invoked.
    3. `loadStudentHistory` is NOT defined in `script.js`! This throws an unhandled `TypeError: loadStudentHistory is not a function`.
    4. The error is caught by `catch (e)`. Because `Number.isInteger(e.status)` is false for a TypeError, execution cascades into the client-side offline fallback at line 610.
    5. At line 695 in the fallback, `logQuizAttendance(currentQuiz, mockAnalysis)` is called AGAIN.
    6. A second attendance record is pushed to `studentQuizHistory`, immediately inflating the quiz count to 2 for a single completed quiz.
  * **Differing Definitions of "Completed Quiz":** The client computes profile counts from an in-memory unshifted array (`studentQuizHistory`), while the backend writes to `gamification_store.json` (`store.submissions`) and Supabase `quiz_submissions`. Without unified server-backed history synchronization, in-memory duplicate pushes corrupt the display.
* **Files:**
  * `frontend/script.js` (lines 562–698, lines 2215–2270)
  * `frontend/js/quiz.js` (lines 400–440)
  * `backend/routes/assessmentRoutes.js` (lines 72–186)
  * `backend/services/gamificationService.js` (lines 780–980)
* **APIs Involved:**
  * `POST /api/assessments/submit`, `GET /api/students/history`
* **Database Tables:**
  * `public.quiz_submissions`, `public.profiles`
