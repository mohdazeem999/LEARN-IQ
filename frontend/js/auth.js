/**
 * LearnIQ - Authentication Controller Module
 */

import { API_BASE, state } from "./state.js";
import { showToast, showPage } from "./ui.js";

export async function checkAuthSession() {
    try {
        const response = await fetch(`${API_BASE}/auth/session`, { credentials: "same-origin" });
        const data = await response.json();
        if (!response.ok || !data.success) throw new Error(data.message || "Unable to restore session.");
        state.currentUser = data.user || null;
        if (state.currentUser) updateUserUI(state.currentUser);
    } catch (e) {
        console.warn("Auth check failed:", e.message);
    }
}

export async function logout() {
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
    state.currentUser = null;
    updateUserUI(null);

    if (signedOut) showToast("👋 Successfully signed out of this device.");
    showPage("landing");
}

export function updateUserUI(user) {
    const userNameElem = document.getElementById("userName");
    const userSubElem = document.getElementById("userSub");
    const userAvatarElem = document.getElementById("userAvatar");
    const authBtnLabel = document.getElementById("authBtnLabel");
    const welcomeUserName = document.getElementById("welcomeUserName");
    const profilePageName = document.getElementById("profilePageName");
    const sidebarLogoutBtn = document.getElementById("sidebarLogoutBtn");
    const topbarCoinsBadge = document.getElementById("topbarCoinsBadge");
    const topbarLevelBadge = document.getElementById("topbarLevelBadge");

    const dropdownUserName = document.getElementById("dropdownUserName");
    const dropdownUserEmail = document.getElementById("dropdownUserEmail");
    const dropdownUserAvatar = document.getElementById("dropdownUserAvatar");
    const dropdownUserRoleBadge = document.getElementById("dropdownUserRoleBadge");
    const dropdownUserClassBadge = document.getElementById("dropdownUserClassBadge");

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

        state.studentProfile.name = name;
        state.studentProfile.classLevel = user.class ? `Class ${user.class}` : state.studentProfile.classLevel;
        state.studentProfile.xp = user.xp !== undefined ? user.xp : (state.studentProfile.xp || 0);
        if (window.updateXPDisplay) window.updateXPDisplay(state.studentProfile.xp);

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

        state.studentProfile.xp = 0;
        if (window.updateXPDisplay) window.updateXPDisplay(0);
    }

    const roleLabel = document.getElementById("roleLabel");
    if (roleLabel) {
        roleLabel.innerText = user
            ? `Mode: ${user.role === "teacher" ? "Teacher" : user.role === "admin" ? "Admin" : "Student"}`
            : "Mode: Sign in";
    }
    if (window.loadLeaderboard) window.loadLeaderboard();
}

export function openAuthModal() {
    const modal = document.getElementById("authModal");
    const userSessionView = document.getElementById("userSessionView");
    const authFormsContainer = document.getElementById("authFormsContainer");

    if (state.currentUser && state.currentUser.email) {
        if (userSessionView) userSessionView.style.display = "block";
        if (authFormsContainer) authFormsContainer.style.display = "none";
    } else {
        if (userSessionView) userSessionView.style.display = "none";
        if (authFormsContainer) authFormsContainer.style.display = "block";
    }

    if (modal) modal.classList.add("active");
}

export function closeAuthModal() {
    const modal = document.getElementById("authModal");
    if (modal) modal.classList.remove("active");
}

export function selectLandingRole(role) {
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

export function selectAuthModalRole(role) {
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

export function switchAuthTab(type) {
    const loginForm = document.getElementById("loginForm");
    const signupForm = document.getElementById("signupForm");
    const tabLoginBtn = document.getElementById("tabLoginBtn");
    const tabSignupBtn = document.getElementById("tabSignupBtn");

    if (type === "login") {
        if (loginForm) loginForm.style.display = "block";
        if (signupForm) signupForm.style.display = "none";
        if (tabLoginBtn) { tabLoginBtn.style.background = "var(--primary-gradient)"; tabLoginBtn.style.color = "white"; }
        if (tabSignupBtn) { tabSignupBtn.style.background = "transparent"; tabSignupBtn.style.color = "var(--muted)"; }
    } else {
        if (loginForm) loginForm.style.display = "none";
        if (signupForm) signupForm.style.display = "block";
        if (tabSignupBtn) { tabSignupBtn.style.background = "var(--primary-gradient)"; tabSignupBtn.style.color = "white"; }
        if (tabLoginBtn) { tabLoginBtn.style.background = "transparent"; tabLoginBtn.style.color = "var(--muted)"; }
    }
}

export function switchLandingTab(type) {
    const loginForm = document.getElementById("landingLoginForm");
    const signupForm = document.getElementById("landingSignupForm");
    const tabLoginBtn = document.getElementById("landingTabLogin");
    const tabSignupBtn = document.getElementById("landingTabSignup");

    if (!loginForm || !signupForm) return;

    if (type === "login") {
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

export async function handleAuthSubmit(event, type) {
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

    const endpoint = type === "login" ? `${API_BASE}/auth/login` : `${API_BASE}/auth/signup`;
    try {
        const email = form.querySelector('input[type="email"]')?.value.trim() || "";
        const password = form.querySelector('input[type="password"]')?.value || "";
        const role = form.querySelector('input[type="hidden"]')?.value || "student";

        let payload = { email, password };
        if (type === "signup") {
            const fullName = form.querySelector('input[type="text"]')?.value.trim() || "";
            let classLevel = null;
            if (role === "student") {
                const classSelect = form.querySelector("select");
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
            state.currentUser = data.session.user;
            updateUserUI(state.currentUser);
            showToast(`✅ ${data.message}`);
            closeAuthModal();
            if (state.currentUser.role === "admin") {
                showPage("admin-dashboard");
                if (window.loadAdminOverview) window.loadAdminOverview();
            } else if (state.currentUser.role === "teacher") {
                showPage("teacher-map");
                if (window.loadTeacherClassMap) window.loadTeacherClassMap();
            } else {
                showPage("dashboard");
                if (window.fetchStudentProfile) await window.fetchStudentProfile();
                if (window.fetchDailyChallenges) window.fetchDailyChallenges();
                if (window.loadStudentHistory) window.loadStudentHistory();
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
