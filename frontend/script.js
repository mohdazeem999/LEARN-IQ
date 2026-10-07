/**
 * LearnIQ — AI-Powered Classroom Learning Intelligence & Quiz Generator
 * Client Application Logic
 */

const API_BASE = "http://localhost:5050/api";

// Application State
let currentRole = "student"; // "student" | "teacher"
let currentQuiz = null;
let currentQuestionIdx = 0;
let userAnswers = {};
let quizTimerInterval = null;
let quizSecondsLeft = 300; // 5 mins
let studentProfile = {
    xp: 0,
    streak: 0,
    rank: "-",
    name: "Guest Student",
    classLevel: "Class 10"
};

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
    fetchStudentProfile();
    loadTeacherClassMap();
    updateDailyStreak();
    if (currentUser && currentUser.email) {
        showPage("dashboard");
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
    } else if (pageId === "teacher-map") {
        loadTeacherClassMap();
    } else if (pageId === "rankings") {
        loadLeaderboard();
    } else if (pageId === "profile") {
        renderProfileTestHistory();
    }
}

function toggleSidebar() {
    const sidebar = document.querySelector(".sidebar");
    if (sidebar) {
        sidebar.classList.toggle("open");
    }
}

// ==========================================
// ROLE SWITCHER (Student vs Teacher)
// ==========================================
async function toggleRole() {
    currentRole = currentRole === "student" ? "teacher" : "student";
    const rolePillBtn = document.getElementById("rolePillBtn");
    const roleLabel = document.getElementById("roleLabel");
    const userName = document.getElementById("userName");
    const userSub = document.getElementById("userSub");
    const userAvatar = document.getElementById("userAvatar");

    if (currentRole === "teacher") {
        roleLabel.innerText = "Mode: Teacher";
        rolePillBtn.style.borderColor = "var(--purple)";
        rolePillBtn.style.color = "var(--purple)";
        userName.innerText = "Prof. Sharma";
        userSub.innerText = "Educator (Class 10-B)";
        userAvatar.innerText = "P";
        showToast("Switched to Teacher Mode! Accessible: Quiz Generator & Class Map.");
        showPage("generator");
    } else {
        roleLabel.innerText = "Mode: Student";
        rolePillBtn.style.borderColor = "var(--cyan)";
        rolePillBtn.style.color = "var(--cyan)";
        userName.innerText = studentProfile.name || "Guest Student";
        userSub.innerText = studentProfile.classLevel || "Class 10";
        userAvatar.innerText = "G";
        showToast("Switched to Student Mode.");
        showPage("dashboard");
    }

    try {
        await fetch(`${API_BASE}/auth/switch-role`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ role: currentRole })
        });
    } catch (e) {
        console.warn("Backend auth role switch endpoint unreachable, using client state.");
    }
}

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
// INTERACTIVE QUIZ ENGINE
// ==========================================
function startQuiz(quiz) {
    currentQuiz = quiz || defaultQuiz;
    currentQuestionIdx = 0;
    userAnswers = {};

    document.getElementById("quizTitle").innerText = currentQuiz.title || "Adaptive Assessment";

    startTimer(300); // 5 minutes timer
    renderCurrentQuestion();
}

function startTimer(seconds) {
    clearInterval(quizTimerInterval);
    quizSecondsLeft = seconds;
    updateTimerDisplay();

    quizTimerInterval = setInterval(() => {
        quizSecondsLeft--;
        updateTimerDisplay();
        if (quizSecondsLeft <= 0) {
            clearInterval(quizTimerInterval);
            showToast("⏳ Time's up! Submitting answers...");
            finishQuiz();
        }
    }, 1000);
}

