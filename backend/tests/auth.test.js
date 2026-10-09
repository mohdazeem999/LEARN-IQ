const test = require("node:test");
const assert = require("node:assert/strict");
const {
    SESSION_MAX_AGE,
    clearSessionCookies,
    getCookie,
    requireRole,
    resolveSession,
    setSessionCookies
} = require("../middleware/auth");

test("auth cookies are HttpOnly and persistent, and Secure in production", () => {
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    const cookies = [];
    const req = { secure: false, get: () => "https" };
    const res = { append: (name, value) => cookies.push({ name, value }) };

    setSessionCookies(req, res, { access_token: "access", refresh_token: "refresh" });
    assert.equal(cookies.length, 2);
    for (const cookie of cookies) {
        assert.equal(cookie.name, "Set-Cookie");
        assert.match(cookie.value, /HttpOnly/);
        assert.match(cookie.value, /Secure/);
        assert.match(cookie.value, /SameSite=Lax/);
        assert.match(cookie.value, /Max-Age=2592000/);
    }
    assert.equal(SESSION_MAX_AGE, 30 * 24 * 60 * 60 * 1000);
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
});

test("logout clears both session cookies", () => {
    const cookies = [];
    clearSessionCookies({ append: (name, value) => cookies.push({ name, value }) });
    assert.equal(cookies.length, 2);
    assert.ok(cookies.every(cookie => /Max-Age=0/.test(cookie.value) && /HttpOnly/.test(cookie.value)));
});

test("cookie parser decodes a named cookie", () => {
    assert.equal(getCookie({ headers: { cookie: "other=1; learniq_access=access%2Etoken" } }, "learniq_access"), "access.token");
    assert.equal(getCookie({ headers: {} }, "learniq_access"), null);
});

test("role middleware allows assigned roles and rejects role switching", () => {
    const allowed = requireRole("teacher", "admin");
    let passed = false;
    allowed({ auth: { user: { role: "teacher" } } }, {}, () => { passed = true; });
    assert.equal(passed, true);

    let statusCode;
    let body;
    const denied = requireRole("teacher", "admin");
    denied(
        { auth: { user: { role: "student" } } },
        {
            status(code) { statusCode = code; return this; },
            json(value) { body = value; }
        },
        () => assert.fail("Student must not be granted teacher access.")
    );
    assert.equal(statusCode, 403);
    assert.equal(body.success, false);
});

test("missing cookies do not restore an unauthenticated session", async () => {
    const session = await resolveSession({ headers: {} }, {});
    assert.equal(session, null);
});
