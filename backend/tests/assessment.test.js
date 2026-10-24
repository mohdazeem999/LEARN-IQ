const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const assessmentRoutes = require("../routes/assessmentRoutes");

function createTestApp(authSession = null) {
    const app = express();
    app.use(express.json());
    app.use((req, res, next) => {
        if (authSession) {
            req.auth = authSession;
        }
        next();
    });
    app.use("/api/assessments", assessmentRoutes);
    return app;
}

test("assessment generator rejects invalid parameters on the server", async () => {
    const studentSession = {
        user: {
            id: "11111111-1111-4111-8111-111111111111",
            name: "Test Student",
            role: "student",
            classNumber: 8,
            class: "Class 8"
        }
    };

    const app = createTestApp(studentSession);
    const server = app.listen(0);
    const port = server.address().port;

    try {
        // Missing subject
        let res = await fetch(`http://127.0.0.1:${port}/api/assessments/generate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ classLevel: 8, topic: "Fractions", questionCount: 5 })
        });
        assert.equal(res.status, 400);
        let data = await res.json();
        assert.match(data.message, /subject is required/i);

        // Missing topic
        res = await fetch(`http://127.0.0.1:${port}/api/assessments/generate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ classLevel: 8, subject: "Mathematics", topic: "", questionCount: 5 })
        });
        assert.equal(res.status, 400);
        data = await res.json();
        assert.match(data.message, /topic is required/i);

        // Invalid difficulty
        res = await fetch(`http://127.0.0.1:${port}/api/assessments/generate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ classLevel: 8, subject: "Mathematics", topic: "Fractions", difficulty: "SuperHard", questionCount: 5 })
        });
        assert.equal(res.status, 400);
        data = await res.json();
        assert.match(data.message, /difficulty must be one of/i);

        // Invalid question count
        res = await fetch(`http://127.0.0.1:${port}/api/assessments/generate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ classLevel: 8, subject: "Mathematics", topic: "Fractions", questionCount: 99 })
        });
        assert.equal(res.status, 400);
        data = await res.json();
        assert.match(data.message, /question count must be an integer between 1 and 30/i);
    } finally {
        server.close();
    }
});

test("student can only generate for their enrolled class, while teacher can generate for any Class 5-12", async () => {
    const studentSession = {
        user: {
            id: "11111111-1111-4111-8111-111111111111",
            name: "Test Student",
            role: "student",
            classNumber: 7,
            class: "Class 7"
        }
    };
    const teacherSession = {
        user: {
            id: "22222222-2222-4222-8222-222222222222",
            name: "Test Teacher",
            role: "teacher"
        }
    };

    // Test student forbidden from requesting different class
    const studentApp = createTestApp(studentSession);
    const studentServer = studentApp.listen(0);
    const studentPort = studentServer.address().port;

    try {
        const res = await fetch(`http://127.0.0.1:${studentPort}/api/assessments/generate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ classLevel: 10, subject: "Mathematics", topic: "Quadratic Equations", questionCount: 3 })
        });
        assert.equal(res.status, 403);
        const data = await res.json();
        assert.match(data.message, /As a Class 7 student/i);
    } finally {
        studentServer.close();
    }

    // Test teacher can generate for multiple classes (e.g. Class 6, Class 11)
    const teacherApp = createTestApp(teacherSession);
    const teacherServer = teacherApp.listen(0);
    const teacherPort = teacherServer.address().port;

    try {
        // Teacher generates for Class 6
        const res6 = await fetch(`http://127.0.0.1:${teacherPort}/api/assessments/generate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ classLevel: 6, subject: "Mathematics", topic: "Fractions & Decimals", questionCount: 3 })
        });
        assert.equal(res6.status, 200);
        const data6 = await res6.json();
        assert.equal(data6.success, true);
        assert.equal(data6.quiz.classLevel, "Class 6");
        assert.equal(data6.quiz.subject, "Mathematics");

        // Teacher generates for Class 11
        const res11 = await fetch(`http://127.0.0.1:${teacherPort}/api/assessments/generate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ classLevel: 11, subject: "Physics", topic: "Kinematics", questionCount: 3 })
        });
        assert.equal(res11.status, 200);
        const data11 = await res11.json();
        assert.equal(data11.success, true);
        assert.equal(data11.quiz.classLevel, "Class 11");

        // Teacher requesting invalid class (< 5 or > 12) is rejected
        const resInvalid = await fetch(`http://127.0.0.1:${teacherPort}/api/assessments/generate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ classLevel: 4, subject: "Science", topic: "Plants", questionCount: 3 })
        });
        assert.equal(resInvalid.status, 400);
        const dataInvalid = await resInvalid.json();
        assert.match(dataInvalid.message, /valid class level.*required/i);
    } finally {
        teacherServer.close();
    }
});

