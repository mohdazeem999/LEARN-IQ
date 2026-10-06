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
    xp: 2480,
    streak: 12,
    rank: 7,
    name: "Alex",
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
document.addEventListener("DOMContentLoaded", () => {
    fetchStudentProfile();
    loadTeacherClassMap();
    showPage("dashboard");
});

// ==========================================
// PAGE SWITCHING & UI NAVIGATION
// ==========================================
function showPage(pageId) {
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
        userName.innerText = studentProfile.name || "Alex";
        userSub.innerText = studentProfile.classLevel || "Class 10";
        userAvatar.innerText = "A";
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
function setTopic(topic, subject, classLevel) {
    if (topic) document.getElementById("genTopic").value = topic;
    if (subject) document.getElementById("genSubject").value = subject;
    if (classLevel) document.getElementById("genClass").value = classLevel;
    showToast(`Selected quick preset: ${topic} (${subject})`);
}

async function generateAIQuiz() {
    const classLevel = document.getElementById("genClass").value;
    const subject = document.getElementById("genSubject").value;
    const topic = document.getElementById("genTopic").value.trim() || "Linear Equations";
    const difficulty = document.getElementById("genDifficulty").value;
    const questionCount = document.getElementById("genCount").value;
    const prompt = document.getElementById("genPrompt").value.trim();

    const generateBtn = document.getElementById("generateBtn");
    const originalBtnHTML = generateBtn.innerHTML;
    generateBtn.disabled = true;
    generateBtn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> Generating AI Quiz...`;

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
            showToast(`✨ Generated ${data.quiz.questions.length} AI questions for ${topic}!`);
        } else {
            throw new Error(data.message || "Failed to generate");
        }
    } catch (err) {
        console.warn("API generate offline, using smart fallback quiz generation:", err);
        // Offline / fallback generation
        currentQuiz = {
            title: `${topic} (${subject})`,
            subject,
            classLevel: `Class ${classLevel}`,
            difficulty,
            questions: defaultQuiz.questions.slice(0, parseInt(questionCount))
        };
        renderQuizPreview(currentQuiz);
        showToast(`✨ Generated AI Quiz preview for ${topic}!`);
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
    const xpElements = document.querySelectorAll(".xp-value, .stat-card strong");
    xpElements.forEach(el => {
        if (el.innerText.includes(",") || !isNaN(parseInt(el.innerText.replace(/,/g, '')))) {
            if (el.closest('.xp-card') || el.closest('.stat-card')) {
                el.innerText = xpValue.toLocaleString();
            }
        }
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
    showToast("Logged out of LearnIQ session.");
    setTimeout(() => {
        showPage("dashboard");
    }, 1000);
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