const express = require("express");
const supabase = require("../config/supabaseClient");
const {
    clearSessionCookies,
    getAuthClient,
    getCookie,
    getProfile,
    resolveSession,
    setSessionCookies
} = require("../middleware/auth");

const router = express.Router();

function presentSession(session) {
    return session ? { user: session.user } : null;
}

async function readSession(req, res) {
    try {
        const session = await resolveSession(req, res);
        return res.json({ success: true, session: presentSession(session), user: session?.user || null });
    } catch (error) {
        console.error("Unable to restore authentication session:", error.message);
        return res.status(503).json({ success: false, message: "Authentication service is temporarily unavailable." });
    }
}

router.get("/session", readSession);
router.get("/me", readSession);

router.post("/signup", async (req, res) => {
    try {
        const { email, password, fullName, classLevel = "Class 10" } = req.body;
        if (typeof email !== "string" || !email.trim() ||
            typeof password !== "string" || password.length < 6 ||
            typeof fullName !== "string" || !fullName.trim()) {
            return res.status(400).json({
                success: false,
                message: "A valid email, a password of at least 6 characters, and full name are required."
            });
        }
        if (!supabase) {
            return res.status(503).json({ success: false, message: "Authentication service is not configured." });
        }

        const authClient = getAuthClient();
        const { data, error } = await authClient.auth.signUp({
            email: email.trim(),
            password,
            options: { data: { full_name: fullName.trim(), class_level: classLevel } }
        });
        if (error) {
            const duplicate = /already|registered|exists/i.test(error.message);
            return res.status(duplicate ? 409 : 400).json({
                success: false,
                message: duplicate ? "An account with this email already exists." : error.message
            });
        }
        if (!data.user || (Array.isArray(data.user.identities) && data.user.identities.length === 0)) {
            return res.status(409).json({ success: false, message: "An account with this email already exists." });
        }

        const { error: profileError } = await supabase.from("profiles").upsert({
            user_id: data.user.id,
            full_name: fullName.trim(),
            role: "student",
            class_level: typeof classLevel === "string" && classLevel.trim() ? classLevel.trim() : "Class 10",
            xp_points: 0,
            streak_days: 0,
            rank_position: 1
        }, { onConflict: "user_id" });
        if (profileError) {
            console.error("Unable to create account profile:", profileError.message);
            return res.status(500).json({ success: false, message: "Account was created, but its profile could not be saved. Please contact support." });
        }

        if (!data.session) {
            return res.json({
                success: true,
                requiresEmailConfirmation: true,
                message: "Account created. Confirm your email, then sign in."
            });
        }

        setSessionCookies(req, res, data.session);
        const profile = await getProfile(data.user.id);
        const user = {
            id: data.user.id,
            email: data.user.email,
            name: profile?.full_name || fullName.trim(),
            role: "student",
            roleName: "Student",
            class: profile?.class_level || "Class 10",
            xp: profile?.xp_points ?? 0,
            streak: profile?.streak_days ?? 0,
            rank: profile?.rank_position ?? "-"
        };
        return res.status(201).json({
            success: true,
            message: "Successfully created account and logged in!",
            session: { user }
        });
    } catch (error) {
        console.error("Signup failed:", error.message);
        return res.status(503).json({ success: false, message: "Unable to create account right now." });
    }
});

router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        if (typeof email !== "string" || !email.trim() ||
            typeof password !== "string" || !password) {
            return res.status(400).json({ success: false, message: "Email and password are required." });
        }
        const authClient = getAuthClient();
        const { data, error } = await authClient.auth.signInWithPassword({
            email: email.trim(),
            password
        });
        if (error || !data.session || !data.user) {
            return res.status(401).json({ success: false, message: "Invalid email or password." });
        }

        const profile = await getProfile(data.user.id);
        setSessionCookies(req, res, data.session);
        const role = ["student", "teacher", "admin"].includes(profile?.role) ? profile.role : "student";
        const name = profile?.full_name || data.user.user_metadata?.full_name || email.split("@")[0];
        const user = {
            id: data.user.id,
            email: data.user.email,
            name,
            role,
            roleName: role === "teacher" ? "Teacher / Educator" : role === "admin" ? "Admin" : "Student",
            class: profile?.class_level || "Class 10",
            xp: profile?.xp_points ?? 0,
            streak: profile?.streak_days ?? 0,
            rank: profile?.rank_position ?? "-"
        };
        return res.json({ success: true, message: `Welcome back, ${name}!`, session: { user } });
    } catch (error) {
        console.error("Login failed:", error.message);
        return res.status(503).json({ success: false, message: "Unable to sign in right now." });
    }
});

router.post("/logout", async (req, res) => {
    const accessToken = getCookie(req, "learniq_access");
    const refreshToken = getCookie(req, "learniq_refresh");
    clearSessionCookies(res);

    if (accessToken && refreshToken) {
        try {
            const authClient = getAuthClient();
            const { error: sessionError } = await authClient.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken
            });
            if (!sessionError) {
                const { error } = await authClient.auth.signOut({ scope: "local" });
                if (error) {
                    console.error("Unable to revoke this device session:", error.message);
                    return res.status(502).json({ success: false, message: "Session cleared on this device, but remote session revocation failed." });
                }
            }
        } catch (error) {
            console.error("Unable to revoke this device session:", error.message);
            return res.status(502).json({ success: false, message: "Session cleared on this device, but remote session revocation failed." });
        }
    }
    return res.json({ success: true, message: "Successfully signed out of this device." });
});

module.exports = router;
