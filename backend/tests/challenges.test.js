const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
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

test("challenge lifecycle: opening challenge awards 0 XP and keeps answers secure server-side", async () => {
    const studentId = "44444444-4444-4444-8444-444444444444";
    const studentSession = {
        user: {
            id: studentId,
            name: "Challenge Test Student",
            role: "student",
            classNumber: 10,
            class: "Class 10"
        }
    };

    const profileBefore = await gamificationService.getStudentGamificationProfile(studentId);
    const initialXp = profileBefore.totalXp || 0;

    const app = createTestApp(studentSession);
    const server = app.listen(0);
    const port = server.address().port;

    try {
        // 1. Open / View challenges
        const res = await fetch(`http://127.0.0.1:${port}/api/students/challenges`);
        assert.equal(res.status, 200);
        const data = await res.json();
        assert.equal(data.success, true);
        assert.equal(data.classNumber, 10);
        assert.ok(Array.isArray(data.challenges));
        assert.ok(data.challenges.length > 0);

        // Verify correct answers and explanations are NOT leaked to the client
        for (const c of data.challenges) {
            if (Array.isArray(c.questions)) {
                for (const q of c.questions) {
                    assert.equal(q.correct, undefined, "Server must not leak correct answer index");
                    assert.equal(q.explanation, undefined, "Server must not leak explanation before submit");
                }
            }
            if (c.problem) {
                assert.equal(c.problem.correct, undefined);
                assert.equal(c.problem.correctIndex, undefined);
                assert.equal(c.problem.explanation, undefined);
            }
        }

        // Verify opening gave 0 XP
        const profileAfter = await gamificationService.getStudentGamificationProfile(studentId);
        assert.equal(profileAfter.totalXp || 0, initialXp, "Opening challenges must award 0 XP");
    } finally {
        server.close();
    }
});

test("submitting incorrect answers (0 correct) awards 0 XP and leaves challenge uncompleted", async () => {
    const studentId = "55555555-5555-4555-8555-555555555555";
    const studentSession = {
        user: {
            id: studentId,
            name: "Wrong Answer Student",
            role: "student",
            classNumber: 10,
            class: "Class 10"
        }
    };

    const profileBefore = await gamificationService.getStudentGamificationProfile(studentId);
    const initialXp = profileBefore.totalXp || 0;

    const app = createTestApp(studentSession);
    const server = app.listen(0);
    const port = server.address().port;

    try {
        // Submit all incorrect answers (option 3 is wrong for all questions in c10_math_quad)
        const res = await fetch(`http://127.0.0.1:${port}/api/students/challenges/submit`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                challengeId: "c10_math_quad",
                answers: { "0": 3, "1": 3 }
            })
        });

        assert.equal(res.status, 200);
        const data = await res.json();
        assert.equal(data.success, false);
        assert.equal(data.passed, false);
        assert.equal(data.earnedXp, 0);
        assert.equal(data.scorePercentage, 0);

        // Verify 0 XP awarded in profile
        const profileAfter = await gamificationService.getStudentGamificationProfile(studentId);
        assert.equal(profileAfter.totalXp || 0, initialXp);
    } finally {
        server.close();
    }
});

test("submitting correct answers awards correct XP once; repeat submit awards NO new XP (idempotency)", async () => {
    const studentId = require("node:crypto").randomUUID();
    const studentSession = {
        user: {
            id: studentId,
            name: "Idempotent Student",
            role: "student",
            classNumber: 10,
            class: "Class 10"
        }
    };

    const profileBefore = await gamificationService.getStudentGamificationProfile(studentId);
    const initialXp = profileBefore.totalXp || 0;

    const app = createTestApp(studentSession);
    const server = app.listen(0);
    const port = server.address().port;

    try {
        // First valid submission: c10_math_quad questions:
        // q0: discriminant of 2x² - 4x + 2 = 0 is 0 (option 1)
        // q1: roots of x² - 5x + 6 = 0 are 2, 3 (option 0)
        const resFirst = await fetch(`http://127.0.0.1:${port}/api/students/challenges/submit`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                challengeId: "c10_math_quad",
                answers: { "0": 1, "1": 0 }
            })
        });

        assert.equal(resFirst.status, 200);
        const dataFirst = await resFirst.json();
        assert.equal(dataFirst.success, true);
        assert.equal(dataFirst.passed, true);
        assert.equal(dataFirst.scorePercentage, 100);
        assert.equal(dataFirst.earnedXp, 95); // c10_math_quad has xpReward: 95
        assert.equal(dataFirst.alreadyClaimed, undefined);

        const profileAfterFirst = await gamificationService.getStudentGamificationProfile(studentId);
        assert.equal(profileAfterFirst.totalXp, initialXp + 95);

        // Repeat submission (e.g. double click, page refresh, or re-submit)
        const resRepeat = await fetch(`http://127.0.0.1:${port}/api/students/challenges/submit`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                challengeId: "c10_math_quad",
                answers: { "0": 1, "1": 0 }
            })
        });

        assert.equal(resRepeat.status, 200);
        const dataRepeat = await resRepeat.json();
        assert.equal(dataRepeat.success, true);
        assert.equal(dataRepeat.alreadyClaimed, true);
        assert.equal(dataRepeat.earnedXp, 0); // No new XP awarded!

        const profileAfterRepeat = await gamificationService.getStudentGamificationProfile(studentId);
        assert.equal(profileAfterRepeat.totalXp, initialXp + 95, "Repeat submit must not increase XP");
    } finally {
        server.close();
    }
});

test("attempt ownership: student submitting attempt for another student is rejected with 403", async () => {
    const studentId = "77777777-7777-4777-8777-777777777777";
    const studentSession = {
        user: {
            id: studentId,
            name: "Legit Student",
            role: "student",
            classNumber: 10,
            class: "Class 10"
        }
    };

    const app = createTestApp(studentSession);
    const server = app.listen(0);
    const port = server.address().port;

    try {
        const res = await fetch(`http://127.0.0.1:${port}/api/students/challenges/submit`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                challengeId: "c10_math_quad",
                studentId: "88888888-8888-4888-8888-888888888888", // Different student!
                answers: { "0": 0, "1": 0 }
            })
        });

        assert.equal(res.status, 403);
        const data = await res.json();
        assert.match(data.message, /cannot submit attempts for another student/i);
    } finally {
        server.close();
    }
});
