const express = require("express");
const router = express.Router();
const {
    generateQuizQuestions,
    analyzeQuizSubmission,
    generateQuestionFeedback
} = require("../services/aiService");
const supabase = require("../config/supabaseClient");
const { authenticate, requireRole } = require("../middleware/auth");
const gamificationService = require("../services/gamificationService");
const { isValidUUID } = require("../utils/validators");

router.use(authenticate);

// POST /api/assessments/generate
router.post("/generate", async (req, res) => {
    try {
        let { classLevel, subject, topic, difficulty, questionCount, prompt } = req.body;

        // Strict RBAC: Students can only generate and access content for their own assigned class
        if (req.auth?.user?.role === "student") {
            const studentClassNum = req.auth.user.classNumber || Number.parseInt(String(req.auth.user.class).replace(/\D/g, ""), 10) || 10;
            const requestedClassNum = req.body.classLevel ? Number.parseInt(String(req.body.classLevel).replace(/\D/g, ""), 10) : null;
            if (requestedClassNum && requestedClassNum !== studentClassNum) {
                return res.status(403).json({
                    success: false,
                    message: `Access denied. As a Class ${studentClassNum} student, you can only access Class ${studentClassNum} content.`
                });
            }
            classLevel = studentClassNum;
        }

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
        if (quiz && quiz.classLevel !== undefined) {
            quiz.classLevel = String(quiz.classLevel);
        }
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

        // Verify quiz against Supabase if saved
        if (supabase && quizId) {
            try {
                const { data: savedQuiz } = await supabase.from("quizzes")
                    .select("id, title, subject, class_level, difficulty, questions")
                    .eq("id", quizId).maybeSingle();
                if (savedQuiz && Array.isArray(savedQuiz.questions)) {
                    analysisQuiz = {
                        ...savedQuiz,
                        classLevel: savedQuiz.class_level,
                        questions: savedQuiz.questions
                    };
                }
            } catch (err) {
                console.warn("Quiz lookup warning:", err.message);
            }
        }

        const analysis = await analyzeQuizSubmission(analysisQuiz, answers);

        // Process full gamification reward calculations: XP, LearnCoins, Streak, Level-up, Badges, Daily missions
        const gamification = await gamificationService.processQuizSubmission({
            studentId: req.auth.user.id,
            studentName: req.auth.user.name,
            quiz,
            answers,
            analysis
        });

        // Optionally persist to Supabase if tables exist and quizId is a valid UUID
        if (supabase && quizId && isValidUUID(quizId)) {
            try {
                const { error: subErr } = await supabase.from("quiz_submissions").insert({
                    quiz_id: quizId,
                    student_id: req.auth.user.id,
                    score_percentage: analysis.scorePercentage,
                    correct_count: analysis.correctCount,
                    total_questions: analysis.totalQuestions,
                    xp_earned: gamification.earnedXp,
                    ai_insight: analysis.aiInsight || null,
                    mistake_categories: analysis.mistakeCategories || null,
                    concept_stats: analysis.conceptStats || null
                });
                if (subErr) {
                    console.warn("Quiz submission save warning:", subErr.message);
                }
            } catch (sErr) {
                console.warn("Quiz submission record failed to save to Supabase:", sErr.message);
            }
        }

        return res.json({
            success: true,
            analysis,
            submission: {
                id: gamification.submissionId,
                submittedAt: new Date().toISOString()
            },
            gamification
        });
    } catch (error) {
        console.error("Assessment submission error:", error);
        return res.status(500).json({
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
