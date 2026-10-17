/**
 * LearnIQ — AI-Powered Classroom Learning Intelligence & Quiz Generator
 * Client Application Logic
 */

// Use the same origin as the frontend so local and deployed server ports stay in sync.
const API_BASE = "/api";

// Ensure all API calls automatically include session cookies
if (typeof window !== "undefined" && window.fetch) {
    const _nativeFetch = window.fetch;
    window.fetch = function (resource, options) {
        options = options || {};
        const url = typeof resource === "string" ? resource : resource?.url || "";
        if (url.startsWith("/api") || url.startsWith(API_BASE)) {
            if (!options.credentials) {
                options.credentials = "same-origin";
            }
        }
        return _nativeFetch.call(this, resource, options);
    };
}

// Application State
let currentQuiz = null;
let currentQuestionIdx = 0;
let userAnswers = {};
let quizTimerInterval = null;
let quizSecondsLeft = 300; // 5 mins
let quizTimerMode = "overall"; // "overall" | "question"
let questionSecondsLeft = 45;
let questionTimerInterval = null;
let quizSubmissionInProgress = false;
let studentProfile = {
    xp: 0,
    streak: 0,
    rank: "-",
    name: "Student",
    classLevel: "Class 10"
};

// Push Your Daily Challenges State
let currentDailyChallenges = [];
let selectedChallengeTask = null;
let selectedChallengeOption = null;

// Default fallback quiz if backend server is unreachable
const defaultQuiz = {
    title: "Linear Equations",
    subject: "Mathematics",
    classLevel: "Class 10",
    difficulty: "Medium",
    questions: [
        {
            id: 1,
            question: "Solve for x in the equation: 3x - 7 = 14",
            options: ["x = 7", "x = 5", "x = 9", "x = 3"],
            correctIndex: 0,
            concept: "One-variable Linear Equations",
            explanation: "Add 7 to both sides: 3x = 21. Then divide by 3: x = 7."
        },
        {
            id: 2,
            question: "If 2(x + 4) = 18, what is the value of x?",
            options: ["x = 5", "x = 7", "x = 9", "x = 4"],
            correctIndex: 0,
            concept: "Distributive Property",
            explanation: "Expand brackets: 2x + 8 = 18. Subtract 8: 2x = 10. Divide by 2: x = 5."
        },
        {
            id: 3,
            question: "A number increased by 12 equals 3 times the same number. What is the number?",
            options: ["6", "4", "8", "12"],
            correctIndex: 0,
            concept: "Word Problems into Equations",
            explanation: "Let the number be x. x + 12 = 3x => 2x = 12 => x = 6."
        },
        {
            id: 4,
            question: "What is the slope of the line represented by y = -4x + 9?",
            options: ["-4", "9", "4", "-9"],
            correctIndex: 0,
            concept: "Slope-Intercept Form",
            explanation: "In y = mx + c, m represents the slope. Here m = -4."
        },
        {
            id: 5,
            question: "Solve the system: x + y = 10 and x - y = 4",
            options: ["x = 7, y = 3", "x = 6, y = 4", "x = 8, y = 2", "x = 5, y = 5"],
            correctIndex: 0,
            concept: "Simultaneous Equations",
            explanation: "Adding equations: 2x = 14 => x = 7. Substitute into x + y = 10 => y = 3."
        }
    ]
};

// ==========================================
// INITIALIZATION
// ==========================================
document.addEventListener("DOMContentLoaded", async () => {
    await checkAuthSession();
    if (currentUser && currentUser.email) {
        if (currentUser.role === "admin") {
            showPage("admin-dashboard");
            loadAdminOverview();
        } else if (currentUser.role === "teacher") {
            showPage("teacher-map");
            loadTeacherClassMap();
        } else {
            await fetchStudentProfile();
            fetchDailyChallenges();
            loadStudentHistory();
            showPage("dashboard");
        }
    } else {
        showPage("landing");
    }
});

// ==========================================
// PAGE SWITCHING & UI NAVIGATION
// ==========================================
function showPage(pageId) {
    if (!currentUser && pageId !== 'landing') {
        showToast("ℹ️ Sign in or create an account to unlock all LearnIQ features.");
        openAuthModal();
        pageId = 'landing';
    }
    if (pageId === "admin-dashboard" && currentUser?.role !== "admin") {
        showToast("❌ Access denied. Administrator privileges are required.");
        pageId = currentUser?.role === "teacher" ? "teacher-map" : "dashboard";
    }
    if (pageId === "teacher-map" && !["teacher", "admin"].includes(currentUser?.role)) {
        showToast("❌ This page is available to teachers and administrators.");
        pageId = "dashboard";
    }

    const pages = document.querySelectorAll(".page");
    pages.forEach(p => p.classList.remove("active"));

    const targetPage = document.getElementById(pageId);
    if (targetPage) {
        targetPage.classList.add("active");
    }

    const navItems = document.querySelectorAll(".nav-item");
    navItems.forEach(item => {
        item.classList.remove("active");
        if (item.getAttribute("onclick") && item.getAttribute("onclick").includes(`'${pageId}'`)) {
            item.classList.add("active");
        }
    });

    if (pageId === "assessment" && (!currentQuiz || currentQuestionIdx === 0)) {
        startQuiz(currentQuiz || defaultQuiz);
    } else if (pageId === "admin-dashboard") {
        loadAdminOverview();
    } else if (pageId === "teacher-map") {
        loadTeacherClassMap();
    } else if (pageId === "challenges") {
        fetchDailyChallenges();
    } else if (pageId === "rankings") {
        loadLeaderboard();
    } else if (pageId === "profile") {
        renderProfileTestHistory();
    } else if (pageId === "intelligence") {
        renderLearningIntelligence();
    }
}

function toggleSidebar() {
    const sidebar = document.querySelector(".sidebar");
    if (sidebar) {
        sidebar.classList.toggle("open");
    }
}

// ==========================================
// The authenticated profile determines the user's role.
// ==========================================
// ==========================================
// AI QUIZ GENERATOR
// ==========================================
function onSubjectChange() {
    const subject = document.getElementById("genSubject").value;
    const topicInput = document.getElementById("genTopic");
    const subjectLabel = document.getElementById("selectedSubjectLabel");
    const chipsContainer = document.getElementById("quickTopicChips");

    if (subjectLabel) subjectLabel.innerText = subject;

    const subjectPresets = {
        Physics: [
            { topic: "Laws of Motion", classLevel: "10" },
            { topic: "Electricity & Circuits", classLevel: "10" },
            { topic: "Work & Energy", classLevel: "9" },
            { topic: "Optics & Light Refraction", classLevel: "10" }
        ],
        Chemistry: [
            { topic: "Periodic Table & Trends", classLevel: "10" },
            { topic: "Acids, Bases & Salts", classLevel: "10" },
            { topic: "Chemical Reactions", classLevel: "9" },
            { topic: "Atomic Structure", classLevel: "9" }
        ],
        Biology: [
            { topic: "Photosynthesis in Plants", classLevel: "10" },
            { topic: "Cell Structure & Organelles", classLevel: "9" },
            { topic: "Human Respiration System", classLevel: "10" },
            { topic: "Genetics & DNA", classLevel: "11" }
        ],
        Mathematics: [
            { topic: "Quadratic Equations", classLevel: "10" },
            { topic: "Trigonometry Ratios", classLevel: "10" },
            { topic: "Fractions & Decimals", classLevel: "6" },
            { topic: "Simultaneous Equations", classLevel: "10" }
        ],
        English: [
            { topic: "Tenses & Active/Passive Voice", classLevel: "9" },
            { topic: "Subject-Verb Agreement", classLevel: "8" },
            { topic: "Reading Comprehension", classLevel: "10" },
            { topic: "Vocabulary & Idioms", classLevel: "10" }
        ]
    };

    const presets = subjectPresets[subject] || subjectPresets["Physics"];
    if (topicInput) {
        topicInput.placeholder = `e.g. ${presets.map(p => p.topic).join(", ")}...`;
    }

    if (chipsContainer) {
        chipsContainer.innerHTML = presets.map(p => `
            <button type="button" class="chip-btn" onclick="setTopic('${p.topic}', '${subject}', '${p.classLevel}')">⚡ ${p.topic}</button>
        `).join("");
    }
}

function getDefaultTopicForSubject(subject) {
    switch (subject) {
        case "Physics": return "Laws of Motion";
        case "Chemistry": return "Acids & Bases";
        case "Biology": return "Photosynthesis";
        case "English": return "Grammar & Tenses";
        case "Mathematics": default: return "Quadratic Equations";
    }
}

function setTopic(topic, subject, classLevel) {
    if (topic) document.getElementById("genTopic").value = topic;
    if (subject) {
        document.getElementById("genSubject").value = subject;
        onSubjectChange();
    }
    if (classLevel) document.getElementById("genClass").value = classLevel;
    showToast(`Selected topic: ${topic} (${subject})`);
}

async function generateAIQuiz() {
    const classLevel = document.getElementById("genClass").value;
    const subject = document.getElementById("genSubject").value;
    const enteredTopic = document.getElementById("genTopic").value.trim();
    const topic = enteredTopic || getDefaultTopicForSubject(subject);
    const difficulty = document.getElementById("genDifficulty").value;
    const questionCount = document.getElementById("genCount").value;
    const prompt = document.getElementById("genPrompt").value.trim();

    const generateBtn = document.getElementById("generateBtn");
    const originalBtnHTML = generateBtn.innerHTML;
    generateBtn.disabled = true;
    generateBtn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> Generating AI ${subject} Quiz...`;

    try {
        const response = await fetch(`${API_BASE}/assessments/generate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ classLevel, subject, topic, difficulty, questionCount, prompt })
        });

        const data = await response.json();
        if (data.success && data.quiz) {
            currentQuiz = data.quiz;
            renderQuizPreview(data.quiz);
            showToast(`✨ Generated ${data.quiz.questions.length} AI ${subject} questions for "${topic}"!`);
        } else {
            throw new Error(data.message || "Failed to generate");
        }
    } catch (err) {
        console.warn("API generate notice:", err);
        // Fallback subject-aligned quiz generation
        currentQuiz = {
            title: `${topic} (${subject})`,
            subject,
            classLevel: `Class ${classLevel}`,
            difficulty,
            questions: [
                {
                    id: 1,
                    question: `In ${subject}, what is the foundational concept behind ${topic}?`,
                    options: [
                        `Key theoretical principles governing ${topic}`,
                        `An unrelated formula`,
                        `An obsolete convention`,
                        `None of the above`
                    ],
                    correctIndex: 0,
                    concept: `${subject} - ${topic}`,
                    explanation: `Understanding ${topic} requires mastering core principles in ${subject}.`
                },
                {
                    id: 2,
                    question: `Which of the following is essential when evaluating ${topic} in ${subject}?`,
                    options: [
                        `Accurate conceptual definition and empirical analysis`,
                        `Ignoring environmental factors`,
                        `Relying on arbitrary guesses`,
                        `Omitting standard formulas`
                    ],
                    correctIndex: 0,
                    concept: `${subject} - ${topic} Principles`,
                    explanation: `Proper evaluation in ${subject} relies on verifying foundational concepts.`
                }
            ]
        };
        renderQuizPreview(currentQuiz);
        showToast(`✨ Generated AI ${subject} Quiz preview for "${topic}"!`);
    } finally {
        generateBtn.disabled = false;
        generateBtn.innerHTML = originalBtnHTML;
    }
}

function renderQuizPreview(quiz) {
    const previewContainer = document.getElementById("genPreviewContainer");
    const previewTitle = document.getElementById("previewQuizTitle");
    const previewList = document.getElementById("previewQuestionsList");

    previewTitle.innerText = `${quiz.title} • [${quiz.difficulty}] (${quiz.questions.length} Questions)`;
    previewList.innerHTML = quiz.questions.map((q, idx) => `
        <div style="background: rgba(7, 11, 20, 0.6); padding: 14px 18px; border-radius: 12px; border: 1px solid var(--border);">
            <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                <strong style="color: var(--cyan);">Q${idx + 1}: ${q.question}</strong>
                <span class="badge-pill strong">${q.concept || "Concept"}</span>
            </div>
            <div style="font-size: 13px; color: var(--muted);">
                Options: ${q.options.join(" • ")}
            </div>
        </div>
    `).join("");

    previewContainer.style.display = "block";
    previewContainer.scrollIntoView({ behavior: "smooth" });
}

