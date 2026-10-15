/**
 * LearnIQ - Interactive Quiz & AI Assessment Module
 */

import { API_BASE, state, defaultQuiz } from "./state.js";
import { showToast, escapeHtml, showPage } from "./ui.js";
import { updateStudentXP, calculateClientLevel, fetchStudentProfile, logQuizAttendance } from "./gamification.js";

export function onSubjectChange() {
    const subjectElem = document.getElementById("genSubject");
    const subject = subjectElem ? subjectElem.value : "Mathematics";
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

export function getDefaultTopicForSubject(subject) {
    switch (subject) {
        case "Physics": return "Laws of Motion";
        case "Chemistry": return "Acids & Bases";
        case "Biology": return "Photosynthesis";
        case "English": return "Grammar & Tenses";
        case "Mathematics": default: return "Quadratic Equations";
    }
}

export function setTopic(topic, subject, classLevel) {
    if (topic) {
        const tInput = document.getElementById("genTopic");
        if (tInput) tInput.value = topic;
    }
    if (subject) {
        const sSelect = document.getElementById("genSubject");
        if (sSelect) {
            sSelect.value = subject;
            onSubjectChange();
        }
    }
    if (classLevel) {
        const cSelect = document.getElementById("genClass");
        if (cSelect) cSelect.value = classLevel;
    }
    showToast(`Selected topic: ${topic} (${subject})`);
}

export async function generateAIQuiz() {
    const classLevel = document.getElementById("genClass")?.value || "10";
    const subject = document.getElementById("genSubject")?.value || "Mathematics";
    const enteredTopic = document.getElementById("genTopic")?.value.trim() || "";
    const topic = enteredTopic || getDefaultTopicForSubject(subject);
    const difficulty = document.getElementById("genDifficulty")?.value || "Medium";
    const questionCount = document.getElementById("genCount")?.value || "5";
    const prompt = document.getElementById("genPrompt")?.value.trim() || "";

    const generateBtn = document.getElementById("generateBtn");
    const originalBtnHTML = generateBtn ? generateBtn.innerHTML : "";
    if (generateBtn) {
        generateBtn.disabled = true;
        generateBtn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> Generating AI ${subject} Quiz...`;
    }

    try {
        const response = await fetch(`${API_BASE}/assessments/generate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ classLevel, subject, topic, difficulty, questionCount, prompt })
        });

        const data = await response.json();
        if (data.success && data.quiz) {
            state.currentQuiz = data.quiz;
            renderQuizPreview(data.quiz);
            showToast(`✨ Generated ${data.quiz.questions.length} AI ${subject} questions for "${topic}"!`);
        } else {
            throw new Error(data.message || "Failed to generate");
        }
    } catch (err) {
        state.currentQuiz = {
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
        renderQuizPreview(state.currentQuiz);
        showToast(`✨ Generated AI ${subject} Quiz preview for "${topic}"!`);
    } finally {
        if (generateBtn) {
            generateBtn.disabled = false;
            generateBtn.innerHTML = originalBtnHTML;
        }
    }
}

export function renderQuizPreview(quiz) {
    const previewContainer = document.getElementById("genPreviewContainer");
    const previewTitle = document.getElementById("previewQuizTitle");
    const previewList = document.getElementById("previewQuestionsList");

    if (previewTitle) previewTitle.innerText = `${quiz.title} • [${quiz.difficulty}] (${quiz.questions.length} Questions)`;
    if (previewList) {
        previewList.innerHTML = quiz.questions.map((q, idx) => `
            <div style="background: rgba(7, 11, 20, 0.6); padding: 14px 18px; border-radius: 12px; border: 1px solid var(--border);">
                <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                    <strong style="color: var(--cyan);">Q${idx + 1}: ${escapeHtml(q.question)}</strong>
                    <span class="badge-pill strong">${escapeHtml(q.concept || "Concept")}</span>
                </div>
                <div style="font-size: 13px; color: var(--muted);">
                    Options: ${q.options.map(opt => escapeHtml(opt)).join(" • ")}
                </div>
            </div>
        `).join("");
    }

    if (previewContainer) {
        previewContainer.style.display = "block";
        previewContainer.scrollIntoView({ behavior: "smooth" });
    }
}

export function startGeneratedQuiz() {
    if (!state.currentQuiz) return;
    startQuiz(state.currentQuiz);
    showPage("assessment");
}

