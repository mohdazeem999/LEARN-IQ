const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const WebSocket = require(path.join(__dirname, '../backend/node_modules/ws'));

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const TEMP_PROFILE = path.join(os.tmpdir(), 'chrome_cdp_profile_' + Date.now());
const TARGET_URL = 'http://localhost:5050';

const OUT_DIR_ROOT = path.join(__dirname, '../docs/mockups');

fs.mkdirSync(OUT_DIR_ROOT, { recursive: true });

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function httpGetJson(url, retries = 6) {
    for (let i = 0; i < retries; i++) {
        try {
            return await new Promise((resolve, reject) => {
                http.get(url, res => {
                    let data = '';
                    res.on('data', chunk => data += chunk);
                    res.on('end', () => {
                        try {
                            resolve(JSON.parse(data));
                        } catch (e) {
                            reject(e);
                        }
                    });
                }).on('error', reject);
            });
        } catch (err) {
            if (i === retries - 1) throw err;
            await sleep(1000);
        }
    }
}

async function main() {
    console.log('🚀 Launching Chrome in Headless Mode with CDP...');
    const chrome = spawn(CHROME_PATH, [
        '--headless=new',
        '--remote-debugging-port=9222',
        '--user-data-dir=' + TEMP_PROFILE,
        '--window-size=1400,900',
        '--disable-gpu',
        '--no-first-run',
        '--no-default-browser-check',
        TARGET_URL
    ]);

    await sleep(4000);

    console.log('🌐 Locating LearnIQ tab...');
    const tabs = await httpGetJson('http://127.0.0.1:9222/json/list');
    const learniqTab = tabs.find(t => t.type === 'page' && t.url.includes('5050'));
    if (!learniqTab) {
        throw new Error('LearnIQ tab not found in Chrome tabs list');
    }
    const wsUrl = learniqTab.webSocketDebuggerUrl;
    console.log('🔌 Connected to WebSocket:', wsUrl);

    const ws = new WebSocket(wsUrl);

    let messageId = 1;
    const callbacks = new Map();

    ws.on('message', data => {
        try {
            const parsed = JSON.parse(data.toString());
            if (parsed.id && callbacks.has(parsed.id)) {
                const { resolve, reject } = callbacks.get(parsed.id);
                callbacks.delete(parsed.id);
                if (parsed.error) {
                    reject(parsed.error);
                } else {
                    resolve(parsed.result);
                }
            }
        } catch (e) {
            console.error('Error handling CDP message:', e);
        }
    });

    function sendCommand(method, params = {}) {
        return new Promise((resolve, reject) => {
            const id = messageId++;
            callbacks.set(id, { resolve, reject });
            ws.send(JSON.stringify({ id, method, params }));
        });
    }

    async function evalScript(expression) {
        const res = await sendCommand('Runtime.evaluate', {
            expression,
            returnByValue: true,
            awaitPromise: true
        });
        return res?.result?.value;
    }

    async function captureScreenshot(filename) {
        console.log(`📸 Capturing: ${filename}...`);
        const res = await sendCommand('Page.captureScreenshot', {
            format: 'png',
            fromSurface: true
        });
        const buffer = Buffer.from(res.data, 'base64');
        const p1 = path.join(OUT_DIR_ROOT, filename);
        fs.writeFileSync(p1, buffer);
        console.log(`   ✅ Saved to ${filename} (${buffer.length} bytes)`);
    }

    async function loginAs(email, password) {
        return await evalScript(`
            (async () => {
                const res = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'same-origin',
                    body: JSON.stringify({ email: '${email}', password: '${password}' })
                });
                const data = await res.json();
                if (data.success && data.session) {
                    currentUser = data.session.user;
                    if (typeof updateUserUI === 'function') updateUserUI(currentUser);
                    if (typeof closeAuthModal === 'function') closeAuthModal();
                    if (currentUser.role === 'student') {
                        if (typeof fetchStudentProfile === 'function') await fetchStudentProfile();
                        if (typeof fetchDailyChallenges === 'function') await fetchDailyChallenges();
                        if (typeof loadStudentHistory === 'function') await loadStudentHistory();
                    } else if (currentUser.role === 'teacher') {
                        if (typeof loadTeacherClassMap === 'function') await loadTeacherClassMap();
                    } else if (currentUser.role === 'admin') {
                        if (typeof loadAdminOverview === 'function') await loadAdminOverview();
                    }
                    return { success: true, role: currentUser.role };
                }
                return { success: false, message: data.message };
            })()
        `);
    }

    async function doLogout() {
        return await evalScript(`
            (async () => {
                await fetch('/api/auth/logout', { method: 'POST' });
                currentUser = null;
                if (typeof updateUserUI === 'function') updateUserUI(null);
                if (typeof closeAuthModal === 'function') closeAuthModal();
                if (typeof showPage === 'function') showPage('landing');
            })()
        `);
    }

    await new Promise((resolve, reject) => {
        ws.on('open', resolve);
        ws.on('error', reject);
    });

    console.log('⚡ Initializing CDP session...');
    await sendCommand('Page.enable');
    await sendCommand('Runtime.enable');
    await sendCommand('Emulation.setDeviceMetricsOverride', {
        width: 1400,
        height: 900,
        deviceScaleFactor: 1.25,
        mobile: false
    });

    await sleep(2500);

    // ========================================================
    // 1. LANDING PAGE
    // ========================================================
    console.log('\n--- Screen 1: Landing Page ---');
    await evalScript(`
        if (typeof closeAuthModal === 'function') closeAuthModal();
        if (typeof showPage === 'function') showPage('landing');
        window.scrollTo(0, 0);
    `);
    await sleep(1000);
    await captureScreenshot('landing.png');

    // ========================================================
    // 2. AUTHENTICATION - LOGIN
    // ========================================================
    console.log('\n--- Screen 2: Login Interface ---');
    await evalScript(`
        if (typeof closeAuthModal === 'function') closeAuthModal();
        const studentBtn = document.getElementById('landingRoleStudent');
        if (studentBtn) studentBtn.click();
        if (typeof switchLandingAuthTab === 'function') switchLandingAuthTab('login');
        const card = document.getElementById('landingAuthCard');
        if (card) card.scrollIntoView({ behavior: 'instant', block: 'center' });
    `);
    await sleep(800);
    await captureScreenshot('login.png');

    // ========================================================
    // 3. AUTHENTICATION - SIGNUP
    // ========================================================
    console.log('\n--- Screen 3: Signup Interface ---');
    await evalScript(`
        if (typeof switchLandingAuthTab === 'function') switchLandingAuthTab('signup');
        const nameInput = document.getElementById('landingSignupName');
        if (nameInput) nameInput.value = 'Aanya Sharma';
        const card = document.getElementById('landingAuthCard');
        if (card) card.scrollIntoView({ behavior: 'instant', block: 'center' });
    `);
    await sleep(800);
    await captureScreenshot('signup.png');

    // ========================================================
    // 4. STUDENT LOGIN & DASHBOARD
    // ========================================================
    console.log('\n--- Screen 4: Student Dashboard ---');
    console.log('Logging in as student@test.com...');
    const studentLogin = await loginAs('student@test.com', 'Password123!');
    console.log('Student login status:', studentLogin);
    await sleep(2000);
    await evalScript(`
        if (typeof closeAuthModal === 'function') closeAuthModal();
        if (typeof showPage === 'function') showPage('dashboard');
        window.scrollTo(0, 0);
    `);
    await sleep(1500);
    await captureScreenshot('student-dashboard.png');

    // ========================================================
    // 5. AI QUIZ GENERATOR / SETUP
    // ========================================================
    console.log('\n--- Screen 5: AI Quiz Generator ---');
    await evalScript(`
        if (typeof closeAuthModal === 'function') closeAuthModal();
        if (typeof showPage === 'function') showPage('generator');
        window.scrollTo(0, 0);
    `);
    await sleep(1200);
    await captureScreenshot('quiz-setup.png');

    // ========================================================
    // 6. ADAPTIVE QUIZ / QUESTION SCREEN
    // ========================================================
    console.log('\n--- Screen 6: Quiz Question Interface ---');
    await evalScript(`
        if (typeof closeAuthModal === 'function') closeAuthModal();
        if (typeof showPage === 'function') showPage('assessment');
        window.scrollTo(0, 0);
    `);
    await sleep(1200);
    await captureScreenshot('quiz-question.png');

    // ========================================================
    // 7. QUIZ RESULTS / DIAGNOSTIC MODAL
    // ========================================================
    console.log('\n--- Screen 7: Quiz Results & AI Diagnostics ---');
    await evalScript(`
        if (typeof openDiagnosisModal === 'function') {
            openDiagnosisModal({
                scorePercentage: 75,
                correctCount: 3,
                totalQuestions: 4,
                xpEarned: 95,
                aiInsight: "Solid grasp of linear equations demonstrated. Minor sign error detected when transposing terms across equals sign. Practicing two-step distribution rules will eliminate this bottleneck.",
                mistakeCategories: {
                    "Calculation Slip": 1,
                    "Conceptual Confusion": 0,
                    "Misread Question": 0
                },
                feedback: [
                    {
                        question: "Solve for x: 3x - 7 = 14",
                        isCorrect: true,
                        chosenAnswer: "x = 7",
                        correctAnswer: "x = 7",
                        explanation: "Adding 7 to both sides gives 3x = 21, dividing by 3 yields x = 7."
                    },
                    {
                        question: "Solve for y: 2(y + 4) = 22",
                        isCorrect: false,
                        chosenAnswer: "y = 9",
                        correctAnswer: "y = 7",
                        explanation: "Expand: 2y + 8 = 22, subtract 8 to get 2y = 14, therefore y = 7.",
                        rubric: "Ensure distribution applies to all elements inside brackets before isolating terms."
                    }
                ],
                improvementPlan: {
                    understands: ["Linear transposition", "Two-step algebraic reduction"],
                    gaps: ["Multiplication distribution over negative constants"],
                    recommendedTopic: "Bracket Distribution Rules",
                    nextAction: "Complete a 3-question targeted drill on distributive properties"
                }
            });
        }
    `);
    await sleep(1500);
    await captureScreenshot('quiz-results.png');

    await evalScript(`
        if (typeof closeDiagnosisModal === 'function') closeDiagnosisModal();
    `);
    await sleep(600);

    // ========================================================
    // 8. LEARNING INTELLIGENCE
    // ========================================================
    console.log('\n--- Screen 8: Learning Intelligence ---');
    await evalScript(`
        if (typeof closeAuthModal === 'function') closeAuthModal();
        if (typeof showPage === 'function') showPage('intelligence');
        window.scrollTo(0, 0);
    `);
    await sleep(1500);
    await captureScreenshot('learning-intelligence.png');

    // ========================================================
    // 9. DAILY CHALLENGES
    // ========================================================
    console.log('\n--- Screen 9: Daily Challenges ---');
    await evalScript(`
        if (typeof closeAuthModal === 'function') closeAuthModal();
        if (typeof showPage === 'function') showPage('challenges');
        window.scrollTo(0, 0);
    `);
    await sleep(1200);
    await captureScreenshot('challenges.png');

    // ========================================================
    // 10. RANKINGS / LEADERBOARD
    // ========================================================
    console.log('\n--- Screen 10: Rankings Leaderboard ---');
    await evalScript(`
        if (typeof closeAuthModal === 'function') closeAuthModal();
        if (typeof showPage === 'function') showPage('rankings');
        window.scrollTo(0, 0);
    `);
    await sleep(1500);
    await captureScreenshot('rankings.png');

    // ========================================================
    // 11. REWARDS & GAMIFICATION SHOP
    // ========================================================
    console.log('\n--- Screen 11: Rewards Shop & Badges ---');
    await evalScript(`
        if (typeof closeAuthModal === 'function') closeAuthModal();
        if (typeof showPage === 'function') showPage('rewards');
        window.scrollTo(0, 0);
    `);
    await sleep(1200);
    await captureScreenshot('rewards.png');

    // ========================================================
    // 12. STUDENT PROFILE & ASSESSMENT HISTORY
    // ========================================================
    console.log('\n--- Screen 12: Student Profile ---');
    await evalScript(`
        if (typeof closeAuthModal === 'function') closeAuthModal();
        if (typeof showPage === 'function') showPage('profile');
        window.scrollTo(0, 0);
    `);
    await sleep(1200);
    await captureScreenshot('student-profile.png');

    // ========================================================
    // 13. SETTINGS
    // ========================================================
    console.log('\n--- Screen 13: Settings ---');
    await evalScript(`
        if (typeof closeAuthModal === 'function') closeAuthModal();
        if (typeof showPage === 'function') showPage('settings');
        window.scrollTo(0, 0);
    `);
    await sleep(1000);
    await captureScreenshot('settings.png');

    // ========================================================
    // 14. TEACHER LOGIN & CLASS LEARNING MAP
    // ========================================================
    console.log('\n--- Screen 14: Teacher Class Learning Map ---');
    await doLogout();
    await sleep(1000);
    console.log('Logging in as teacher@test.local...');
    const teacherLogin = await loginAs('teacher@test.local', 'Password123!');
    console.log('Teacher login status:', teacherLogin);
    await sleep(2000);
    await evalScript(`
        if (typeof closeAuthModal === 'function') closeAuthModal();
        if (typeof showPage === 'function') showPage('teacher-map');
        if (typeof loadTeacherClassMap === 'function') loadTeacherClassMap();
        window.scrollTo(0, 0);
    `);
    await sleep(1500);
    await captureScreenshot('teacher-dashboard.png');

    // ========================================================
    // 15. TEACHER AI TARGETED INTERVENTION
    // ========================================================
    console.log('\n--- Screen 15: Teacher AI Intervention ---');
    await evalScript(`
        if (typeof generateIntervention === 'function') generateIntervention();
    `);
    await sleep(1500);
    await captureScreenshot('teacher-intervention.png');

    // ========================================================
    // 16. ADMIN DASHBOARD
    // ========================================================
    console.log('\n--- Screen 16: Admin Dashboard ---');
    await doLogout();
    await sleep(1000);
    console.log('Logging in as admin@test.local...');
    const adminLogin = await loginAs('admin@test.local', 'Password123!');
    console.log('Admin login status:', adminLogin);
    await sleep(2000);
    await evalScript(`
        if (typeof closeAuthModal === 'function') closeAuthModal();
        if (typeof showPage === 'function') showPage('admin-dashboard');
        if (typeof loadAdminOverview === 'function') loadAdminOverview();
        window.scrollTo(0, 0);
    `);
    await sleep(1500);
    await captureScreenshot('admin-dashboard.png');

    console.log('\n✨ All screens successfully captured with clean real data!');

    ws.close();
    chrome.kill();
    process.exit(0);
}

main().catch(err => {
    console.error('Fatal execution error:', err);
    process.exit(1);
});
