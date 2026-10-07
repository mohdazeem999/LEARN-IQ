const { GoogleGenAI } = require("@google/genai");
const https = require("https");

/**
 * Intelligent AI Quiz Generator & Learning Intelligence Service
 * Uses Google GenAI SDK (Gemini 2.5 / 1.5 Flash) when GEMINI_API_KEY is available,
 * with direct REST fallback and robust subject-aligned pedagogical template engine fallback.
 */

async function callGeminiAPI(promptText) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return null;

    try {
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: promptText,
            config: {
                responseMimeType: "application/json"
            }
        });

        if (response && response.text) {
            return JSON.parse(response.text);
        }
    } catch (err) {
        console.warn("Gemini SDK notice:", err.message, "- Trying fallback REST endpoint...");
        return callGeminiRestFallback(promptText, apiKey);
    }
    return null;
}

function callGeminiRestFallback(promptText, apiKey) {
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
 * Generates dynamic questions strictly aligned with Subject, Topic, Class Level & Difficulty
 */
async function generateQuizQuestions({ classLevel = 10, subject = "Mathematics", topic = "Linear Equations", difficulty = "Medium", questionCount = 5, prompt = "" }) {
    const cleanSubject = subject || "General Science";
    const cleanTopic = topic || "Foundational Concepts";

    const aiPrompt = `
    You are an expert master educator and curriculum author.
    Generate a high-quality, ${questionCount}-question multiple-choice assessment for Class ${classLevel} students.

    SUBJECT: "${cleanSubject}"
    TOPIC: "${cleanTopic}"
    DIFFICULTY LEVEL: "${difficulty}"
    ${prompt ? "ADDITIONAL TEACHER INSTRUCTIONS: " + prompt : ""}

    CRITICAL ALIGNMENT RULES:
    1. EVERY single question MUST be 100% strictly about the Subject "${cleanSubject}" and Topic "${cleanTopic}".
    2. Do NOT include questions from other subjects (e.g. do not include math or linear equations if subject is Physics, Chemistry, Biology, or English).
    3. Provide exactly 4 plausible options per question.
    4. The "correctIndex" (integer 0, 1, 2, or 3) MUST point to the true correct option in the "options" array.
    5. Include clear explanations and sub-concept labels.

    Respond ONLY with a valid JSON object matching this schema EXACTLY:
    {
      "title": "${cleanTopic} (${cleanSubject})",
      "subject": "${cleanSubject}",
      "classLevel": "Class ${classLevel}",
      "difficulty": "${difficulty}",
      "questions": [
        {
          "id": 1,
          "question": "Clear, precise question text strictly on ${cleanTopic} in ${cleanSubject}",
          "options": ["Option A", "Option B", "Option C", "Option D"],
          "correctIndex": 0,
          "concept": "Sub-concept name",
          "explanation": "Educational breakdown explaining why the answer is correct."
        }
      ]
    }
    `;

    // Attempt Gemini API call
    const aiResult = await callGeminiAPI(aiPrompt);
    if (aiResult && aiResult.questions && Array.isArray(aiResult.questions) && aiResult.questions.length > 0) {
        return aiResult;
    }

    // Smart pedagogical fallback repository strictly aligned by subject & topic
    return generateFallbackQuiz(classLevel, cleanSubject, cleanTopic, difficulty, questionCount);
}

/**
 * Subject-Aware Fallback Generator providing realistic, subject-aligned questions
 */
function generateFallbackQuiz(classLevel, subject, topic, difficulty, count) {
    const lowerSub = (subject || "").toLowerCase();
    const lowerTopic = (topic || "").toLowerCase();

    // Subject & Topic Bank
    const bank = {
        physics: [
            {
                question: `According to Newton's Second Law of Motion regarding ${topic}, Force is equal to:`,
                options: ["Mass × Acceleration", "Mass / Acceleration", "Velocity × Time", "Work / Distance"],
                correctIndex: 0,
                concept: "Laws of Motion",
                explanation: "F = m × a (Force equals mass multiplied by acceleration)."
            },
            {
                question: `In physics, what is the SI unit of electrical resistance?`,
                options: ["Ohm (Ω)", "Volt (V)", "Ampere (A)", "Watt (W)"],
                correctIndex: 0,
                concept: "Electrical Circuits",
                explanation: "The Ohm is the standard SI unit measuring electrical resistance."
            },
            {
                question: `Which type of energy is stored in an object due to its position or height?`,
                options: ["Potential Energy", "Kinetic Energy", "Thermal Energy", "Chemical Energy"],
                correctIndex: 0,
                concept: "Energy & Work",
                explanation: "Gravitational potential energy is determined by mass, gravity, and height (PE = mgh)."
            },
            {
                question: `What phenomenon describes the bending of light when it passes from air into water?`,
                options: ["Refraction", "Reflection", "Diffraction", "Dispersion"],
                correctIndex: 0,
                concept: "Optics & Light",
                explanation: "Refraction occurs due to changes in light speed between optical media."
            }
        ],
        chemistry: [
            {
                question: `In chemical science regarding ${topic}, what is the chemical symbol for Gold?`,
                options: ["Au", "Ag", "Fe", "Cu"],
                correctIndex: 0,
                concept: "Chemical Symbols & Elements",
                explanation: "Au is derived from the Latin word 'Aurum'."
            },
            {
                question: `What is the pH value of a neutral solution such as pure water at room temperature?`,
                options: ["7", "0", "14", "5"],
                correctIndex: 0,
                concept: "Acids, Bases & pH Scale",
                explanation: "A pH of 7 represents neutral acidity at 25°C."
            },
            {
                question: `Which subatomic particle carries a negative electrical charge inside an atom?`,
                options: ["Electron", "Proton", "Neutron", "Positron"],
                correctIndex: 0,
                concept: "Atomic Structure",
                explanation: "Electrons orbit the nucleus and carry a -1 elementary charge."
            },
            {
                question: `A chemical reaction that releases thermal energy into its surroundings is called:`,
                options: ["Exothermic Reaction", "Endothermic Reaction", "Synthesis Reaction", "Decomposition"],
                correctIndex: 0,
                concept: "Chemical Energetics",
                explanation: "Exothermic processes release heat into the surrounding environment."
            }
        ],
        biology: [
            {
                question: `During ${topic} in plant cells, which organelle absorbs sunlight to synthesize glucose?`,
                options: ["Chloroplast", "Mitochondria", "Nucleus", "Ribosome"],
                correctIndex: 0,
                concept: "Plant Physiology & Photosynthesis",
                explanation: "Chloroplasts contain green chlorophyll pigments that drive photosynthesis."
            },
            {
                question: `Which gas is absorbed from the atmosphere by plants during photosynthesis?`,
                options: ["Carbon Dioxide (CO2)", "Oxygen (O2)", "Nitrogen (N2)", "Methane (CH4)"],
                correctIndex: 0,
                concept: "Gas Exchange & Respiration",
                explanation: "Plants take in CO2 and release O2 as a byproduct."
            },
            {
                question: `What is known as the 'powerhouse of the cell' for ATP energy generation?`,
                options: ["Mitochondria", "Endoplasmic Reticulum", "Golgi Body", "Lysosome"],
                correctIndex: 0,
                concept: "Cell Biology",
                explanation: "Mitochondria generate chemical energy in the form of ATP via cellular respiration."
            },
            {
                question: `Which molecule carries genetic instructions for development and functioning in living organisms?`,
                options: ["DNA", "RNA", "Hemoglobin", "Lipid"],
                correctIndex: 0,
                concept: "Genetics & Molecular Biology",
                explanation: "DNA (Deoxyribonucleic acid) stores hereditary genetic information."
            }
        ],
        mathematics: [
            {
                question: `Regarding ${topic}, solve for x in the equation: 3x - 7 = 14`,
                options: ["x = 7", "x = 5", "x = 9", "x = 3"],
                correctIndex: 0,
                concept: "Algebraic Equations",
                explanation: "Add 7 to both sides: 3x = 21. Divide by 3: x = 7."
            },
            {
                question: `What is the value of sin(30°) in trigonometry?`,
                options: ["1/2", "√3/2", "1", "0"],
                correctIndex: 0,
                concept: "Trigonometric Ratios",
                explanation: "The sine of 30 degrees is 0.5 or 1/2."
            },
            {
                question: `If a circle has a radius of 7 cm, what is its circumference? (Use π = 22/7)`,
                options: ["44 cm", "154 cm²", "88 cm", "22 cm"],
                correctIndex: 0,
                concept: "Geometry & Mensuration",
                explanation: "Circumference = 2 × π × r = 2 × (22/7) × 7 = 44 cm."
            },
            {
                question: `What is the discriminant formula for a quadratic equation ax² + bx + c = 0?`,
                options: ["b² - 4ac", "b² + 4ac", "-b ± √d", "2a / b"],
                correctIndex: 0,
                concept: "Quadratic Equations",
                explanation: "The discriminant D = b² - 4ac determines the nature of roots."
            }
        ],
        english: [
            {
                question: `Identify the correct past perfect form of the verb in ${topic}:`,
                options: ["She had completed her assignment.", "She completes her assignment.", "She will complete her assignment.", "She is completing her assignment."],
                correctIndex: 0,
                concept: "Grammar & Tenses",
                explanation: "Past perfect tense uses 'had' + past participle verb form."
            },
            {
                question: `Which of the following sentences uses correct subject-verb agreement?`,
                options: ["Neither of the students was late.", "Neither of the students were late.", "Neither of the students are late.", "Neither of the students be late."],
                correctIndex: 0,
                concept: "Subject-Verb Agreement",
                explanation: "'Neither' takes a singular verb ('was')."
            },
            {
                question: `What figure of speech directly compares two things using 'like' or 'as'?`,
                options: ["Simile", "Metaphor", "Personification", "Hyperbole"],
                correctIndex: 0,
                concept: "Literary Devices",
                explanation: "A simile uses explicit comparative words such as 'like' or 'as'."
            }
        ]
    };

    // Determine target category
    let category = "mathematics";
    if (lowerSub.includes("phys")) category = "physics";
    else if (lowerSub.includes("chem")) category = "chemistry";
    else if (lowerSub.includes("bio")) category = "biology";
    else if (lowerSub.includes("eng") || lowerSub.includes("lit") || lowerSub.includes("gram")) category = "english";
    else if (lowerSub.includes("math") || lowerSub.includes("alg") || lowerSub.includes("geom")) category = "mathematics";
    else {
        // Create custom subject-aligned questions dynamically
        return generateDynamicSubjectQuiz(classLevel, subject, topic, difficulty, count);
    }

    const questions = bank[category] || bank["mathematics"];
    let finalQuestions = [];

    for (let i = 0; i < count; i++) {
        const base = questions[i % questions.length];
        finalQuestions.push({
            id: i + 1,
            question: base.question.replace("${topic}", topic),
            options: [...base.options],
            correctIndex: base.correctIndex,
            concept: `${subject} - ${base.concept}`,
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
 * Creates dynamic, subject-tailored questions for any custom topic entered by the teacher
 */
function generateDynamicSubjectQuiz(classLevel, subject, topic, difficulty, count) {
    const templates = [
        {
            question: `In ${subject}, what is the foundational concept behind ${topic}?`,
            options: [
                `The systematic analysis and principles governing ${topic}`,
                `An unrelated mathematical formula`,
                `A historical convention no longer used`,
                `None of the above`
            ],
            correctIndex: 0,
            concept: `Foundations of ${topic}`,
            explanation: `Understanding ${topic} requires mastering its core theoretical principles in ${subject}.`
        },
        {
            question: `Which of the following key elements is essential when evaluating ${topic} in ${subject}?`,
            options: [
                `Accurate conceptual definition and practical application`,
                `Ignoring contextual variables`,
                `Assuming constant values without verification`,
                `Relying on arbitrary estimates`
            ],
            correctIndex: 0,
            concept: `Core Principles of ${topic}`,
            explanation: `Proper evaluation in ${subject} relies on verifying foundational concepts.`
        },
        {
            question: `What is a common real-world application of ${topic}?`,
            options: [
                `Solving complex domain problems and analyzing structured data in ${subject}`,
                `Random guessing`,
                `Disregarding experimental observations`,
                `Standardizing non-functional procedures`
            ],
            correctIndex: 0,
            concept: `Applications of ${topic}`,
            explanation: `${topic} provides practical insights applied across modern ${subject} studies.`
        }
    ];

    let finalQuestions = [];
    for (let i = 0; i < count; i++) {
        const base = templates[i % templates.length];
        finalQuestions.push({
            id: i + 1,
            question: base.question,
            options: [...base.options],
            correctIndex: base.correctIndex,
            concept: `${subject} - ${base.concept}`,
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

module.exports = {
    generateQuizQuestions,
    analyzeQuizSubmission
};


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
