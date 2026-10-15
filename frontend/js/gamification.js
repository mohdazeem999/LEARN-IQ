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

export function selectChallengeTaskOption(idx) {
    state.selectedChallengeOption = idx;
    const options = document.querySelectorAll("#modalChallengeInteractiveArea .answer-option");
    options.forEach((btn, i) => {
        if (i === idx) btn.classList.add("selected");
        else btn.classList.remove("selected");
    });
}

export function closeChallengeTaskModal() {
    const modal = document.getElementById("challengeTaskModal");
    if (modal) modal.classList.remove("active");
    state.selectedChallengeTask = null;
    state.selectedChallengeOption = null;
}

export async function verifyAndClaimChallenge() {
    if (!state.selectedChallengeTask) return;
    const c = state.selectedChallengeTask;
    const feedback = document.getElementById("modalChallengeFeedback");
    const submitBtn = document.getElementById("modalChallengeSubmitBtn");

    if (c.problem && state.selectedChallengeOption === null) {
        showToast("⚠️ Please select an answer option first.");
        return;
    }

    if (c.problem && state.selectedChallengeOption !== c.problem.correctIndex) {
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
            const totalXp = data.totalXp !== undefined ? data.totalXp : ((state.studentProfile.xp || 0) + earnedXp);
            state.studentProfile.xp = totalXp;
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

export function practiceLearningTopic(topic) {
    const subject = document.getElementById("genSubject");
    const topicInput = document.getElementById("genTopic");
    if (subject) {
        subject.value = "Mathematics";
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
    const topicRows = [...document.querySelectorAll("#intelligence .mastery-row")];
    const weakestTopic = topicRows.reduce((weakest, row) => {
        const mastery = Number(row.dataset.mastery);
        return Number.isFinite(mastery) && (!weakest || mastery < weakest.mastery)
            ? { name: row.dataset.topic, mastery }
            : weakest;
    }, null);

    const topic = weakestTopic?.name || "Fractions";
    practiceLearningTopic(topic);
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

export async function loadLeaderboard() {
    const container = document.getElementById("rankingListContainer");
    if (!container) return;

    try {
        const response = await fetch(`${API_BASE}/students/leaderboard`);
        const data = await response.json();

        if (data.success && data.leaderboard && data.leaderboard.length > 0) {
            container.innerHTML = data.leaderboard.map(item => {
                const isCurrentUser = state.currentUser && (state.currentUser.id === item.userId || state.currentUser.name === item.name);
                const initial = (item.name || "S").charAt(0).toUpperCase();
                if (isCurrentUser) {
                    const rankElem = document.getElementById("dashboardRankVal");
                    if (rankElem) rankElem.innerText = `#${item.rank}`;
                }
                return `
                    <div class="ranking-row ${isCurrentUser ? 'you' : ''}">
                        <span>#${item.rank}</span>
                        <div class="avatar">${initial}</div>
                        <strong>${escapeHtml(item.name)} ${isCurrentUser ? '(You)' : ''}</strong>
                        <span class="badge-pill" style="font-size: 11px; margin-left: auto; margin-right: 12px; background: rgba(255,255,255,0.05);">${item.class ? 'Class ' + item.class : 'Class 10'}</span>
                        <span style="color: var(--cyan); font-weight: 700;">${(item.xp || 0).toLocaleString()} XP</span>
                    </div>
                `;
            }).join("");
        }
    } catch (err) {
        console.warn("Leaderboard fetch notice:", err.message);
    }
}
