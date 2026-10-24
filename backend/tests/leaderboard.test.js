const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const studentRoutes = require("../routes/studentRoutes");

// Helper to create test app with studentRoutes
function createTestApp(authSession = null) {
    const app = express();
    app.use(express.json());
    // Simulate auth middleware injection for testing
    app.use((req, res, next) => {
        if (authSession) {
            req.auth = authSession;
        }
        next();
    });
    app.use("/api/students", studentRoutes);
    return app;
}

test("leaderboard rejects unauthenticated (logged-out) requests with 401", async () => {
    // When no auth session exists, the authenticate middleware rejects with 401
    const app = express();
    app.use("/api/students", studentRoutes);

    const server = app.listen(0);
    const port = server.address().port;

    try {
        const response = await fetch(`http://127.0.0.1:${port}/api/students/leaderboard`);
        assert.equal(response.status, 401);
        const data = await response.json();
        assert.equal(data.success, false);
        assert.match(data.message, /authentication required/i);
    } finally {
        server.close();
    }
});

test("Class 7 student is strictly scoped to Class 7 and ignores client-tampered class param", async () => {
    // Authenticated Class 7 student
    const class7StudentSession = {
        user: {
            id: "b639be23-9e83-43df-a8ae-03136cf3355c",
            name: "Arjun Sharma",
            email: "student_1791826187706@test.local",
            role: "student",
            class: "Class 7",
            classNumber: 7
        }
    };

    const app = createTestApp(class7StudentSession);
    const server = app.listen(0);
    const port = server.address().port;

    try {
        // Attempt tampering by passing ?classLevel=10 and ?class=12
        const response = await fetch(`http://127.0.0.1:${port}/api/students/leaderboard?classLevel=10&class=12`);
        assert.equal(response.status, 200);
        const data = await response.json();

        assert.equal(data.success, true);
        assert.equal(data.classNumber, 7);
        assert.equal(data.className, "Class 7");

        // Every student in the returned leaderboard must be Class 7
        if (data.leaderboard.length > 0) {
            for (const item of data.leaderboard) {
                assert.equal(item.class, "Class 7");
            }
            // Class 10 students must NOT appear in Class 7 rankings
            assert.ok(!data.leaderboard.some(item => item.name === "Alex Student"));
            assert.ok(!data.leaderboard.some(item => item.name === "mohdazeez"));
        }
    } finally {
        server.close();
    }
});

test("Class 10 student is strictly scoped to Class 10 and cannot see Class 7 students (e.g. Arjun)", async () => {
    // Authenticated Class 10 student
    const class10StudentSession = {
        user: {
            id: "27171240-0dac-472b-96b9-6f5e1b06d035",
            name: "mohdazeez",
            email: "mohdazeemuddinahmed5@gmail.com",
            role: "student",
            class: "Class 10",
            classNumber: 10
        }
    };

    const app = createTestApp(class10StudentSession);
    const server = app.listen(0);
    const port = server.address().port;

    try {
        const response = await fetch(`http://127.0.0.1:${port}/api/students/leaderboard`);
        assert.equal(response.status, 200);
        const data = await response.json();

        assert.equal(data.success, true);
        assert.equal(data.classNumber, 10);
        assert.equal(data.className, "Class 10");

        // Every student in the returned leaderboard must be Class 10
        if (data.leaderboard.length > 0) {
            for (const item of data.leaderboard) {
                assert.equal(item.class, "Class 10");
            }
            // Arjun Sharma (who is enrolled in Class 7) must NOT appear in Class 10 rankings
            assert.ok(!data.leaderboard.some(item => item.name === "Arjun Sharma"));
        }
    } finally {
        server.close();
    }
});

test("missing student class returns missingClass prompt and never silently defaults to Class 10", async () => {
    // Student with no assigned class
    const unassignedStudentSession = {
        user: {
            id: "unassigned-user-id",
            name: "New Student",
            role: "student",
            class: null,
            classNumber: null
        }
    };

    const app = createTestApp(unassignedStudentSession);
    const server = app.listen(0);
    const port = server.address().port;

    try {
        const response = await fetch(`http://127.0.0.1:${port}/api/students/leaderboard`);
        assert.equal(response.status, 200);
        const data = await response.json();

        assert.equal(data.success, true);
        assert.equal(data.missingClass, true);
        assert.equal(data.classNumber, null);
        assert.equal(data.leaderboard.length, 0);
        assert.match(data.message, /set your class/i);
    } finally {
        server.close();
    }
});