function startGeneratedQuiz() {
    if (!currentQuiz) return;
    startQuiz(currentQuiz);
    showPage("assessment");
}

// ==========================================
// INTERACTIVE QUIZ ENGINE & DUAL TIMER MODES
// ==========================================
function setQuizTimerMode(mode) {
    quizTimerMode = mode;
    const btnOverall = document.getElementById("btnTimerModeOverall");
    const btnQuestion = document.getElementById("btnTimerModeQuestion");
    const modeBadge = document.getElementById("quizTimerModeBadge");

    if (btnOverall && btnQuestion) {
        if (mode === "overall") {
            btnOverall.classList.add("active");
            btnOverall.style.background = "var(--primary-gradient)";
            btnOverall.style.color = "white";
            btnQuestion.classList.remove("active");
            btnQuestion.style.background = "transparent";
            btnQuestion.style.color = "var(--muted)";
            if (modeBadge) {
                modeBadge.innerText = "Overall";
                modeBadge.style.background = "rgba(0, 240, 255, 0.2)";
                modeBadge.style.color = "var(--cyan)";
            }
            clearInterval(questionTimerInterval);
            updateTimerDisplay();
        } else {
            btnQuestion.classList.add("active");
            btnQuestion.style.background = "var(--primary-gradient)";
            btnQuestion.style.color = "white";
            btnOverall.classList.remove("active");
            btnOverall.style.background = "transparent";
            btnOverall.style.color = "var(--muted)";
            if (modeBadge) {
                modeBadge.innerText = "Per Question";
                modeBadge.style.background = "rgba(168, 85, 247, 0.25)";
                modeBadge.style.color = "var(--purple)";
            }
            startQuestionTimer(45);
        }
    }
}

function startQuiz(quiz) {
    currentQuiz = quiz || defaultQuiz;
    currentQuestionIdx = 0;
    userAnswers = {};
    quizSubmissionInProgress = false;

    const quizTitleElem = document.getElementById("quizTitle");
    if (quizTitleElem) quizTitleElem.innerText = currentQuiz.title || "Adaptive Assessment";

    startTimer(300); // 5 minutes overall timer
    renderCurrentQuestion();
}

function startTimer(seconds) {
    clearInterval(quizTimerInterval);
    quizSecondsLeft = seconds;
    if (quizTimerMode === "overall") updateTimerDisplay();

    quizTimerInterval = setInterval(() => {
        quizSecondsLeft--;
        if (quizTimerMode === "overall") updateTimerDisplay();
        if (quizSecondsLeft <= 0) {
            clearInterval(quizTimerInterval);
            clearInterval(questionTimerInterval);
            showToast("⏳ Quiz time's up! Submitting answers...");
            finishQuiz();
        }
    }, 1000);
}

function startQuestionTimer(seconds = 45) {
    clearInterval(questionTimerInterval);
    questionSecondsLeft = seconds;
    updateQuestionTimerDisplay();

    questionTimerInterval = setInterval(() => {
        questionSecondsLeft--;
        updateQuestionTimerDisplay();
        if (questionSecondsLeft <= 0) {
            clearInterval(questionTimerInterval);
            showToast("⏱️ Question timer expired! Moving to next question...");
            autoAdvanceQuestion();
        }
    }, 1000);
}

function updateQuestionTimerDisplay() {
    const timerElem = document.getElementById("quizTimer");
    if (timerElem && quizTimerMode === "question") {
        const secs = Math.max(0, questionSecondsLeft);
        timerElem.innerText = `00:${secs.toString().padStart(2, '0')}`;
    }
}

function autoAdvanceQuestion() {
    if (!currentQuiz) return;
    const q = currentQuiz.questions[currentQuestionIdx];
    if (userAnswers[q.id || currentQuestionIdx + 1] === undefined) {
        userAnswers[q.id || currentQuestionIdx + 1] = -1;
    }
    if (currentQuestionIdx < currentQuiz.questions.length - 1) {
        currentQuestionIdx++;
        renderCurrentQuestion();
    } else {
        clearInterval(quizTimerInterval);
        clearInterval(questionTimerInterval);
        finishQuiz();
    }
}

function updateTimerDisplay() {
    if (quizTimerMode !== "overall") return;
    const mins = Math.floor(Math.max(0, quizSecondsLeft) / 60);
    const secs = Math.max(0, quizSecondsLeft) % 60;
    const timerElem = document.getElementById("quizTimer");
    if (timerElem) {
        timerElem.innerText = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
}

function renderCurrentQuestion() {
    if (!currentQuiz || !currentQuiz.questions) return;
    const questions = currentQuiz.questions;
    const q = questions[currentQuestionIdx];

    const idxElem = document.getElementById("questionIndex");
    const numElem = document.getElementById("questionNumber");
    const txtElem = document.getElementById("questionText");
    const progressFill = document.getElementById("quizProgressFill");

    if (idxElem) idxElem.innerText = (currentQuestionIdx + 1).toString().padStart(2, '0');
    if (numElem) numElem.innerText = `Question ${currentQuestionIdx + 1} of ${questions.length}`;
    if (txtElem) txtElem.innerText = q.question;

    const progressPct = Math.round(((currentQuestionIdx + 1) / questions.length) * 100);
    if (progressFill) progressFill.style.width = `${progressPct}%`;

    const answerContainer = document.getElementById("answerContainer");
    if (!answerContainer) return;
    answerContainer.innerHTML = "";

    q.options.forEach((optText, optIdx) => {
        const optionBtn = document.createElement("button");
        optionBtn.type = "button";
        optionBtn.className = "answer-option";
        if (userAnswers[q.id || currentQuestionIdx + 1] === optIdx) {
            optionBtn.classList.add("selected");
        }

        optionBtn.innerHTML = `
            <span class="option-num-badge">${optIdx + 1}</span>
            <span style="font-size: 13.5px; line-height: 1.4; color: var(--text);">${escapeHtml(optText)}</span>
        `;
        optionBtn.onclick = () => selectOption(optIdx);
        answerContainer.appendChild(optionBtn);
    });

    const adaptiveMsg = document.getElementById("adaptiveMessage");
    if (adaptiveMsg) {
        adaptiveMsg.innerText = `Concept: ${q.concept || "Curriculum"} • Select an option (1, 2, 3, or 4).`;
    }

    if (quizTimerMode === "question") {
        startQuestionTimer(45);
    }
}

function selectOption(optIdx) {
    if (!currentQuiz) return;
    const q = currentQuiz.questions[currentQuestionIdx];
    userAnswers[q.id || currentQuestionIdx + 1] = optIdx;

    const options = document.querySelectorAll("#answerContainer .answer-option");
    options.forEach((opt, i) => {
        if (i === optIdx) {
            opt.classList.add("selected");
        } else {
            opt.classList.remove("selected");
        }
    });
}

function nextQuestion() {
    if (!currentQuiz) return;
    const q = currentQuiz.questions[currentQuestionIdx];

    if (userAnswers[q.id || currentQuestionIdx + 1] === undefined) {
        showToast("⚠️ Please select an answer before continuing.");
        return;
    }

    clearInterval(questionTimerInterval);

    if (currentQuestionIdx < currentQuiz.questions.length - 1) {
        currentQuestionIdx++;
        renderCurrentQuestion();
    } else {
        clearInterval(quizTimerInterval);
        finishQuiz();
    }
}

async function finishQuiz() {
    if (quizSubmissionInProgress) return;
    quizSubmissionInProgress = true;
    clearInterval(quizTimerInterval);
    clearInterval(questionTimerInterval);
    showToast("🧠 AI is analyzing your quiz responses...");

    try {
        const response = await fetch(`${API_BASE}/assessments/submit`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ quiz: currentQuiz, answers: userAnswers })
        });

        const data = await response.json();
        if (!response.ok) {
            throw Object.assign(new Error(data.message || "Quiz submission could not be saved."), { status: response.status });
        }
        if (data.success && data.analysis) {
            openDiagnosisModal(data.analysis);

            // Reusable Gamification & XP System update
            const earnedXp = data.gamification?.earnedXp || data.analysis.xpEarned || 100;
            const totalXp = data.gamification?.totalXp !== undefined ? data.gamification.totalXp : ((studentProfile.xp || 0) + earnedXp);
            studentProfile.xp = totalXp;
            updateXPDisplay(totalXp);

            const lvl = calculateClientLevel(totalXp);
            showToast(`+${earnedXp} XP 🎉 → Quiz Complete → ${lvl.xpNeededForNext} XP to Next Level (${lvl.title})`);

            if (data.submission) {
                await fetchStudentProfile();
            }
            logQuizAttendance(currentQuiz, data.analysis);
            if (data.submission) await loadStudentHistory();
        } else {
            throw new Error("Invalid response");
        }
    } catch (e) {
        if (Number.isInteger(e.status)) {
            showToast(`❌ ${e.message}`);
            if (e.status === 401) {
                currentUser = null;
                updateUserUI(null);
                showPage("landing");
            }
            return;
        }
        console.warn("API submit offline, calculating client-side analysis:", e);
        // Client side fallback calculation
        const total = currentQuiz.questions.length;
        let correct = 0;
        currentQuiz.questions.forEach((q, idx) => {
            if (userAnswers[q.id || idx + 1] === q.correctIndex) correct++;
        });
        const scorePct = Math.round((correct / total) * 100);
        const xp = correct * 30 + (scorePct >= 80 ? 100 : 50);

        const feedback = currentQuiz.questions.map((q, idx) => {
            const answer = userAnswers[q.id || idx + 1];
            const isAnswered = Number.isInteger(answer) && answer >= 0 &&
                Array.isArray(q.options) && answer < q.options.length;
            const isCorrect = isAnswered && answer === q.correctIndex;
            return {
                questionId: q.id || idx + 1,
                question: q.question,
                topic: q.concept || currentQuiz.title || "General",
                selectedAnswer: isAnswered ? String(q.options[answer]) : "Not answered",
                correctAnswer: Array.isArray(q.options) ? String(q.options[q.correctIndex] || "Not available") : "Not available",
                isCorrect,
                isAnswered,
                errorCategory: isAnswered && !isCorrect ? "Mistake type not confidently identified." : null,
                explanation: q.explanation || (isAnswered && isCorrect
                    ? "Correct answer. Keep using the reasoning that helped you solve it."
                    : "AI feedback is unavailable. Review the question and correct answer, then retry feedback when the service is available."),
                stepByStepSolution: [],
                whySelectedAnswerDoesNotWork: "",
                practicalTip: "Read the question again and compare your answer with the key idea in the explanation.",
                practiceActivity: `Try one more ${q.concept || currentQuiz.title || "topic"} question and explain your reasoning.`,
                classificationConfidence: null,
                status: isAnswered && !isCorrect ? "unavailable" : "complete",
                retryAvailable: isAnswered && !isCorrect
            };
        });
        const mistakeCategories = {
            "Conceptual Error": 0,
            "Calculation Error": 0,
            "Misinterpretation": 0,
            "Careless Error": 0,
            "Mistake type not confidently identified.": feedback.filter(item => item.retryAvailable).length,
            "Unanswered": feedback.filter(item => !item.isAnswered).length
        };
        const conceptStats = {};
        feedback.forEach(item => {
            const concept = item.topic || "General Concept";
            conceptStats[concept] = conceptStats[concept] || { total: 0, answered: 0, correct: 0, incorrect: 0 };
            conceptStats[concept].total++;
            if (item.isAnswered) {
                conceptStats[concept].answered++;
                if (item.isCorrect) conceptStats[concept].correct++;
                else conceptStats[concept].incorrect++;
            }
        });
        const mockAnalysis = {
            scorePercentage: scorePct,
            correctCount: correct,
            totalQuestions: total,
            xpEarned: xp,
            aiInsight: "Your score is calculated from the quiz answer key. AI feedback is unavailable, so use the provided explanations and retry feedback when the service is available.",
            mistakeCategories,
            feedback,
            conceptStats,
            improvementPlan: {
                understands: [],
                needsRevision: feedback.filter(item => item.isAnswered && !item.isCorrect).map(item => ({
                    concept: item.topic,
                    affectedQuestions: 1,
                    evidence: "Review this question; one response is not enough to confirm a pattern."
                })),
                unansweredTopics: feedback.filter(item => !item.isAnswered).map(item => ({
                    topic: item.topic,
                    questions: 1
                })),
                mistakePatterns: { "Mistake type not confidently identified.": mistakeCategories["Mistake type not confidently identified."] },
                revisionActivities: feedback.filter(item => !item.isCorrect).map(item => item.practiceActivity),
                recommendedPracticeQuestions: feedback.filter(item => !item.isCorrect).map(item => item.practiceActivity),
                nextStep: "Review the explanations for any missed or unanswered questions, then try another practice set.",
                evidenceNote: "A single question is a prompt to review, not proof of mastery or a long-term weakness."
            }
        };

        openDiagnosisModal(mockAnalysis);
        updateStudentXP(xp);
        logQuizAttendance(currentQuiz, mockAnalysis);
    } finally {
        quizSubmissionInProgress = false;
    }
}