function updateTimerDisplay() {
    const mins = Math.floor(quizSecondsLeft / 60);
    const secs = quizSecondsLeft % 60;
    const timerElem = document.getElementById("quizTimer");
    if (timerElem) {
        timerElem.innerText = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
}

function renderCurrentQuestion() {
    if (!currentQuiz || !currentQuiz.questions) return;
    const questions = currentQuiz.questions;
    const q = questions[currentQuestionIdx];

    document.getElementById("questionIndex").innerText = (currentQuestionIdx + 1).toString().padStart(2, '0');
    document.getElementById("questionNumber").innerText = `Question ${currentQuestionIdx + 1} of ${questions.length}`;
    document.getElementById("questionText").innerText = q.question;

    const progressPct = Math.round(((currentQuestionIdx + 1) / questions.length) * 100);
    document.getElementById("quizProgressFill").style.width = `${progressPct}%`;

    const answerContainer = document.getElementById("answerContainer");
    answerContainer.innerHTML = "";

    const letters = ["A", "B", "C", "D"];
    q.options.forEach((optText, optIdx) => {
        const optionBtn = document.createElement("button");
        optionBtn.className = "answer-option";
        if (userAnswers[q.id || currentQuestionIdx + 1] === optIdx) {
            optionBtn.classList.add("selected");
        }

        optionBtn.innerHTML = `
            <strong style="width: 28px; height: 28px; border-radius: 50%; background: rgba(255,255,255,0.06); display: inline-grid; place-items: center; font-size: 12px; color: var(--cyan);">${letters[optIdx]}</strong>
            <span>${optText}</span>
        `;
        optionBtn.onclick = () => selectOption(optIdx);
        answerContainer.appendChild(optionBtn);
    });

    const adaptiveMsg = document.getElementById("adaptiveMessage");
    if (adaptiveMsg) {
        adaptiveMsg.innerText = `Concept: ${q.concept || "General"} • Choose an answer to adapt difficulty.`;
    }
}

function selectOption(optIdx) {
    if (!currentQuiz) return;
    const q = currentQuiz.questions[currentQuestionIdx];
    userAnswers[q.id || currentQuestionIdx + 1] = optIdx;

    const options = document.querySelectorAll(".answer-option");
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

    if (currentQuestionIdx < currentQuiz.questions.length - 1) {
        currentQuestionIdx++;
        renderCurrentQuestion();
    } else {
        clearInterval(quizTimerInterval);
        finishQuiz();
    }
}

async function finishQuiz() {
    showToast("🧠 AI is analyzing your quiz responses...");

    try {
        const response = await fetch(`${API_BASE}/assessments/submit`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ quiz: currentQuiz, answers: userAnswers })
        });

        const data = await response.json();
        if (data.success && data.analysis) {
            openDiagnosisModal(data.analysis);
            updateStudentXP(data.analysis.xpEarned || 150);
            logQuizAttendance(currentQuiz, data.analysis);
        } else {
            throw new Error("Invalid response");
        }
    } catch (e) {
        console.warn("API submit offline, calculating client-side analysis:", e);
        // Client side fallback calculation
        const total = currentQuiz.questions.length;
        let correct = 0;
        currentQuiz.questions.forEach((q, idx) => {
            if (userAnswers[q.id || idx + 1] === q.correctIndex) correct++;
        });
        const scorePct = Math.round((correct / total) * 100);
        const xp = correct * 30 + (scorePct >= 80 ? 100 : 50);

        const mockAnalysis = {
            scorePercentage: scorePct,
            correctCount: correct,
            totalQuestions: total,
            xpEarned: xp,
            aiInsight: scorePct >= 80 ? "Excellent mastery! You solved linear equation applications seamlessly." : "Good try! Strengthen equation distribution rules with practice.",
            mistakeCategories: {
                "Conceptual Error": scorePct < 100 ? 1 : 0,
                "Calculation Error": scorePct < 80 ? 1 : 0,
                "Misinterpretation": 0
            }
        };

        openDiagnosisModal(mockAnalysis);
        updateStudentXP(xp);
        logQuizAttendance(currentQuiz, mockAnalysis);
    }
}

// ==========================================
// POST-QUIZ AI DIAGNOSIS MODAL
// ==========================================
function openDiagnosisModal(analysis) {
    const modal = document.getElementById("diagnosisModal");
    const scoreTitle = document.getElementById("diagScoreTitle");
    const subTitle = document.getElementById("diagSubTitle");
    const insightHeader = document.getElementById("diagInsightHeader");
    const insightBody = document.getElementById("diagInsightBody");
    const mistakeContainer = document.getElementById("diagMistakeContainer");

    scoreTitle.innerText = `Score: ${analysis.scorePercentage}% (${analysis.correctCount}/${analysis.totalQuestions} Correct)`;
    subTitle.innerText = `🎉 You earned +${analysis.xpEarned} XP!`;

    if (analysis.scorePercentage >= 80) {
        insightHeader.innerText = "Mastery Achieved!";
        insightHeader.style.color = "var(--green)";
    } else if (analysis.scorePercentage >= 50) {
        insightHeader.innerText = "Developing Understanding";
        insightHeader.style.color = "var(--cyan)";
    } else {
        insightHeader.innerText = "Learning Gap Detected";
        insightHeader.style.color = "var(--red)";
    }

    insightBody.innerText = analysis.aiInsight;

    const mistakes = analysis.mistakeCategories || {};
    mistakeContainer.innerHTML = Object.keys(mistakes).map(cat => `
        <div class="mistake-card">
            <strong>${cat}</strong>
            <span style="color: ${mistakes[cat] > 0 ? 'var(--red)' : 'var(--green)'};">${mistakes[cat]}×</span>
        </div>
    `).join("");

    modal.classList.add("active");
}

