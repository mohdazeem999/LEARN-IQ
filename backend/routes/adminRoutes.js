const express = require("express");
const router = express.Router();
const supabase = require("../config/supabaseClient");
const { authenticate, requireRole } = require("../middleware/auth");
const { isValidUUID } = require("../utils/validators");

// Strictly protect all admin routes with authentication and admin role requirement
router.use(authenticate, requireRole("admin"));

// GET /api/admin/overview
router.get("/overview", async (req, res) => {
    try {
        if (!supabase) {
            return res.status(503).json({ success: false, message: "Database service unavailable." });
        }

        const { data: profiles, error } = await supabase
            .from("profiles")
            .select("id, user_id, name, email, role, class, xp, streak, rank, created_at")
            .order("created_at", { ascending: false });

        if (error) {
            return res.status(500).json({ success: false, message: error.message });
        }

        const userList = profiles || [];
        const studentCount = userList.filter(u => u.role === "student").length;
        const teacherCount = userList.filter(u => u.role === "teacher").length;
        const adminCount = userList.filter(u => u.role === "admin").length;

        return res.json({
            success: true,
            summary: {
                totalUsers: userList.length,
                students: studentCount,
                teachers: teacherCount,
                admins: adminCount,
                systemStatus: "Operational",
                authProvider: "Supabase Cloud Auth",
                databaseConnected: true
            },
            recentUsers: userList.slice(0, 10)
        });
    } catch (err) {
        console.error("Admin overview error:", err.message);
        return res.status(500).json({ success: false, message: "Failed to load admin overview." });
    }
});

// GET /api/admin/users
router.get("/users", async (req, res) => {
    try {
        if (!supabase) {
            return res.status(503).json({ success: false, message: "Database service unavailable." });
        }

        const { data: profiles, error } = await supabase
            .from("profiles")
            .select("id, user_id, name, email, role, class, xp, streak, rank, created_at")
            .order("created_at", { ascending: false });

        if (error) {
            return res.status(500).json({ success: false, message: error.message });
        }

        return res.json({
            success: true,
            users: profiles || []
        });
    } catch (err) {
        console.error("Admin users error:", err.message);
        return res.status(500).json({ success: false, message: "Failed to list users." });
    }
});

// POST /api/admin/role
router.post("/role", async (req, res) => {
    try {
        const { userId, role } = req.body;
        if (!userId || !["student", "teacher", "admin"].includes(role)) {
            return res.status(400).json({ success: false, message: "Valid userId and role ('student', 'teacher', 'admin') are required." });
        }

        if (!isValidUUID(userId)) {
            return res.status(400).json({ success: false, message: "Invalid userId format. Must be a valid UUID." });
        }

        if (!supabase) {
            return res.status(503).json({ success: false, message: "Database service unavailable." });
        }

        const { data, error } = await supabase
            .from("profiles")
            .update({ role })
            .or(`user_id.eq.${userId},id.eq.${userId}`)
            .select()
            .single();

        if (error) {
            return res.status(500).json({ success: false, message: error.message });
        }

        return res.json({
            success: true,
            message: `User role successfully updated to ${role}.`,
            user: data
        });
    } catch (err) {
        console.error("Admin update role error:", err.message);
        return res.status(500).json({ success: false, message: "Failed to update role." });
    }
});

const assignmentService = require("../services/assignmentService");

// GET /api/admin/teacher-assignments
// List all teacher class assignments
router.get("/teacher-assignments", async (req, res) => {
    try {
        const assignments = await assignmentService.getAllAssignments();
        res.json({
            success: true,
            assignments
        });
    } catch (err) {
        console.error("Admin fetch teacher assignments error:", err.message);
        res.status(500).json({ success: false, message: "Failed to list teacher assignments." });
    }
});

// POST /api/admin/teacher-assignments
// Assign a class to an educator
router.post("/teacher-assignments", async (req, res) => {
    try {
        const { teacherId, classLevel, section = "Section A", subject = "All Curriculum Subjects" } = req.body;

        if (!teacherId || !isValidUUID(teacherId)) {
            return res.status(400).json({ success: false, message: "Valid teacherId (UUID) is required." });
        }

        const classNum = Number(classLevel);
        if (!Number.isInteger(classNum) || classNum < 5 || classNum > 12) {
            return res.status(400).json({ success: false, message: "Class must be an integer between 5 and 12." });
        }

        // Verify that target user is a teacher
        if (supabase) {
            const { data: targetProfile } = await supabase
                .from("profiles")
                .select("id, role, name")
                .or(`user_id.eq.${teacherId},id.eq.${teacherId}`)
                .maybeSingle();

            if (targetProfile && targetProfile.role !== "teacher" && targetProfile.role !== "admin") {
                return res.status(400).json({
                    success: false,
                    message: `User ${targetProfile.name || teacherId} is currently a '${targetProfile.role}'. Update their role to 'teacher' before assigning classes.`
                });
            }
        }

        const assignment = await assignmentService.assignClassToTeacher({
            teacherId,
            classLevel: classNum,
            section,
            subject,
            assignedBy: req.auth.user.id
        });

        res.status(201).json({
            success: true,
            message: `Successfully assigned Class ${classNum} (${section}) to educator.`,
            assignment
        });
    } catch (err) {
        console.error("Admin assign teacher class error:", err.message);
        res.status(400).json({ success: false, message: err.message || "Failed to assign class." });
    }
});

// DELETE /api/admin/teacher-assignments/:id
// Remove a class assignment
router.delete("/teacher-assignments/:id", async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({ success: false, message: "Assignment ID is required." });
        }

        await assignmentService.removeTeacherAssignment(id);
        res.json({
            success: true,
            message: "Class assignment successfully removed."
        });
    } catch (err) {
        console.error("Admin remove teacher assignment error:", err.message);
        res.status(500).json({ success: false, message: "Failed to remove assignment." });
    }
});

module.exports = router;