// ==========================================
// POST-QUIZ AI DIAGNOSIS MODAL
// ==========================================
function openDiagnosisModal(analysis) {
    currentAnalysis = analysis;
    const modal = document.getElementById("diagnosisModal");
    const scoreTitle = document.getElementById("diagScoreTitle");
    const subTitle = document.getElementById("diagSubTitle");
    const insightHeader = document.getElementById("diagInsightHeader");
    const insightBody = document.getElementById("diagInsightBody");
    const mistakeContainer = document.getElementById("diagMistakeContainer");
    const subjectTitle = document.getElementById("diagSubjectTitle");

    scoreTitle.innerText = `Score: ${analysis.scorePercentage}% (${analysis.correctCount}/${analysis.totalQuestions} Correct)`;
    subTitle.innerText = `🎉 You earned +${analysis.xpEarned} XP!`;
    subjectTitle.innerText = `${currentQuiz.subject || "Quiz"} • ${currentQuiz.title || "Assessment"}`;

    if (analysis.scorePercentage >= 80) {
        insightHeader.innerText = (analysis.improvementPlan?.understands || []).length
            ? "Strong understanding across several questions"
            : "Great quiz performance!";
        insightHeader.style.color = "var(--green)";
    } else if (analysis.scorePercentage >= 50) {
        insightHeader.innerText = "Developing Understanding";
        insightHeader.style.color = "var(--cyan)";
    } else {
        insightHeader.innerText = "Let's build on this attempt";
        insightHeader.style.color = "var(--cyan)";
    }

    insightBody.innerText = analysis.aiInsight;

    const mistakes = analysis.mistakeCategories || {};
    mistakeContainer.replaceChildren();
    Object.entries(mistakes).filter(([, count]) => count > 0).forEach(([category, count]) => {
        const card = document.createElement("div");
        card.className = "mistake-card";
        const label = document.createElement("strong");
        label.textContent = category;
        const number = document.createElement("span");
        number.textContent = `${count}×`;
        number.style.color = "var(--orange)";
        card.append(label, number);
        mistakeContainer.appendChild(card);
    });
    if (!mistakeContainer.childElementCount) {
        const message = document.createElement("p");
        message.className = "diag-empty-state";
        message.textContent = "No incorrect or unanswered questions. Great work!";
        mistakeContainer.appendChild(message);
    }

    renderQuestionFeedback(analysis.feedback || []);
    renderImprovementPlan(analysis.improvementPlan || {});
    document.getElementById("practiseSimilarBtn").hidden =
        !(analysis.feedback || []).some(item => !item.isCorrect);
    modal.classList.add("active");
}

let currentAnalysis = null;

function appendFeedbackField(container, label, value) {
    if (!value) return;
    const paragraph = document.createElement("p");
    const heading = document.createElement("strong");
    heading.textContent = `${label}: `;
    paragraph.append(heading, document.createTextNode(value));
    container.appendChild(paragraph);
}

function renderQuestionFeedback(feedbackItems) {
    const container = document.getElementById("diagQuestionFeedback");
    container.replaceChildren();
    feedbackItems.forEach((item, index) => {
        const details = document.createElement("details");
        details.className = "diag-question-card";
        const summary = document.createElement("summary");
        const state = item.isCorrect ? "Correct" : item.isAnswered ? "Review" : "Not answered";
        summary.textContent = `Question ${index + 1} · ${item.topic || "General"} · ${state}`;
        details.appendChild(summary);

        const body = document.createElement("div");
        body.className = "diag-feedback-body";
        appendFeedbackField(body, "Question", item.question);
        appendFeedbackField(body, "Your answer", item.selectedAnswer || "Not answered");
        appendFeedbackField(body, "Correct answer", item.correctAnswer);
        if (item.errorCategory) {
            appendFeedbackField(body, "Mistake type", item.errorCategory);
            if (typeof item.classificationConfidence === "number") {
                appendFeedbackField(body, "Classification confidence", `${Math.round(item.classificationConfidence * 100)}%`);
            }
        }
        appendFeedbackField(body, "Explanation", item.explanation);
        if (Array.isArray(item.stepByStepSolution) && item.stepByStepSolution.length) {
            const stepsTitle = document.createElement("strong");
            stepsTitle.textContent = "Step-by-step solution";
            body.appendChild(stepsTitle);
            const steps = document.createElement("ol");
            item.stepByStepSolution.forEach(step => {
                const entry = document.createElement("li");
                entry.textContent = step;
                steps.appendChild(entry);
            });
            body.appendChild(steps);
        }
        appendFeedbackField(body, "Why your answer does not fit", item.whySelectedAnswerDoesNotWork);
        appendFeedbackField(body, "Tip", item.practicalTip);
        appendFeedbackField(body, "Try this", item.practiceActivity);

        if (item.retryAvailable) {
            const retry = document.createElement("button");
            retry.type = "button";
            retry.className = "secondary-btn diag-retry-btn";
            retry.textContent = "Retry AI Feedback";
            retry.addEventListener("click", () => retryQuestionFeedback(item.questionId, retry));
            body.appendChild(retry);
        }
        details.appendChild(body);
        container.appendChild(details);
    });
}

function renderImprovementPlan(plan) {
    const container = document.getElementById("diagImprovementPlan");
    container.replaceChildren();
    const sections = [
        ["Concepts you understand", (plan.understands || []).join(", ") || "More questions will help confirm what you understand."],
        ["Topics to review", (plan.needsRevision || []).map(item =>
            `${item.concept} (${item.affectedQuestions} incorrect question${item.affectedQuestions === 1 ? "" : "s"}; ${item.evidence}; importance: ${item.importance || "not provided"})`
        ).join("; ") || "No topics were flagged for review in this attempt."],
        ["Unanswered questions", (plan.unansweredTopics || []).map(item =>
            `${item.topic} (${item.questions} unanswered)`
        ).join(", ") || "No questions were left unanswered."],
        ["Revision activities", (plan.revisionActivities || []).join(" ") || "Try another question set to build more evidence."],
        ["Recommended practice", (plan.recommendedPracticeQuestions || []).join(" ") || "Practise a few more questions from this quiz topic."],
        ["Next step", plan.nextStep || "Review the feedback, then continue practising."]
    ];
    sections.forEach(([label, value]) => appendFeedbackField(container, label, value));
    appendFeedbackField(container, "Evidence note", plan.evidenceNote);
}

async function retryQuestionFeedback(questionId, button) {
    const item = currentAnalysis?.feedback?.find(feedback => String(feedback.questionId) === String(questionId));
    const question = currentQuiz?.questions?.find((entry, index) =>
        String(entry.id || index + 1) === String(questionId)
    );
    if (!item || !question) return;

    button.disabled = true;
    button.textContent = "Generating feedback…";
    const questionIndex = currentQuiz.questions.indexOf(question);
    const selectedIndex = userAnswers[question.id || questionIndex + 1];
    try {
        const response = await fetch(`${API_BASE}/assessments/feedback/retry`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                subject: question.subject || currentQuiz.subject || "Other",
                classLevel: currentQuiz.classLevel || studentProfile.classLevel,
                topic: question.concept || currentQuiz.title || "General",
                difficulty: currentQuiz.difficulty || "",
                questionType: question.questionType || question.type || "",
                question: question.question,
                options: question.options,
                selectedIndex,
                correctIndex: question.correctIndex,
                explanation: question.explanation || "",
                solution: question.solution || question.correctSolution || "",
                rubric: question.rubric || "",
                sourceText: question.passage || question.context || question.sourceText || ""
            })
        });
        const data = await response.json();
        if (!response.ok || !data.success || !data.feedback) {
            throw new Error(data.message || "AI feedback is temporarily unavailable.");
        }
        const previousCategory = item.errorCategory;
        const nextCategory = data.feedback.errorCategory;
        if (previousCategory && currentAnalysis.mistakeCategories[previousCategory] > 0) {
            currentAnalysis.mistakeCategories[previousCategory]--;
        }
        if (nextCategory) {
            currentAnalysis.mistakeCategories[nextCategory] =
                (currentAnalysis.mistakeCategories[nextCategory] || 0) + 1;
        }
        Object.assign(item, data.feedback, {
            questionId: item.questionId,
            isCorrect: false,
            isAnswered: true,
            retryAvailable: false
        });
        openDiagnosisModal(currentAnalysis);
    } catch (error) {
        button.disabled = false;
        button.textContent = "Retry AI Feedback";
        showToast(error.message || "AI feedback is temporarily unavailable. Please try again.");
    }
}

