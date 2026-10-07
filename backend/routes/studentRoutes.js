const express = require("express");
const router = express.Router();
const supabase = require("../config/supabaseClient");

let studentState = {
    id: "std-101",
    name: "Guest Student",
    classLevel: "Class 10",
    xp: 0,
    streak: 0,
    rank: "-",
    overallProgress: 0,
    dnaScores: {
        conceptMastery: 0,
        problemSolving: 0,
        consistency: 0,
        improvement: 0
    },
    redeemedRewards: []
};

// GET /api/students/profile
router.get("/profile", async (req, res) => {
    if (supabase) {
        try {
            const { data, error } = await supabase.from('profiles').select('*').eq('user_id', 'std-101').maybeSingle();
            if (data && !error) {
                studentState.name = data.full_name || studentState.name;
                studentState.classLevel = data.class_level || studentState.classLevel;
                studentState.xp = data.xp_points ?? 0;
                studentState.streak = data.streak_days ?? 0;
                studentState.rank = data.rank_position ?? "-";
            }
        } catch (err) {
            console.warn("Supabase fetch profile warning:", err.message);
        }
    }

    res.json({
        success: true,
        student: studentState
    });
});

// GET /api/students/leaderboard
router.get("/leaderboard", async (req, res) => {
    let leaderboard = [];
    if (supabase) {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('user_id, full_name, xp_points, streak_days, class_level, role')
                .order('xp_points', { ascending: false })
                .limit(20);

            if (data && data.length > 0 && !error) {
                leaderboard = data.map((p, idx) => ({
                    rank: idx + 1,
                    userId: p.user_id,
                    name: p.full_name || "Student",
                    xp: p.xp_points || 0,
                    class: p.class_level || "Class 10",
                    streak: p.streak_days || 0,
                    role: p.role || "student"
                }));
            }
        } catch (err) {
            console.warn("Supabase fetch leaderboard error:", err.message);
        }
    }

    res.json({
        success: true,
        leaderboard
    });
});

// POST /api/students/rewards/redeem
router.post("/rewards/redeem", async (req, res) => {
    const { rewardTitle, cost } = req.body;
    if (!rewardTitle || !cost) {
        return res.status(400).json({ success: false, message: "Reward title and cost are required." });
    }

    if (studentState.xp < cost) {
        return res.status(400).json({
            success: false,
            message: `Insufficient XP. You need ${cost} XP but only have ${studentState.xp} XP.`
        });
    }

    studentState.xp -= cost;
    const redemption = {
        title: rewardTitle,
        cost,
        date: new Date().toISOString()
    };
    studentState.redeemedRewards.push(redemption);

    if (supabase) {
        try {
            await supabase.from('reward_redemptions').insert([{
                student_id: 'std-101',
                reward_title: rewardTitle,
                cost_xp: cost,
                status: 'approved'
            }]);
            console.log("💾 Saved reward redemption to Supabase.");
        } catch (err) {
            console.warn("Supabase save redemption warning:", err.message);
        }
    }

    res.json({
        success: true,
        message: `Successfully redeemed "${rewardTitle}"!`,
        remainingXp: studentState.xp,
        redeemedRewards: studentState.redeemedRewards
    });
});

module.exports = router;

