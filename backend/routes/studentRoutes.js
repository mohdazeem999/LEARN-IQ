const express = require("express");
const router = express.Router();

let studentState = {
    id: "std-101",
    name: "Alex",
    classLevel: "Class 10",
    xp: 2480,
    streak: 12,
    rank: 7,
    overallProgress: 78,
    dnaScores: {
        conceptMastery: 82,
        problemSolving: 74,
        consistency: 91,
        improvement: 86
    },
    redeemedRewards: []
};

// GET /api/students/profile
router.get("/profile", (req, res) => {
    res.json({
        success: true,
        student: studentState
    });
});

// POST /api/students/rewards/redeem
router.post("/rewards/redeem", (req, res) => {
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
    studentState.redeemedRewards.push({
        title: rewardTitle,
        cost,
        date: new Date().toISOString()
    });

    res.json({
        success: true,
        message: `Successfully redeemed "${rewardTitle}"!`,
        remainingXp: studentState.xp,
        redeemedRewards: studentState.redeemedRewards
    });
});

module.exports = router;
