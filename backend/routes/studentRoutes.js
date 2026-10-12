const express = require("express");
const router = express.Router();
const supabase = require("../config/supabaseClient");
const { authenticate, requireRole } = require("../middleware/auth");
const gamificationService = require("../services/gamificationService");

// Public or Semi-Public Leaderboard
// GET /api/students/leaderboard
router.get("/leaderboard", async (req, res) => {
    try {
        let profilesData = [];
        if (supabase) {
            const { data } = await supabase.from("profiles")
                .select("user_id, id, name, xp, streak, class, role")
                .eq("role", "student")
                .order("xp", { ascending: false })
                .limit(25);
            if (data) profilesData = data;
        }

        const leaderboard = profilesData.map((profile, index) => {
            const lvl = gamificationService.calculateLevel(profile.xp || 0);
            return {
                rank: index + 1,
                userId: profile.user_id || profile.id,
                name: profile.name || "Student",
                xp: profile.xp || 0,
                level: lvl.levelNumber,
                levelTitle: lvl.title,
                class: profile.class ? `Class ${profile.class}` : "Class 10",
                streak: profile.streak || 0,
                role: profile.role
            };
        });

        res.json({
            success: true,
            leaderboard
        });
    } catch (err) {
        console.error("Leaderboard error:", err.message);
        res.status(500).json({ success: false, message: "Unable to load the leaderboard." });
    }
});

// Protect all remaining student routes
router.use(authenticate, requireRole("student", "admin"));

// GET /api/students/profile
router.get("/profile", async (req, res) => {
    try {
        const studentGamification = await gamificationService.getStudentGamificationProfile(
            req.auth.user.id,
            req.auth.user
        );

        res.json({
            success: true,
            student: studentGamification
        });
    } catch (error) {
        console.error("Student profile error:", error.message);
        res.status(500).json({ success: false, message: "Unable to load your profile." });
    }
});

// GET /api/students/gamification
router.get("/gamification", async (req, res) => {
    try {
        const studentGamification = await gamificationService.getStudentGamificationProfile(
            req.auth.user.id,
            req.auth.user
        );

        res.json({
            success: true,
            gamification: studentGamification
        });
    } catch (error) {
        console.error("Gamification fetch error:", error.message);
        res.status(500).json({ success: false, message: "Unable to load gamification data." });
    }
});

// GET /api/students/history
router.get("/history", async (req, res) => {
    try {
        const gamificationProfile = await gamificationService.getStudentGamificationProfile(
            req.auth.user.id,
            req.auth.user
        );

        const historyItems = (gamificationProfile.recentHistory || []).map(submission => {
            const dateObj = new Date(submission.submittedAt);
            return {
                id: submission.id,
                dateStr: dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
                timeStr: dateObj.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
                subject: submission.subject || "Mathematics",
                topic: submission.topic || submission.title || "Assessment",
                score: submission.scorePercentage,
                correctCount: submission.correctCount,
                totalQuestions: submission.totalQuestions,
                xpEarned: submission.xpEarned,
                coinsEarned: submission.coinsEarned || 10
            };
        });

        return res.json({
            success: true,
            history: historyItems
        });
    } catch (error) {
        console.error("History fetch error:", error.message);
        return res.status(500).json({ success: false, message: "Unable to load assessment history." });
    }
});

// POST /api/students/avatar/select
router.post("/avatar/select", (req, res) => {
    try {
        const { avatarId } = req.body;
        if (!avatarId || typeof avatarId !== "string") {
            return res.status(400).json({ success: false, message: "Avatar identifier is required." });
        }

        const result = gamificationService.selectActiveAvatar(req.auth.user.id, avatarId);
        res.json({
            success: true,
            message: `Avatar successfully updated to ${result.activeAvatar.name}!`,
            activeAvatar: result.activeAvatar
        });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

// POST /api/students/rewards/redeem
router.post("/rewards/redeem", async (req, res) => {
    try {
        const { itemId, rewardTitle, cost } = req.body;
        const targetItemId = itemId || (
            rewardTitle && rewardTitle.toLowerCase().includes("gold") ? "frame_gold" :
            rewardTitle && rewardTitle.toLowerCase().includes("neon") ? "frame_neon" :
            rewardTitle && rewardTitle.toLowerCase().includes("math") ? "title_math" :
            rewardTitle && rewardTitle.toLowerCase().includes("matrix") ? "theme_matrix" :
            "frame_neon"
        );

        const result = gamificationService.redeemShopItem(req.auth.user.id, targetItemId);

        res.json({
            success: true,
            message: `🎉 Successfully unlocked ${result.item.name}!`,
            item: result.item,
            remainingCoins: result.remainingCoins,
            equipped: result.equipped
        });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

// GET /api/students/challenges
router.get("/challenges", async (req, res) => {
    try {
        const student = req.auth.user;
        const classNum = student.classNumber || Number.parseInt(String(student.class).replace(/\D/g, ""), 10) || 10;
        const challengesData = gamificationService.getStudentDailyChallenges(student.id, classNum);

        res.json({
            success: true,
            ...challengesData
        });
    } catch (error) {
        console.error("Challenges fetch error:", error.message);
        res.status(500).json({ success: false, message: "Unable to load daily challenges." });
    }
});

// POST /api/students/challenges/claim
router.post("/challenges/claim", async (req, res) => {
    try {
        const { challengeId } = req.body;
        if (!challengeId || typeof challengeId !== "string") {
            return res.status(400).json({ success: false, message: "Valid challengeId is required." });
        }

        const student = req.auth.user;
        const classNum = student.classNumber || Number.parseInt(String(student.class).replace(/\D/g, ""), 10) || 10;
        const result = await gamificationService.completeDailyChallenge(student.id, challengeId, classNum);

        res.json({
            success: true,
            ...result
        });
    } catch (error) {
        console.error("Challenge claim error:", error.message);
        res.status(400).json({ success: false, message: error.message });
    }
});

module.exports = router;
