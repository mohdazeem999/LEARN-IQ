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
    if (code === "email_not_confirmed" || /email not confirmed/i.test(message)) {
        return {
            status: 403,
            message: "Your email address has not been confirmed yet. Please check your inbox and verify your email before signing in."
        };
    }
    if (error.status === 429 || code === "over_email_send_rate_limit" || code === "over_request_rate_limit" ||
        /rate limit|too many requests|over_email_send_rate_limit|security purposes/i.test(message)) {
        return {
            status: 429,
            message: "Too many sign-in attempts or email rate limit exceeded. Please wait a few minutes and try again."
        };
    }
    if (/already|registered|exists/i.test(message)) {
        return {
            status: 409,
            message: "An account with this email already exists. Please sign in instead."
        };
    }
    if (/password/i.test(message) && /short|weak|character/i.test(message)) {
        return {
            status: 400,
            message: "Password must be at least 6 characters long."
        };
    }

    if (error.status >= 500 || !Number.isFinite(error.status)) {
        console.error("Supabase authentication request failed:", {
            status: error.status || null,
            code: error.code || error.name || "unknown",
            message: error.message
        });
        return { status: 503, message: "Authentication service is temporarily unavailable. Please try again shortly." };
    }

    return {
        status: error.status || 400,
        message: error.message || "Unable to sign in with those details. Check your credentials and account status."
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
        const { email, password, fullName, role, classLevel } = req.body;
        if (typeof email !== "string" || !email.trim() ||
            typeof password !== "string" || password.length < 6 ||
            typeof fullName !== "string" || !fullName.trim()) {
            return res.status(400).json({
                success: false,
                message: "A valid email, a password of at least 6 characters, and full name are required."
            });
        }

        // Security: Public registration is student-only.
        // Teacher and Administrator accounts must be assigned by an authorized administrator.
        if (role && role !== "student") {
            return res.status(403).json({
                success: false,
                message: "Public registration is student-only. Teacher and Administrator accounts must be assigned by an authorized administrator."
            });
        }

        if (!classLevel || !String(classLevel).trim()) {
            return res.status(400).json({
                success: false,
                message: "Please select your Class / Standard (Class 5 to 12). Class is mandatory for student registration."
            });
        }

        if (!supabase) {
            return res.status(503).json({ success: false, message: "Authentication service is not configured." });
        }

        const authClient = getAuthClient();
        const authResult = await authClient.auth.signUp({
            email: email.trim(),
            password,
            options: { data: { full_name: fullName.trim(), role: "student", class_level: classLevel } }
        });

        const { data, error } = authResult;
        if (error) {
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
                classLevel
            });
        } catch (profileError) {
            console.error("Unable to create account profile:", profileError.message);
            return res.status(500).json({ success: false, message: "Account was created, but its profile could not be saved. Please contact support." });
        }

        const session = data.session;
        // In standard email confirmation flows, session is null until verified.
        // Provide clear instructions without auto-confirming.
        if (!session) {
            return res.status(201).json({
                success: true,
                requiresEmailConfirmation: true,
                message: "Account created successfully! Please check your email to confirm your account before signing in."
            });
        }

        setSessionCookies(req, res, session);
        const user = presentUser(data.user, profile);
        return res.status(201).json({
            success: true,
            message: "Successfully created student account and logged in!",
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
        const { data, error } = await authClient.auth.signInWithPassword({
            email: email.trim(),
            password
        });

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
