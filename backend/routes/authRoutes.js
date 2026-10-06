const express = require("express");
const router = express.Router();

let currentSession = {
    role: "student", // "student" or "teacher"
    user: {
        id: "std-101",
        name: "Alex",
        roleName: "Student",
        class: "Class 10"
    }
};

// GET /api/auth/session
router.get("/session", (req, res) => {
    res.json({
        success: true,
        session: currentSession
    });
});

// POST /api/auth/switch-role
router.post("/switch-role", (req, res) => {
    const { role } = req.body;
    if (role === "teacher") {
        currentSession = {
            role: "teacher",
            user: {
                id: "tch-202",
                name: "Prof. Sharma",
                roleName: "Teacher / Educator",
                subject: "Mathematics & Science"
            }
        };
    } else {
        currentSession = {
            role: "student",
            user: {
                id: "std-101",
                name: "Alex",
                roleName: "Student",
                class: "Class 10"
            }
        };
    }

    res.json({
        success: true,
        message: `Switched session to ${currentSession.role.toUpperCase()} mode.`,
        session: currentSession
    });
});

module.exports = router;