async function startSimilarPractice() {
    const item = currentAnalysis?.feedback?.find(feedback => !feedback.isCorrect);
    const question = item && currentQuiz?.questions?.find((entry, index) =>
        String(entry.id || index + 1) === String(item.questionId)
    );
    const subject = question?.subject || currentQuiz?.subject || "Other";
    const topic = question?.concept || currentQuiz?.title || "Foundational Concepts";
    const button = document.getElementById("practiseSimilarBtn");
    button.disabled = true;
    button.textContent = "Preparing practice…";
    try {
        const response = await fetch(`${API_BASE}/assessments/generate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                subject,
                topic,
                classLevel: currentQuiz?.classLevel || studentProfile.classLevel,
                difficulty: currentQuiz?.difficulty || "Medium",
                questionCount: 3,
                prompt: "Create fresh practice questions for this topic. Do not repeat the original question verbatim."
            })
        });
        const data = await response.json();
        if (!response.ok || !data.success || !data.quiz) {
            throw new Error(data.message || "Practice questions could not be prepared.");
        }
        currentQuiz = data.quiz;
        currentQuestionIdx = 0;
        showPage("assessment");
        document.getElementById("diagnosisModal").classList.remove("active");
        showToast(`Practice is ready for ${topic}.`);
    } catch (error) {
        showToast(error.message || "Practice questions could not be prepared. Please try again.");
    } finally {
        button.disabled = false;
        button.innerHTML = `Practise Similar Questions <i class="fa-solid fa-arrow-right"></i>`;
    }
}

function closeDiagnosisModal() {
    const modal = document.getElementById("diagnosisModal");
    modal.classList.remove("active");
    showPage("intelligence");
}

// ==========================================
// TEACHER CLASS MAP & GAP DETECTION
// ==========================================
async function onTeacherClassChanged(classNum) {
    await loadTeacherClassMap(classNum);
}

async function loadTeacherClassMap(classNum) {
    if (!["teacher", "admin"].includes(currentUser?.role)) return;
    const selectElem = document.getElementById("teacherClassSelect");
    const targetClass = classNum || selectElem?.value || "10";
    if (selectElem && selectElem.value !== String(targetClass)) {
        selectElem.value = String(targetClass);
    }
    const subtitle = document.getElementById("teacherMapSubtitle");
    if (subtitle) {
        subtitle.innerText = `Real-time concept mastery trends and automated intervention plans for Class ${targetClass}.`;
    }
    try {
        const response = await fetch(`${API_BASE}/teachers/class-map?classLevel=${targetClass}`);
        const data = await response.json();

        if (data.success && data.learningMap) {
            renderTeacherClassMap(data.learningMap);
        }
    } catch (e) {
        console.warn("API class-map offline, using fallback:", e);
    }
}

function renderTeacherClassMap(data) {
    const barsContainer = document.getElementById("teacherConceptBars");
    const supportContainer = document.getElementById("studentsSupportList");

    if (barsContainer && data.concepts) {
        barsContainer.innerHTML = data.concepts.map(c => `
            <div class="dna-item">
                <div>
                    <span>${escapeHtml(c.name)}</span>
                    <strong style="color: ${c.mastery < 60 ? 'var(--red)' : 'var(--cyan)'};">${c.mastery}%</strong>
                </div>
                <div class="progress">
                    <div style="width:${c.mastery}%; background: ${c.mastery < 60 ? 'var(--red)' : 'var(--cyan)'};"></div>
                </div>
            </div>
        `).join("");
    }

    if (supportContainer && data.studentsRequiringSupport) {
        supportContainer.innerHTML = data.studentsRequiringSupport.map(s => `
            <div style="background: rgba(7, 11, 20, 0.6); padding: 12px 16px; border-radius: 12px; border: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <strong style="color: var(--text);">${escapeHtml(s.name)}</strong>
                    <div style="font-size: 12px; color: var(--muted);">${escapeHtml(s.weakConcept)}</div>
                </div>
                <span class="badge-pill critical">${escapeHtml(String(s.score))}</span>
            </div>
        `).join("");
    }
}

async function generateIntervention() {
    const targetClass = document.getElementById("teacherClassSelect")?.value || "10";
    try {
        const response = await fetch(`${API_BASE}/teachers/intervention`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ concept: "Linear Equations", className: `Class ${targetClass}` })
        });
        const data = await response.json();
        if (data.success && data.aiInterventionPlan) {
            const plan = data.aiInterventionPlan;
            document.getElementById("interventTitle").innerText = plan.summary;
            document.getElementById("interventDesc").innerText = `Recommended Action: ${plan.recommendedAction}\n\nRemedial Exercises: ${plan.remedialQuiz.join(" • ")}`;
            showToast("💡 AI Teacher Intervention Plan generated!");
        }
    } catch (e) {
        document.getElementById("interventTitle").innerText = `Targeted intervention recommended for Class ${targetClass}`;
        document.getElementById("interventDesc").innerText = "Recommended Action: Spend 5 minutes on foundational rules, then assign targeted practice questions.";
        showToast("💡 AI Teacher Intervention Plan loaded!");
    }
}

// ==========================================
// SCALABLE GAMIFICATION & LEVELS SYSTEM
// ==========================================
const GAMIFICATION_LEVELS = [
    { level: 1, title: "Explorer", icon: "🌱", minXp: 0 },
    { level: 2, title: "Learner", icon: "📚", minXp: 100 },
    { level: 3, title: "Problem Solver", icon: "🧩", minXp: 250 },
    { level: 4, title: "Achiever", icon: "⭐", minXp: 450 },
    { level: 5, title: "Knowledge Builder", icon: "🏗️", minXp: 700 },
    { level: 6, title: "Master Thinker", icon: "🎯", minXp: 1000 },
    { level: 7, title: "Logic Master", icon: "⚡", minXp: 1350 },
    { level: 8, title: "Intellect Champion", icon: "🏆", minXp: 1750 },
    { level: 9, title: "Scholar", icon: "📜", minXp: 2200 },
    { level: 10, title: "Grand Scholar", icon: "🎓", minXp: 2700 },
    { level: 11, title: "Polymath", icon: "🔬", minXp: 3250 },
    { level: 12, title: "Genius", icon: "💡", minXp: 3850 },
    { level: 13, title: "Luminary", icon: "🌟", minXp: 4500 },
    { level: 14, title: "Prodigy", icon: "👑", minXp: 5200 },
    { level: 15, title: "Grandmaster", icon: "💎", minXp: 6000 }
];

function calculateClientLevel(totalXp) {
    const xp = Math.max(0, Number(totalXp) || 0);
    let current = GAMIFICATION_LEVELS[0];
    let next = GAMIFICATION_LEVELS[1];

    for (let i = 0; i < GAMIFICATION_LEVELS.length; i++) {
        if (xp >= GAMIFICATION_LEVELS[i].minXp) {
            current = GAMIFICATION_LEVELS[i];
            next = GAMIFICATION_LEVELS[i + 1] || null;
        } else {
            break;
        }
    }

    if (!next) {
        const extraLevels = Math.floor((xp - current.minXp) / 1000);
        const lvlNum = 15 + extraLevels;
        const currentTierBase = current.minXp + (extraLevels * 1000);
        const nextTierBase = currentTierBase + 1000;
        const needed = nextTierBase - xp;
        const progress = Math.min(100, Math.floor(((xp - currentTierBase) / 1000) * 100));
        return {
            level: lvlNum,
            title: extraLevels > 0 ? `Ascendant ${extraLevels}` : current.title,
            icon: "🌌",
            minXp: currentTierBase,
            nextLevelXp: nextTierBase,
            xpNeededForNext: needed,
            progressPercent: progress
        };
    }

    const range = next.minXp - current.minXp;
    const progress = Math.min(100, Math.max(0, Math.floor(((xp - current.minXp) / range) * 100)));
    const needed = Math.max(0, next.minXp - xp);

    return {
        level: current.level,
        title: current.title,
        icon: current.icon,
        minXp: current.minXp,
        nextLevelXp: next.minXp,
        xpNeededForNext: needed,
        progressPercent: progress
    };
}

async function fetchStudentProfile() {
    try {
        const response = await fetch(`${API_BASE}/students/profile`);
        const data = await response.json();
        if (data.success && data.student) {
            const rawXp = data.student.xp !== undefined ? data.student.xp : (data.student.totalXp !== undefined ? data.student.totalXp : 0);
            studentProfile = {
                ...studentProfile,
                ...data.student,
                xp: rawXp
            };
            updateXPDisplay(rawXp);
            updateDailyStreak();
            renderLearningIntelligence();
        }
    } catch (e) {
        updateXPDisplay(studentProfile.xp);
    }
}

function updateStudentXP(pointsGained) {
    studentProfile.xp = (studentProfile.xp || 0) + pointsGained;
    updateXPDisplay(studentProfile.xp);
    renderLearningIntelligence();
}

function updateXPDisplay(xpValue) {
    const val = Math.max(0, typeof xpValue === 'number' ? xpValue : (studentProfile.xp || 0));
    studentProfile.xp = val;

    const xpElements = document.querySelectorAll(".xp-value");
    xpElements.forEach(el => {
        el.innerText = val.toLocaleString();
    });

    const lvl = calculateClientLevel(val);

    const sidebarLevelName = document.getElementById("sidebarLevelName");
    if (sidebarLevelName) {
        sidebarLevelName.innerText = `Lvl ${lvl.level} • ${lvl.title}`;
    }
    const sidebarLevelProgressText = document.getElementById("sidebarLevelProgressText");
    if (sidebarLevelProgressText) {
        sidebarLevelProgressText.innerText = `${lvl.progressPercent}% (${lvl.xpNeededForNext} XP to Lvl ${lvl.level + 1})`;
    }
    const sidebarLevelProgressFill = document.getElementById("sidebarLevelProgressFill");
    if (sidebarLevelProgressFill) {
        sidebarLevelProgressFill.style.width = `${lvl.progressPercent}%`;
    }

    const topbarLevelIcon = document.getElementById("topbarLevelIcon");
    if (topbarLevelIcon) topbarLevelIcon.innerText = lvl.icon;
    const topbarLevelText = document.getElementById("topbarLevelText");
    if (topbarLevelText) topbarLevelText.innerText = `Lvl ${lvl.level} • ${lvl.title}`;
    const topbarLevelBadge = document.getElementById("topbarLevelBadge");
    if (topbarLevelBadge && currentUser && currentUser.role === "student") {
        topbarLevelBadge.style.display = "flex";
    }

    const dashLevelText = document.getElementById("dashLevelText");
    if (dashLevelText) dashLevelText.innerText = `Level ${lvl.level} — ${lvl.title}`;
    const dashLevelProgress = document.getElementById("dashLevelProgress");
    if (dashLevelProgress) dashLevelProgress.innerText = `${lvl.xpNeededForNext} XP needed to reach Level ${lvl.level + 1}`;
    const dashLevelFill = document.getElementById("dashLevelFill");
    if (dashLevelFill) dashLevelFill.style.width = `${lvl.progressPercent}%`;
}

// ==========================================
// PUSH YOUR CHALLENGES CONTROLLER
// ==========================================
async function fetchDailyChallenges() {
    const grid = document.getElementById("dailyChallengesGrid");
    if (!grid) return;

    try {
        const response = await fetch(`${API_BASE}/students/challenges`);
        const data = await response.json();
        if (data.success && Array.isArray(data.challenges)) {
            currentDailyChallenges = data.challenges;

            // Update Overview Card
            const classLevel = data.classLevel || 10;
            const streak = data.streak || 1;
            const completedCount = currentDailyChallenges.filter(c => c.completed).length;
            const totalCount = currentDailyChallenges.length;
            const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
            const totalAvailableXp = currentDailyChallenges.reduce((sum, c) => sum + (c.xp || 0), 0);

            const overviewClassBadge = document.getElementById("overviewClassBadge");
            if (overviewClassBadge) overviewClassBadge.innerHTML = `<i class="fa-solid fa-graduation-cap"></i> Class ${classLevel} Quests`;

            const challengesClassSubtitle = document.getElementById("challengesClassSubtitle");
            if (challengesClassSubtitle) challengesClassSubtitle.innerText = `Age-appropriate, subject-specific daily quests designed for Class ${classLevel}.`;

            const overviewTotalXp = document.getElementById("overviewTotalXpAvailable");
            if (overviewTotalXp) overviewTotalXp.innerText = `+${totalAvailableXp} XP`;

            const overviewStreak = document.getElementById("overviewStreakDays");
            if (overviewStreak) overviewStreak.innerText = `${streak} ${streak === 1 ? 'Day' : 'Days'}`;

            const progressLabel = document.getElementById("overviewProgressPercent");
            if (progressLabel) progressLabel.innerText = `${completedCount} / ${totalCount} Complete (${pct}%)`;

            const progressBar = document.getElementById("overviewProgressBar");
            if (progressBar) progressBar.style.width = `${pct}%`;

            // Render Challenges Grid
            if (currentDailyChallenges.length === 0) {
                grid.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--muted);"><i class="fa-solid fa-trophy" style="font-size: 32px; color: var(--cyan); margin-bottom: 12px;"></i><p>All daily challenges complete for today! Check back tomorrow for fresh quests.</p></div>`;
            } else {
                grid.innerHTML = currentDailyChallenges.map(c => {
                    const isCompleted = Boolean(c.completed);
                    return `
                        <div class="challenge-card-v2 ${isCompleted ? 'completed' : ''}">
                            <div class="challenge-top-meta">
                                <span class="challenge-badge">${escapeHtml(c.category || c.subject || 'Mission')}</span>
                                <span class="challenge-xp-badge">+${c.xpReward || c.xp || 50} XP</span>
                            </div>
                            <h4>${escapeHtml(c.title)}</h4>
                            <p>${escapeHtml(c.description)}</p>
                            <div style="margin-top: auto;">
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; font-size: 11.5px;">
                                    <span style="color: var(--muted);">${escapeHtml(c.subject)} • Class ${c.classLevel}</span>
                                    <span class="badge-pill ${isCompleted ? 'strong' : ''}" style="${isCompleted ? '' : 'color: var(--cyan); background: rgba(0,240,255,0.08);'}">
                                        <i class="fa-solid ${isCompleted ? 'fa-circle-check' : 'fa-hourglass-start'}"></i> ${isCompleted ? 'Completed' : 'Ready'}
                                    </span>
                                </div>
                                ${isCompleted
                                    ? `<button class="challenge-claim-btn" disabled><i class="fa-solid fa-check-double"></i> Claimed (+${c.xpReward || c.xp || 50} XP)</button>`
                                    : `<button class="challenge-claim-btn" onclick="openChallengeTask('${c.id}')"><i class="fa-solid fa-play"></i> Solve Challenge (+${c.xpReward || c.xp || 50} XP)</button>`
                                }
                            </div>
                        </div>
                    `;
                }).join("");
            }
        }
    } catch (err) {
        console.error("Failed to load daily challenges:", err);
    }
}

