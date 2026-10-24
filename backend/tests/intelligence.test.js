const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const crypto = require("crypto");
const studentRoutes = require("../routes/studentRoutes");
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
    return app;
}

test("Learning Intelligence: unauthenticated requests receive 401", async () => {
    const app = createTestApp(null);
    const server = app.listen(0);
    const port = server.address().port;

    try {
        const res = await fetch(`http://127.0.0.1:${port}/api/students/intelligence`);
        assert.equal(res.status, 401);
    } finally {
        server.close();
    }
});

test("Learning Intelligence: Science returns Science topics only, Math returns Math only, honest empty state for unattempted subject", async () => {
    const studentId = crypto.randomUUID();
    const studentSession = {
        user: {
            id: studentId,
            name: "Intelligence Test Student",
            role: "student",
            class: "Class 10"
        }
    };

    // Record 1 genuine Science quiz (Chemistry - Periodic Table)
    await gamificationService.processQuizSubmission({
        studentId,
        studentName: "Intelligence Test Student",
        quiz: {
            id: crypto.randomUUID(),
            title: "Periodic Table & Trends (Chemistry)",
            subject: "Chemistry",
            topic: "Periodic Table & Trends",
            classLevel: "Class 10"
        },
        answers: { 1: 0, 2: 1, 3: 2 },
        analysis: {
            scorePercentage: 100,
            correctCount: 3,
            totalQuestions: 3,
            mistakeCategories: {
                "Calculation Error": 0,
                "Conceptual Error": 0,
                "Misinterpretation": 0,
                "Careless Error": 0,
                "Unanswered": 0
            }
        }
    });

    // Record 1 genuine Mathematics quiz (Linear Equations)
    await gamificationService.processQuizSubmission({
        studentId,
        studentName: "Intelligence Test Student",
        quiz: {
            id: crypto.randomUUID(),
            title: "Linear Equations",
            subject: "Mathematics",
            topic: "Linear Equations",
            classLevel: "Class 10"
        },
        answers: { 1: 0, 2: 0, 3: 0, 4: 1, 5: 2 },
        analysis: {
            scorePercentage: 60,
            correctCount: 3,
            totalQuestions: 5,
            mistakeCategories: {
                "Calculation Error": 2,
                "Conceptual Error": 0,
                "Misinterpretation": 0,
                "Careless Error": 0,
                "Unanswered": 0
            }
        }
    });

    const app = createTestApp(studentSession);
    const server = app.listen(0);
    const port = server.address().port;

    try {
        // 1. Query Science: Must return Science (Chemistry) topics only, NEVER Math
        const sciRes = await fetch(`http://127.0.0.1:${port}/api/students/intelligence?subject=Science`);
        assert.equal(sciRes.status, 200);
        const sciData = await sciRes.json();
        assert.equal(sciData.success, true);
        assert.equal(sciData.subject, "Science");
        assert.equal(sciData.totalAttempts, 1);
        assert.equal(sciData.overallMastery, 100);
        assert.equal(sciData.topics.length, 1);
        assert.equal(sciData.topics[0].topic, "Periodic Table & Trends");
        assert.equal(sciData.topics[0].subject, "Chemistry");
        assert.equal(sciData.topics[0].mastery, 100);
        assert.equal(sciData.topics[0].status, "Strong");
        // Ensure no Mathematics topics leaked into Science
        const mathLeaksInSci = sciData.topics.filter(t => t.topic.toLowerCase().includes("linear") || t.subject === "Mathematics");
        assert.equal(mathLeaksInSci.length, 0, "Science must not return Mathematics topics");

        // 2. Query Mathematics: Must return Mathematics topics only, NEVER Science
        const mathRes = await fetch(`http://127.0.0.1:${port}/api/students/intelligence?subject=Mathematics`);
        assert.equal(mathRes.status, 200);
        const mathData = await mathRes.json();
        assert.equal(mathData.success, true);
        assert.equal(mathData.subject, "Mathematics");
        assert.equal(mathData.totalAttempts, 1);
        assert.equal(mathData.overallMastery, 60);
        assert.equal(mathData.topics.length, 1);
        assert.equal(mathData.topics[0].topic, "Linear Equations");
        assert.equal(mathData.topics[0].subject, "Mathematics");
        assert.equal(mathData.topics[0].mastery, 60);
        assert.equal(mathData.topics[0].status, "Developing");
        assert.ok(mathData.mistakes.length > 0);
        assert.equal(mathData.mistakes[0].title, "Calculation Errors");
        assert.equal(mathData.mistakes[0].count, 2);
        // Ensure no Science topics leaked into Mathematics
        const sciLeaksInMath = mathData.topics.filter(t => t.topic.toLowerCase().includes("periodic") || t.subject === "Chemistry");
        assert.equal(sciLeaksInMath.length, 0, "Mathematics must not return Science topics");

        // 3. Query unattempted subject (Social Science): Honest empty state without invented mastery
        const ssRes = await fetch(`http://127.0.0.1:${port}/api/students/intelligence?subject=Social%20Science`);
        assert.equal(ssRes.status, 200);
        const ssData = await ssRes.json();
        assert.equal(ssData.success, true);
        assert.equal(ssData.overallMastery, null, "Unattempted subject must have null mastery");
        assert.equal(ssData.totalAttempts, 0);
        assert.equal(ssData.topics.length, 0, "Unattempted subject must have 0 topics");
        assert.equal(ssData.mistakes.length, 0, "Unattempted subject must have 0 mistakes");
        assert.equal(ssData.nextAction, null, "Unattempted subject must have null next action");

        // 4. Must agree with history API
        const histSciRes = await fetch(`http://127.0.0.1:${port}/api/students/history?subject=Science`);
        const histSciData = await histSciRes.json();
        assert.equal(histSciData.success, true);
        assert.equal(histSciData.history.length, 1);
        assert.equal(histSciData.history[0].topic, "Periodic Table & Trends");

        const histMathRes = await fetch(`http://127.0.0.1:${port}/api/students/history?subject=Mathematics`);
        const histMathData = await histMathRes.json();
        assert.equal(histMathData.success, true);
        assert.equal(histMathData.history.length, 1);
        assert.equal(histMathData.history[0].topic, "Linear Equations");

    } finally {
        server.close();
    }
});
