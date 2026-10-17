/**
 * LearnIQ - Application Orchestrator & Bootstrapper (ES Module)
 */

import { state, defaultQuiz, API_BASE } from "./state.js";
import { escapeHtml, showToast, toggleSidebar, toggleUserDropdown, closeUserDropdown, showPage } from "./ui.js";
import { checkAuthSession, logout, updateUserUI, openAuthModal, closeAuthModal, selectLandingRole, selectAuthModalRole, switchAuthTab, switchLandingTab, handleAuthSubmit } from "./auth.js";
import { onSubjectChange, setTopic, generateAIQuiz, startGeneratedQuiz, setQuizTimerMode, startQuiz, selectOption, nextQuestion, finishQuiz, openDiagnosisModal, startSimilarPractice, closeDiagnosisModal } from "./quiz.js";
import { fetchStudentProfile, updateStudentXP, updateXPDisplay, fetchDailyChallenges, openChallengeTask, selectChallengeTaskOption, closeChallengeTaskModal, verifyAndClaimChallenge, redeemReward, practiceLearningTopic, selectLearningSubject, startLinearEquationsPractice, startRecommendedPractice, renderLearningIntelligence, loadLeaderboard, switchRankingTab, logQuizAttendance, renderProfileTestHistory } from "./gamification.js";
import { loadTeacherClassMap, onTeacherClassChanged, generateIntervention, renderTeacherClassMap } from "./teacher.js";
import { loadAdminOverview, updateUserRole } from "./admin.js";

// ==========================================
// BIND GLOBAL FUNCTIONS FOR INLINE HTML ONCLICK
// ==========================================
window.showPage = showPage;
window.showToast = showToast;
window.escapeHtml = escapeHtml;
window.toggleSidebar = toggleSidebar;
window.toggleUserDropdown = toggleUserDropdown;
window.closeUserDropdown = closeUserDropdown;

// Auth
window.openAuthModal = openAuthModal;
window.closeAuthModal = closeAuthModal;
window.selectLandingRole = selectLandingRole;
window.selectAuthModalRole = selectAuthModalRole;
window.switchAuthTab = switchAuthTab;
window.switchLandingTab = switchLandingTab;
window.handleAuthSubmit = handleAuthSubmit;
window.logout = logout;

// Quiz
window.onSubjectChange = onSubjectChange;
window.setTopic = setTopic;
window.generateAIQuiz = generateAIQuiz;
window.startGeneratedQuiz = startGeneratedQuiz;
window.setQuizTimerMode = setQuizTimerMode;
window.startQuiz = startQuiz;
window.selectOption = selectOption;
window.nextQuestion = nextQuestion;
window.finishQuiz = finishQuiz;
window.openDiagnosisModal = openDiagnosisModal;
window.startSimilarPractice = startSimilarPractice;
window.closeDiagnosisModal = closeDiagnosisModal;

// Gamification
window.fetchStudentProfile = fetchStudentProfile;
window.updateStudentXP = updateStudentXP;
window.updateXPDisplay = updateXPDisplay;
window.fetchDailyChallenges = fetchDailyChallenges;
window.openChallengeTask = openChallengeTask;
window.selectChallengeTaskOption = selectChallengeTaskOption;
window.closeChallengeTaskModal = closeChallengeTaskModal;
window.verifyAndClaimChallenge = verifyAndClaimChallenge;
window.redeemReward = redeemReward;
window.practiceLearningTopic = practiceLearningTopic;
window.selectLearningSubject = selectLearningSubject;
window.startLinearEquationsPractice = startLinearEquationsPractice;
window.startRecommendedPractice = startRecommendedPractice;
window.renderLearningIntelligence = renderLearningIntelligence;
window.loadLeaderboard = loadLeaderboard;
window.switchRankingTab = switchRankingTab;
window.logQuizAttendance = logQuizAttendance;
window.renderProfileTestHistory = renderProfileTestHistory;

// Teacher & Admin
window.loadTeacherClassMap = loadTeacherClassMap;
window.onTeacherClassChanged = onTeacherClassChanged;
window.generateIntervention = generateIntervention;
window.renderTeacherClassMap = renderTeacherClassMap;
window.loadAdminOverview = loadAdminOverview;
window.updateUserRole = updateUserRole;

// State references
window.defaultQuiz = defaultQuiz;

// ==========================================
// APPLICATION BOOTSTRAPPER
// ==========================================
document.addEventListener("DOMContentLoaded", async () => {
    // Attach form listeners
    const landingLoginForm = document.getElementById("landingLoginForm");
    const landingSignupForm = document.getElementById("landingSignupForm");
    const modalLoginForm = document.getElementById("loginForm");
    const modalSignupForm = document.getElementById("signupForm");

    if (landingLoginForm) {
        landingLoginForm.addEventListener("submit", (e) => handleAuthSubmit(e, "login"));
    }
    if (landingSignupForm) {
        landingSignupForm.addEventListener("submit", (e) => handleAuthSubmit(e, "signup"));
    }
    if (modalLoginForm) {
        modalLoginForm.addEventListener("submit", (e) => handleAuthSubmit(e, "login"));
    }
    if (modalSignupForm) {
        modalSignupForm.addEventListener("submit", (e) => handleAuthSubmit(e, "signup"));
    }

    // Close dropdown on outside click
    document.addEventListener("click", (e) => {
        const userWrap = document.querySelector(".topbar-user-wrap");
        if (userWrap && !userWrap.contains(e.target)) {
            closeUserDropdown();
        }
    });

    // Check active auth session with backend
    await checkAuthSession();

    if (state.currentUser && state.currentUser.email) {
        if (state.currentUser.role === "admin") {
            showPage("admin-dashboard");
            loadAdminOverview();
        } else if (state.currentUser.role === "teacher") {
            showPage("teacher-map");
            loadTeacherClassMap();
        } else {
            await fetchStudentProfile();
            fetchDailyChallenges();
            showPage("dashboard");
        }
    } else {
        showPage("landing");
    }
});