function openChallengeTask(challengeId) {
    const c = currentDailyChallenges.find(x => x.id === challengeId);
    if (!c || c.completed) return;

    selectedChallengeTask = c;
    selectedChallengeOption = null;

    const modal = document.getElementById("challengeTaskModal");
    const badge = document.getElementById("modalChallengeBadge");
    const title = document.getElementById("modalChallengeTitle");
    const desc = document.getElementById("modalChallengeDesc");
    const interactiveArea = document.getElementById("modalChallengeInteractiveArea");
    const feedback = document.getElementById("modalChallengeFeedback");
    const submitBtn = document.getElementById("modalChallengeSubmitBtn");

    if (badge) badge.innerText = `${c.category || c.subject} • Class ${c.classLevel}`;
    if (title) title.innerText = c.title;
    if (desc) desc.innerText = c.description;

    if (feedback) {
        feedback.style.display = "none";
        feedback.innerText = "";
    }

    if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<i class="fa-solid fa-bolt"></i> Complete & Claim +${c.xpReward || c.xp || 50} XP`;
    }

    if (interactiveArea && c.problem) {
        interactiveArea.innerHTML = `
            <div style="font-size: 14.5px; font-weight: 600; color: var(--text); margin-bottom: 14px; line-height: 1.5;">
                <i class="fa-solid fa-circle-question" style="color: var(--cyan); margin-right: 8px;"></i>${escapeHtml(c.problem.question)}
            </div>
            <div class="answer-grid" style="grid-template-columns: 1fr; gap: 8px;">
                ${c.problem.options.map((opt, idx) => `
                    <button type="button" class="answer-option" id="challengeOptBtn_${idx}" onclick="selectChallengeTaskOption(${idx})" style="padding: 10px 14px; text-align: left;">
                        <span class="option-num-badge">${idx + 1}</span>
                        <span style="font-size: 13px; color: var(--text);">${escapeHtml(opt)}</span>
                    </button>
                `).join("")}
            </div>
        `;
    }

    if (modal) modal.classList.add("active");
}

function selectChallengeTaskOption(idx) {
    selectedChallengeOption = idx;
    const options = document.querySelectorAll("#modalChallengeInteractiveArea .answer-option");
    options.forEach((btn, i) => {
        if (i === idx) btn.classList.add("selected");
        else btn.classList.remove("selected");
    });
}

function closeChallengeTaskModal() {
    const modal = document.getElementById("challengeTaskModal");
    if (modal) modal.classList.remove("active");
    selectedChallengeTask = null;
    selectedChallengeOption = null;
}

async function verifyAndClaimChallenge() {
    if (!selectedChallengeTask) return;
    const c = selectedChallengeTask;
    const feedback = document.getElementById("modalChallengeFeedback");
    const submitBtn = document.getElementById("modalChallengeSubmitBtn");

    if (c.problem && selectedChallengeOption === null) {
        showToast("⚠️ Please select an answer option first.");
        return;
    }

    // Check correctness
    if (c.problem && selectedChallengeOption !== c.problem.correctIndex) {
        if (feedback) {
            feedback.style.display = "block";
            feedback.style.background = "rgba(239, 68, 68, 0.15)";
            feedback.style.border = "1px solid rgba(239, 68, 68, 0.3)";
            feedback.style.color = "#ef4444";
            feedback.innerHTML = `<i class="fa-solid fa-triangle-exclamation" style="margin-right: 6px;"></i> Not quite right! Review the problem and try another option.`;
        }
        return;
    }

    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Verifying & Claiming...`;
    }

    try {
        const response = await fetch(`${API_BASE}/students/challenges/claim`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ challengeId: c.id })
        });
        const data = await response.json();

        if (data.success) {
            const earnedXp = data.earnedXp || c.xp;
            const totalXp = data.totalXp !== undefined ? data.totalXp : ((studentProfile.xp || 0) + earnedXp);
            studentProfile.xp = totalXp;
            updateXPDisplay(totalXp);

            const lvl = calculateClientLevel(totalXp);

            if (feedback) {
                feedback.style.display = "block";
                feedback.style.background = "rgba(34, 197, 94, 0.15)";
                feedback.style.border = "1px solid rgba(34, 197, 94, 0.3)";
                feedback.style.color = "#22c55e";
                feedback.innerHTML = `<i class="fa-solid fa-circle-check" style="margin-right: 6px;"></i> Correct! ${escapeHtml(c.problem?.explanation || '')}<br><strong style="color: var(--cyan); margin-top: 4px; display: inline-block;">+${earnedXp} XP Awarded! 🎉</strong>`;
            }

            showToast(`+${earnedXp} XP 🎉 → Challenge Complete → ${lvl.xpNeededForNext} XP to Next Level (${lvl.title})`);

            c.completed = true;
            fetchDailyChallenges();

            setTimeout(() => {
                closeChallengeTaskModal();
            }, 1400);
        } else {
            showToast(`❌ ${data.message || 'Could not complete challenge.'}`);
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = `<i class="fa-solid fa-bolt"></i> Complete & Claim +${c.xp} XP`;
            }
        }
    } catch (err) {
        showToast("⚠️ Could not reach server to claim challenge.");
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = `<i class="fa-solid fa-bolt"></i> Complete & Claim +${c.xp} XP`;
        }
    }
}

