/**
 * LearnIQ - Admin Dashboard Controller
 */

import { API_BASE, state } from "./state.js";
import { showToast, escapeHtml } from "./ui.js";

export async function loadAdminOverview() {
    if (state.currentUser?.role !== "admin") return;
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
        const teacherSelect = document.getElementById("assignTeacherSelect");

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

                // Populate teacher selector for class assignments
                if (teacherSelect) {
                    const educators = usersData.users.filter(u => u.role === "teacher");
                    if (educators.length === 0) {
                        teacherSelect.innerHTML = `<option value="" disabled selected>-- No educators available (promote a user first) --</option>`;
                    } else {
                        teacherSelect.innerHTML = `<option value="" disabled selected>-- Choose Educator --</option>` +
                            educators.map(t => `<option value="${t.user_id || t.id}">${escapeHtml(t.name || "Teacher")} (${escapeHtml(t.email || "No email")})</option>`).join("");
                    }
                }
            }
        }

        // Also load teacher class assignments
        await loadTeacherAssignments();
    } catch (err) {
        console.error("Failed to load admin overview:", err);
    }
}

export async function updateUserRole(userId, newRole) {
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

export async function loadTeacherAssignments() {
    const tbody = document.getElementById("adminTeacherAssignmentsTableBody");
    const countBadge = document.getElementById("adminAssignmentsCount");
    if (!tbody) return;

    try {
        const res = await fetch(`${API_BASE}/admin/teacher-assignments`, { credentials: "same-origin" });
        const data = await res.json();

        if (data.success && Array.isArray(data.assignments)) {
            if (countBadge) {
                countBadge.innerText = `${data.assignments.length} Assignment${data.assignments.length === 1 ? "" : "s"}`;
            }

            if (data.assignments.length === 0) {
                tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 24px; color: var(--muted);">No educator class assignments configured. Use the form above to assign a class.</td></tr>`;
            } else {
                tbody.innerHTML = data.assignments.map(a => `
                    <tr style="border-bottom: 1px solid rgba(255,255,255,0.04);">
                        <td style="padding: 12px 10px; font-weight: 600; color: var(--text);">
                            ${escapeHtml(a.teacherName || a.teacherEmail || a.teacherId)}
                        </td>
                        <td style="padding: 12px 10px;">
                            <span class="badge-pill" style="background: rgba(0, 240, 255, 0.1); color: var(--cyan); border: 1px solid rgba(0, 240, 255, 0.3);">
                                Class ${a.class}
                            </span>
                        </td>
                        <td style="padding: 12px 10px; color: var(--muted);">${escapeHtml(a.section || "Section A")}</td>
                        <td style="padding: 12px 10px; color: var(--muted);">${escapeHtml(a.subject || "All Curriculum Subjects")}</td>
                        <td style="padding: 12px 10px; text-align: right;">
                            <button onclick="removeTeacherAssignment('${a.id}')" style="background: rgba(239, 68, 68, 0.15); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 6px; padding: 4px 10px; font-size: 11px; cursor: pointer;">
                                <i class="fa-solid fa-trash-can"></i> Unassign
                            </button>
                        </td>
                    </tr>
                `).join("");
            }
        }
    } catch (err) {
        console.warn("Unable to load teacher assignments:", err.message);
    }
}

export async function handleAssignTeacherClass(event) {
    event.preventDefault();
    const teacherSelect = document.getElementById("assignTeacherSelect");
    const classSelect = document.getElementById("assignClassSelect");
    const sectionInput = document.getElementById("assignSectionInput");

    const teacherId = teacherSelect?.value;
    const classLevel = classSelect?.value;
    const section = sectionInput?.value || "Section A";

    if (!teacherId) {
        showToast("⚠️ Please select an educator.");
        return;
    }
    if (!classLevel) {
        showToast("⚠️ Please select a class.");
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/admin/teacher-assignments`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "same-origin",
            body: JSON.stringify({ teacherId, classLevel: Number(classLevel), section })
        });
        const data = await res.json();
        if (data.success) {
            showToast(`✅ ${data.message}`);
            await loadTeacherAssignments();
        } else {
            showToast(`❌ ${data.message || "Failed to assign class."}`);
        }
    } catch (err) {
        showToast("⚠️ Could not assign class to educator.");
    }
}

export async function removeTeacherAssignment(id) {
    if (!confirm("Remove this educator class assignment?")) return;
    try {
        const res = await fetch(`${API_BASE}/admin/teacher-assignments/${id}`, {
            method: "DELETE",
            credentials: "same-origin"
        });
        const data = await res.json();
        if (data.success) {
            showToast(`✅ ${data.message}`);
            await loadTeacherAssignments();
        } else {
            showToast(`❌ ${data.message || "Failed to remove assignment."}`);
        }
    } catch (err) {
        showToast("⚠️ Could not remove class assignment.");
    }
}
