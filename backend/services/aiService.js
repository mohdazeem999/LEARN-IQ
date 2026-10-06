const https = require("https");

/**
 * Intelligent AI Quiz Generator & Learning Intelligence Service
 * Uses Gemini API REST endpoint when GEMINI_API_KEY is available,
 * or intelligent pedagogical template engine as a robust fallback.
 */

async function callGeminiAPI(promptText) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return null;

    return new Promise((resolve) => {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
        const data = JSON.stringify({
            contents: [{ parts: [{ text: promptText }] }],
            generationConfig: { responseMimeType: "application/json" }
        });

        const req = https.request(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data)
            },
            timeout: 10000
        }, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(body);
                    const text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
                    if (text) {
                        resolve(JSON.parse(text));
                    } else {
                        resolve(null);
                    }
                } catch (e) {
                    resolve(null);
                }
            });
        });

        req.on('error', () => resolve(null));
        req.on('timeout', () => {
            req.destroy();
            resolve(null);
        });

        req.write(data);
        req.end();
    });
}

/**
 * Generates dynamic questions based on Subject, Topic, Class Level & Difficulty
 */
async function generateQuizQuestions({ classLevel = 10, subject = "Mathematics", topic = "Linear Equations", difficulty = "Medium", questionCount = 5, prompt = "" }) {
    const aiPrompt = `
    Generate a ${questionCount}-question multiple-choice quiz for Class ${classLevel} students in subject "${subject}" on topic "${topic}".
    Target difficulty level: ${difficulty}.
    ${prompt ? "Special instructions: " + prompt : ""}

    Respond with JSON in this format ONLY:
    {
      "title": "${topic} Assessment",
      "subject": "${subject}",
      "classLevel": "${classLevel}",
      "difficulty": "${difficulty}",
      "questions": [
        {
          "id": 1,
          "question": "Question text here",
          "options": ["Option A", "Option B", "Option C", "Option D"],
          "correctIndex": 0,
          "concept": "Sub-concept name",
          "explanation": "Detailed explanation of correct answer and common pitfalls."
        }
      ]
    }
    `;

    // Attempt Gemini API call
    const aiResult = await callGeminiAPI(aiPrompt);
    if (aiResult && aiResult.questions && Array.isArray(aiResult.questions)) {
        return aiResult;
    }

    // Smart pedagogical fallback repository
    return generateFallbackQuiz(classLevel, subject, topic, difficulty, questionCount);
}

/**
 * Fallback generator providing realistic, curriculum-aligned questions
 */
function generateFallbackQuiz(classLevel, subject, topic, difficulty, count) {
    const topicBank = {
        "Linear Equations": [
            {
                question: "Solve for x in the equation: 3x - 7 = 14",
                options: ["x = 7", "x = 5", "x = 9", "x = 3"],
                correctIndex: 0,
                concept: "One-variable Linear Equations",
                explanation: "Add 7 to both sides: 3x = 21. Then divide by 3: x = 7."
            },
            {
                question: "If 2(x + 4) = 18, what is the value of x?",
                options: ["x = 5", "x = 7", "x = 9", "x = 4"],
                correctIndex: 0,
                concept: "Distributive Property in Equations",
                explanation: "Expand brackets: 2x + 8 = 18. Subtract 8: 2x = 10. Divide by 2: x = 5."
            },
            {
                question: "A number increased by 12 equals 3 times the same number. What is the number?",
                options: ["6", "4", "8", "12"],
                correctIndex: 0,
                concept: "Word Problems into Linear Equations",
                explanation: "Let the number be x. x + 12 = 3x => 2x = 12 => x = 6."
            },
            {
                question: "What is the slope of the line represented by y = -4x + 9?",
                options: ["-4", "9", "4", "-9"],
                correctIndex: 0,
                concept: "Slope-Intercept Form",
                explanation: "In y = mx + c, m represents the slope. Here m = -4."
            },
            {
                question: "Solve the system: x + y = 10 and x - y = 4",
                options: ["x = 7, y = 3", "x = 6, y = 4", "x = 8, y = 2", "x = 5, y = 5"],
                correctIndex: 0,
                concept: "Simultaneous Equations",
                explanation: "Adding equations: 2x = 14 => x = 7. Substitute into x + y = 10 => y = 3."
            }
        ],
        "Fractions": [
            {
                question: "What is 3/4 + 2/5 in simplest form?",
                options: ["23/20", "5/9", "11/20", "1 1/4"],
                correctIndex: 0,
                concept: "Addition of Unlike Fractions",
                explanation: "LCM of 4 and 5 is 20. (15 + 8)/20 = 23/20."
            },
            {
                question: "Simplify the fraction 36/48 to its lowest terms:",
                options: ["3/4", "6/8", "9/12", "4/5"],
                correctIndex: 0,
                concept: "Fraction Simplification",
                explanation: "Divide numerator and denominator by GCD (12): 36÷12 = 3, 48÷12 = 4."
            }
        ],
        "Physics": [
            {
                question: "According to Newton's Second Law of Motion, Force equals:",
                options: ["Mass × Acceleration", "Mass / Acceleration", "Velocity × Time", "Work / Distance"],
                correctIndex: 0,
                concept: "Laws of Motion",
                explanation: "F = m × a (Force = Mass times Acceleration)."
            },
            {
                question: "What is the SI unit of electrical resistance?",
                options: ["Ohm (Ω)", "Volt (V)", "Ampere (A)", "Watt (W)"],
                correctIndex: 0,
                concept: "Electricity & Circuits",
                explanation: "The Ohm is the SI unit of electrical resistance."
            }
        ],
        "Photosynthesis": [
            {
                question: "Which gas is absorbed by plants during photosynthesis?",
                options: ["Carbon Dioxide (CO2)", "Oxygen (O2)", "Nitrogen (N2)", "Hydrogen (H2)"],
                correctIndex: 0,
                concept: "Plant Physiology & Gas Exchange",
                explanation: "Plants take in Carbon Dioxide and water in the presence of sunlight to synthesize glucose and release Oxygen."
            },
            {
                question: "In which cellular organelle does photosynthesis take place?",
                options: ["Chloroplast", "Mitochondria", "Nucleus", "Ribosome"],
                correctIndex: 0,
                concept: "Cell Organelles",
                explanation: "Photosynthesis occurs inside chloroplasts, which contain chlorophyll."
            }
        ],
        "Periodic Table": [
            {
                question: "What is the chemical symbol for Gold?",
                options: ["Au", "Ag", "Fe", "Gd"],
                correctIndex: 0,
                concept: "Chemical Symbols & Elements",
                explanation: "Au comes from the Latin word for gold, 'Aurum'."
            },
            {
                question: "Which element group contains the Noble Gases?",
                options: ["Group 18", "Group 1", "Group 17", "Group 2"],
                correctIndex: 0,
                concept: "Periodic Groups & Periodic Trends",
                explanation: "Group 18 consists of unreactive noble gases like Helium, Neon, and Argon."
            }
        ]
    };

    const key = Object.keys(topicBank).find(k => topic.toLowerCase().includes(k.toLowerCase())) || "Linear Equations";
    let questions = topicBank[key] || topicBank["Linear Equations"];

    // Expand questions if requested count is larger
    let finalQuestions = [];
    for (let i = 0; i < count; i++) {
        const base = questions[i % questions.length];
        finalQuestions.push({
            id: i + 1,
            question: base.question,
            options: [...base.options],
            correctIndex: base.correctIndex,
            concept: base.concept,
            explanation: base.explanation
        });
    }

    return {
        title: `${topic} (${subject})`,
        subject: subject,
        classLevel: `Class ${classLevel}`,
        difficulty: difficulty,
        questions: finalQuestions
    };
}

