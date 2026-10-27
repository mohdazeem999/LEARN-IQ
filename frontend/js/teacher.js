/**
 * LearnIQ - Teacher Dashboard Controller
 */

import { API_BASE, state } from "./state.js";
import { showToast, escapeHtml } from "./ui.js";

export async function onTeacherClassChanged(classNum) {
    await loadTeacherClassMap(classNum);
}

export async function loadTeacherClassMap(classNum) {
    if (!["teacher", "admin"].includes(state.currentUser?.role)) return;

    const selectElem = document.getElementById("teacherClassSelect");
    const subtitle = document.getElementById("teacherMapSubtitle");

    try {
        // 1. Fetch assigned classes for this educator from server
        const classesRes = await fetch(`${API_BASE}/teachers/classes`, { credentials: "same-origin" });
        const classesData = await classesRes.json();

        if (classesData.success && Array.isArray(classesData.classes)) {
            if (selectElem) {
                if (classesData.classes.length === 0) {
                    selectElem.innerHTML = `<option value="">No Classes Assigned</option>`;
                    if (subtitle) {
                        subtitle.innerText = "No classes have been assigned to your educator account yet. Please contact an administrator.";
                    }
                    renderTeacherClassMap({ concepts: [], studentsRequiringSupport: [] });
                    return;
                }

                // Populate select with only assigned classes
                const currentVal = classNum || selectElem.value;
                const isCurrentAllowed = classesData.classes.some(c => String(c.id) === String(currentVal));
                const targetVal = isCurrentAllowed ? currentVal : String(classesData.classes[0].id);

                selectElem.innerHTML = classesData.classes.map(c =>
                    `<option value="${c.id}" ${String(c.id) === String(targetVal) ? "selected" : ""}>Class ${c.id}</option>`
                ).join("");

                selectElem.value = String(targetVal);
                classNum = targetVal;
            }
        }
    } catch (err) {
        console.warn("Unable to refresh assigned classes:", err.message);
    }

    const targetClass = classNum || selectElem?.value || "10";
    if (subtitle) {
        subtitle.innerText = `Real-time concept mastery trends and automated intervention plans for Class ${targetClass}.`;
    }

    try {
        const response = await fetch(`${API_BASE}/teachers/class-map?classLevel=${targetClass}`, { credentials: "same-origin" });
        const data = await response.json();

        if (response.status === 403) {
            showToast(`⚠️ ${data.message || "You are not assigned to this class."}`);
            if (subtitle) {
                subtitle.innerText = `Access restricted: Class ${targetClass} is not assigned to your account.`;
            }
            renderTeacherClassMap({ concepts: [], studentsRequiringSupport: [] });
            return;
        }

        if (data.success && data.learningMap) {
            renderTeacherClassMap(data.learningMap);
        }
    } catch (e) {
        console.warn("Teacher class map request error:", e);
    }
}

export function renderTeacherClassMap(data) {
    const barsContainer = document.getElementById("teacherConceptBars");
    const supportContainer = document.getElementById("studentsSupportList");

    if (barsContainer) {
        if (!data.concepts || data.concepts.length === 0) {
            barsContainer.innerHTML = `<div style="text-align: center; color: var(--muted); padding: 24px;">No curriculum concepts recorded for this class.</div>`;
        } else {
            barsContainer.innerHTML = data.concepts.map(c => `
                <div class="dna-item">
                    <div>
                        <span>${escapeHtml(c.name)}</span>
                        <strong style="color: ${c.mastery < 60 ? 'var(--red)' : 'var(--cyan)'};">${c.mastery}%</strong>
                    </div>
                    <div class="progress">
                        <div style="width:${c.mastery}%; background: ${c.mastery < 60 ? 'var(--red)' : 'var(--cyan)'};"></div>
                    </div>
                </div>
            `).join("");
        }
    }

    if (supportContainer) {
        if (!data.studentsRequiringSupport || data.studentsRequiringSupport.length === 0) {
            supportContainer.innerHTML = `
                <div style="background: rgba(7, 11, 20, 0.4); padding: 20px; border-radius: 12px; border: 1px dashed var(--border); text-align: center; color: var(--muted); font-size: 13px;">
                    <i class="fa-solid fa-circle-check" style="color: var(--cyan); margin-bottom: 6px; display: block; font-size: 18px;"></i>
                    All assigned students in this class are performing at or above baseline mastery.
                </div>
            `;
        } else {
            supportContainer.innerHTML = data.studentsRequiringSupport.map(s => `
                <div style="background: rgba(7, 11, 20, 0.6); padding: 12px 16px; border-radius: 12px; border: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <strong style="color: var(--text);">${escapeHtml(s.name)}</strong>
                        <div style="font-size: 12px; color: var(--muted);">${escapeHtml(s.weakConcept)}</div>
                    </div>
                    <span class="badge-pill critical">${escapeHtml(String(s.score))}</span>
                </div>
            `).join("");
        }
    }
}

export async function generateIntervention() {
    const targetClass = document.getElementById("teacherClassSelect")?.value || "10";
    try {
        const response = await fetch(`${API_BASE}/teachers/intervention`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "same-origin",
            body: JSON.stringify({ concept: "Linear Equations", className: `Class ${targetClass}`, classLevel: targetClass })
        });
        const data = await response.json();
        if (response.status === 403) {
            showToast(`⚠️ ${data.message || "You are not assigned to this class."}`);
            return;
        }
        if (data.success && data.aiInterventionPlan) {
            const plan = data.aiInterventionPlan;
            const titleElem = document.getElementById("interventTitle");
            const descElem = document.getElementById("interventDesc");
            if (titleElem) titleElem.innerText = plan.summary;
            if (descElem) descElem.innerText = `Recommended Action: ${plan.recommendedAction}\n\nRemedial Exercises: ${plan.remedialQuiz.join(" • ")}`;
            showToast("💡 AI Teacher Intervention Plan generated!");
        }
    } catch (e) {
        showToast("⚠️ Could not generate intervention plan.");
    }
}
