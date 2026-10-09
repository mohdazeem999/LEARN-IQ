const express = require("express");
const router = express.Router();
const {
    generateQuizQuestions,
    analyzeQuizSubmission,
    generateQuestionFeedback
} = require("../services/aiService");
const supabase = require("../config/supabaseClient");
const { authenticate, requireRole } = require("../middleware/auth");

router.use(authenticate);

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
                const { data: savedQuiz, error } = await supabase.from("quizzes").insert({
                    title: quiz.title,
                    subject: quiz.subject,
                    class_level: quiz.classLevel,
                    difficulty: quiz.difficulty,
                    created_by: req.auth.user.id,
                    questions: quiz.questions
                }).select("id").single();
                if (error) throw error;
                quiz.id = savedQuiz.id;
            } catch (sErr) {
                console.error("Unable to save generated quiz:", sErr.message);
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
router.post("/submit", requireRole("student", "admin"), async (req, res) => {
    try {
        const { quiz, answers } = req.body;
        if (!quiz || !Array.isArray(quiz.questions) || !quiz.questions.length ||
            quiz.questions.length > 30 || !answers || typeof answers !== "object" ||
            Array.isArray(answers) ||
            ["title", "subject", "classLevel", "difficulty"].some(field =>
                typeof quiz[field] !== "string" || !quiz[field].trim() || quiz[field].length > 120)) {
            return res.status(400).json({ success: false, message: "Quiz data and student answers are required." });
        }

        const invalidQuestion = quiz.questions.some(question =>
            !question || typeof question.question !== "string" ||
            !question.question.trim() || question.question.length > 4000 ||
            !Array.isArray(question.options) || !question.options.length ||
            question.options.length > 8 ||
            question.options.some(option => typeof option !== "string" || option.length > 1000) ||
            !Number.isInteger(question.correctIndex) ||
            question.correctIndex < 0 || question.correctIndex >= question.options.length ||
            ["explanation", "solution", "correctSolution", "rubric", "questionType", "type", "subject", "concept", "passage", "context", "sourceText"]
                .some(field => question[field] !== undefined &&
                    (typeof question[field] !== "string" || question[field].length > 2000))
        );
        if (invalidQuestion) {
            return res.status(400).json({ success: false, message: "Quiz questions must include options and a valid answer key." });
        }
        const questionKeys = quiz.questions.map((question, index) => String(question.id || index + 1));
        if (new Set(questionKeys).size !== questionKeys.length) {
            return res.status(400).json({ success: false, message: "Quiz question identifiers must be unique." });
        }
        const invalidAnswer = Object.entries(answers).some(([key, answer]) => {
            if (answer === null || answer === undefined) return false;
            if (!Number.isInteger(answer) || answer < 0) return true;
            const question = quiz.questions.find((entry, index) => String(entry.id || index + 1) === key);
            return !question || answer >= question.options.length;
        });
        if (invalidAnswer) {
            return res.status(400).json({ success: false, message: "Answers must be option indexes or unanswered." });
        }

        let quizId = quiz.id;
        let analysisQuiz = quiz;
        if (supabase && quizId) {
            const { data: savedQuiz, error: quizError } = await supabase.from("quizzes")
                .select("id, title, subject, class_level, difficulty, questions")
                .eq("id", quizId).maybeSingle();
            if (quizError) {
                return res.status(503).json({ success: false, message: "Unable to verify the quiz." });
            }
            if (!savedQuiz) {
                return res.status(400).json({ success: false, message: "This quiz is no longer available." });
            }
            const matchesSavedQuestions = Array.isArray(savedQuiz.questions) &&
                savedQuiz.questions.length === quiz.questions.length &&
                savedQuiz.questions.every((question, index) => {
                    const submitted = quiz.questions[index];
                    return String(question.id || index + 1) === String(submitted.id || index + 1) &&
                        JSON.stringify(question.options) === JSON.stringify(submitted.options);
                });
            if (!matchesSavedQuestions) {
                return res.status(400).json({ success: false, message: "Quiz content does not match the saved assessment." });
            }
            analysisQuiz = {
                ...savedQuiz,
                classLevel: savedQuiz.class_level,
                questions: savedQuiz.questions
            };
        } else if (supabase) {
            const { data: savedQuiz, error: saveError } = await supabase.from("quizzes").insert({
                title: quiz.title,
                subject: quiz.subject,
                class_level: quiz.classLevel,
                difficulty: quiz.difficulty,
                created_by: req.auth.user.id,
                questions: quiz.questions
            }).select("id").single();
            if (saveError) {
                console.error("Unable to save assessment:", saveError.message);
                return res.status(503).json({ success: false, message: "Unable to save this assessment." });
            }
            quizId = savedQuiz.id;
        }
        const analysis = await analyzeQuizSubmission(analysisQuiz, answers);

        let submission = null;
        if (supabase && quizId) {
            const { data: previousSubmission, error: previousError } = await supabase.from("quiz_submissions")
                .select("submitted_at").eq("student_id", req.auth.user.id)
                .order("submitted_at", { ascending: false }).limit(1).maybeSingle();
            if (previousError) {
                return res.status(503).json({ success: false, message: "Unable to update your learning streak." });
            }
            const { data: savedSubmission, error: submissionError } = await supabase
                .from("quiz_submissions")
                .insert({
                    quiz_id: quizId,
                    student_id: req.auth.user.id,
                    score_percentage: analysis.scorePercentage,
                    correct_count: analysis.correctCount,
                    total_questions: analysis.totalQuestions,
                    xp_earned: analysis.xpEarned,
                    ai_insight: analysis.aiInsight || null,
                    mistake_categories: analysis.mistakeCategories || null,
                    concept_stats: analysis.conceptStats || null
                })
                .select("id, submitted_at")
                .single();
            if (submissionError) {
                console.error("Unable to save quiz submission:", submissionError.message);
                return res.status(503).json({ success: false, message: "Quiz was scored, but the result could not be saved." });
            }
            const { data: profile, error: profileError } = await supabase.from("profiles")
                .select("xp_points, streak_days").eq("user_id", req.auth.user.id).single();
            if (profileError) {
                console.error("Unable to load profile XP:", profileError.message);
                return res.status(503).json({ success: false, message: "Quiz result was saved, but your XP could not be updated." });
            }
            const today = new Date().toISOString().slice(0, 10);
            const previousDay = previousSubmission?.submitted_at
                ? new Date(previousSubmission.submitted_at).toISOString().slice(0, 10)
                : null;
            const dayGap = previousDay
                ? Math.floor((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${previousDay}T00:00:00Z`)) / 86_400_000)
                : null;
            const streakDays = dayGap === 0
                ? profile.streak_days || 0
                : dayGap === 1 ? (profile.streak_days || 0) + 1 : 1;
            const { error: updateError } = await supabase.from("profiles")
                .update({
                    xp_points: (profile.xp_points || 0) + analysis.xpEarned,
                    streak_days: streakDays
                })
                .eq("user_id", req.auth.user.id);
            if (updateError) {
                console.error("Unable to update profile XP:", updateError.message);
                return res.status(503).json({ success: false, message: "Quiz result was saved, but your XP could not be updated." });
            }
            submission = { id: savedSubmission.id, submittedAt: savedSubmission.submitted_at };
        }

        res.json({
            success: true,
            analysis,
            submission
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to analyze assessment: " + error.message
        });
    }
});

// POST /api/assessments/feedback/retry
router.post("/feedback/retry", async (req, res) => {
    const context = req.body;
    if (!context || typeof context !== "object" ||
        typeof context.question !== "string" || context.question.length > 4000 ||
        !Array.isArray(context.options) || !context.options.length || context.options.length > 8 ||
        !Number.isInteger(context.selectedIndex) || !Number.isInteger(context.correctIndex) ||
        context.selectedIndex < 0 || context.selectedIndex >= context.options.length ||
        context.correctIndex < 0 || context.correctIndex >= context.options.length ||
        context.selectedIndex === context.correctIndex) {
        return res.status(400).json({ success: false, message: "A valid incorrect question is required to retry feedback." });
    }
    for (const field of ["subject", "classLevel", "topic", "difficulty", "questionType", "explanation", "solution", "rubric", "sourceText"]) {
        if (context[field] !== undefined &&
            (typeof context[field] !== "string" || context[field].length > 2000)) {
            return res.status(400).json({ success: false, message: `Invalid ${field} context.` });
        }
    }
    if (context.options.some(option => typeof option !== "string" || option.length > 1000)) {
        return res.status(400).json({ success: false, message: "Question options must be short text values." });
    }

    const feedback = await generateQuestionFeedback(context);
    if (feedback.status !== "complete") {
        return res.status(503).json({
            success: false,
            message: "AI feedback is temporarily unavailable. The official answer and provided explanation are unchanged.",
            feedback
        });
    }
    return res.json({ success: true, feedback });
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
