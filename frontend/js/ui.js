/**
 * LearnIQ - UI & Navigation Helper Module
 */

import { state } from "./state.js";

export function escapeHtml(str) {
    if (typeof str !== "string") return "";
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

export function showToast(message) {
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

export function toggleSidebar() {
    const sidebar = document.querySelector(".sidebar");
    if (sidebar) {
        sidebar.classList.toggle("open");
    }
}

export function toggleUserDropdown() {
    const dropdown = document.getElementById("userMenuDropdown");
    if (!dropdown) return;
    dropdown.classList.toggle("open");
}

export function closeUserDropdown() {
    const dropdown = document.getElementById("userMenuDropdown");
    if (dropdown) dropdown.classList.remove("open");
}

export function showPage(pageId) {
    if (!state.currentUser && pageId !== "landing") {
        showToast("ℹ️ Sign in or create an account to unlock all LearnIQ features.");
        if (window.openAuthModal) window.openAuthModal();
        pageId = "landing";
    }
    if (pageId === "admin-dashboard" && state.currentUser?.role !== "admin") {
        showToast("❌ Access denied. Administrator privileges are required.");
        pageId = state.currentUser?.role === "teacher" ? "teacher-map" : "dashboard";
    }
    if (pageId === "teacher-map" && !["teacher", "admin"].includes(state.currentUser?.role)) {
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

    if (pageId === "assessment") {
        if (window.renderAssessmentIntro) window.renderAssessmentIntro();
    } else if (pageId === "admin-dashboard") {
        if (window.loadAdminOverview) window.loadAdminOverview();
    } else if (pageId === "teacher-map") {
        if (window.loadTeacherClassMap) window.loadTeacherClassMap();
    } else if (pageId === "challenges") {
        if (window.fetchDailyChallenges) window.fetchDailyChallenges();
    } else if (pageId === "rankings") {
        if (window.loadLeaderboard) window.loadLeaderboard();
    } else if (pageId === "profile") {
        if (window.renderProfileTestHistory) window.renderProfileTestHistory();
    } else if (pageId === "intelligence") {
        if (window.renderLearningIntelligence) window.renderLearningIntelligence();
    }
}
