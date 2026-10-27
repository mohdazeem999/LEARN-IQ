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

        // Role-based Class Scoping & Validation: LearnIQ supports Class 5 through Class 12
        if (req.auth?.user?.role === "student") {
            const studentClassNum = req.auth.user.classNumber || (req.auth.user.class ? Number.parseInt(String(req.auth.user.class).replace(/\D/g, ""), 10) : null);
            if (!studentClassNum || studentClassNum < 5 || studentClassNum > 12) {
                return res.status(400).json({
                    success: false,
                    message: "Please set your Class (Class 5 to 12) in your profile before generating assessments."
                });
            }
            const requestedClassNum = classLevel ? Number.parseInt(String(classLevel).replace(/\D/g, ""), 10) : null;
            if (requestedClassNum && requestedClassNum !== studentClassNum) {
                return res.status(403).json({
                    success: false,
                    message: `Access denied. As a Class ${studentClassNum} student, you can only generate assessments for Class ${studentClassNum}.`
                });
            }
            classLevel = studentClassNum;
        } else {
            // Teachers and Admins can generate assessments for any Class 5 through Class 12
            const parsedClass = Number.parseInt(String(classLevel).replace(/\D/g, ""), 10);
            if (!Number.isInteger(parsedClass) || parsedClass < 5 || parsedClass > 12) {
                return res.status(400).json({
                    success: false,
                    message: "Valid class level (Class 5 through Class 12) is required."
                });
            }
            classLevel = parsedClass;
        }

        // Validate subject
        if (!subject || typeof subject !== "string" || !subject.trim() || subject.trim().length > 100) {
            return res.status(400).json({
                success: false,
                message: "Subject is required and must be a valid text string (max 100 characters)."
            });
        }
        subject = subject.trim();

        // Validate topic
        if (!topic || typeof topic !== "string" || !topic.trim() || topic.trim().length > 200) {
            return res.status(400).json({
                success: false,
                message: "Topic is required and must be a valid text string (max 200 characters)."
            });
        }
        topic = topic.trim();

        // Validate difficulty
        const validDifficulties = ["Easy", "Medium", "Hard"];
        if (difficulty && !validDifficulties.includes(difficulty)) {
            return res.status(400).json({
                success: false,
                message: "Difficulty must be one of: Easy, Medium, Hard."
            });
        }
        difficulty = difficulty || "Medium";

        // Validate questionCount
        const count = Number.parseInt(questionCount, 10);
        if (!Number.isInteger(count) || count < 1 || count > 30) {
            return res.status(400).json({
                success: false,
                message: "Question count must be an integer between 1 and 30."
            });
        }
        questionCount = count;

        const quiz = await generateQuizQuestions({
            classLevel,
            subject,
            topic,
            difficulty,
            questionCount,
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

        // Server-enforced time rule: verify elapsed time against explicit quiz duration
        const allowedDuration = analysisQuiz.timeLimit || analysisQuiz.durationSeconds || (analysisQuiz.timerMode === "question" ? analysisQuiz.questions.length * 45 : null);
        if (allowedDuration && Number.isFinite(allowedDuration) && allowedDuration > 0) {
            const gracePeriod = 30; // 30-second buffer for network transmission
            const maxAllowed = allowedDuration + gracePeriod;
            if (req.body.timeElapsedSeconds && req.body.timeElapsedSeconds > maxAllowed) {
                return res.status(400).json({
                    success: false,
                    message: `Assessment time limit exceeded (${allowedDuration}s limit). Submission rejected.`
                });
            }
            if (req.body.startTime) {
                const startTimeMs = new Date(req.body.startTime).getTime();
                if (Number.isFinite(startTimeMs)) {
                    const elapsedSinceStart = (Date.now() - startTimeMs) / 1000;
                    if (elapsedSinceStart > maxAllowed) {
                        return res.status(400).json({
                            success: false,
                            message: `Assessment time limit exceeded (${allowedDuration}s limit). Submission rejected.`
                        });
                    }
                }
            }
        }

        const idempotencyKey = req.body.idempotencyKey || req.headers["idempotency-key"] || null;

        // Idempotency check: verify if this quiz attempt has already been submitted to Supabase
        if (supabase && quizId && isValidUUID(quizId)) {
            try {
                const { data: existingDbSub } = await supabase.from("quiz_submissions")
                    .select("id, quiz_id, student_id, score_percentage, correct_count, total_questions, xp_earned, ai_insight, mistake_categories, concept_stats, submitted_at")
                    .eq("quiz_id", quizId)
                    .eq("student_id", req.auth.user.id)
                    .maybeSingle();

                if (existingDbSub) {
                    return res.json({
                        success: true,
                        message: "Assessment submission already recorded.",
                        analysis: {
                            scorePercentage: existingDbSub.score_percentage,
                            correctCount: existingDbSub.correct_count,
                            totalQuestions: existingDbSub.total_questions,
                            xpEarned: existingDbSub.xp_earned,
                            aiInsight: existingDbSub.ai_insight || null,
                            mistakeCategories: existingDbSub.mistake_categories || null,
                            conceptStats: existingDbSub.concept_stats || null
                        },
                        submission: {
                            id: existingDbSub.id,
                            submittedAt: existingDbSub.submitted_at
                        },
                        gamification: {
                            earnedXp: 0,
                            isDuplicate: true
                        }
                    });
                }
            } catch (checkErr) {
                console.warn("Existing submission check warning:", checkErr.message);
            }
        }

        const analysis = await analyzeQuizSubmission(analysisQuiz, answers);

        // Process full gamification reward calculations: XP, LearnCoins, Streak, Level-up, Badges, Daily missions
        const gamification = await gamificationService.processQuizSubmission({
            studentId: req.auth.user.id,
            studentName: req.auth.user.name,
            quiz,
            answers,
            analysis,
            idempotencyKey
        });

        if (gamification.isDuplicate) {
            return res.json({
                success: true,
                message: "Assessment submission already recorded.",
                analysis,
                submission: {
                    id: gamification.submissionId,
                    submittedAt: new Date().toISOString()
                },
                gamification
            });
        }

        // Persist to Supabase canonical table using the exact same submissionId
        if (supabase && quizId && isValidUUID(quizId)) {
            try {
                const { error: subErr } = await supabase.from("quiz_submissions").insert({
                    id: gamification.submissionId,
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