function closeDiagnosisModal() {
    const modal = document.getElementById("diagnosisModal");
    modal.classList.remove("active");
    showPage("intelligence");
}

// ==========================================
// TEACHER CLASS MAP & GAP DETECTION
// ==========================================
async function loadTeacherClassMap() {
    try {
        const response = await fetch(`${API_BASE}/teachers/class-map`);
        const data = await response.json();

        if (data.success) {
            renderTeacherClassMap(data);
        }
    } catch (e) {
        console.warn("API class-map offline, using local data.");
        renderTeacherClassMap({
            className: "Class 10 - Section B",
            concepts: [
                { name: "Fractions & Decimals", mastery: 88, status: "Strong" },
                { name: "Linear Equations in 1 Variable", mastery: 54, status: "Critical Learning Gap" },
                { name: "Algebraic Bracket Expansion", mastery: 61, status: "Needs Practice" },
                { name: "Geometry & Pythagorean Theorem", mastery: 82, status: "Strong" }
            ],
            studentsRequiringSupport: [
                { name: "Rohan V.", weakConcept: "Linear Equations", score: "42%" },
                { name: "Sneha M.", weakConcept: "Algebraic Expansion", score: "48%" },
                { name: "Priya S.", weakConcept: "Linear Equations", score: "50%" }
            ]
        });
    }
}

function renderTeacherClassMap(data) {
    const barsContainer = document.getElementById("teacherConceptBars");
    const supportContainer = document.getElementById("studentsSupportList");

    if (barsContainer && data.concepts) {
        barsContainer.innerHTML = data.concepts.map(c => `
            <div class="dna-item">
                <div>
                    <span>${c.name}</span>
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
                    <strong style="color: var(--text);">${s.name}</strong>
                    <div style="font-size: 12px; color: var(--muted);">${s.weakConcept}</div>
                </div>
                <span class="badge-pill critical">${s.score}</span>
            </div>
        `).join("");
    }
}

async function generateIntervention() {
    try {
        const response = await fetch(`${API_BASE}/teachers/intervention`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ concept: "Linear Equations", className: "Class 10-B" })
        });
        const data = await response.json();
        if (data.success && data.aiInterventionPlan) {
            const plan = data.aiInterventionPlan;
            document.getElementById("interventTitle").innerText = plan.summary;
            document.getElementById("interventDesc").innerText = `Recommended Action: ${plan.recommendedAction}\n\nRemedial Exercises: ${plan.remedialQuiz.join(" • ")}`;
            showToast("💡 AI Teacher Intervention Plan generated!");
        }
    } catch (e) {
        document.getElementById("interventTitle").innerText = "18 of 32 students in Class 10-B need bracket expansion review";
        document.getElementById("interventDesc").innerText = "Recommended Action: Spend 5 minutes on bracket multiplication rules, then assign 3 targeted practice questions.";
        showToast("💡 AI Teacher Intervention Plan loaded!");
    }
}

// ==========================================
// GAMIFICATION & REWARDS
// ==========================================
async function fetchStudentProfile() {
    try {
        const response = await fetch(`${API_BASE}/students/profile`);
        const data = await response.json();
        if (data.success && data.student) {
            studentProfile = data.student;
            updateXPDisplay(studentProfile.xp);
        }
    } catch (e) {
        updateXPDisplay(studentProfile.xp);
    }
}

function updateStudentXP(pointsGained) {
    studentProfile.xp += pointsGained;
    updateXPDisplay(studentProfile.xp);
}

function updateXPDisplay(xpValue) {
    const val = typeof xpValue === 'number' ? xpValue : (studentProfile.xp || 0);
    const xpElements = document.querySelectorAll(".xp-value");
    xpElements.forEach(el => {
        el.innerText = val.toLocaleString();
    });
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
        if (data.success) {
            studentProfile.xp = data.remainingXp;
            updateXPDisplay(studentProfile.xp);
            showToast(`🎁 ${data.message}`);
        } else {
            showToast(`❌ ${data.message}`);
        }
    } catch (e) {
        studentProfile.xp -= cost;
        updateXPDisplay(studentProfile.xp);
        showToast(`🎁 Successfully redeemed "${title}" for ${cost} XP!`);
    }
}

