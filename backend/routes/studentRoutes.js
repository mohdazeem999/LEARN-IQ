const express = require("express");
const router = express.Router();
const supabase = require("../config/supabaseClient");
const { authenticate, requireRole } = require("../middleware/auth");

// GET /api/students/profile
router.get("/profile", authenticate, requireRole("student", "admin"), async (req, res) => {
    const { data, error } = await supabase.from("profiles").select("*")
        .eq("user_id", req.auth.user.id).maybeSingle();
    if (error) {
        return res.status(503).json({ success: false, message: "Unable to load your profile." });
    }
    res.json({
        success: true,
        student: {
            id: req.auth.user.id,
            name: data?.full_name || req.auth.user.name,
            classLevel: data?.class_level || "Class 10",
            xp: data?.xp_points ?? 0,
            streak: data?.streak_days ?? 0,
            rank: data?.rank_position ?? "-",
            overallProgress: 0,
            dnaScores: { conceptMastery: 0, problemSolving: 0, consistency: 0, improvement: 0 },
            redeemedRewards: []
        }
    });
});

// GET /api/students/leaderboard
router.get("/leaderboard", async (req, res) => {
    if (!supabase) {
        return res.status(503).json({ success: false, message: "Leaderboard service is not configured." });
    }
    const { data, error } = await supabase.from("profiles")
        .select("user_id, full_name, xp_points, streak_days, class_level, role")
        .eq("role", "student")
        .order("xp_points", { ascending: false })
        .limit(20);
    if (error) {
        return res.status(503).json({ success: false, message: "Unable to load the leaderboard." });
    }
    res.json({
        success: true,
        leaderboard: data.map((profile, index) => ({
            rank: index + 1,
            userId: profile.user_id,
            name: profile.full_name || "Student",
            xp: profile.xp_points || 0,
            class: profile.class_level || "Class 10",
            streak: profile.streak_days || 0,
            role: profile.role
        }))
    });
});

router.use(authenticate, requireRole("student", "admin"));

// GET /api/students/history
router.get("/history", async (req, res) => {
    const { data, error } = await supabase.from("quiz_submissions")
        .select("id, score_percentage, correct_count, total_questions, xp_earned, submitted_at, quizzes(title, subject)")
        .eq("student_id", req.auth.user.id)
        .order("submitted_at", { ascending: false })
        .limit(100);
    if (error) {
        return res.status(503).json({ success: false, message: "Unable to load your quiz history." });
    }
    return res.json({
        success: true,
        history: data.map(submission => ({
            id: submission.id,
            dateStr: new Date(submission.submitted_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
            timeStr: new Date(submission.submitted_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
            subject: submission.quizzes?.subject || "Mathematics",
            topic: submission.quizzes?.title || "Assessment",
            score: submission.score_percentage,
            correctCount: submission.correct_count,
            totalQuestions: submission.total_questions,
            xpEarned: submission.xp_earned
        }))
    });
});

// POST /api/students/rewards/redeem
router.post("/rewards/redeem", async (req, res) => {
    const { rewardTitle, cost } = req.body;
    if (typeof rewardTitle !== "string" || !rewardTitle || !Number.isInteger(cost) || cost <= 0) {
        return res.status(400).json({ success: false, message: "Reward title and cost are required." });
    }
    const { data: reward, error: rewardError } = await supabase.from("rewards")
        .select("title, cost_xp").eq("title", rewardTitle).maybeSingle();
    if (rewardError) {
        return res.status(503).json({ success: false, message: "Unable to verify reward." });
    }
    if (!reward || reward.cost_xp !== cost) {
        return res.status(400).json({ success: false, message: "The selected reward is not available at that cost." });
    }
    const { data: profile, error: profileError } = await supabase.from("profiles")
        .select("xp_points").eq("user_id", req.auth.user.id).single();
    if (profileError) {
        return res.status(503).json({ success: false, message: "Unable to load your reward balance." });
    }
    if ((profile.xp_points || 0) < cost) {
        return res.status(400).json({
            success: false,
            message: `Insufficient XP. You need ${cost} XP but only have ${profile.xp_points || 0} XP.`
        });
    }
    const remainingXp = profile.xp_points - cost;
    const { error: updateError } = await supabase.from("profiles")
        .update({ xp_points: remainingXp }).eq("user_id", req.auth.user.id);
    if (updateError) {
        return res.status(503).json({ success: false, message: "Unable to update your reward balance." });
    }
    const { error: redemptionError } = await supabase.from("reward_redemptions").insert({
        student_id: req.auth.user.id,
        reward_title: rewardTitle,
        cost_xp: cost,
        status: "approved"
    });
    if (redemptionError) {
        return res.status(503).json({ success: false, message: "Balance was updated, but the redemption could not be saved." });
    }
    res.json({
        success: true,
        message: `Successfully redeemed "${rewardTitle}"!`,
        remainingXp
    });
});

module.exports = router;
