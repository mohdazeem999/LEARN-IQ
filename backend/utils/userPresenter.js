/**
 * Formats a user and profile object into a consistent, secure client-facing user representation.
 * @param {object} authUser - The Supabase auth user
 * @param {object} profile - The database profile
 * @returns {object} Formatted user object
 */
function presentUser(authUser, profile = {}) {
    if (!authUser) return null;

    // Role is strictly read from verified database profile.
    // Editable browser/client user_metadata is never trusted for role authorization.
    const role = ["student", "teacher", "admin"].includes(profile?.role)
        ? profile.role
        : "student";

    const fallbackName = role === "teacher" ? "Educator" : role === "admin" ? "Administrator" : "Student";
    const name = profile?.name || authUser.user_metadata?.full_name || authUser.email?.split("@")[0] || fallbackName;
    const isStudent = role === "student";
    const classStr = isStudent && profile?.class ? `Class ${profile.class}` : null;
    const classNumber = isStudent ? (profile?.class || null) : null;

    return {
        id: authUser.id,
        email: authUser.email || null,
        name,
        role,
        roleName: role === "teacher" ? "Teacher / Educator" : role === "admin" ? "Admin" : "Student",
        class: classStr,
        classNumber,
        xp: isStudent ? (profile?.xp ?? 0) : 0,
        streak: isStudent ? (profile?.streak ?? 0) : 0,
        rank: isStudent ? (profile?.rank ?? "-") : "-",
        coins: isStudent ? (profile?.coins ?? 50) : 0
    };
}

module.exports = {
    presentUser
};
