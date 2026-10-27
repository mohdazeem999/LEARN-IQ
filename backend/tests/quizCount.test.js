const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const crypto = require("crypto");
const studentRoutes = require("../routes/studentRoutes");
const assessmentRoutes = require("../routes/assessmentRoutes");
const gamificationService = require("../services/gamificationService");

function createTestApp(authSession = null) {
    const app = express();
    app.use(express.json());
    app.use((req, res, next) => {
        if (authSession) {
            req.auth = authSession;
        }
        next();
    });
    app.use("/api/students", studentRoutes);
    app.use("/api/assessments", assessmentRoutes);
    return app;
}

test("Quiz Count Lifecycle: 0 quizzes = 0 across Profile, History, and Intelligence", async () => {
    const studentId = crypto.randomUUID();
    const studentSession = {
        user: {
            id: studentId,
            name: "New Student Zero",
            role: "student",
            class: "Class 10"
        }
    };

    const app = createTestApp(studentSession);
    const server = app.listen(0);
    const port = server.address().port;

    try {
        // 1. Profile count
        const profRes = await fetch(`http://127.0.0.1:${port}/api/students/profile`);
        const profData = await profRes.json();
        assert.equal(profRes.status, 200);
        assert.equal(profData.student.stats.totalAssessments, 0);
        assert.equal(profData.student.recentHistory.length, 0);

        // 2. History count
        const histRes = await fetch(`http://127.0.0.1:${port}/api/students/history`);
        const histData = await histRes.json();
        assert.equal(histRes.status, 200);
        assert.equal(histData.history.length, 0);

        // 3. Learning Intelligence count
        const intRes = await fetch(`http://127.0.0.1:${port}/api/students/intelligence?subject=Mathematics`);
        const intData = await intRes.json();
        assert.equal(intRes.status, 200);
        assert.equal(intData.totalAttempts, 0);
        assert.equal(intData.topics.length, 0);
    } finally {
        server.close();
    }
});