async function redeemReward(cost, title = "Reward Item") {
    if (studentProfile.xp < cost) {
        showToast(`❌ Insufficient XP! You need ${cost} XP, but have ${studentProfile.xp} XP.`);
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/students/rewards/redeem`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ rewardTitle: title, cost })
        });
        const data = await response.json();
        if (!response.ok || !data.success) {
            throw new Error(data.message || "Reward redemption could not be completed.");
        }
        studentProfile.xp = data.remainingXp;
        updateXPDisplay(studentProfile.xp);
        showToast(`🎁 ${data.message}`);
    } catch (e) {
        showToast(`⚠️ ${e.message || "Reward redemption could not be confirmed. Please try again."}`);
    }
}

function practiceLearningTopic(topic) {
    const subject = document.getElementById("genSubject");
    const topicInput = document.getElementById("genTopic");
    if (subject) {
        subject.value = "Mathematics";
        onSubjectChange();
    }
    if (topicInput) topicInput.value = topic;
    showPage("generator");
}

function startLinearEquationsPractice() {
    currentQuiz = defaultQuiz;
    currentQuestionIdx = 0;
    showPage("assessment");
}

function startRecommendedPractice() {
    const topicRows = [...document.querySelectorAll("#intelligence .mastery-row")];
    const weakestTopic = topicRows.reduce((weakest, row) => {
        const mastery = Number(row.dataset.mastery);
        return Number.isFinite(mastery) && (!weakest || mastery < weakest.mastery)
            ? { name: row.dataset.topic, mastery }
            : weakest;
    }, null);

    const topic = weakestTopic ? weakestTopic.name : "Fractions";
    practiceLearningTopic(topic);
}

function selectLearningSubject(subject) {
    const overview = document.getElementById("learningSubjectOverview");
    const detail = document.getElementById("learningSubjectDetail");
    const nameEl = document.getElementById("selectedSubjectName");
    const select = document.getElementById("learningSubjectSelect");
    if (select && select.value !== subject) select.value = subject;

    if (!subject || subject === "All Subjects") {
        if (overview) overview.hidden = false;
        if (detail) detail.hidden = true;
    } else {
        if (overview) overview.hidden = true;
        if (detail) detail.hidden = false;
        if (nameEl) nameEl.textContent = subject;
    }
}

function renderLearningIntelligence() {
    const history = Array.isArray(studentQuizHistory) ? studentQuizHistory : [];
    const scoreHistory = history
        .filter(item => item.score !== null && item.score !== "" && Number.isFinite(Number(item.score)))
        .slice(0, 7)
        .reverse();
    const scores = history
        .filter(item => item.score !== null && item.score !== "")
        .map(item => Number(item.score))
        .filter(score => Number.isFinite(score));
    const accuracy = document.getElementById("learningAccuracy");
    const quizCount = document.getElementById("learningQuizCount");
    const streak = document.getElementById("learningStreak");
    const xp = document.getElementById("learningXp");

    if (accuracy) {
        accuracy.textContent = scores.length
            ? `${Math.round(scores.reduce((total, score) => total + score, 0) / scores.length)}%`
            : "--";
    }
    if (quizCount) quizCount.textContent = history.length.toLocaleString();
    if (streak) {
        const currentStreak = Number(studentProfile.streak);
        streak.textContent = Number.isFinite(currentStreak)
            ? `${currentStreak} ${currentStreak === 1 ? "day" : "days"}`
            : "--";
    }
    if (xp) {
        const currentXp = Number(studentProfile.xp);
        xp.textContent = Number.isFinite(currentXp) ? currentXp.toLocaleString() : "--";
    }

    const topicRows = [...document.querySelectorAll("#intelligence .mastery-row")];
    const weakestTopic = topicRows.reduce((weakest, row) => {
        const mastery = Number(row.dataset.mastery);
        return Number.isFinite(mastery) && (!weakest || mastery < weakest.mastery)
            ? { name: row.dataset.topic, mastery }
            : weakest;
    }, null);
    const recommendationTitle = document.getElementById("nextActionTitle");
    const recommendationMastery = document.getElementById("nextActionMastery");
    if (weakestTopic && recommendationTitle && recommendationMastery) {
        recommendationTitle.textContent = `Practice ${weakestTopic.name}`;
        recommendationMastery.textContent = `${weakestTopic.mastery}%`;
    }

    renderLearningProgressChart(scoreHistory);
}

function renderLearningProgressChart(history) {
    const emptyState = document.getElementById("learningProgressEmpty");
    const chartWrap = document.getElementById("learningProgressChartWrap");
    const canvas = document.getElementById("learningProgressChart");
    const summary = document.getElementById("learningChartSummary");
    if (!emptyState || !chartWrap || !canvas || !summary) return;

    if (!history.length) {
        emptyState.hidden = false;
        chartWrap.hidden = true;
        return;
    }

    emptyState.hidden = true;
    chartWrap.hidden = false;
    const context = canvas.getContext("2d");
    if (!context) return;

    const bounds = canvas.getBoundingClientRect();
    const width = Math.max(bounds.width, 280);
    const height = 190;
    const pixelRatio = window.devicePixelRatio || 1;
    canvas.width = width * pixelRatio;
    canvas.height = height * pixelRatio;
    context.scale(pixelRatio, pixelRatio);
    context.clearRect(0, 0, width, height);

    const left = 34;
    const right = width - 12;
    const top = 12;
    const bottom = height - 28;
    const chartHeight = bottom - top;
    context.font = "10px Inter, sans-serif";
    context.textBaseline = "middle";

    [0, 50, 100].forEach(value => {
        const y = bottom - chartHeight * value / 100;
        context.strokeStyle = "rgba(255, 255, 255, 0.08)";
        context.lineWidth = 1;
        context.beginPath();
        context.moveTo(left, y);
        context.lineTo(right, y);
        context.stroke();
        context.fillStyle = "#8e99ad";
        context.textAlign = "right";
        context.fillText(`${value}%`, left - 7, y);
    });

    const points = history.map((entry, index) => ({
        x: history.length === 1
            ? (left + right) / 2
            : left + (right - left) * index / (history.length - 1),
        y: bottom - chartHeight * Math.max(0, Math.min(100, Number(entry.score))) / 100
    }));

    if (points.length > 1) {
        context.beginPath();
        context.moveTo(points[0].x, points[0].y);
        points.slice(1).forEach(point => context.lineTo(point.x, point.y));
        context.strokeStyle = "#9b6cff";
        context.lineWidth = 2.5;
        context.lineJoin = "round";
        context.stroke();
    }

    points.forEach((point, index) => {
        context.beginPath();
        context.arc(point.x, point.y, 3.5, 0, Math.PI * 2);
        context.fillStyle = "#39d9ff";
        context.fill();
        context.fillStyle = "#8e99ad";
        context.textAlign = history.length === 1
            ? "center"
            : index === 0 ? "left" : index === points.length - 1 ? "right" : "center";
        context.fillText((history[index].dateStr || "Quiz").split(",")[0], point.x, height - 12);
    });

    summary.textContent = `Recorded quiz accuracy: ${history.map(item => `${item.dateStr || "Quiz"} ${item.score}%`).join(", ")}.`;
}

window.addEventListener("resize", () => {
    if (document.getElementById("intelligence")?.classList.contains("active")) {
        renderLearningIntelligence();
    }
});

async function logout() {
    let signedOut = false;
    try {
        const response = await fetch(`${API_BASE}/auth/logout`, { method: "POST" });
        const data = await response.json();
        signedOut = response.ok && data.success;
        if (!signedOut && data.message?.startsWith("Session cleared on this device")) {
            signedOut = true;
            showToast(data.message);
        } else if (!signedOut) {
            showToast(data.message || "Unable to confirm sign out.");
            return;
        }
    } catch (e) {
        showToast("⚠️ Could not reach the authentication service to sign out.");
        return;
    }
    currentUser = null;
    updateUserUI(null);

    if (signedOut) showToast("👋 Successfully signed out of this device.");
    showPage("landing");
}

// ==========================================
// AUTHENTICATION & SUPABASE AUTH MODAL
// ==========================================
let currentUser = null;

async function checkAuthSession() {
    try {
        const response = await fetch(`${API_BASE}/auth/session`, { credentials: "same-origin" });
        const data = await response.json();
        if (!response.ok || !data.success) throw new Error(data.message || "Unable to restore session.");
        currentUser = data.user || null;
        if (currentUser) updateUserUI(currentUser);
    } catch (e) {
        console.warn("Auth check failed:", e.message);
    }
}

function toggleUserDropdown() {
    const dropdown = document.getElementById("userMenuDropdown");
    if (!dropdown) return;
    dropdown.classList.toggle("open");
}

function closeUserDropdown() {
    const dropdown = document.getElementById("userMenuDropdown");
    if (dropdown) dropdown.classList.remove("open");
}

document.addEventListener("click", (e) => {
    const userWrap = document.querySelector(".topbar-user-wrap");
    if (userWrap && !userWrap.contains(e.target)) {
        closeUserDropdown();
    }
});

function updateUserUI(user) {
    const userNameElem = document.getElementById("userName");
    const userSubElem = document.getElementById("userSub");
    const userAvatarElem = document.getElementById("userAvatar");
    const authBtnLabel = document.getElementById("authBtnLabel");
    const welcomeUserName = document.getElementById("welcomeUserName");
    const profilePageName = document.getElementById("profilePageName");
    const sidebarLogoutBtn = document.getElementById("sidebarLogoutBtn");
    const topbarCoinsBadge = document.getElementById("topbarCoinsBadge");
    const topbarLevelBadge = document.getElementById("topbarLevelBadge");

    // Dropdown elements
    const dropdownUserName = document.getElementById("dropdownUserName");
    const dropdownUserEmail = document.getElementById("dropdownUserEmail");
    const dropdownUserAvatar = document.getElementById("dropdownUserAvatar");
    const dropdownUserRoleBadge = document.getElementById("dropdownUserRoleBadge");
    const dropdownUserClassBadge = document.getElementById("dropdownUserClassBadge");

    // Nav elements
    const navDashboard = document.getElementById("navDashboard");
    const navChallenges = document.getElementById("navChallenges");
    const navAssessment = document.getElementById("navAssessment");
    const navTeacherMap = document.getElementById("navTeacherMap");
    const navAdminDashboard = document.getElementById("navAdminDashboard");
    const navRewards = document.getElementById("navRewards");

    if (user) {
        const name = user.name || "User";
        if (userNameElem) userNameElem.innerText = name;
        if (welcomeUserName) welcomeUserName.innerText = name;
        if (profilePageName) profilePageName.innerText = name;
        if (userSubElem) {
            userSubElem.innerText = user.role === "teacher"
                ? "Educator"
                : user.role === "admin"
                    ? "Administrator"
                    : (user.class ? `Class ${user.class}` : "Student");
        }
        if (userAvatarElem) userAvatarElem.innerText = name.charAt(0).toUpperCase();
        if (authBtnLabel) authBtnLabel.innerText = "Account";
        if (sidebarLogoutBtn) sidebarLogoutBtn.style.display = "flex";

        // Dropdown
        if (dropdownUserName) dropdownUserName.innerText = name;
        if (dropdownUserEmail) dropdownUserEmail.innerText = user.email || "";
        if (dropdownUserAvatar) dropdownUserAvatar.innerText = name.charAt(0).toUpperCase();
        if (dropdownUserRoleBadge) {
            dropdownUserRoleBadge.innerText = user.role === "teacher" ? "Educator" : user.role === "admin" ? "Admin" : "Student";
            dropdownUserRoleBadge.style.color = user.role === "teacher" ? "var(--purple)" : user.role === "admin" ? "#f59e0b" : "var(--cyan)";
        }
        if (dropdownUserClassBadge) {
            if (user.role === "student" && user.class) {
                dropdownUserClassBadge.style.display = "inline-block";
                dropdownUserClassBadge.innerText = `Class ${user.class}`;
            } else {
                dropdownUserClassBadge.style.display = "none";
            }
        }

        studentProfile.name = name;
        studentProfile.classLevel = user.class ? `Class ${user.class}` : studentProfile.classLevel;
        studentProfile.xp = user.xp !== undefined ? user.xp : (studentProfile.xp || 0);
        updateXPDisplay(studentProfile.xp);

        // Sidebar navigation visibility based on role
        if (user.role === "teacher") {
            if (navDashboard) navDashboard.style.display = "none";
            if (navChallenges) navChallenges.style.display = "none";
            if (navAssessment) navAssessment.style.display = "none";
            if (navTeacherMap) navTeacherMap.style.display = "flex";
            if (navAdminDashboard) navAdminDashboard.style.display = "none";
            if (navRewards) navRewards.style.display = "none";
            if (topbarCoinsBadge) topbarCoinsBadge.style.display = "none";
            if (topbarLevelBadge) topbarLevelBadge.style.display = "none";
        } else if (user.role === "admin") {
            if (navDashboard) navDashboard.style.display = "none";
            if (navChallenges) navChallenges.style.display = "none";
            if (navAssessment) navAssessment.style.display = "none";
            if (navTeacherMap) navTeacherMap.style.display = "flex";
            if (navAdminDashboard) navAdminDashboard.style.display = "flex";
            if (navRewards) navRewards.style.display = "none";
            if (topbarCoinsBadge) topbarCoinsBadge.style.display = "none";
            if (topbarLevelBadge) topbarLevelBadge.style.display = "none";
        } else {
            // Student
            if (navDashboard) navDashboard.style.display = "flex";
            if (navChallenges) navChallenges.style.display = "flex";
            if (navAssessment) navAssessment.style.display = "flex";
            if (navTeacherMap) navTeacherMap.style.display = "none";
            if (navAdminDashboard) navAdminDashboard.style.display = "none";
            if (navRewards) navRewards.style.display = "flex";
            if (topbarCoinsBadge) topbarCoinsBadge.style.display = "flex";
            if (topbarLevelBadge) topbarLevelBadge.style.display = "flex";
        }

        const modalUserAvatar = document.getElementById("modalUserAvatar");
        const modalUserName = document.getElementById("modalUserName");
        const modalUserEmail = document.getElementById("modalUserEmail");
        const modalUserRoleBadge = document.getElementById("modalUserRoleBadge");

        if (modalUserAvatar) modalUserAvatar.innerText = name.charAt(0).toUpperCase();
        if (modalUserName) modalUserName.innerText = name;
        if (modalUserEmail) modalUserEmail.innerText = user.email || "";
        if (modalUserRoleBadge) modalUserRoleBadge.innerText = user.role === "teacher" ? "Educator Mode" : user.role === "admin" ? "Administrator Mode" : `Student Mode (${user.class ? 'Class ' + user.class : 'Class 10'})`;
    } else {
        if (userNameElem) userNameElem.innerText = "Sign in";
        if (welcomeUserName) welcomeUserName.innerText = "Learner";
        if (profilePageName) profilePageName.innerText = "No profile";
        if (userSubElem) userSubElem.innerText = "Not signed in";
        if (userAvatarElem) userAvatarElem.innerText = "-";
        if (authBtnLabel) authBtnLabel.innerText = "Sign In";
        if (sidebarLogoutBtn) sidebarLogoutBtn.style.display = "none";
        if (topbarCoinsBadge) topbarCoinsBadge.style.display = "none";
        if (topbarLevelBadge) topbarLevelBadge.style.display = "none";

        if (navDashboard) navDashboard.style.display = "flex";
        if (navChallenges) navChallenges.style.display = "flex";
        if (navAssessment) navAssessment.style.display = "flex";
        if (navTeacherMap) navTeacherMap.style.display = "none";
        if (navAdminDashboard) navAdminDashboard.style.display = "none";

        studentProfile.xp = 0;
        updateXPDisplay(0);
    }

    const roleLabel = document.getElementById("roleLabel");
    if (roleLabel) {
        roleLabel.innerText = user
            ? `Mode: ${user.role === "teacher" ? "Teacher" : user.role === "admin" ? "Admin" : "Student"}`
            : "Mode: Sign in";
    }
    loadLeaderboard();
}

function switchRankingTab(button, tabName) {
    const tabs = document.querySelectorAll("#rankings .rankings-tab-btn");
    tabs.forEach(btn => btn.classList.remove("active"));
    if (button) button.classList.add("active");
}

function updateYourRankCard(leaderboard, myIndex) {
    const rankNumElem = document.getElementById("yourRankNumber");
    const classmatesElem = document.getElementById("yourRankClassmates");
    const xpElem = document.getElementById("yourRankXp");
    const progressFill = document.getElementById("yourRankProgressFill");
    const statusLine = document.getElementById("yourRankStatusLine");

    if (!rankNumElem || !classmatesElem || !xpElem || !progressFill || !statusLine) return;

    const totalClassmates = Array.isArray(leaderboard) ? leaderboard.length : 0;

    if (myIndex >= 0 && myIndex < totalClassmates) {
        const myItem = leaderboard[myIndex];
        const myRank = myIndex + 1;
        const myXp = Number(myItem.xp) || 0;

        rankNumElem.textContent = `#${myRank}`;
        classmatesElem.textContent = `of ${totalClassmates} classmates`;
        xpElem.textContent = `${myXp.toLocaleString()} XP`;

        if (myRank === 1) {
            progressFill.style.width = "100%";
            statusLine.innerHTML = "🏆 You're leading the class";
        } else {
            const nextStudent = leaderboard[myIndex - 1];
            const nextXp = Number(nextStudent.xp) || 0;
            const diffXp = Math.max(0, nextXp - myXp);
            const fillPct = nextXp > 0 ? Math.min(100, Math.max(5, Math.round((myXp / nextXp) * 100))) : 100;
            progressFill.style.width = `${fillPct}%`;
            statusLine.innerHTML = `<strong>${diffXp.toLocaleString()} XP</strong> to pass <strong>${escapeHtml(nextStudent.name)}</strong>`;
        }

        const dashboardRank = document.getElementById("dashboardRankVal");
        if (dashboardRank) dashboardRank.innerText = `#${myRank}`;
    } else if (currentUser && currentUser.name) {
        const myXp = Number(studentProfile?.xp) || 0;
        const myRank = totalClassmates + 1;
        rankNumElem.textContent = `#${myRank}`;
        classmatesElem.textContent = `of ${totalClassmates + 1} classmates`;
        xpElem.textContent = `${myXp.toLocaleString()} XP`;

        if (totalClassmates > 0) {
            const targetStudent = leaderboard[totalClassmates - 1];
            const targetXp = Number(targetStudent.xp) || 0;
            const diffXp = Math.max(1, targetXp - myXp);
            const fillPct = targetXp > 0 ? Math.min(100, Math.round((myXp / targetXp) * 100)) : 0;
            progressFill.style.width = `${fillPct}%`;
            statusLine.innerHTML = `<strong>${diffXp.toLocaleString()} XP</strong> to pass <strong>${escapeHtml(targetStudent.name)}</strong>`;
        } else {
            progressFill.style.width = "100%";
            statusLine.innerHTML = "🏆 Complete a quiz to set your class ranking!";
        }
    } else {
        rankNumElem.textContent = "#--";
        classmatesElem.textContent = totalClassmates ? `of ${totalClassmates} classmates` : "of classmates";
        xpElem.textContent = "0 XP";
        progressFill.style.width = "0%";
        statusLine.innerHTML = `<a href="javascript:void(0)" onclick="openAuthModal()" style="color: #38d6ff; text-decoration: underline; font-weight: 700;">Sign in</a> to view your ranking.`;
    }
}