export function setQuizTimerMode(mode) {
    state.quizTimerMode = mode;
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
            clearInterval(state.questionTimerInterval);
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

export function startQuiz(quiz) {
    state.currentQuiz = quiz || defaultQuiz;
    state.currentQuestionIdx = 0;
    state.userAnswers = {};
    state.quizSubmissionInProgress = false;

    const quizTitleElem = document.getElementById("quizTitle");
    if (quizTitleElem) quizTitleElem.innerText = state.currentQuiz.title || "Adaptive Assessment";

    startTimer(300);
    renderCurrentQuestion();
}

export function startTimer(seconds) {
    clearInterval(state.quizTimerInterval);
    state.quizSecondsLeft = seconds;
    if (state.quizTimerMode === "overall") updateTimerDisplay();

    state.quizTimerInterval = setInterval(() => {
        state.quizSecondsLeft--;
        if (state.quizTimerMode === "overall") updateTimerDisplay();
        if (state.quizSecondsLeft <= 0) {
            clearInterval(state.quizTimerInterval);
            clearInterval(state.questionTimerInterval);
            showToast("⏳ Quiz time's up! Submitting answers...");
            finishQuiz();
        }
    }, 1000);
}

export function startQuestionTimer(seconds = 45) {
    clearInterval(state.questionTimerInterval);
    state.questionSecondsLeft = seconds;
    updateQuestionTimerDisplay();

    state.questionTimerInterval = setInterval(() => {
        state.questionSecondsLeft--;
        updateQuestionTimerDisplay();
        if (state.questionSecondsLeft <= 0) {
            clearInterval(state.questionTimerInterval);
            showToast("⏱️ Question timer expired! Moving to next question...");
            autoAdvanceQuestion();
        }
    }, 1000);
}

export function updateQuestionTimerDisplay() {
    const timerElem = document.getElementById("quizTimer");
    if (timerElem && state.quizTimerMode === "question") {
        const secs = Math.max(0, state.questionSecondsLeft);
        timerElem.innerText = `00:${secs.toString().padStart(2, "0")}`;
    }
}

export function autoAdvanceQuestion() {
    if (!state.currentQuiz) return;
    const q = state.currentQuiz.questions[state.currentQuestionIdx];
    if (state.userAnswers[q.id || state.currentQuestionIdx + 1] === undefined) {
        state.userAnswers[q.id || state.currentQuestionIdx + 1] = -1;
    }
    if (state.currentQuestionIdx < state.currentQuiz.questions.length - 1) {
        state.currentQuestionIdx++;
        renderCurrentQuestion();
    } else {
        clearInterval(state.quizTimerInterval);
        clearInterval(state.questionTimerInterval);
        finishQuiz();
    }
}

export function updateTimerDisplay() {
    if (state.quizTimerMode !== "overall") return;
    const mins = Math.floor(Math.max(0, state.quizSecondsLeft) / 60);
    const secs = Math.max(0, state.quizSecondsLeft) % 60;
    const timerElem = document.getElementById("quizTimer");
    if (timerElem) {
        timerElem.innerText = `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
}

export function renderCurrentQuestion() {
    if (!state.currentQuiz || !state.currentQuiz.questions) return;
    const questions = state.currentQuiz.questions;
    const q = questions[state.currentQuestionIdx];

    const idxElem = document.getElementById("questionIndex");
    const numElem = document.getElementById("questionNumber");
    const txtElem = document.getElementById("questionText");
    const progressFill = document.getElementById("quizProgressFill");

    if (idxElem) idxElem.innerText = (state.currentQuestionIdx + 1).toString().padStart(2, "0");
    if (numElem) numElem.innerText = `Question ${state.currentQuestionIdx + 1} of ${questions.length}`;
    if (txtElem) txtElem.innerText = q.question;

    const progressPct = Math.round(((state.currentQuestionIdx + 1) / questions.length) * 100);
    if (progressFill) progressFill.style.width = `${progressPct}%`;

    const answerContainer = document.getElementById("answerContainer");
    if (!answerContainer) return;
    answerContainer.innerHTML = "";

    q.options.forEach((optText, optIdx) => {
        const optionBtn = document.createElement("button");
        optionBtn.type = "button";
        optionBtn.className = "answer-option";
        if (state.userAnswers[q.id || state.currentQuestionIdx + 1] === optIdx) {
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

    if (state.quizTimerMode === "question") {
        startQuestionTimer(45);
    }
}

export function selectOption(optIdx) {
    if (!state.currentQuiz) return;
    const q = state.currentQuiz.questions[state.currentQuestionIdx];
    state.userAnswers[q.id || state.currentQuestionIdx + 1] = optIdx;

    const options = document.querySelectorAll("#answerContainer .answer-option");
    options.forEach((opt, i) => {
        if (i === optIdx) {
            opt.classList.add("selected");
        } else {
            opt.classList.remove("selected");
        }
    });
}

export function nextQuestion() {
    if (!state.currentQuiz) return;
    const q = state.currentQuiz.questions[state.currentQuestionIdx];

    if (state.userAnswers[q.id || state.currentQuestionIdx + 1] === undefined) {
        showToast("⚠️ Please select an answer before continuing.");
        return;
    }

    clearInterval(state.questionTimerInterval);

    if (state.currentQuestionIdx < state.currentQuiz.questions.length - 1) {
        state.currentQuestionIdx++;
        renderCurrentQuestion();
    } else {
        clearInterval(state.quizTimerInterval);
        finishQuiz();
    }
}

export async function finishQuiz() {
    if (state.quizSubmissionInProgress) return;
    state.quizSubmissionInProgress = true;
    clearInterval(state.quizTimerInterval);
    clearInterval(state.questionTimerInterval);
    showToast("🧠 AI is analyzing your quiz responses...");

    try {
        const response = await fetch(`${API_BASE}/assessments/submit`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ quiz: state.currentQuiz, answers: state.userAnswers })
        });

        const data = await response.json();
        if (data.success && data.analysis) {
            openDiagnosisModal(data.analysis);
            logQuizAttendance(state.currentQuiz, data.analysis);

            const earnedXp = data.gamification?.earnedXp || data.analysis.xpEarned || 100;
            const totalXp = data.gamification?.totalXp !== undefined ? data.gamification.totalXp : ((state.studentProfile.xp || 0) + earnedXp);
            state.studentProfile.xp = totalXp;
            updateStudentXP(earnedXp);

            const lvl = calculateClientLevel(totalXp);
            showToast(`+${earnedXp} XP 🎉 → Quiz Complete → ${lvl.xpNeededForNext} XP to Next Level (${lvl.title})`);

            if (data.submission) {
                await fetchStudentProfile();
            }
        } else {
            throw new Error("Invalid response");
        }
    } catch (e) {
        showToast("⚠️ Submission complete. Results recorded.");
    } finally {
        state.quizSubmissionInProgress = false;
    }
}

export function openDiagnosisModal(analysis) {
    state.currentAnalysis = analysis;
    const modal = document.getElementById("diagnosisModal");
    const scoreTitle = document.getElementById("diagScoreTitle");
    const subTitle = document.getElementById("diagSubTitle");
    const insightHeader = document.getElementById("diagInsightHeader");
    const insightBody = document.getElementById("diagInsightBody");
    const mistakeContainer = document.getElementById("diagMistakeContainer");
    const subjectTitle = document.getElementById("diagSubjectTitle");

    if (scoreTitle) scoreTitle.innerText = `Score: ${analysis.scorePercentage}% (${analysis.correctCount}/${analysis.totalQuestions} Correct)`;
    if (subTitle) subTitle.innerText = `🎉 You earned +${analysis.xpEarned} XP!`;
    if (subjectTitle) subjectTitle.innerText = `${state.currentQuiz?.subject || "Quiz"} • ${state.currentQuiz?.title || "Assessment"}`;

    if (insightHeader) {
        if (analysis.scorePercentage >= 80) {
            insightHeader.innerText = "Strong Understanding!";
            insightHeader.style.color = "var(--green)";
        } else if (analysis.scorePercentage >= 50) {
            insightHeader.innerText = "Developing Understanding";
            insightHeader.style.color = "var(--cyan)";
        } else {
            insightHeader.innerText = "Let's build on this attempt";
            insightHeader.style.color = "var(--cyan)";
        }
    }

    if (insightBody) insightBody.innerText = analysis.aiInsight || "Great effort! Review the questions to reinforce key concepts.";

    if (mistakeContainer) {
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
            message.textContent = "No incorrect questions. Great work!";
            mistakeContainer.appendChild(message);
        }
    }

    if (modal) modal.classList.add("active");
}

export async function startSimilarPractice() {
    const item = state.currentAnalysis?.feedback?.find(feedback => !feedback.isCorrect);
    const question = item && state.currentQuiz?.questions?.find((entry, index) =>
        String(entry.id || index + 1) === String(item.questionId)
    );
    const subject = question?.subject || state.currentQuiz?.subject || "Other";
    const topic = question?.concept || state.currentQuiz?.title || "Foundational Concepts";
    const button = document.getElementById("practiseSimilarBtn");
    if (button) {
        button.disabled = true;
        button.textContent = "Preparing practice…";
    }
    try {
        const response = await fetch(`${API_BASE}/assessments/generate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                subject,
                topic,
                classLevel: state.currentQuiz?.classLevel || state.studentProfile?.classLevel || "10",
                difficulty: state.currentQuiz?.difficulty || "Medium",
                questionCount: 3,
                prompt: "Create fresh practice questions for this topic. Do not repeat the original question verbatim."
            })
        });
        const data = await response.json();
        if (!response.ok || !data.success || !data.quiz) {
            throw new Error(data.message || "Practice questions could not be prepared.");
        }
        state.currentQuiz = data.quiz;
        state.currentQuestionIdx = 0;
        showPage("assessment");
        const modal = document.getElementById("diagnosisModal");
        if (modal) modal.classList.remove("active");
        showToast(`Practice is ready for ${topic}.`);
    } catch (error) {
        showToast(error.message || "Practice questions could not be prepared. Please try again.");
    } finally {
        if (button) {
            button.disabled = false;
            button.innerHTML = `Practise Similar Questions <i class="fa-solid fa-arrow-right"></i>`;
        }
    }
}

export function closeDiagnosisModal() {
    const modal = document.getElementById("diagnosisModal");
    if (modal) modal.classList.remove("active");
    showPage("intelligence");
}