test("Quiz Count Lifecycle: Opening or generating without submit does NOT increment quiz count", async () => {
    const studentId = crypto.randomUUID();
    const studentSession = {
        user: {
            id: studentId,
            name: "Abandoning Student",
            role: "student",
            class: "Class 10"
        }
    };

    const app = createTestApp(studentSession);
    const server = app.listen(0);
    const port = server.address().port;

    try {
        // Generate quiz but never submit answers
        const genRes = await fetch(`http://127.0.0.1:${port}/api/assessments/generate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                classLevel: 10,
                subject: "Mathematics",
                topic: "Linear Equations",
                questionCount: 3,
                difficulty: "Medium"
            })
        });
        const genData = await genRes.json();
        assert.equal(genRes.status, 200);
        assert.ok(genData.quiz);

        // Verify history and profile still report 0
        const histRes = await fetch(`http://127.0.0.1:${port}/api/students/history`);
        const histData = await histRes.json();
        assert.equal(histData.history.length, 0);

        const profRes = await fetch(`http://127.0.0.1:${port}/api/students/profile`);
        const profData = await profRes.json();
        assert.equal(profData.student.stats.totalAssessments, 0);
    } finally {
        server.close();
    }
});

test("Quiz Count Lifecycle: 1 completed quiz shows exactly 1 across Profile, History, and Intelligence; Refresh = unchanged", async () => {
    const studentId = crypto.randomUUID();
    const studentSession = {
        user: {
            id: studentId,
            name: "Single Quiz Student",
            role: "student",
            class: "Class 10"
        }
    };

    const app = createTestApp(studentSession);
    const server = app.listen(0);
    const port = server.address().port;

    try {
        const quizId = crypto.randomUUID();
        const quiz = {
            id: quizId,
            title: "Linear Equations Mastery",
            subject: "Mathematics",
            topic: "Linear Equations",
            classLevel: "Class 10",
            difficulty: "Medium",
            questions: [
                {
                    id: 1,
                    question: "Solve 2x + 4 = 10",
                    options: ["x = 2", "x = 3", "x = 4", "x = 5"],
                    correctIndex: 1,
                    concept: "Linear Equations"
                }
            ]
        };

        const submitRes = await fetch(`http://127.0.0.1:${port}/api/assessments/submit`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                quiz,
                answers: { 1: 1 },
                idempotencyKey: `sub_${quizId}_${studentId}`
            })
        });
        const submitData = await submitRes.json();
        assert.equal(submitRes.status, 200);
        assert.equal(submitData.success, true);

        // Verification 1: Quiz History length must be exactly 1
        const histRes = await fetch(`http://127.0.0.1:${port}/api/students/history`);
        const histData = await histRes.json();
        assert.equal(histData.history.length, 1);
        assert.ok(histData.history[0].topic.includes("Linear Equations"));

        // Verification 2: Profile stats totalAssessments must be exactly 1
        const profRes = await fetch(`http://127.0.0.1:${port}/api/students/profile`);
        const profData = await profRes.json();
        assert.equal(profData.student.stats.totalAssessments, 1);
        assert.equal(profData.student.recentHistory.length, 1);

        // Verification 3: Learning Intelligence totalAttempts must be exactly 1
        const intRes = await fetch(`http://127.0.0.1:${port}/api/students/intelligence?subject=Mathematics`);
        const intData = await intRes.json();
        assert.equal(intData.totalAttempts, 1);

        // Verification 4: Simulate page refresh (re-query endpoints) -> counts remain unchanged!
        const refreshHist = await fetch(`http://127.0.0.1:${port}/api/students/history`);
        const refreshHistData = await refreshHist.json();
        assert.equal(refreshHistData.history.length, 1);

        const refreshProf = await fetch(`http://127.0.0.1:${port}/api/students/profile`);
        const refreshProfData = await refreshProf.json();
        assert.equal(refreshProfData.student.stats.totalAssessments, 1);

        const refreshInt = await fetch(`http://127.0.0.1:${port}/api/students/intelligence?subject=Mathematics`);
        const refreshIntData = await refreshInt.json();
        assert.equal(refreshIntData.totalAttempts, 1);
    } finally {
        server.close();
    }
});

test("Idempotency: repeat / double submit handler does not create duplicates or award duplicate XP", async () => {
    const studentId = crypto.randomUUID();
    const studentSession = {
        user: {
            id: studentId,
            name: "Idempotent Student",
            role: "student",
            class: "Class 10"
        }
    };

    const app = createTestApp(studentSession);
    const server = app.listen(0);
    const port = server.address().port;

    try {
        const quizId = crypto.randomUUID();
        const quiz = {
            id: quizId,
            title: "Trigonometry Basics",
            subject: "Mathematics",
            topic: "Trigonometry",
            classLevel: "Class 10",
            difficulty: "Medium",
            questions: [
                {
                    id: 1,
                    question: "What is sin(90°)?",
                    options: ["0", "0.5", "1", "undefined"],
                    correctIndex: 2,
                    concept: "Trigonometry"
                }
            ]
        };

        const idempotencyKey = `idemp_${quizId}_attempt_1`;

        // First submit
        const sub1 = await fetch(`http://127.0.0.1:${port}/api/assessments/submit`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                quiz,
                answers: { 1: 2 },
                idempotencyKey
            })
        });
        const sub1Data = await sub1.json();
        assert.equal(sub1.status, 200);
        assert.equal(sub1Data.success, true);
        const originalSubmissionId = sub1Data.submission.id;
        const awardedXp = sub1Data.gamification.earnedXp;
        assert.ok(awardedXp > 0);

        // Immediate repeat / double submit with same idempotency key / quiz
        const sub2 = await fetch(`http://127.0.0.1:${port}/api/assessments/submit`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                quiz,
                answers: { 1: 2 },
                idempotencyKey
            })
        });
        const sub2Data = await sub2.json();
        assert.equal(sub2.status, 200);
        assert.equal(sub2Data.success, true);
        assert.equal(sub2Data.gamification.isDuplicate, true);
        assert.equal(sub2Data.gamification.earnedXp, 0); // No double XP awarded!
        assert.equal(sub2Data.submission.id, originalSubmissionId);

        // Quiz count remains strictly 1 across History and Profile
        const histRes = await fetch(`http://127.0.0.1:${port}/api/students/history`);
        const histData = await histRes.json();
        assert.equal(histData.history.length, 1);

        const profRes = await fetch(`http://127.0.0.1:${port}/api/students/profile`);
        const profData = await profRes.json();
        assert.equal(profData.student.stats.totalAssessments, 1);
    } finally {
        server.close();
    }
});

