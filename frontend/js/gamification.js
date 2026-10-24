/**
 * LearnIQ - Gamification & Student Progress Module
 */

import { API_BASE, state, defaultQuiz } from "./state.js";
import { showToast, escapeHtml, showPage } from "./ui.js";

export const GAMIFICATION_LEVELS = [
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

export function calculateClientLevel(totalXp) {
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

export async function fetchStudentProfile() {
    try {
        const response = await fetch(`${API_BASE}/students/profile`);
        const data = await response.json();
        if (data.success && data.student) {
            const rawXp = data.student.xp !== undefined ? data.student.xp : (data.student.totalXp !== undefined ? data.student.totalXp : 0);
            state.studentProfile = {
                ...state.studentProfile,
                ...data.student,
                xp: rawXp
            };
            updateXPDisplay(rawXp);
            renderLearningIntelligence();
        }
    } catch (e) {
        updateXPDisplay(state.studentProfile.xp);
    }
}

export function updateStudentXP(pointsGained) {
    state.studentProfile.xp = (state.studentProfile.xp || 0) + pointsGained;
    updateXPDisplay(state.studentProfile.xp);
    renderLearningIntelligence();
}

export function updateXPDisplay(xpValue) {
    const val = Math.max(0, typeof xpValue === 'number' ? xpValue : (state.studentProfile.xp || 0));
    state.studentProfile.xp = val;

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
    if (topbarLevelBadge && state.currentUser && state.currentUser.role === "student") {
        topbarLevelBadge.style.display = "flex";
    }

    const dashLevelText = document.getElementById("dashLevelText");
    if (dashLevelText) dashLevelText.innerText = `Level ${lvl.level} — ${lvl.title}`;
    const dashLevelProgress = document.getElementById("dashLevelProgress");
    if (dashLevelProgress) dashLevelProgress.innerText = `${lvl.xpNeededForNext} XP needed to reach Level ${lvl.level + 1}`;
    const dashLevelFill = document.getElementById("dashLevelFill");
    if (dashLevelFill) dashLevelFill.style.width = `${lvl.progressPercent}%`;
}

export async function fetchDailyChallenges() {
    const grid = document.getElementById("dailyChallengesGrid");
    if (!grid) return;

    try {
        const response = await fetch(`${API_BASE}/students/challenges`);
        const data = await response.json();
        if (data.success && Array.isArray(data.challenges)) {
            state.currentDailyChallenges = data.challenges;

            const classLevel = data.classLevel || 10;
            const streak = data.streak || 1;
            const completedCount = state.currentDailyChallenges.filter(c => c.completed).length;
            const totalCount = state.currentDailyChallenges.length;
            const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
            const totalAvailableXp = state.currentDailyChallenges.reduce((sum, c) => sum + (c.xp || 0), 0);

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

            if (state.currentDailyChallenges.length === 0) {
                grid.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--muted);"><i class="fa-solid fa-trophy" style="font-size: 32px; color: var(--cyan); margin-bottom: 12px;"></i><p>All daily challenges complete for today! Check back tomorrow for fresh quests.</p></div>`;
            } else {
                grid.innerHTML = state.currentDailyChallenges.map(c => {
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

export function openChallengeTask(challengeId) {
    const c = state.currentDailyChallenges.find(x => x.id === challengeId);
    if (!c || c.completed) return;

    state.selectedChallengeTask = c;
    state.selectedChallengeOption = null;
    state.selectedChallengeAnswers = {};

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

    const questions = Array.isArray(c.questions) && c.questions.length > 0
        ? c.questions
        : (c.problem ? [{ id: 0, question: c.problem.question, options: c.problem.options }] : []);

    if (interactiveArea) {
        if (questions.length > 0) {
            interactiveArea.innerHTML = questions.map((q, qIdx) => `
                <div style="margin-bottom: ${qIdx < questions.length - 1 ? '16px' : '0'};">
                    <div style="font-size: 14.5px; font-weight: 600; color: var(--text); margin-bottom: 12px; line-height: 1.5;">
                        <i class="fa-solid fa-circle-question" style="color: var(--cyan); margin-right: 8px;"></i>${escapeHtml(q.question)}
                    </div>
                    <div class="answer-grid" style="grid-template-columns: 1fr; gap: 8px;">
                        ${q.options.map((opt, optIdx) => `
                            <button type="button" class="answer-option" id="challengeOptBtn_${qIdx}_${optIdx}" onclick="selectChallengeTaskOption(${optIdx}, ${qIdx})" style="padding: 10px 14px; text-align: left;">
                                <span class="option-num-badge">${optIdx + 1}</span>
                                <span style="font-size: 13px; color: var(--text);">${escapeHtml(opt)}</span>
                            </button>
                        `).join("")}
                    </div>
                </div>
            `).join("");
        } else {
            interactiveArea.innerHTML = `
                <p style="color: var(--muted); text-align: center; margin: 0;">Task ready. Click Complete & Claim to verify and earn XP.</p>
            `;
        }
    }

    if (modal) modal.classList.add("active");
}

export function selectChallengeTaskOption(optIdx, qIdx = 0) {
    if (!state.selectedChallengeAnswers) state.selectedChallengeAnswers = {};
    state.selectedChallengeAnswers[qIdx] = optIdx;
    state.selectedChallengeOption = optIdx;
    const buttons = document.querySelectorAll(`#modalChallengeInteractiveArea button[id^="challengeOptBtn_${qIdx}_"]`);
    buttons.forEach((btn, i) => {
        if (i === optIdx) btn.classList.add("selected");
        else btn.classList.remove("selected");
    });
}

export function closeChallengeTaskModal() {
    const modal = document.getElementById("challengeTaskModal");
    if (modal) modal.classList.remove("active");
    state.selectedChallengeTask = null;
    state.selectedChallengeOption = null;
    state.selectedChallengeAnswers = {};
}

export async function verifyAndClaimChallenge() {
    if (!state.selectedChallengeTask || state.challengeClaimInProgress) return;
    const c = state.selectedChallengeTask;
    const feedback = document.getElementById("modalChallengeFeedback");
    const submitBtn = document.getElementById("modalChallengeSubmitBtn");

    const questions = Array.isArray(c.questions) && c.questions.length > 0
        ? c.questions
        : (c.problem ? [{ id: 0, question: c.problem.question, options: c.problem.options }] : []);

    if (questions.length > 0) {
        const answers = state.selectedChallengeAnswers || {};
        const answeredCount = Object.keys(answers).filter(k => answers[k] !== null && answers[k] !== undefined).length;
        if (answeredCount < questions.length) {
            showToast("⚠️ Please select an answer option first.");
            return;
        }
    }

    state.challengeClaimInProgress = true;
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Submitting & Verifying...`;
    }

    try {
        const response = await fetch(`${API_BASE}/students/challenges/submit`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "same-origin",
            body: JSON.stringify({
                challengeId: c.id,
                answers: state.selectedChallengeAnswers || {}
            })
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || "Could not complete challenge.");
        }

        if (data.success && (data.passed !== false)) {
            const earnedXp = data.earnedXp || 0;
            const totalXp = data.totalXp !== undefined ? data.totalXp : ((state.studentProfile.xp || 0) + earnedXp);
            state.studentProfile.xp = totalXp;
            updateXPDisplay(totalXp);

            const lvl = calculateClientLevel(totalXp);

            if (feedback) {
                feedback.style.display = "block";
                feedback.style.background = "rgba(34, 197, 94, 0.15)";
                feedback.style.border = "1px solid rgba(34, 197, 94, 0.3)";
                feedback.style.color = "#22c55e";
                const explanationText = data.feedback?.[0]?.explanation || "";
                feedback.innerHTML = `<i class="fa-solid fa-circle-check" style="margin-right: 6px;"></i> ${data.alreadyClaimed ? 'Already completed!' : 'Correct!'} ${escapeHtml(explanationText)}<br><strong style="color: var(--cyan); margin-top: 4px; display: inline-block;">+${earnedXp} XP Awarded! 🎉</strong>`;
            }

            if (data.alreadyClaimed) {
                showToast("ℹ️ This daily challenge was already completed today.");
            } else {
                showToast(`+${earnedXp} XP 🎉 → Challenge Complete → ${lvl.xpNeededForNext} XP to Next Level (${lvl.title})`);
            }

            c.completed = true;
            c.claimed = true;
            await fetchDailyChallenges();
            await fetchStudentProfile();

            setTimeout(() => {
                closeChallengeTaskModal();
            }, 1500);
        } else {
            // Unsuccessful attempt (e.g. 0 correct)
            if (feedback) {
                feedback.style.display = "block";
                feedback.style.background = "rgba(239, 68, 68, 0.15)";
                feedback.style.border = "1px solid rgba(239, 68, 68, 0.3)";
                feedback.style.color = "#ef4444";
                const explanationText = data.feedback?.[0]?.explanation || data.message || "Review the problem and try another option.";
                feedback.innerHTML = `<i class="fa-solid fa-triangle-exclamation" style="margin-right: 6px;"></i> Not quite right! ${escapeHtml(explanationText)}`;
            }
            showToast(`❌ ${data.message || 'Incorrect answer. Try again!'}`);
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = `<i class="fa-solid fa-bolt"></i> Complete & Claim +${c.xpReward || c.xp || 50} XP`;
            }
        }
    } catch (err) {
        showToast(`⚠️ ${err.message || "Could not reach server to claim challenge."}`);
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = `<i class="fa-solid fa-bolt"></i> Complete & Claim +${c.xpReward || c.xp || 50} XP`;
        }
    } finally {
        state.challengeClaimInProgress = false;
    }
}

export async function redeemReward(cost, title = "Reward Item") {
    if (state.studentProfile.xp < cost) {
        showToast(`❌ Insufficient XP! You need ${cost} XP, but have ${state.studentProfile.xp} XP.`);
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
        state.studentProfile.xp = data.remainingXp;
        updateXPDisplay(state.studentProfile.xp);
        showToast(`🎁 ${data.message}`);
    } catch (e) {
        showToast(`⚠️ ${e.message || "Reward redemption could not be confirmed. Please try again."}`);
    }
}

export function practiceLearningTopic(topic, subject) {
    const subjectElem = document.getElementById("genSubject");
    const topicInput = document.getElementById("genTopic");
    if (subject && subjectElem) {
        subjectElem.value = subject;
        if (window.onSubjectChange) window.onSubjectChange();
    }
    if (topicInput) topicInput.value = topic;
    showPage("generator");
}

export function startLinearEquationsPractice() {
    state.currentQuiz = defaultQuiz;
    state.currentQuestionIdx = 0;
    showPage("assessment");
}

export function startRecommendedPractice() {
    if (currentLearningIntelligence && currentLearningIntelligence.nextAction) {
        const action = currentLearningIntelligence.nextAction;
        practiceLearningTopic(action.topic, action.subject);
        return;
    }
    const topicRows = [...document.querySelectorAll("#intelligence .mastery-row")];
    const weakestTopic = topicRows.reduce((weakest, row) => {
        const mastery = Number(row.dataset.mastery);
        return Number.isFinite(mastery) && (!weakest || mastery < weakest.mastery)
            ? { name: row.dataset.topic, mastery }
            : weakest;
    }, null);

    const currentSubject = document.getElementById("learningSubjectSelect")?.value || "Mathematics";
    const topic = weakestTopic?.name || "Linear Equations";
    practiceLearningTopic(topic, currentSubject);
}

export function renderLearningIntelligence() {
    const history = Array.isArray(state.studentHistory) ? state.studentHistory : [];
    const accuracy = document.getElementById("learningAccuracy");
    const quizCount = document.getElementById("learningQuizCount");
    const streak = document.getElementById("learningStreak");
    const xp = document.getElementById("learningXp");

    if (accuracy && history.length > 0) {
        const avg = Math.round(history.reduce((sum, h) => sum + (Number(h.score) || 0), 0) / history.length);
        accuracy.innerText = `${avg}%`;
    }
    if (quizCount) {
        quizCount.innerText = history.length;
    }
    if (streak) {
        streak.innerText = `${state.studentProfile.streak || 1}d`;
    }
    if (xp) {
        xp.innerText = (state.studentProfile.xp || 0).toLocaleString();
    }
}

export function logQuizAttendance(quiz, analysis) {
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
    state.studentHistory.unshift(entry);

    const streakElem = document.getElementById("dashboardStreakVal");
    const streak = Number(state.studentProfile.streak) || 0;
    if (streakElem) streakElem.innerText = `${streak} ${streak === 1 ? 'Day' : 'Days'}`;

    renderProfileTestHistory();
    renderLearningIntelligence();
}

export function renderProfileTestHistory() {
    const counts = {
        Mathematics: 0,
        Physics: 0,
        Chemistry: 0,
        Biology: 0,
        English: 0
    };

    state.studentHistory.forEach(item => {
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

    if (state.studentHistory.length > 0) {
        container.innerHTML = state.studentHistory.map(item => `
            <div style="background: rgba(7, 11, 20, 0.6); padding: 12px 16px; border-radius: 12px; border: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center;">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <div style="width: 36px; height: 36px; border-radius: 10px; background: rgba(0, 240, 255, 0.1); color: var(--cyan); display: grid; place-items: center; font-size: 16px;">
                        <i class="fa-solid fa-file-signature"></i>
                    </div>
                    <div>
                        <strong style="font-size: 14px; color: var(--text); display: block;">${escapeHtml(item.topic)} (${escapeHtml(item.subject)})</strong>
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

export function switchRankingTab(button, tabName) {
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
    } else if (state.currentUser && state.currentUser.name) {
        const myXp = Number(state.studentProfile?.xp) || 0;
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

export async function loadLeaderboard() {
    const container = document.getElementById("rankingListContainer");
    if (!container) return;

    if (!state.currentUser) {
        updateYourRankCard([], -1);
        container.innerHTML = `
            <div class="ranking-empty-card">
                <i class="fa-solid fa-lock" style="font-size: 36px; color: #38d6ff; margin-bottom: 12px; display: block;"></i>
                <h3 style="font-size: 16px; color: #ffffff; margin-bottom: 6px;">Sign In to View Rankings</h3>
                <p style="font-size: 13px; color: #9aa6bd; max-width: 380px; margin: 0 auto 16px auto;">Sign in with your student account to see your class standings and compete with your classmates.</p>
                <button class="primary-btn" onclick="openAuthModal()" style="margin: 0 auto; padding: 10px 20px; font-size: 13px;">
                    <i class="fa-solid fa-right-to-bracket"></i> Sign In to LearnIQ
                </button>
            </div>
        `;
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/students/leaderboard`);
        if (response.status === 401) {
            updateYourRankCard([], -1);
            container.innerHTML = `
                <div class="ranking-empty-card">
                    <i class="fa-solid fa-lock" style="font-size: 36px; color: #38d6ff; margin-bottom: 12px; display: block;"></i>
                    <h3 style="font-size: 16px; color: #ffffff; margin-bottom: 6px;">Authentication Required</h3>
                    <p style="font-size: 13px; color: #9aa6bd; max-width: 380px; margin: 0 auto 16px auto;">Your session has expired. Please sign in again to access class rankings.</p>
                    <button class="primary-btn" onclick="openAuthModal()" style="margin: 0 auto; padding: 10px 20px; font-size: 13px;">
                        <i class="fa-solid fa-right-to-bracket"></i> Sign In
                    </button>
                </div>
            `;
            return;
        }

        const data = await response.json();

        if (data.missingClass) {
            updateYourRankCard([], -1);
            const statusLine = document.getElementById("yourRankStatusLine");
            if (statusLine) statusLine.innerHTML = "⚠️ Please set your Class to view rankings.";
            container.innerHTML = `
                <div class="ranking-empty-card">
                    <i class="fa-solid fa-graduation-cap" style="font-size: 36px; color: #f59e0b; margin-bottom: 12px; display: block;"></i>
                    <h3 style="font-size: 16px; color: #ffffff; margin-bottom: 6px;">Class Not Set</h3>
                    <p style="font-size: 13px; color: #9aa6bd; max-width: 380px; margin: 0 auto 16px auto;">Your profile is missing an assigned class. Please select your Class (Class 5 to 12) in your profile or settings to join your classmates on the leaderboard.</p>
                    <button class="secondary-btn" onclick="showPage('settings')" style="margin: 0 auto; padding: 10px 20px; font-size: 13px;">
                        <i class="fa-solid fa-gear"></i> Set Your Class in Settings
                    </button>
                </div>
            `;
            return;
        }

        if (data.success && Array.isArray(data.leaderboard) && data.leaderboard.length > 0) {
            const leaderboard = data.leaderboard;
            const myIndex = leaderboard.findIndex(item => {
                const user = state.currentUser;
                if (!user) return false;
                return (user.id && (user.id === item.userId || user.id === item.id)) ||
                       (user.name && user.name.toLowerCase() === (item.name || "").toLowerCase()) ||
                       (user.email && item.email && user.email === item.email);
            });

            updateYourRankCard(leaderboard, myIndex);

            container.innerHTML = leaderboard.map((item, index) => {
                const user = state.currentUser;
                const rankNum = item.rank || (index + 1);
                const rankColorClass = rankNum === 1 ? 'rank-gold' : rankNum === 2 ? 'rank-silver' : rankNum === 3 ? 'rank-bronze' : 'rank-other';
                const isCurrentUser = user && (
                    (user.id && (user.id === item.userId || user.id === item.id)) ||
                    (user.name && user.name.toLowerCase() === (item.name || "").toLowerCase()) ||
                    (user.email && item.email && user.email === item.email)
                );

                const cleanName = (item.name || "Student").replace(/\s*\((?:you|You)\)\s*/gi, "").trim();
                const rawClass = String(item.class || (data.classNumber ? `Class ${data.classNumber}` : "Class 10")).replace(/class\s*/gi, "").trim();
                const classDisplay = `CLASS ${rawClass}`;

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
            const studentClassNum = data.classNumber || (state.currentUser?.class ? Number.parseInt(String(state.currentUser.class).replace(/\D/g, ""), 10) : null);
            const classTitle = studentClassNum ? `Class ${studentClassNum}` : "your class";
            updateYourRankCard([], -1);

            container.innerHTML = `
                <div class="ranking-empty-card">
                    <i class="fa-solid fa-ranking-star" style="font-size: 36px; color: #38d6ff; margin-bottom: 12px; display: block;"></i>
                    <h3 style="font-size: 16px; color: #ffffff; margin-bottom: 6px;">No Active ${classTitle} Students Yet</h3>
                    <p style="font-size: 13px; color: #9aa6bd; max-width: 380px; margin: 0 auto 16px auto;">Be the first student in ${classTitle} to complete an AI quiz and claim the #1 spot on the leaderboard!</p>
                    <button class="primary-btn" onclick="showPage('generator')" style="margin: 0 auto; padding: 10px 20px; font-size: 13px;">
                        <i class="fa-solid fa-wand-magic-sparkles"></i> Take a Quiz Now
                    </button>
                </div>
            `;
        }
    } catch (err) {
        console.warn("Leaderboard fetch notice:", err.message);
    }
}

export let currentLearningIntelligence = null;

export async function selectLearningSubject(subject) {
    const overview = document.getElementById("learningSubjectOverview");
    const detail = document.getElementById("learningSubjectDetail");
    const nameEl = document.getElementById("selectedSubjectName");
    const select = document.getElementById("learningSubjectSelect");
    const masteryEl = document.getElementById("selectedSubjectMastery");
    const topicsList = document.getElementById("subjectTopicsList");
    const topicsEmpty = document.getElementById("subjectTopicsEmpty");
    const topicsLoading = document.getElementById("subjectTopicsLoading");
    const mistakeCards = document.getElementById("mistakeCards");
    const mistakesEmpty = document.getElementById("mistakesEmpty");
    const nextActionContent = document.getElementById("nextActionContent");
    const nextActionEmpty = document.getElementById("recommendationEmpty");
    const nextActionTitle = document.getElementById("nextActionTitle");
    const nextActionMastery = document.getElementById("nextActionMastery");
    const nextActionButton = document.getElementById("nextActionButton");

    if (select && select.value !== subject) select.value = subject;
    if (nameEl) nameEl.textContent = subject || "Mathematics";

    // Immediate cleanup: clear stale topics scorecard while loading fresh data
    if (topicsList) topicsList.innerHTML = "";
    if (topicsEmpty) topicsEmpty.hidden = true;
    if (topicsLoading) topicsLoading.hidden = false;
    if (masteryEl) masteryEl.textContent = "--";
    if (mistakeCards) mistakeCards.innerHTML = "";
    if (mistakesEmpty) mistakesEmpty.hidden = true;
    if (nextActionContent) nextActionContent.hidden = true;
    if (nextActionEmpty) nextActionEmpty.hidden = false;

    if (overview) overview.hidden = true;
    if (detail) detail.hidden = false;

    try {
        const querySubject = (subject && subject !== "All Subjects") ? subject : "";
        const res = await fetch(`${API_BASE}/students/intelligence?subject=${encodeURIComponent(querySubject)}`);
        const data = await res.json();

        if (topicsLoading) topicsLoading.hidden = true;

        if (!data || !data.success) {
            if (topicsEmpty) topicsEmpty.hidden = false;
            return;
        }

        currentLearningIntelligence = data;

        if (masteryEl) {
            masteryEl.textContent = data.overallMastery !== null ? `${data.overallMastery}%` : "--";
        }

        const topics = Array.isArray(data.topics) ? data.topics : [];
        if (topics.length === 0) {
            if (topicsEmpty) {
                topicsEmpty.textContent = `No topic results for ${escapeHtml(subject || 'this subject')} yet. Complete a quiz to see your mastery here.`;
                topicsEmpty.hidden = false;
            }
            if (topicsList) topicsList.innerHTML = "";
        } else {
            if (topicsEmpty) topicsEmpty.hidden = true;
            if (topicsList) {
                topicsList.innerHTML = topics.map(t => {
                    const statusClass = t.statusClass || (t.mastery >= 80 ? "strong-status" : t.mastery >= 60 ? "developing-status" : "needs-practice-status");
                    return `
                        <article class="mastery-row" data-topic="${escapeHtml(t.topic)}" data-mastery="${t.mastery}">
                            <div class="mastery-topic">
                                <strong>${escapeHtml(t.topic)}</strong>
                                <span class="mastery-status ${statusClass}">${escapeHtml(t.status)}</span>
                            </div>
                            <div class="mastery-progress">
                                <div class="mastery-track" role="progressbar" aria-label="${escapeHtml(t.topic)} mastery" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${t.mastery}">
                                    <span style="width:${t.mastery}%"></span>
                                </div>
                                <span>${t.mastery}%</span>
                            </div>
                            <button class="topic-practice-btn" onclick="practiceLearningTopic('${escapeHtml(t.topic)}', '${escapeHtml(t.subject || subject)}')">Practice</button>
                        </article>
                    `;
                }).join("");
            }
        }

        const mistakes = Array.isArray(data.mistakes) ? data.mistakes : [];
        if (mistakes.length === 0) {
            if (mistakesEmpty) mistakesEmpty.hidden = false;
            if (mistakeCards) mistakeCards.innerHTML = "";
        } else {
            if (mistakesEmpty) mistakesEmpty.hidden = true;
            if (mistakeCards) {
                mistakeCards.innerHTML = mistakes.map(m => `
                    <article class="learning-mistake-card">
                        <span class="mistake-card-icon ${escapeHtml(m.typeClass || 'conceptual-icon')}">
                            <i class="${escapeHtml(m.iconClass || 'fa-solid fa-triangle-exclamation')}" aria-hidden="true"></i>
                        </span>
                        <div>
                            <strong>${escapeHtml(m.title)}</strong>
                            <span>${m.count} ${m.count === 1 ? 'mistake' : 'mistakes'}</span>
                        </div>
                        ${m.mostFrequent ? '<small class="most-frequent-label">Most frequent</small>' : ''}
                    </article>
                `).join("");
            }
        }

        if (data.nextAction) {
            if (nextActionEmpty) nextActionEmpty.hidden = true;
            if (nextActionContent) nextActionContent.hidden = false;
            if (nextActionTitle) nextActionTitle.textContent = `Practice ${data.nextAction.topic}`;
            if (nextActionMastery) nextActionMastery.textContent = `${data.nextAction.currentMastery}%`;
            if (nextActionButton) {
                nextActionButton.onclick = () => practiceLearningTopic(data.nextAction.topic, data.nextAction.subject || subject);
            }
        } else {
            if (nextActionContent) nextActionContent.hidden = true;
            if (nextActionEmpty) nextActionEmpty.hidden = false;
        }

    } catch (err) {
        console.error("Error loading learning intelligence:", err);
        if (topicsLoading) topicsLoading.hidden = true;
        if (topicsEmpty) topicsEmpty.hidden = false;
    }
}