function logout() {
    try {
        fetch(`${API_BASE}/auth/logout`, { method: "POST" });
    } catch (e) {
        // ignore
    }
    localStorage.removeItem("learniq_token");
    authToken = null;
    currentUser = null;

    updateUserUI(null);

    showToast("👋 Successfully signed out of LearnIQ session.");
    showPage("landing");
}

// ==========================================
// AUTHENTICATION & SUPABASE AUTH MODAL
// ==========================================
let authToken = localStorage.getItem("learniq_token") || null;
let currentUser = null;

async function checkAuthSession() {
    if (!authToken) return;
    try {
        const response = await fetch(`${API_BASE}/auth/me`, {
            headers: { "Authorization": `Bearer ${authToken}` }
        });
        const data = await response.json();
        if (data.success && data.user) {
            currentUser = data.user;
            updateUserUI(data.user);
        }
    } catch (e) {
        console.warn("Auth check failed:", e.message);
    }
}

function updateUserUI(user) {
    const userNameElem = document.getElementById("userName");
    const userSubElem = document.getElementById("userSub");
    const userAvatarElem = document.getElementById("userAvatar");
    const authBtnLabel = document.getElementById("authBtnLabel");
    const welcomeUserName = document.getElementById("welcomeUserName");
    const profilePageName = document.getElementById("profilePageName");
    const topbarLogoutBtn = document.getElementById("topbarLogoutBtn");

    if (user) {
        const name = user.name || "Guest Student";
        if (userNameElem) userNameElem.innerText = name;
        if (welcomeUserName) welcomeUserName.innerText = name;
        if (profilePageName) profilePageName.innerText = name;
        if (userSubElem) userSubElem.innerText = user.class || (user.role === "teacher" ? "Educator" : "Student");
        if (userAvatarElem) userAvatarElem.innerText = name.charAt(0).toUpperCase();
        if (authBtnLabel) authBtnLabel.innerText = "Account";
        if (topbarLogoutBtn) topbarLogoutBtn.style.display = "inline-flex";

        studentProfile.name = name;
        studentProfile.classLevel = user.class || studentProfile.classLevel;
        studentProfile.xp = user.xp !== undefined ? user.xp : 0;
        updateXPDisplay(studentProfile.xp);

        const modalUserAvatar = document.getElementById("modalUserAvatar");
        const modalUserName = document.getElementById("modalUserName");
        const modalUserEmail = document.getElementById("modalUserEmail");
        const modalUserRoleBadge = document.getElementById("modalUserRoleBadge");

        if (modalUserAvatar) modalUserAvatar.innerText = name.charAt(0).toUpperCase();
        if (modalUserName) modalUserName.innerText = name;
        if (modalUserEmail) modalUserEmail.innerText = user.email || "student@learniq.edu";
        if (modalUserRoleBadge) modalUserRoleBadge.innerText = user.role === "teacher" ? "Teacher Mode" : "Student Mode";
    } else {
        if (userNameElem) userNameElem.innerText = "Guest";
        if (welcomeUserName) welcomeUserName.innerText = "Guest";
        if (profilePageName) profilePageName.innerText = "Guest Student";
        if (userSubElem) userSubElem.innerText = "Class 10";
        if (userAvatarElem) userAvatarElem.innerText = "G";
        if (authBtnLabel) authBtnLabel.innerText = "Sign In";
        if (topbarLogoutBtn) topbarLogoutBtn.style.display = "none";

        studentProfile.xp = 0;
        updateXPDisplay(0);
    }
    loadLeaderboard();
}