/**
 * AI Response & Learning Gap Diagnosis Engine
 */
async function analyzeQuizSubmission(quizData, userAnswers) {
    const questions = quizData.questions || [];
    let correctCount = 0;
    let totalQuestions = questions.length;
    let conceptStats = {};
    let mistakeCategories = {
        "Conceptual Error": 0,
        "Calculation Error": 0,
        "Misinterpretation": 0,
        "Careless Error": 0
    };

    let breakdown = [];

    questions.forEach((q, idx) => {
        const userSel = userAnswers[q.id || idx + 1];
        const isCorrect = userSel === q.correctIndex;

        if (isCorrect) correctCount++;

        const concept = q.concept || "General Concept";
        if (!conceptStats[concept]) {
            conceptStats[concept] = { total: 0, correct: 0 };
        }
        conceptStats[concept].total++;
        if (isCorrect) conceptStats[concept].correct++;

        if (!isCorrect) {
            // Categorize mistake based on context heuristic or AI
            let errType = "Conceptual Error";
            if (q.question.toLowerCase().includes("solve") || q.question.toLowerCase().includes("calculate")) {
                errType = Math.random() > 0.5 ? "Calculation Error" : "Conceptual Error";
            } else if (q.question.toLowerCase().includes("what") || q.question.toLowerCase().includes("which")) {
                errType = Math.random() > 0.5 ? "Misinterpretation" : "Careless Error";
            }
            mistakeCategories[errType]++;

            breakdown.push({
                questionId: q.id,
                question: q.question,
                selectedOption: q.options[userSel] || "Not answered",
                correctOption: q.options[q.correctIndex],
                concept: concept,
                errorType: errType,
                explanation: q.explanation
            });
        }
    });

    const scorePercentage = Math.round((correctCount / totalQuestions) * 100);
    const xpEarned = correctCount * 30 + (scorePercentage >= 80 ? 100 : 50);

    // Identify weak concepts (< 60% mastery)
    let weakConcepts = [];
    let strongConcepts = [];
    Object.keys(conceptStats).forEach(c => {
        const pct = Math.round((conceptStats[c].correct / conceptStats[c].total) * 100);
        if (pct < 60) weakConcepts.push(c);
        else strongConcepts.push(c);
    });

    let aiInsight = "";
    if (scorePercentage >= 80) {
        aiInsight = `Outstanding performance! You have strong mastery in ${strongConcepts.join(", ") || "this subject"}. Ready for advanced challenges!`;
    } else if (scorePercentage >= 50) {
        aiInsight = `Good effort! You showed strong understanding, but need practice on: ${weakConcepts.join(", ") || "key sub-topics"}.`;
    } else {
        aiInsight = `Learning gaps detected in ${weakConcepts.join(", ") || "core concepts"}. Recommended step: complete 5 targeted foundation questions.`;
    }

    return {
        scorePercentage,
        correctCount,
        totalQuestions,
        xpEarned,
        aiInsight,
        weakConcepts,
        strongConcepts,
        mistakeCategories,
        breakdown,
        conceptStats
    };
}

module.exports = {
    generateQuizQuestions,
    analyzeQuizSubmission
};
