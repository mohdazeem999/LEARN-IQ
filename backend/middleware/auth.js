const supabase = require("../config/supabaseClient");
const { createClient } = require("@supabase/supabase-js");

const ACCESS_COOKIE = "learniq_access";
const REFRESH_COOKIE = "learniq_refresh";
const SESSION_MAX_AGE = 30 * 24 * 60 * 60 * 1000;

function getAuthClient() {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
    if (!url || !key) {
        throw new Error("Supabase URL and publishable/anon key are required for authentication.");
    }
    return createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false }
    });
}

function getCookie(req, name) {
    const cookieHeader = req.headers.cookie || "";
    const entry = cookieHeader.split(";").map(value => value.trim())
        .find(value => value.startsWith(`${name}=`));
    if (!entry) return null;
    try {
        return decodeURIComponent(entry.slice(name.length + 1));
    } catch {
        return null;
    }
}

function setSessionCookies(req, res, session) {
    const secure = req.secure || req.get("x-forwarded-proto") === "https" ||
        process.env.NODE_ENV === "production";
    const options = `Path=/; HttpOnly; SameSite=Lax${secure ? "; Secure" : ""}; Max-Age=${Math.floor(SESSION_MAX_AGE / 1000)}`;
    res.append("Set-Cookie", `${ACCESS_COOKIE}=${encodeURIComponent(session.access_token)}; ${options}`);
    res.append("Set-Cookie", `${REFRESH_COOKIE}=${encodeURIComponent(session.refresh_token)}; ${options}`);
}

function clearSessionCookies(res) {
    const secure = process.env.NODE_ENV === "production";
    const options = `Path=/; HttpOnly; SameSite=Lax${secure ? "; Secure" : ""}; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    res.append("Set-Cookie", `${ACCESS_COOKIE}=; ${options}`);
    res.append("Set-Cookie", `${REFRESH_COOKIE}=; ${options}`);
}

function isNearExpiry(token) {
    try {
        const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString());
        return !Number.isFinite(payload.exp) || payload.exp * 1000 < Date.now() + 60_000;
    } catch {
        return true;
    }
}

async function getProfile(userId) {
    if (!supabase) throw new Error("Supabase database is not configured.");
    const { data, error } = await supabase.from("profiles")
        .select("user_id, full_name, role, class_level, xp_points, streak_days, rank_position")
        .eq("user_id", userId)
        .maybeSingle();
    if (error) throw error;
    return data;
}

async function resolveSession(req, res) {
    let accessToken = getCookie(req, ACCESS_COOKIE);
    const refreshToken = getCookie(req, REFRESH_COOKIE);
    if (!accessToken && !refreshToken) return null;

    const authClient = getAuthClient();
    let user = null;

    if (accessToken && !isNearExpiry(accessToken)) {
        const result = await supabase.auth.getUser(accessToken);
        if (!result.error) user = result.data.user;
    }

    if (!user && refreshToken) {
        const { data, error } = await authClient.auth.refreshSession({ refresh_token: refreshToken });
        if (error || !data.session || !data.user) {
            clearSessionCookies(res);
            return null;
        }
        setSessionCookies(req, res, data.session);
        accessToken = data.session.access_token;
        user = data.user;
    }

    if (!user) {
        clearSessionCookies(res);
        return null;
    }

    const profile = await getProfile(user.id);
    const role = ["student", "teacher", "admin"].includes(profile?.role)
        ? profile.role
        : "student";
    const name = profile?.full_name || user.user_metadata?.full_name || "User";
    return {
        accessToken,
        refreshToken: getCookie(req, REFRESH_COOKIE),
        user: {
            id: user.id,
            email: user.email,
            name,
            role,
            roleName: role === "teacher" ? "Teacher / Educator" : role === "admin" ? "Admin" : "Student",
            class: profile?.class_level || "Class 10",
            xp: profile?.xp_points ?? 0,
            streak: profile?.streak_days ?? 0,
            rank: profile?.rank_position ?? "-"
        }
    };
}

async function authenticate(req, res, next) {
    try {
        const session = await resolveSession(req, res);
        if (!session) {
            return res.status(401).json({ success: false, message: "Authentication required." });
        }
        req.auth = session;
        return next();
    } catch (error) {
        console.error("Authentication validation failed:", error.message);
        return res.status(503).json({ success: false, message: "Authentication service is temporarily unavailable." });
    }
}

function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.auth || !roles.includes(req.auth.user.role)) {
            return res.status(403).json({ success: false, message: "You do not have permission to access this resource." });
        }
        return next();
    };
}

module.exports = {
    ACCESS_COOKIE,
    REFRESH_COOKIE,
    SESSION_MAX_AGE,
    authenticate,
    clearSessionCookies,
    getAuthClient,
    getCookie,
    getProfile,
    requireRole,
    resolveSession,
    setSessionCookies
};
