const express = require("express");
const router = express.Router();
const supabase = require("../config/supabaseClient");
const { authenticate, requireRole } = require("../middleware/auth");

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

module.exports = router;
