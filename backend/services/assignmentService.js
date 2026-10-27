const fs = require("fs");
const path = require("path");
const supabase = require("../config/supabaseClient");
const { isValidUUID } = require("../utils/validators");

const STORE_PATH = path.join(__dirname, "../data/teacher_assignments.json");

function loadStore() {
    try {
        if (fs.existsSync(STORE_PATH)) {
            const raw = fs.readFileSync(STORE_PATH, "utf-8");
            return JSON.parse(raw);
        }
    } catch (e) {
        console.warn("Could not read teacher assignments store:", e.message);
    }
    return { assignments: [] };
}

function saveStore(data) {
    try {
        const dir = path.dirname(STORE_PATH);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2), "utf-8");
    } catch (e) {
        console.warn("Could not persist teacher assignments store:", e.message);
    }
}

/**
 * Retrieves all class numbers assigned to a teacher.
 * If user is admin, returns all classes (5 to 12).
 * @param {string} teacherId - Profile UUID of the teacher
 * @returns {Promise<number[]>} Array of assigned class numbers (e.g. [10, 9])
 */
async function getTeacherAssignedClasses(teacherId) {
    if (!teacherId) return [];

    let assigned = [];

    // 1. Try querying Supabase teacher_class_assignments
    if (supabase && isValidUUID(teacherId)) {
        try {
            const { data, error } = await supabase
                .from("teacher_class_assignments")
                .select("class")
                .eq("teacher_id", teacherId);
            if (!error && Array.isArray(data) && data.length > 0) {
                assigned = data.map(row => Number(row.class)).filter(n => Number.isInteger(n));
            }
        } catch (err) {
            // Table may not exist yet if migration pending; gracefully fallback
        }
    }

    // 2. Combine or fallback to local store
    const store = loadStore();
    const localMatches = (store.assignments || [])
        .filter(a => String(a.teacherId) === String(teacherId))
        .map(a => Number(a.class))
        .filter(n => Number.isInteger(n));

    const combined = Array.from(new Set([...assigned, ...localMatches])).sort((a, b) => a - b);
    return combined;
}

/**
 * Retrieves detailed assignment records for a teacher.
 * @param {string} teacherId - Profile UUID of the teacher
 * @returns {Promise<object[]>} Array of assignment records
 */
async function getTeacherAssignments(teacherId) {
    if (!teacherId) return [];

    let assignments = [];

    if (supabase && isValidUUID(teacherId)) {
        try {
            const { data, error } = await supabase
                .from("teacher_class_assignments")
                .select("id, teacher_id, class, section, subject, created_at")
                .eq("teacher_id", teacherId);
            if (!error && Array.isArray(data) && data.length > 0) {
                assignments = data.map(row => ({
                    id: row.id,
                    teacherId: row.teacher_id,
                    class: Number(row.class),
                    section: row.section || "Section A",
                    subject: row.subject || "All Curriculum Subjects",
                    createdAt: row.created_at
                }));
            }
        } catch (err) {
            // Fallback
        }
    }

    const store = loadStore();
    const localList = (store.assignments || [])
        .filter(a => String(a.teacherId) === String(teacherId));

    // Merge uniqueness by class + section
    const map = new Map();
    for (const a of [...assignments, ...localList]) {
        const key = `${a.class}-${a.section || "Section A"}`;
        if (!map.has(key)) map.set(key, a);
    }

    return Array.from(map.values());
}

/**
 * Retrieves all teacher assignments across the platform (for administrators).
 * @returns {Promise<object[]>}
 */
async function getAllAssignments() {
    let assignments = [];

    if (supabase) {
        try {
            const { data, error } = await supabase
                .from("teacher_class_assignments")
                .select("id, teacher_id, class, section, subject, created_at, profiles:teacher_id(name, email)");
            if (!error && Array.isArray(data)) {
                assignments = data.map(row => ({
                    id: row.id,
                    teacherId: row.teacher_id,
                    teacherName: row.profiles?.name || "Teacher",
                    teacherEmail: row.profiles?.email || "",
                    class: Number(row.class),
                    section: row.section || "Section A",
                    subject: row.subject || "All Curriculum Subjects",
                    createdAt: row.created_at
                }));
            }
        } catch (err) {
            // Fallback
        }
    }

    const store = loadStore();
    const localList = store.assignments || [];

    const map = new Map();
    for (const a of [...assignments, ...localList]) {
        const key = `${a.teacherId}-${a.class}-${a.section || "Section A"}`;
        if (!map.has(key)) map.set(key, a);
    }

    return Array.from(map.values());
}

/**
 * Assigns a class to a teacher (performed by authorized admin).
 * @param {object} params
 * @param {string} params.teacherId
 * @param {number} params.classLevel
 * @param {string} [params.section="Section A"]
 * @param {string} [params.subject="All Curriculum Subjects"]
 * @param {string} [params.assignedBy]
 * @returns {Promise<object>} Created assignment
 */
async function assignClassToTeacher({ teacherId, classLevel, section = "Section A", subject = "All Curriculum Subjects", assignedBy = null }) {
    const classNum = Number(classLevel);
    if (!Number.isInteger(classNum) || classNum < 5 || classNum > 12) {
        throw new Error("Invalid class level. Must be an integer between 5 and 12.");
    }
    if (!teacherId) {
        throw new Error("Teacher ID is required.");
    }

    const assignmentId = `assign_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const newRecord = {
        id: assignmentId,
        teacherId,
        class: classNum,
        section: section || "Section A",
        subject: subject || "All Curriculum Subjects",
        assignedBy: assignedBy || null,
        createdAt: new Date().toISOString()
    };

    // Save to local store
    const store = loadStore();
    store.assignments = store.assignments || [];
    const exists = store.assignments.some(a =>
        String(a.teacherId) === String(teacherId) &&
        Number(a.class) === classNum &&
        (a.section || "Section A") === (section || "Section A")
    );
    if (!exists) {
        store.assignments.push(newRecord);
        saveStore(store);
    }

    // Persist to Supabase if connected
    if (supabase && isValidUUID(teacherId)) {
        try {
            const { data, error } = await supabase
                .from("teacher_class_assignments")
                .insert({
                    teacher_id: teacherId,
                    class: classNum,
                    section: section || "Section A",
                    subject: subject || "All Curriculum Subjects",
                    assigned_by: isValidUUID(assignedBy) ? assignedBy : null
                })
                .select()
                .single();
            if (!error && data) {
                newRecord.id = data.id;
            }
        } catch (err) {
            console.warn("Supabase teacher assignment insert warning:", err.message);
        }
    }

    return newRecord;
}

/**
 * Removes a teacher class assignment.
 * @param {string} assignmentId
 * @returns {Promise<boolean>}
 */
async function removeTeacherAssignment(assignmentId) {
    if (!assignmentId) return false;

    const store = loadStore();
    const initialLen = (store.assignments || []).length;
    store.assignments = (store.assignments || []).filter(a => String(a.id) !== String(assignmentId));
    if (store.assignments.length !== initialLen) {
        saveStore(store);
    }

    if (supabase && isValidUUID(assignmentId)) {
        try {
            await supabase
                .from("teacher_class_assignments")
                .delete()
                .eq("id", assignmentId);
        } catch (err) {
            console.warn("Supabase teacher assignment delete warning:", err.message);
        }
    }

    return true;
}

module.exports = {
    getTeacherAssignedClasses,
    getTeacherAssignments,
    getAllAssignments,
    assignClassToTeacher,
    removeTeacherAssignment
};