test("server strictly enforces time limit rules on quiz submit", async () => {
    const studentSession = {
        user: {
            id: "11111111-1111-4111-8111-111111111111",
            name: "Test Student",
            role: "student",
            classNumber: 10,
            class: "Class 10"
        }
    };

    const timedQuiz = {
        title: "Timed Algebra Quiz",
        subject: "Mathematics",
        classLevel: "Class 10",
        difficulty: "Medium",
        timeLimit: 120, // 2 minutes
        questions: [
            {
                id: 1,
                question: "What is 2 + 2?",
                options: ["3", "4", "5", "6"],
                correctIndex: 1,
                concept: "Arithmetic"
            }
        ]
    };

    const app = createTestApp(studentSession);
    const server = app.listen(0);
    const port = server.address().port;

    try {
        // 1. Submission claiming 300 seconds on a 120-second quiz (> 120 + 30s grace) -> Rejected
        const resExceeded = await fetch(`http://127.0.0.1:${port}/api/assessments/submit`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                quiz: timedQuiz,
                answers: { "1": 1 },
                timeElapsedSeconds: 300,
                startTime: new Date(Date.now() - 300000).toISOString()
            })
        });
        assert.equal(resExceeded.status, 400);
        const dataExceeded = await resExceeded.json();
        assert.match(dataExceeded.message, /time limit exceeded/i);

        // 2. Untimed quiz submission succeeds without time rejection
        const untimedQuiz = {
            title: "Untimed Conceptual Quiz",
            subject: "Physics",
            classLevel: "Class 10",
            difficulty: "Easy",
            questions: [
                {
                    id: 1,
                    question: "What is velocity?",
                    options: ["Speed with direction", "Acceleration", "Force", "Mass"],
                    correctIndex: 0,
                    concept: "Kinematics"
                }
            ]
        };

        const resUntimed = await fetch(`http://127.0.0.1:${port}/api/assessments/submit`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                quiz: untimedQuiz,
                answers: { "1": 0 },
                timeElapsedSeconds: 800
            })
        });
        assert.equal(resUntimed.status, 200);
        const dataUntimed = await resUntimed.json();
        assert.equal(dataUntimed.success, true);
    } finally {
        server.close();
    }
});

test("adaptive assessment activation uses genuine student class and topic, preventing duplicate or unprompted generation", async () => {
    const studentSession = {
        user: {
            id: "33333333-3333-4333-8333-333333333333",
            name: "Adaptive Student",
            role: "student",
            classNumber: 9,
            class: "Class 9"
        }
    };

    const app = createTestApp(studentSession);
    const server = app.listen(0);
    const port = server.address().port;

    try {
        // 1. Activation with real student class and subject/topic succeeds and returns genuine question set
        const res = await fetch(`http://127.0.0.1:${port}/api/assessments/generate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                classLevel: 9,
                subject: "Physics",
                topic: "Gravitation",
                difficulty: "Medium",
                questionCount: 4
            })
        });

        assert.equal(res.status, 200);
        const data = await res.json();
        assert.equal(data.success, true);
        assert.ok(data.quiz);
        assert.equal(data.quiz.classLevel, "Class 9");
        assert.equal(data.quiz.subject, "Physics");
        assert.equal(data.quiz.title, "Gravitation (Physics)");
        assert.ok(Array.isArray(data.quiz.questions));
        assert.equal(data.quiz.questions.length, 4);

        // Verify genuine question structure
        for (const q of data.quiz.questions) {
            assert.ok(q.question && q.question.length > 5);
            assert.ok(Array.isArray(q.options) && q.options.length >= 2);
            assert.equal(typeof q.correctIndex, "number");
        }

        // 2. Reject mismatched class if student attempts to generate for another class
        const resMismatch = await fetch(`http://127.0.0.1:${port}/api/assessments/generate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                classLevel: 10,
                subject: "Physics",
                topic: "Light Reflection & Refraction",
                questionCount: 4
            })
        });
        assert.equal(resMismatch.status, 403);
    } finally {
        server.close();
    }
});