async function loadLeaderboard() {
    const container = document.getElementById("rankingListContainer");
    if (!container) return;

    try {
        const response = await fetch(`${API_BASE}/students/leaderboard`);
        const data = await response.json();

        if (data.success && Array.isArray(data.leaderboard) && data.leaderboard.length > 0) {
            const leaderboard = data.leaderboard;
            const myIndex = leaderboard.findIndex(item => {
                if (!currentUser) return false;
                return (currentUser.id && (currentUser.id === item.userId || currentUser.id === item.id)) ||
                       (currentUser.name && currentUser.name.toLowerCase() === (item.name || "").toLowerCase()) ||
                       (currentUser.email && item.email && currentUser.email === item.email);
            });

            updateYourRankCard(leaderboard, myIndex);

            container.innerHTML = leaderboard.map((item, index) => {
                const rankNum = item.rank || (index + 1);
                const rankColorClass = rankNum === 1 ? 'rank-gold' : rankNum === 2 ? 'rank-silver' : rankNum === 3 ? 'rank-bronze' : 'rank-other';
                const isCurrentUser = currentUser && (
                    (currentUser.id && (currentUser.id === item.userId || currentUser.id === item.id)) ||
                    (currentUser.name && currentUser.name.toLowerCase() === (item.name || "").toLowerCase()) ||
                    (currentUser.email && item.email && currentUser.email === item.email)
                );

                const cleanName = (item.name || "Student").replace(/\s*\((?:you|You)\)\s*/gi, "").trim();
                const rawClass = String(item.class || "Class 10").replace(/class\s*/gi, "").trim();
                const classDisplay = `CLASS ${rawClass || "10"}`;

                return `
                    <article class="leaderboard-row ${isCurrentUser ? 'current-user-row' : ''}">
                        <span class="leaderboard-rank ${rankColorClass}">#${rankNum}</span>
                        <div class="leaderboard-avatar" aria-hidden="true">${(cleanName || "S").charAt(0).toUpperCase()}</div>
                        <div class="leaderboard-info">
                            <span class="leaderboard-name">${escapeHtml(cleanName)}</span>
                            ${isCurrentUser ? '<span class="you-badge">YOU</span>' : ''}
                        </div>
                        <span class="class-chip">${classDisplay}</span>
                        <span class="leaderboard-xp">${(item.xp || 0).toLocaleString()} XP</span>
                    </article>
                `;
            }).join("");
        } else {
            updateYourRankCard([], -1);
            if (currentUser && currentUser.name) {
                const cleanName = (currentUser.name || "Student").replace(/\s*\((?:you|You)\)\s*/gi, "").trim();
                const rawClass = String(currentUser.class || "Class 10").replace(/class\s*/gi, "").trim();
                container.innerHTML = `
                    <article class="leaderboard-row current-user-row">
                        <span class="leaderboard-rank rank-gold">#1</span>
                        <div class="leaderboard-avatar" aria-hidden="true">${(cleanName || "U").charAt(0).toUpperCase()}</div>
                        <div class="leaderboard-info">
                            <span class="leaderboard-name">${escapeHtml(cleanName)}</span>
                            <span class="you-badge">YOU</span>
                        </div>
                        <span class="class-chip">CLASS ${rawClass || "10"}</span>
                        <span class="leaderboard-xp">${(studentProfile.xp || 0).toLocaleString()} XP</span>
                    </article>
                `;
            } else {
                container.innerHTML = `
                    <div class="ranking-empty-card">
                        <i class="fa-solid fa-ranking-star" style="font-size: 36px; color: #38d6ff; margin-bottom: 12px; display: block;"></i>
                        <h3 style="font-size: 16px; color: #ffffff; margin-bottom: 6px;">No Active Leaderboard Members Yet</h3>
                        <p style="font-size: 13px; color: #9aa6bd; max-width: 380px; margin: 0 auto 16px auto;">Sign in and complete AI quizzes to earn XP and claim the #1 spot on the leaderboard!</p>
                        <button class="primary-btn" onclick="openAuthModal()" style="margin: 0 auto; padding: 10px 20px; font-size: 13px;">
                            <i class="fa-solid fa-user-plus"></i> Sign In to Join Leaderboard
                        </button>
                    </div>
                `;
            }
        }
    } catch (err) {
        console.warn("Leaderboard fetch notice:", err.message);
    }
}

function openAuthModal() {
    const modal = document.getElementById("authModal");
    const userSessionView = document.getElementById("userSessionView");
    const authFormsContainer = document.getElementById("authFormsContainer");

    if (currentUser && currentUser.email) {
        if (userSessionView) userSessionView.style.display = "block";
        if (authFormsContainer) authFormsContainer.style.display = "none";
    } else {
        if (userSessionView) userSessionView.style.display = "none";
        if (authFormsContainer) authFormsContainer.style.display = "block";
    }

    if (modal) modal.classList.add("active");
}

function closeAuthModal() {
    const modal = document.getElementById("authModal");
    if (modal) modal.classList.remove("active");
}

function selectLandingRole(role) {
    const studentBtn = document.getElementById("landingRoleStudent");
    const teacherBtn = document.getElementById("landingRoleTeacher");
    const adminBtn = document.getElementById("landingRoleAdmin");
    const loginRoleInput = document.getElementById("landingLoginRole");
    const signupRoleInput = document.getElementById("landingSignupRole");
    const classGroup = document.getElementById("landingSignupClassGroup");
    const deptGroup = document.getElementById("landingSignupDepartmentGroup");
    const notice = document.getElementById("landingRoleContextText");
    const loginBtnText = document.getElementById("landingLoginBtnText");
    const signupBtnText = document.getElementById("landingSignupBtnText");
    const emailInput = document.getElementById("landingLoginEmail");
    const tabsRow = document.getElementById("landingAuthTabsRow");

    [studentBtn, teacherBtn, adminBtn].forEach(b => {
        if (b) {
            b.classList.remove("active");
            b.style.background = "transparent";
            b.style.color = "var(--muted)";
        }
    });

    const activeBtn = role === "teacher" ? teacherBtn : role === "admin" ? adminBtn : studentBtn;
    if (activeBtn) {
        activeBtn.classList.add("active");
        activeBtn.style.background = "var(--primary-gradient)";
        activeBtn.style.color = "white";
    }

    if (loginRoleInput) loginRoleInput.value = role;
    if (signupRoleInput) signupRoleInput.value = role;

    if (role === "student") {
        if (classGroup) classGroup.style.display = "block";
        if (deptGroup) deptGroup.style.display = "none";
        if (tabsRow) tabsRow.style.display = "flex";
        if (notice) notice.innerText = "Student Portal: Access class-specific curriculum, daily quests & XP.";
        if (loginBtnText) loginBtnText.innerText = "Sign In as Student";
        if (signupBtnText) signupBtnText.innerText = "Create Student Account";
        if (emailInput) emailInput.placeholder = "student@example.com";
    } else if (role === "teacher") {
        if (classGroup) classGroup.style.display = "none";
        if (deptGroup) deptGroup.style.display = "block";
        if (tabsRow) tabsRow.style.display = "flex";
        if (notice) notice.innerText = "Teacher Portal: Manage classes, track student mastery & review gap intelligence.";
        if (loginBtnText) loginBtnText.innerText = "Sign In as Teacher";
        if (signupBtnText) signupBtnText.innerText = "Create Teacher Account";
        if (emailInput) emailInput.placeholder = "teacher@school.org";
    } else if (role === "admin") {
        if (classGroup) classGroup.style.display = "none";
        if (deptGroup) deptGroup.style.display = "none";
        if (tabsRow) tabsRow.style.display = "none";
        switchLandingTab("login");
        if (notice) notice.innerText = "Admin Portal: System governance, user account roles & platform management.";
        if (loginBtnText) loginBtnText.innerText = "Sign In as Administrator";
        if (emailInput) emailInput.placeholder = "admin@learniq.local";
    }
}

function selectAuthModalRole(role) {
    const studentBtn = document.getElementById("modalRoleStudent");
    const teacherBtn = document.getElementById("modalRoleTeacher");
    const adminBtn = document.getElementById("modalRoleAdmin");
    const loginRoleInput = document.getElementById("loginRole");
    const signupRoleInput = document.getElementById("signupRole");
    const classGroup = document.getElementById("modalSignupClassGroup");
    const deptGroup = document.getElementById("modalSignupDepartmentGroup");
    const notice = document.getElementById("modalRoleContextText");
    const loginBtnText = document.getElementById("modalLoginBtnText");
    const signupBtnText = document.getElementById("modalSignupBtnText");
    const emailInput = document.getElementById("loginEmail");
    const tabsRow = document.getElementById("modalAuthTabsRow");

    [studentBtn, teacherBtn, adminBtn].forEach(b => {
        if (b) {
            b.classList.remove("active");
            b.style.background = "transparent";
            b.style.color = "var(--muted)";
        }
    });

    const activeBtn = role === "teacher" ? teacherBtn : role === "admin" ? adminBtn : studentBtn;
    if (activeBtn) {
        activeBtn.classList.add("active");
        activeBtn.style.background = "var(--primary-gradient)";
        activeBtn.style.color = "white";
    }

    if (loginRoleInput) loginRoleInput.value = role;
    if (signupRoleInput) signupRoleInput.value = role;

    if (role === "student") {
        if (classGroup) classGroup.style.display = "block";
        if (deptGroup) deptGroup.style.display = "none";
        if (tabsRow) tabsRow.style.display = "flex";
        if (notice) notice.innerText = "Student Portal: Access class-specific learning missions & quizzes.";
        if (loginBtnText) loginBtnText.innerText = "Sign In as Student";
        if (signupBtnText) signupBtnText.innerText = "Create Student Account";
        if (emailInput) emailInput.placeholder = "student@example.com";
    } else if (role === "teacher") {
        if (classGroup) classGroup.style.display = "none";
        if (deptGroup) deptGroup.style.display = "block";
        if (tabsRow) tabsRow.style.display = "flex";
        if (notice) notice.innerText = "Teacher Portal: Access classes & track student concept mastery.";
        if (loginBtnText) loginBtnText.innerText = "Sign In as Teacher";
        if (signupBtnText) signupBtnText.innerText = "Create Teacher Account";
        if (emailInput) emailInput.placeholder = "teacher@school.org";
    } else if (role === "admin") {
        if (classGroup) classGroup.style.display = "none";
        if (deptGroup) deptGroup.style.display = "none";
        if (tabsRow) tabsRow.style.display = "none";
        switchAuthTab("login");
        if (notice) notice.innerText = "Admin Portal: System administration & user roles.";
        if (loginBtnText) loginBtnText.innerText = "Sign In as Administrator";
        if (emailInput) emailInput.placeholder = "admin@learniq.local";
    }
}

