const express = require("express");
const router = express.Router();
const { generateQuizQuestions, analyzeQuizSubmission } = require("../services/aiService");
const supabase = require("../config/supabaseClient");

// POST /api/assessments/generate
router.post("/generate", async (req, res) => {
    try {
        const { classLevel, subject, topic, difficulty, questionCount, prompt } = req.body;
        const quiz = await generateQuizQuestions({
            classLevel: classLevel || 10,
            subject: subject || "Mathematics",
            topic: topic || "Linear Equations",
            difficulty: difficulty || "Medium",
            questionCount: parseInt(questionCount) || 5,
            prompt: prompt || ""
        });

        // Persist to Supabase if connected
        if (supabase && quiz) {
            try {
                await supabase.from('quizzes').insert([{
                    title: quiz.title,
                    subject: quiz.subject,
                    class_level: quiz.classLevel,
                    difficulty: quiz.difficulty,
                    questions: quiz.questions
                }]);
                console.log("💾 Saved generated AI Quiz to Supabase.");
            } catch (sErr) {
                console.warn("Supabase insert quiz warning:", sErr.message);
            }
        }

        res.json({
            success: true,
            quiz
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to generate AI Quiz: " + error.message
        });
    }
});

// POST /api/assessments/submit
router.post("/submit", async (req, res) => {
    try {
        const { quiz, answers } = req.body;
        if (!quiz || !answers) {
            return res.status(400).json({ success: false, message: "Quiz data and student answers are required." });
        }

        const analysis = await analyzeQuizSubmission(quiz, answers);

        // Persist submission to Supabase if connected
        if (supabase && analysis) {
            try {
                await supabase.from('quiz_submissions').insert([{
                    student_id: 'std-101',
                    score_percentage: analysis.scorePercentage,
                    correct_count: analysis.correctCount,
                    total_questions: analysis.totalQuestions,
                    xp_earned: analysis.xpEarned,
                    ai_insight: analysis.aiInsight,
                    mistake_categories: analysis.mistakeCategories,
                    concept_stats: analysis.conceptStats
                }]);
                console.log("💾 Saved quiz submission and AI analysis to Supabase.");
            } catch (sErr) {
                console.warn("Supabase insert submission warning:", sErr.message);
            }
        }

        res.json({
            success: true,
            analysis
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to analyze assessment: " + error.message
        });
    }
});

// GET /api/assessments/adaptive
router.get("/adaptive", (req, res) => {
    const { topic = "Linear Equations", currentScore = 50 } = req.query;
    const scoreNum = parseInt(currentScore);

    let difficulty = "Medium";
    if (scoreNum > 75) difficulty = "Hard";
    else if (scoreNum < 40) difficulty = "Easy";

    res.json({
        success: true,
        topic,
        recommendedDifficulty: difficulty,
        adaptiveMessage: `System adapted next question difficulty to [${difficulty}] based on your recent score of ${scoreNum}%.`
    });
});

module.exports = router;
