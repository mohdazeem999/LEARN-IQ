const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const assignmentService = require("../services/assignmentService");
const { presentUser } = require("../utils/userPresenter");
const authRoutes = require("../routes/authRoutes");
const teacherRoutes = require("../routes/teacherRoutes");
const adminRoutes = require("../routes/adminRoutes");

// Helper to create test server with custom mock session
function createTestApp(authSession) {
    const app = express();
    app.use(express.json());
    app.use((req, res, next) => {
        if (authSession) req.auth = authSession;
        next();
    });
    app.use("/api/auth", authRoutes);
    app.use("/api/teachers", teacherRoutes);
    app.use("/api/admin", adminRoutes);
    return app;
}

test("Public registration is student-only: rejects teacher or admin signup with 403", async () => {
    const app = createTestApp(null);
    const server = app.listen(0);
    const port = server.address().port;

    try {
        // Attempting to register as teacher
        const resTeacher = await fetch(`http://127.0.0.1:${port}/api/auth/signup`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                email: "teacher_attempt@example.com",
                password: "password123",
                fullName: "Malicious User",
                role: "teacher"
            })
        });
        const dataTeacher = await resTeacher.json();
        assert.equal(resTeacher.status, 403);
        assert.equal(dataTeacher.success, false);
        assert.match(dataTeacher.message, /student-only/i);

        // Attempting to register as admin
        const resAdmin = await fetch(`http://127.0.0.1:${port}/api/auth/signup`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                email: "admin_attempt@example.com",
                password: "password123",
                fullName: "Malicious User",
                role: "admin"
            })
        });
        const dataAdmin = await resAdmin.json();
        assert.equal(resAdmin.status, 403);
        assert.equal(dataAdmin.success, false);
        assert.match(dataAdmin.message, /student-only/i);
    } finally {
        server.close();
    }
});

test("Role information in editable user_metadata is NEVER trusted for role authorization", () => {
    // Malicious user injected role: 'admin' into Supabase Auth user_metadata
    const tamperedAuthUser = {
        id: "77777777-7777-7777-7777-777777777777",
        email: "hacker@example.com",
        user_metadata: {
            role: "admin",
            full_name: "Hacker Account"
        }
    };

    // Database profile has role 'student' (or no role)
    const studentProfile = {
        id: tamperedAuthUser.id,
        role: "student",
        class: 10
    };

    const presented = presentUser(tamperedAuthUser, studentProfile);
    assert.equal(presented.role, "student");
    assert.equal(presented.roleName, "Student");

    // Profile missing role or null defaults strictly to student, never user_metadata.role
    const nullProfile = { id: tamperedAuthUser.id };
    const presentedDefault = presentUser(tamperedAuthUser, nullProfile);
    assert.equal(presentedDefault.role, "student");
});

test("Teacher endpoints are strictly protected: students are rejected with 403", async () => {
    const studentSession = {
        user: {
            id: "11111111-1111-1111-1111-111111111111",
            name: "Test Student",
            role: "student",
            class: 10
        }
    };
    const app = createTestApp(studentSession);
    const server = app.listen(0);
    const port = server.address().port;

    try {
        const resClasses = await fetch(`http://127.0.0.1:${port}/api/teachers/classes`);
        assert.equal(resClasses.status, 403);

        const resMap = await fetch(`http://127.0.0.1:${port}/api/teachers/class-map?classLevel=10`);
        assert.equal(resMap.status, 403);

        const resIntervention = await fetch(`http://127.0.0.1:${port}/api/teachers/intervention`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ concept: "Linear Equations", className: "Class 10" })
        });
        assert.equal(resIntervention.status, 403);
    } finally {
        server.close();
    }
});

test("Teacher class isolation: teacher can ONLY access classes assigned to them", async () => {
    const teacherId = "22222222-2222-2222-2222-222222222222";
    const teacherSession = {
        user: {
            id: teacherId,
            name: "Ms. Sharma",
            role: "teacher"
        }
    };

    // Cleanly assign ONLY Class 10 to Ms. Sharma
    await assignmentService.assignClassToTeacher({
        teacherId,
        classLevel: 10,
        section: "Section A",
        subject: "Mathematics"
    });

    const app = createTestApp(teacherSession);
    const server = app.listen(0);
    const port = server.address().port;

    try {
        // 1. GET /api/teachers/classes only returns assigned classes (Class 10), not classes 5, 6, 7, 8, 9, 11, 12
        const resClasses = await fetch(`http://127.0.0.1:${port}/api/teachers/classes`);
        const dataClasses = await resClasses.json();
        assert.equal(resClasses.status, 200);
        assert.equal(dataClasses.success, true);
        const classIds = dataClasses.classes.map(c => c.id);
        assert.ok(classIds.includes(10));
        assert.ok(!classIds.includes(7), "Class 7 must not be in Ms. Sharma's assigned classes");
        assert.ok(!classIds.includes(11), "Class 11 must not be in Ms. Sharma's assigned classes");

        // 2. Accessing assigned Class 10 succeeds
        const resClass10 = await fetch(`http://127.0.0.1:${port}/api/teachers/class-map?classLevel=10`);
        assert.equal(resClass10.status, 200);

        // 3. Accessing unassigned Class 7 is rejected with 403 Forbidden
        const resClass7 = await fetch(`http://127.0.0.1:${port}/api/teachers/class-map?classLevel=7`);
        const dataClass7 = await resClass7.json();
        assert.equal(resClass7.status, 403);
        assert.equal(dataClass7.success, false);
        assert.match(dataClass7.message, /Forbidden.*not assigned to Class 7/i);

        // 4. Accessing unassigned Class 12 is rejected with 403 Forbidden
        const resClass12 = await fetch(`http://127.0.0.1:${port}/api/teachers/class-map?classLevel=12`);
        assert.equal(resClass12.status, 403);
    } finally {
        server.close();
    }
});

test("Admin endpoints: authorized admin can assign and remove teacher class assignments", async () => {
    const adminSession = {
        user: {
            id: "00000000-0000-0000-0000-000000000000",
            name: "School Administrator",
            role: "admin"
        }
    };
    const app = createTestApp(adminSession);
    const server = app.listen(0);
    const port = server.address().port;

    const testTeacherId = "33333333-3333-3333-3333-333333333333";

    try {
        // 1. Admin assigns Class 9 to teacher
        const assignRes = await fetch(`http://127.0.0.1:${port}/api/admin/teacher-assignments`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                teacherId: testTeacherId,
                classLevel: 9,
                section: "Section B",
                subject: "Science"
            })
        });
        const assignData = await assignRes.json();
        assert.equal(assignRes.status, 201);
        assert.equal(assignData.success, true);
        assert.equal(assignData.assignment.class, 9);

        // 2. Verify assignment shows in admin list
        const listRes = await fetch(`http://127.0.0.1:${port}/api/admin/teacher-assignments`);
        const listData = await listRes.json();
        assert.equal(listRes.status, 200);
        assert.ok(listData.assignments.some(a => String(a.teacherId) === testTeacherId && a.class === 9));

        // 3. Admin removes assignment
        const removeRes = await fetch(`http://127.0.0.1:${port}/api/admin/teacher-assignments/${assignData.assignment.id}`, {
            method: "DELETE"
        });
        const removeData = await removeRes.json();
        assert.equal(removeRes.status, 200);
        assert.equal(removeData.success, true);
    } finally {
        server.close();
    }
});