function switchAuthTab(type) {
    const loginForm = document.getElementById("loginForm");
    const signupForm = document.getElementById("signupForm");
    const tabLoginBtn = document.getElementById("tabLoginBtn");
    const tabSignupBtn = document.getElementById("tabSignupBtn");

    if (type === 'login') {
        loginForm.style.display = "block";
        signupForm.style.display = "none";
        tabLoginBtn.style.background = "var(--primary-gradient)";
        tabLoginBtn.style.color = "white";
        tabSignupBtn.style.background = "transparent";
        tabSignupBtn.style.color = "var(--muted)";
    } else {
        loginForm.style.display = "none";
        signupForm.style.display = "block";
        tabSignupBtn.style.background = "var(--primary-gradient)";
        tabSignupBtn.style.color = "white";
        tabLoginBtn.style.background = "transparent";
        tabLoginBtn.style.color = "var(--muted)";
    }
}

function switchLandingTab(type) {
    const loginForm = document.getElementById("landingLoginForm");
    const signupForm = document.getElementById("landingSignupForm");
    const tabLoginBtn = document.getElementById("landingTabLogin");
    const tabSignupBtn = document.getElementById("landingTabSignup");

    if (!loginForm || !signupForm) return;

    if (type === 'login') {
        loginForm.style.display = "block";
        signupForm.style.display = "none";
        if (tabLoginBtn) { tabLoginBtn.style.background = "var(--primary-gradient)"; tabLoginBtn.style.color = "white"; }
        if (tabSignupBtn) { tabSignupBtn.style.background = "transparent"; tabSignupBtn.style.color = "var(--muted)"; }
    } else {
        loginForm.style.display = "none";
        signupForm.style.display = "block";
        if (tabSignupBtn) { tabSignupBtn.style.background = "var(--primary-gradient)"; tabSignupBtn.style.color = "white"; }
        if (tabLoginBtn) { tabLoginBtn.style.background = "transparent"; tabLoginBtn.style.color = "var(--muted)"; }
    }
}

async function handleAuthSubmit(event, type) {
    event.preventDefault();
    const form = event.currentTarget;
    if (form.dataset.authSubmitting === "true") return;

    const submitButton = form.querySelector('[type="submit"]');
    const originalButtonHtml = submitButton?.innerHTML;
    form.dataset.authSubmitting = "true";
    if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = type === "login" ? "Signing in..." : "Creating account...";
    }

    const endpoint = type === 'login' ? `${API_BASE}/auth/login` : `${API_BASE}/auth/signup`;
    try {
        const email = form.querySelector('input[type="email"]')?.value.trim() || "";
        const password = form.querySelector('input[type="password"]')?.value || "";
        const role = form.querySelector('input[type="hidden"]')?.value || "student";

        let payload = { email, password };
        if (type === "signup") {
            const fullName = form.querySelector('input[type="text"]')?.value.trim() || "";
            let classLevel = null;
            if (role === "student") {
                const classSelect = form.querySelector('select');
                classLevel = classSelect?.value || "";
                if (!classLevel) {
                    showToast("⚠️ Please select your Class / Grade level (Required for students).");
                    form.dataset.authSubmitting = "false";
                    if (submitButton) {
                        submitButton.disabled = false;
                        submitButton.innerHTML = originalButtonHtml;
                    }
                    return;
                }
            }
            payload = { fullName, email, password, role, classLevel };
        }

        const response = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "same-origin",
            body: JSON.stringify(payload)
        });

        const data = await response.json().catch(() => ({}));
        if (data.success && data.requiresEmailConfirmation) {
            showToast(`✅ ${data.message}`);
            switchLandingTab("login");
            switchAuthTab("login");
        } else if (data.success && data.session) {
            currentUser = data.session.user;
            updateUserUI(currentUser);
            showToast(`✅ ${data.message}`);
            closeAuthModal();
            if (currentUser.role === "admin") {
                showPage("admin-dashboard");
                loadAdminOverview();
            } else if (currentUser.role === "teacher") {
                showPage("teacher-map");
                loadTeacherClassMap();
            } else {
                showPage("dashboard");
                await fetchStudentProfile();
                fetchDailyChallenges();
                loadStudentHistory();
            }
        } else {
            showToast(`❌ ${data.message || (response.ok ? "Authentication failed." : "Unable to authenticate. Please try again.")}`);
        }
    } catch (err) {
        showToast("⚠️ Could not reach the authentication service. Check your connection and try again.");
    } finally {
        form.dataset.authSubmitting = "false";
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.innerHTML = originalButtonHtml;
        }
    }
}

// ==========================================
// TEST ATTENDANCE & STREAK TRACKER
// ==========================================
let studentQuizHistory = [];

function logQuizAttendance(quiz, analysis) {
    if (!quiz || !analysis) return;
    const entry = {
        id: `test-${Date.now()}`,
        dateStr: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        timeStr: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        subject: quiz.subject || "Mathematics",
        topic: quiz.title || "Assessment",
        score: analysis.scorePercentage,
        correctCount: analysis.correctCount,
        totalQuestions: analysis.totalQuestions,
        xpEarned: analysis.xpEarned
    };
    studentQuizHistory.unshift(entry);

    updateDailyStreak();
    renderProfileTestHistory();
    renderLearningIntelligence();
}

function updateDailyStreak() {
    const streak = Number(studentProfile.streak) || 0;

    const streakElem = document.getElementById("dashboardStreakVal");
    if (streakElem) streakElem.innerText = `${streak} ${streak === 1 ? 'Day' : 'Days'}`;
}

function renderProfileTestHistory() {
    const counts = {
        Mathematics: 0,
        Physics: 0,
        Chemistry: 0,
        Biology: 0,
        English: 0
    };

    studentQuizHistory.forEach(item => {
        const sub = item.subject || "Mathematics";
        if (counts[sub] !== undefined) counts[sub]++;
        else counts["Mathematics"]++;
    });

    const mElem = document.getElementById("countMathTests");
    const pElem = document.getElementById("countPhysicsTests");
    const cElem = document.getElementById("countChemistryTests");
    const bElem = document.getElementById("countBiologyTests");
    const eElem = document.getElementById("countEnglishTests");

    if (mElem) mElem.innerText = counts.Mathematics;
    if (pElem) pElem.innerText = counts.Physics;
    if (cElem) cElem.innerText = counts.Chemistry;
    if (bElem) bElem.innerText = counts.Biology;
    if (eElem) eElem.innerText = counts.English;

    const container = document.getElementById("testHistoryLogContainer");
    if (!container) return;

    if (studentQuizHistory.length > 0) {
        container.innerHTML = studentQuizHistory.map(item => `
            <div style="background: rgba(7, 11, 20, 0.6); padding: 12px 16px; border-radius: 12px; border: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center;">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <div style="width: 36px; height: 36px; border-radius: 10px; background: rgba(0, 240, 255, 0.1); color: var(--cyan); display: grid; place-items: center; font-size: 16px;">
                        <i class="fa-solid fa-file-signature"></i>
                    </div>
                    <div>
                        <strong style="font-size: 14px; color: var(--text); display: block;">${item.topic} (${item.subject})</strong>
                        <span style="font-size: 11px; color: var(--muted);"><i class="fa-regular fa-calendar-check" style="margin-right: 4px;"></i>${item.dateStr} at ${item.timeStr}</span>
                    </div>
                </div>
                <div style="display: flex; align-items: center; gap: 14px;">
                    <span class="badge-pill ${item.score >= 80 ? 'strong' : 'critical'}" style="font-size: 12px; padding: 4px 10px;">${item.score}% (${item.correctCount}/${item.totalQuestions})</span>
                    <span style="color: var(--cyan); font-weight: 700; font-size: 13px;">+${item.xpEarned} XP</span>
                </div>
            </div>
        `).join("");
    } else {
        container.innerHTML = `
            <div style="text-align: center; padding: 30px; color: var(--muted);">
                <i class="fa-solid fa-clipboard-list" style="font-size: 32px; color: var(--cyan); margin-bottom: 8px;"></i>
                <p style="font-size: 13px;">No assessment history recorded yet. Complete an AI Quiz to track your attendance by subject & date!</p>
            </div>
        `;
    }
}

// ==========================================
// TOAST NOTIFICATIONS
// ==========================================
function showToast(message) {
    const toast = document.getElementById("toast");
    if (!toast) return;
    toast.innerText = message;
    toast.style.display = "block";
    toast.style.opacity = "1";

    setTimeout(() => {
        toast.style.opacity = "0";
        setTimeout(() => {
            toast.style.display = "none";
        }, 300);
    }, 3500);
}

// ==========================================
// ADMIN DASHBOARD CONTROLLER
// ==========================================
function escapeHtml(str) {
    if (typeof str !== "string") return "";
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

async function loadAdminOverview() {
    if (currentUser?.role !== "admin") return;
    try {
        const response = await fetch(`${API_BASE}/admin/overview`, { credentials: "same-origin" });
        const data = await response.json();
        if (data.success && data.summary) {
            const totalUsersElem = document.getElementById("adminTotalUsers");
            const studentsCountElem = document.getElementById("adminStudentsCount");
            const teachersCountElem = document.getElementById("adminTeachersCount");
            const adminsCountElem = document.getElementById("adminAdminsCount");
            const tableUserCount = document.getElementById("adminTableUserCount");
            if (totalUsersElem) totalUsersElem.innerText = data.summary.totalUsers;
            if (studentsCountElem) studentsCountElem.innerText = data.summary.students;
            if (teachersCountElem) teachersCountElem.innerText = data.summary.teachers;
            if (adminsCountElem) adminsCountElem.innerText = data.summary.admins;
            if (tableUserCount) tableUserCount.innerText = `${data.summary.totalUsers} registered users`;
        }

        const usersRes = await fetch(`${API_BASE}/admin/users`, { credentials: "same-origin" });
        const usersData = await usersRes.json();
        const tbody = document.getElementById("adminUserTableBody");
        if (tbody && usersData.success && Array.isArray(usersData.users)) {
            if (usersData.users.length === 0) {
                tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 24px; color: var(--muted);">No users found.</td></tr>`;
            } else {
                tbody.innerHTML = usersData.users.map(u => {
                    const roleColor = u.role === "admin" ? "#f59e0b" : u.role === "teacher" ? "var(--purple)" : "var(--cyan)";
                    const roleBadge = `<span class="badge-pill" style="background: rgba(255,255,255,0.06); color: ${roleColor}; border: 1px solid ${roleColor}40; text-transform: capitalize;">${escapeHtml(u.role)}</span>`;
                    return `
                        <tr style="border-bottom: 1px solid rgba(255,255,255,0.04);">
                            <td style="padding: 12px 10px; font-weight: 600; color: var(--text);">${escapeHtml(u.name || "User")}</td>
                            <td style="padding: 12px 10px; color: var(--muted);">${escapeHtml(u.email || "-")}</td>
                            <td style="padding: 12px 10px;">${roleBadge}</td>
                            <td style="padding: 12px 10px; color: var(--muted);">${u.class ? "Class " + u.class : "Class 10"}</td>
                            <td style="padding: 12px 10px; color: var(--cyan);">${(u.xp || 0).toLocaleString()} XP / ${u.streak || 0}d</td>
                            <td style="padding: 12px 10px; text-align: right;">
                                <select onchange="updateUserRole('${u.user_id || u.id}', this.value)" style="background: #1e293b; color: var(--text); border: 1px solid var(--border); border-radius: 8px; padding: 4px 8px; font-size: 12px;">
                                    <option value="student" ${u.role === "student" ? "selected" : ""}>Student</option>
                                    <option value="teacher" ${u.role === "teacher" ? "selected" : ""}>Teacher</option>
                                    <option value="admin" ${u.role === "admin" ? "selected" : ""}>Admin</option>
                                </select>
                            </td>
                        </tr>
                    `;
                }).join("");
            }
        }
    } catch (err) {
        console.error("Failed to load admin overview:", err);
    }
}

async function updateUserRole(userId, newRole) {
    try {
        const res = await fetch(`${API_BASE}/admin/role`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "same-origin",
            body: JSON.stringify({ userId, role: newRole })
        });
        const data = await res.json();
        if (data.success) {
            showToast(`✅ ${data.message}`);
            loadAdminOverview();
        } else {
            showToast(`❌ ${data.message || "Failed to update role."}`);
        }
    } catch (err) {
        showToast("⚠️ Could not contact server to update role.");
    }
}

