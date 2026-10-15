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
    const targetClass = classNum || selectElem?.value || "10";
    if (selectElem && selectElem.value !== String(targetClass)) {
        selectElem.value = String(targetClass);
    }
    const subtitle = document.getElementById("teacherMapSubtitle");
    if (subtitle) {
        subtitle.innerText = `Real-time concept mastery trends and automated intervention plans for Class ${targetClass}.`;
    }
    try {
        const response = await fetch(`${API_BASE}/teachers/class-map?classLevel=${targetClass}`);
        const data = await response.json();

        if (data.success && data.learningMap) {
            renderTeacherClassMap(data.learningMap);
        }
    } catch (e) {
        console.warn("API class-map offline, using fallback:", e);
    }
}

export function renderTeacherClassMap(data) {
    const barsContainer = document.getElementById("teacherConceptBars");
    const supportContainer = document.getElementById("studentsSupportList");

    if (barsContainer && data.concepts) {
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

    if (supportContainer && data.studentsRequiringSupport) {
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

export async function generateIntervention() {
    const targetClass = document.getElementById("teacherClassSelect")?.value || "10";
    try {
        const response = await fetch(`${API_BASE}/teachers/intervention`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ concept: "Linear Equations", className: `Class ${targetClass}` })
        });
        const data = await response.json();
        if (data.success && data.aiInterventionPlan) {
            const plan = data.aiInterventionPlan;
            const titleElem = document.getElementById("interventTitle");
            const descElem = document.getElementById("interventDesc");
            if (titleElem) titleElem.innerText = plan.summary;
            if (descElem) descElem.innerText = `Recommended Action: ${plan.recommendedAction}\n\nRemedial Exercises: ${plan.remedialQuiz.join(" • ")}`;
            showToast("💡 AI Teacher Intervention Plan generated!");
        }
    } catch (e) {
        const titleElem = document.getElementById("interventTitle");
        const descElem = document.getElementById("interventDesc");
        if (titleElem) titleElem.innerText = `Targeted intervention recommended for Class ${targetClass}`;
        if (descElem) descElem.innerText = "Recommended Action: Spend 5 minutes on foundational rules, then assign targeted practice questions.";
        showToast("💡 AI Teacher Intervention Plan loaded!");
    }
}