test("Multiple quizzes (several = correct): distinct quizzes increment count cleanly across all views", async () => {
    const studentId = crypto.randomUUID();
    const studentSession = {
        user: {
            id: studentId,
            name: "Multi Quiz Student",
            role: "student",
            class: "Class 10"
        }
    };

    const app = createTestApp(studentSession);
    const server = app.listen(0);
    const port = server.address().port;

    try {
        const subjects = ["Mathematics", "Physics", "Chemistry"];
        for (let i = 0; i < subjects.length; i++) {
            gamificationService.resetSubmissionRateLimit(studentId);

            const qId = crypto.randomUUID();
            const quiz = {
                id: qId,
                title: `${subjects[i]} Unit ${i + 1}`,
                subject: subjects[i],
                topic: `Topic ${i + 1}`,
                classLevel: "Class 10",
                difficulty: "Medium",
                questions: [
                    {
                        id: 1,
                        question: "Sample Question",
                        options: ["A", "B", "C", "D"],
                        correctIndex: 0,
                        concept: `Concept ${i + 1}`
                    }
                ]
            };

            const sub = await fetch(`http://127.0.0.1:${port}/api/assessments/submit`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    quiz,
                    answers: { 1: 0 },
                    idempotencyKey: `multi_${qId}`
                })
            });
            assert.equal(sub.status, 200);
        }

        // Must report exactly 3 across all endpoints
        const histRes = await fetch(`http://127.0.0.1:${port}/api/students/history`);
        const histData = await histRes.json();
        assert.equal(histData.history.length, 3);

        const profRes = await fetch(`http://127.0.0.1:${port}/api/students/profile`);
        const profData = await profRes.json();
        assert.equal(profData.student.stats.totalAssessments, 3);
        assert.equal(profData.student.recentHistory.length, 3);

        // Subject breakdown in history
        const mathHist = await fetch(`http://127.0.0.1:${port}/api/students/history?subject=Mathematics`);
        const mathData = await mathHist.json();
        assert.equal(mathData.history.length, 1);

        const physHist = await fetch(`http://127.0.0.1:${port}/api/students/history?subject=Physics`);
        const physData = await physHist.json();
        assert.equal(physData.history.length, 1);
    } finally {
        server.close();
    }
});

test("Deduplication: Student with legacy cross-source entries (DB + store) resolves to correct single count", async () => {
    // Student 89477a22-911b-435a-8fcc-43a2a4bab2d3 has 4 submissions in DB and 4 in store for the same 4 quizzes
    const studentId = "89477a22-911b-435a-8fcc-43a2a4bab2d3";
    const studentSession = {
        user: {
            id: studentId,
            name: "Alex Student",
            role: "student",
            class: "Class 10"
        }
    };

    const app = createTestApp(studentSession);
    const server = app.listen(0);
    const port = server.address().port;

    try {
        const histRes = await fetch(`http://127.0.0.1:${port}/api/students/history`);
        const histData = await histRes.json();
        // There are 4 distinct quizzes taken by this student, NOT 8!
        assert.equal(histData.history.length, 4);

        const profRes = await fetch(`http://127.0.0.1:${port}/api/students/profile`);
        const profData = await profRes.json();
        assert.equal(profData.student.stats.totalAssessments, 4);
    } finally {
        server.close();
    }
});
