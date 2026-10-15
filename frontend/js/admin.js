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
