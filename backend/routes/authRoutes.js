const express = require("express");
const router = express.Router();
const supabase = require("../config/supabaseClient");

let currentSession = {
    role: "student", // "student" or "teacher"
    user: {
        id: "std-101",
        email: "student@learniq.edu",
        name: "Guest Student",
        roleName: "Student",
        class: "Class 10"
    }
};

// GET /api/auth/session
router.get("/session", (req, res) => {
    res.json({
        success: true,
        session: currentSession
    });
});

// POST /api/auth/signup
router.post("/signup", async (req, res) => {
    try {
        const { email, password, fullName, role = "student", classLevel = "Class 10" } = req.body;

        if (!email || !password || !fullName) {
            return res.status(400).json({ success: false, message: "Email, password, and full name are required." });
        }

        let authData = null;
        let userId = `user-${Date.now()}`;

        if (supabase) {
            try {
                const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: { full_name: fullName, role, class_level: classLevel }
                    }
                });

                if (error && !error.message.includes("rate limit")) {
                    console.warn("Supabase signUp warning:", error.message);
                } else if (data && data.user) {
                    authData = data;
                    userId = data.user.id;
                }

                // Insert into public.profiles with 0 starting XP
                await supabase.from('profiles').upsert([{
                    user_id: userId,
                    full_name: fullName,
                    role: role,
                    class_level: classLevel,
                    xp_points: 0,
                    streak_days: 0,
                    rank_position: 1
                }], { onConflict: 'user_id' }).select();

            } catch (sErr) {
                console.warn("Supabase profile save error:", sErr.message);
            }
        }

        currentSession = {
            role: role,
            token: authData?.session?.access_token || `token-${Date.now()}`,
            user: {
                id: userId,
                email: email,
                name: fullName,
                roleName: role === "teacher" ? "Teacher / Educator" : "Student",
                class: classLevel,
                xp: 0,
                streak: 0
            }
        };

        res.json({
            success: true,
            message: "Successfully created account and logged in!",
            session: currentSession
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: "Signup failed: " + err.message
        });
    }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, message: "Email and password are required." });
        }

        let userProfile = null;
        let token = `token-${Date.now()}`;
        let userId = `user-${Date.now()}`;

        if (supabase) {
            try {
                const { data, error } = await supabase.auth.signInWithPassword({
                    email,
                    password
                });

                if (error) {
                    console.warn("Supabase signIn warning:", error.message);
                } else if (data && data.user) {
                    token = data.session?.access_token || token;
                    userId = data.user.id;
                }

                // Query profile
                const { data: pData } = await supabase.from('profiles').select('*').eq('user_id', userId).maybeSingle();
                if (pData) userProfile = pData;
            } catch (sErr) {
                console.warn("Supabase login warning:", sErr.message);
            }
        }

        const nameFromEmail = email.split("@")[0];
        const formattedName = nameFromEmail.charAt(0).toUpperCase() + nameFromEmail.slice(1);

        currentSession = {
            role: userProfile?.role || (email.includes("teacher") ? "teacher" : "student"),
            token: token,
            user: {
                id: userId,
                email: email,
                name: userProfile?.full_name || formattedName,
                roleName: (userProfile?.role === "teacher" || email.includes("teacher")) ? "Teacher / Educator" : "Student",
                class: userProfile?.class_level || "Class 10",
                xp: userProfile?.xp_points ?? 0,
                streak: userProfile?.streak_days ?? 0
            }
        };

        res.json({
            success: true,
            message: `Welcome back, ${currentSession.user.name}!`,
            session: currentSession
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: "Login failed: " + err.message
        });
    }
});

// GET /api/auth/me
router.get("/me", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ") && supabase) {
        const token = authHeader.split(" ")[1];
        try {
            const { data, error } = await supabase.auth.getUser(token);
            if (data && data.user && !error) {
                const { data: pData } = await supabase.from('profiles').select('*').eq('user_id', data.user.id).maybeSingle();
                return res.json({
                    success: true,
                    user: {
                        id: data.user.id,
                        email: data.user.email,
                        name: pData?.full_name || data.user.user_metadata?.full_name || "User",
                        role: pData?.role || data.user.user_metadata?.role || "student",
                        class: pData?.class_level || "Class 10"
                    }
                });
            }
        } catch (e) {
            console.warn("Verify token warning:", e.message);
        }
    }

    res.json({
        success: true,
        user: currentSession.user
    });
});

// POST /api/auth/switch-role
router.post("/switch-role", (req, res) => {
    const { role } = req.body;
    if (role === "teacher") {
        currentSession = {
            role: "teacher",
            user: {
                id: "tch-202",
                email: "teacher@learniq.edu",
                name: "Prof. Sharma",
                roleName: "Teacher / Educator",
                subject: "Mathematics & Science"
            }
        };
    } else {
        currentSession = {
            role: "student",
            user: {
                id: "std-101",
                email: "student@learniq.edu",
                name: "Guest Student",
                roleName: "Student",
                class: "Class 10"
            }
        };
    }

    res.json({
        success: true,
        message: `Switched session to ${currentSession.role.toUpperCase()} mode.`,
        session: currentSession
    });
});

// POST /api/auth/logout
router.post("/logout", async (req, res) => {
    if (supabase) {
        try {
            await supabase.auth.signOut();
        } catch (e) {
            // ignore
        }
    }
    currentSession = {
        role: "student",
        user: {
            id: "guest",
            email: "guest@learniq.edu",
            name: "Guest Student",
            roleName: "Student",
            class: "Class 10"
        }
    };
    res.json({
        success: true,
        message: "Successfully logged out of Supabase session."
    });
});

module.exports = router;