async function loadLeaderboard() {
    const container = document.getElementById("rankingListContainer");
    if (!container) return;

    try {
        const response = await fetch(`${API_BASE}/students/leaderboard`);
        const data = await response.json();

        if (data.success && data.leaderboard && data.leaderboard.length > 0) {
            container.innerHTML = data.leaderboard.map(item => {
                const isCurrentUser = currentUser && (currentUser.id === item.userId || currentUser.name === item.name);
                const initial = (item.name || "S").charAt(0).toUpperCase();
                if (isCurrentUser) {
                    const rankElem = document.getElementById("dashboardRankVal");
                    if (rankElem) rankElem.innerText = `#${item.rank}`;
                }
                return `
                    <div class="ranking-row ${isCurrentUser ? 'you' : ''}">
                        <span>#${item.rank}</span>
                        <div class="avatar">${initial}</div>
                        <strong>${item.name} ${isCurrentUser ? '(You)' : ''}</strong>
                        <span class="badge-pill" style="font-size: 11px; margin-left: auto; margin-right: 12px; background: rgba(255,255,255,0.05);">${item.class || 'Class 10'}</span>
                        <span style="color: var(--cyan); font-weight: 700;">${(item.xp || 0).toLocaleString()} XP</span>
                    </div>
                `;
            }).join("");
        } else {
            if (currentUser && currentUser.name) {
                container.innerHTML = `
                    <div class="ranking-row you">
                        <span>#1</span>
                        <div class="avatar">${(currentUser.name || "U").charAt(0).toUpperCase()}</div>
                        <strong>${currentUser.name} (You)</strong>
                        <span class="badge-pill" style="font-size: 11px; margin-left: auto; margin-right: 12px; background: rgba(0,240,255,0.1); color: var(--cyan);">${currentUser.class || 'Class 10'}</span>
                        <span style="color: var(--cyan); font-weight: 700;">${(studentProfile.xp || 0).toLocaleString()} XP</span>
                    </div>
                `;
            } else {
                container.innerHTML = `
                    <div style="text-align: center; padding: 40px 20px; background: rgba(7,11,20,0.6); border-radius: 16px; border: 1px dashed var(--border);">
                        <i class="fa-solid fa-ranking-star" style="font-size: 36px; color: var(--cyan); margin-bottom: 12px;"></i>
                        <h3 style="font-size: 16px; color: var(--text); margin-bottom: 6px;">No Active Leaderboard Members Yet</h3>
                        <p style="font-size: 13px; color: var(--muted); max-width: 380px; margin: 0 auto 16px auto;">Sign in and complete AI quizzes to earn XP and claim the #1 spot on the leaderboard!</p>
                        <button class="primary-btn" onclick="openAuthModal()" style="margin: 0 auto;">
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
    const endpoint = type === 'login' ? `${API_BASE}/auth/login` : `${API_BASE}/auth/signup`;

    let email = "";
    let password = "";
    let fullName = "";
    let role = "student";

    if (type === 'login') {
        const lEmail = document.getElementById("loginEmail")?.value;
        const ldEmail = document.getElementById("landingLoginEmail")?.value;
        email = (lEmail || ldEmail || "").trim();

        const lPass = document.getElementById("loginPassword")?.value;
        const ldPass = document.getElementById("landingLoginPassword")?.value;
        password = (lPass || ldPass || "").trim();
    } else {
        const sName = document.getElementById("signupName")?.value;
        const ldName = document.getElementById("landingSignupName")?.value;
        fullName = (sName || ldName || "").trim();

        const sEmail = document.getElementById("signupEmail")?.value;
        const ldEmail = document.getElementById("landingSignupEmail")?.value;
        email = (sEmail || ldEmail || "").trim();

        const sPass = document.getElementById("signupPassword")?.value;
        const ldPass = document.getElementById("landingSignupPassword")?.value;
        password = (sPass || ldPass || "").trim();

        const sRole = document.getElementById("signupRole")?.value;
        const ldRole = document.getElementById("landingSignupRole")?.value;
        role = sRole || ldRole || "student";
    }

    const payload = type === 'login' ? { email, password } : { fullName, email, password, role };

    try {
        const response = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        if (data.success && data.session) {
            authToken = data.session.token || `token-${Date.now()}`;
            localStorage.setItem("learniq_token", authToken);
            currentUser = data.session.user;

            updateUserUI(currentUser);
            showToast(`✅ ${data.message}`);
            closeAuthModal();
            showPage("dashboard");

            if (data.session.role === "teacher" && currentRole !== "teacher") {
                toggleRole();
            }
        } else {
            showToast(`❌ ${data.message || "Authentication failed."}`);
        }
    } catch (err) {
        showToast("⚠️ Authentication server unreachable. Please check connection.");
    }
}

// ==========================================
// TEST ATTENDANCE & STREAK TRACKER
// ==========================================
let studentQuizHistory = JSON.parse(localStorage.getItem("learniq_quiz_history") || "[]");

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
    localStorage.setItem("learniq_quiz_history", JSON.stringify(studentQuizHistory));

    updateDailyStreak();
    renderProfileTestHistory();
}

function updateDailyStreak() {
    const today = new Date().toDateString();
    const lastActive = localStorage.getItem("learniq_last_active_date");
    let streak = parseInt(localStorage.getItem("learniq_streak_count") || "0");

    if (lastActive !== today) {
        streak += 1;
        localStorage.setItem("learniq_streak_count", streak.toString());
        localStorage.setItem("learniq_last_active_date", today);
    }
    studentProfile.streak = streak;

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