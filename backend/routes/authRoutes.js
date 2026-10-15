const express = require("express");
const supabase = require("../config/supabaseClient");
const {
    clearSessionCookies,
    ensureProfile,
    getAuthClient,
    getCookie,
    resolveSession,
    setSessionCookies
} = require("../middleware/auth");
const { presentUser } = require("../utils/userPresenter");

const router = express.Router();

function presentSession(session) {
    return session ? { user: session.user } : null;
}

function authErrorResponse(error) {
    const code = String(error.code || "").toLowerCase();
    const message = String(error.message || "").toLowerCase();
    if (code === "invalid_credentials" || code === "user_not_found" ||
        /invalid login credentials|invalid credentials|user not found/.test(message)) {
        return { status: 401, message: "Invalid email or password." };
    }
    if (code === "email_not_confirmed" || /email not confirmed/.test(message)) {
        return { status: 403, message: "Please confirm your email address before signing in." };
    }
    if (error.status === 429) {
        return { status: 429, message: "Too many sign-in attempts. Please wait a few minutes and try again." };
    }

    if (error.status >= 500 || error.status === 401 || !Number.isFinite(error.status)) {
        console.error("Supabase authentication request failed:", {
            status: error.status || null,
            code: error.code || error.name || "unknown"
        });
        return { status: 503, message: "Authentication is temporarily unavailable. Please try again shortly." };
    }

    return {
        status: 400,
        message: "Unable to sign in with those details. Check your credentials and account status."
    };
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
        const { email, password, fullName, role = "student", classLevel } = req.body;
        if (typeof email !== "string" || !email.trim() ||
            typeof password !== "string" || password.length < 6 ||
            typeof fullName !== "string" || !fullName.trim()) {
            return res.status(400).json({
                success: false,
                message: "A valid email, a password of at least 6 characters, and full name are required."
            });
        }

        const normalizedRole = role === "teacher" ? "teacher" : "student";
        if (normalizedRole === "student" && (!classLevel || !String(classLevel).trim())) {
            return res.status(400).json({
                success: false,
                message: "Please select your Class / Standard (Class 5 to 12). Class is mandatory for student registration."
            });
        }

        if (!supabase) {
            return res.status(503).json({ success: false, message: "Authentication service is not configured." });
        }

        const authClient = getAuthClient();
        let authResult = await authClient.auth.signUp({
            email: email.trim(),
            password,
            options: { data: { full_name: fullName.trim(), role: normalizedRole, class_level: normalizedRole === "student" ? classLevel : null } }
        });

        // If provider email rate limit is exceeded (e.g. Supabase free tier email limit) and admin API is available,
        // create the user directly with email pre-confirmed so registration doesn't fail.
        if (authResult.error && (authResult.error.status === 429 || /rate limit|email/i.test(authResult.error.message)) && supabase?.auth?.admin) {
            const adminCreate = await supabase.auth.admin.createUser({
                email: email.trim(),
                password,
                email_confirm: true,
                user_metadata: { full_name: fullName.trim(), class_level: normalizedRole === "student" ? classLevel : null, role: normalizedRole }
            });
            if (adminCreate.error) {
                authResult.error = adminCreate.error;
            } else {
                const signInRes = await authClient.auth.signInWithPassword({
                    email: email.trim(),
                    password
                });
                if (!signInRes.error && signInRes.data.session) {
                    authResult = signInRes;
                } else {
                    authResult = { data: { user: adminCreate.data.user, session: null }, error: null };
                }
            }
        }

        const { data, error } = authResult;
        if (error) {
            const duplicate = /already|registered|exists/i.test(error.message);
            if (duplicate) {
                return res.status(409).json({
                    success: false,
                    message: "An account with this email already exists."
                });
            }
            const mappedError = authErrorResponse(error);
            return res.status(mappedError.status).json({
                success: false,
                message: mappedError.message
            });
        }
        if (!data.user || (Array.isArray(data.user.identities) && data.user.identities.length === 0)) {
            return res.status(409).json({ success: false, message: "An account with this email already exists." });
        }

        let profile;
        try {
            profile = await ensureProfile(data.user, {
                fullName: fullName.trim(),
                role: normalizedRole,
                classLevel: normalizedRole === "student" ? classLevel : null
            });
        } catch (profileError) {
            console.error("Unable to create account profile:", profileError.message);
            return res.status(500).json({ success: false, message: "Account was created, but its profile could not be saved. Please contact support." });
        }

        let session = data.session;
        if (!session && supabase?.auth?.admin && data.user) {
            try {
                await supabase.auth.admin.updateUserById(data.user.id, { email_confirm: true });
                const autoLogin = await authClient.auth.signInWithPassword({
                    email: email.trim(),
                    password
                });
                if (!autoLogin.error && autoLogin.data.session) {
                    session = autoLogin.data.session;
                }
            } catch (confirmErr) {
                console.warn("Auto-confirm failed on signup:", confirmErr.message);
            }
        }

        if (!session) {
            return res.json({
                success: true,
                requiresEmailConfirmation: true,
                message: "Account created. Please sign in."
            });
        }

        setSessionCookies(req, res, session);
        const user = presentUser(data.user, profile);
        return res.status(201).json({
            success: true,
            message: `Successfully created ${normalizedRole === "teacher" ? "teacher" : "student"} account and logged in!`,
            session: { user }
        });
    } catch (error) {
        console.error("Signup failed:", { name: error.name, code: error.code || null });
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
        let { data, error } = await authClient.auth.signInWithPassword({
            email: email.trim(),
            password
        });
        if (error && (/email not confirmed/i.test(error.message) || error.code === "email_not_confirmed") && supabase?.auth?.admin) {
            try {
                const { data: usersData } = await supabase.auth.admin.listUsers();
                const targetUser = usersData?.users?.find(u => u.email?.toLowerCase() === email.trim().toLowerCase());
                if (targetUser) {
                    await supabase.auth.admin.updateUserById(targetUser.id, { email_confirm: true });
                    const retry = await authClient.auth.signInWithPassword({
                        email: email.trim(),
                        password
                    });
                    if (!retry.error) {
                        data = retry.data;
                        error = null;
                    }
                }
            } catch (autoConfirmErr) {
                console.warn("Auto-confirm on login failed:", autoConfirmErr.message);
            }
        }
        if (error) {
            const mappedError = authErrorResponse(error);
            return res.status(mappedError.status).json({ success: false, message: mappedError.message });
        }
        if (!data.session || !data.user) {
            return res.status(503).json({ success: false, message: "Authentication did not return a valid session. Please try again." });
        }

        const profile = await ensureProfile(data.user);
        setSessionCookies(req, res, data.session);
        const user = presentUser(data.user, profile);
        return res.json({ success: true, message: `Welcome back, ${user.name}!`, session: { user } });
    } catch (error) {
        console.error("Login failed:", { name: error.name, code: error.code || null });
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
