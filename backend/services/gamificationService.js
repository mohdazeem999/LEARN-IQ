const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const supabase = require("../config/supabaseClient");

const DATA_FILE = path.join(__dirname, "../data/gamification_store.json");

// ========================================================
// 1. CONFIGURATION CATALOGS
// ========================================================

const LEVELS = [
    { level: 1, title: "Explorer", minXp: 0, maxXp: 150, icon: "🌱" },
    { level: 2, title: "Learner", minXp: 150, maxXp: 350, icon: "🧠" },
    { level: 3, title: "Thinker", minXp: 350, maxXp: 650, icon: "💡" },
    { level: 4, title: "Problem Solver", minXp: 650, maxXp: 1050, icon: "🚀" },
    { level: 5, title: "Achiever", minXp: 1050, maxXp: 1600, icon: "🏆" },
    { level: 6, title: "Knowledge Builder", minXp: 1600, maxXp: 2300, icon: "⚡" },
    { level: 7, title: "Scholar", minXp: 2300, maxXp: 3200, icon: "🔬" },
    { level: 8, title: "Analyst", minXp: 3200, maxXp: 4300, icon: "📊" },
    { level: 9, title: "Mastermind", minXp: 4300, maxXp: 5600, icon: "🌟" },
    { level: 10, title: "Innovator", minXp: 5600, maxXp: 7200, icon: "💡" },
    { level: 11, title: "Master", minXp: 7200, maxXp: 9000, icon: "👑" },
    { level: 12, title: "Grandmaster", minXp: 9000, maxXp: 11200, icon: "🎖️" },
    { level: 13, title: "Sage", minXp: 11200, maxXp: 14000, icon: "🔮" },
    { level: 14, title: "Champion of Learning", minXp: 14000, maxXp: 17500, icon: "🌠" },
    { level: 15, title: "Supreme Luminary", minXp: 17500, maxXp: 22000, icon: "🌌" }
];

const AVATARS = [
    { id: "avatar_explorer", name: "Explorer", icon: "🌱", description: "Beginning the quest for knowledge.", unlockType: "level", unlockValue: 1 },
    { id: "avatar_scientist", name: "Scientist", icon: "🔬", description: "Curious investigator of natural laws.", unlockType: "level", unlockValue: 2 },
    { id: "avatar_mathematician", name: "Mathematician", icon: "📐", description: "Master of patterns and equations.", unlockType: "level", unlockValue: 3 },
    { id: "avatar_coder", name: "Coder", icon: "💻", description: "Architect of algorithmic logic.", unlockType: "level", unlockValue: 4 },
    { id: "avatar_engineer", name: "Engineer", icon: "⚙️", description: "Builder of practical solutions.", unlockType: "level", unlockValue: 5 },
    { id: "avatar_inventor", name: "Inventor", icon: "💡", description: "Creator of novel ideas and methods.", unlockType: "level", unlockValue: 6 },
    { id: "avatar_astronaut", name: "Astronaut", icon: "🚀", description: "Reaching beyond horizons.", unlockType: "streak", unlockValue: 7 },
    { id: "avatar_ai_researcher", name: "AI Researcher", icon: "🤖", description: "Pioneering intelligence systems.", unlockType: "achievements", unlockValue: 5 },
    { id: "avatar_master_scholar", name: "Master Scholar", icon: "👑", description: "Highest echelon of academic dedication.", unlockType: "level", unlockValue: 8 }
];

const ACHIEVEMENTS = [
    { id: "first_step", title: "First Step", icon: "🧠", description: "Complete your first assessment.", xpReward: 50, coinsReward: 20 },
    { id: "on_fire", title: "On Fire", icon: "🔥", description: "Maintain a 3-day learning streak.", xpReward: 50, coinsReward: 25 },
    { id: "week_warrior", title: "Week Warrior", icon: "⚡", description: "Maintain a 7-day learning streak.", xpReward: 100, coinsReward: 50 },
    { id: "rising_star", title: "Rising Star", icon: "🚀", description: "Reach Level 5 (Achiever).", xpReward: 150, coinsReward: 60 },
    { id: "perfect_score", title: "Perfect Score", icon: "🎯", description: "Score 100% on any assessment.", xpReward: 75, coinsReward: 35 },
    { id: "comeback", title: "Comeback Champion", icon: "📈", description: "Improve your score by 15% or more over a previous attempt.", xpReward: 80, coinsReward: 40 },
    { id: "science_explorer", title: "Science Explorer", icon: "🧪", description: "Complete 3 science assessments.", xpReward: 60, coinsReward: 30 },
    { id: "math_mind", title: "Math Mind", icon: "📐", description: "Complete 3 mathematics assessments.", xpReward: 60, coinsReward: 30 },
    { id: "problem_solver", title: "Problem Solver", icon: "🧩", description: "Answer 25 questions correctly in total.", xpReward: 100, coinsReward: 50 },
    { id: "consistent_learner", title: "Consistent Learner", icon: "🏆", description: "Complete 5 assessments.", xpReward: 120, coinsReward: 50 },
    { id: "mastery_unlocked", title: "Mastery Unlocked", icon: "🌟", description: "Achieve 85%+ concept mastery in any topic.", xpReward: 90, coinsReward: 45 },
    { id: "smart_shopper", title: "Smart Shopper", icon: "🛍️", description: "Redeem your first reward from the LearnCoins shop.", xpReward: 40, coinsReward: 20 }
];

const REWARD_SHOP_ITEMS = [
    { id: "frame_neon", name: "Cyber Neon Glow Frame", type: "frame", icon: "fa-circle-notch", costCoins: 80, description: "Vibrant glowing border for your avatar card." },
    { id: "frame_gold", name: "Golden Scholar Frame", type: "frame", icon: "fa-crown", costCoins: 120, description: "Prestigious gold border reflecting academic dedication." },
    { id: "theme_matrix", name: "Matrix Code Backdrop", type: "theme", icon: "fa-terminal", costCoins: 150, description: "High-tech emerald code backdrop for your student card." },
    { id: "theme_nebula", name: "Deep Space Nebula Theme", type: "theme", icon: "fa-meteor", costCoins: 180, description: "Galactic purple-blue gradient backdrop." },
    { id: "title_math", name: 'Title: "Math Prodigy"', type: "title", icon: "fa-certificate", costCoins: 100, description: 'Display "Math Prodigy" badge under your name.' },
    { id: "title_ai", name: 'Title: "AI Pioneer"', type: "title", icon: "fa-wand-magic-sparkles", costCoins: 120, description: 'Display "AI Pioneer" badge under your name.' },
    { id: "title_thinker", name: 'Title: "Curious Thinker"', type: "title", icon: "fa-lightbulb", costCoins: 90, description: 'Display "Curious Thinker" title on your profile.' },
    { id: "streak_shield", name: "Streak Freeze Shield", type: "powerup", icon: "fa-shield", costCoins: 200, description: "Protects your learning streak if you miss a single day." }
];

// ========================================================
// 2. STORE INITIALIZATION & ACCESS
// ========================================================

let storeCache = null;

function loadStore() {
    if (storeCache) return storeCache;
    try {
        if (fs.existsSync(DATA_FILE)) {
            const raw = fs.readFileSync(DATA_FILE, "utf-8");
            storeCache = JSON.parse(raw);
            return storeCache;
        }
    } catch (err) {
        console.warn("Failed to load gamification store, initializing fresh store:", err.message);
    }

    storeCache = {
        students: {}, // [studentId] -> { xp, recentXpGained, coins, activeAvatar, equipped: { frame, theme, title }, unlockedAvatars: [], unlockedItems: [] }
        submissions: [], // [ { id, studentId, quizId, subject, topic, scorePercentage, correctCount, totalQuestions, xpEarned, coinsEarned, submittedAt } ]
        xp_transactions: [], // [ { id, studentId, amount, source, referenceId, createdAt } ]
        coin_transactions: [], // [ { id, studentId, amount, source, referenceId, createdAt } ]
        student_achievements: {}, // [studentId] -> [ { achievementId, unlockedAt } ]
        daily_missions: {}, // [dateStr] -> [studentId] -> [ missions ]
        student_challenges: {}, // [dateStr] -> [studentId] -> { [challengeId]: { completed: bool, claimed: bool, completedAt } }
        submission_timestamps: {} // Anti-cheat rate limiter: [studentId] -> lastSubmissionTimestamp
    };
    saveStore();
    return storeCache;
}

function saveStore() {
    try {
        if (!storeCache) return;
        const dir = path.dirname(DATA_FILE);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        const tmp = `${DATA_FILE}.tmp.${Date.now()}`;
        fs.writeFileSync(tmp, JSON.stringify(storeCache, null, 2), "utf-8");
        fs.renameSync(tmp, DATA_FILE);
    } catch (err) {
        console.error("Critical error saving gamification store:", err.message);
    }
}

function ensureStudentState(studentId) {
    const store = loadStore();
    if (!store.students[studentId]) {
        store.students[studentId] = {
            xp: 0,
            recentXpGained: 0,
            coins: 50, // Welcome grant
            activeAvatar: "avatar_explorer",
            equipped: {
                frame: null,
                theme: null,
                title: null
            },
            unlockedAvatars: ["avatar_explorer"],
            unlockedItems: [],
            streakFreezeCount: 0
        };
        saveStore();
    } else {
        if (typeof store.students[studentId].xp !== "number") store.students[studentId].xp = 0;
        if (typeof store.students[studentId].recentXpGained !== "number") store.students[studentId].recentXpGained = 0;
    }
    return store.students[studentId];
}

// ========================================================
// 3. LEVEL & XP HELPERS
// ========================================================

function calculateLevel(totalXp) {
    const xp = Math.max(0, Number.isFinite(totalXp) ? Math.round(totalXp) : 0);
    let currentLevel = LEVELS[0];
    let nextLevel = null;

    const maxPresetLevel = LEVELS[LEVELS.length - 1];
    if (xp < maxPresetLevel.minXp) {
        for (let i = LEVELS.length - 1; i >= 0; i--) {
            if (xp >= LEVELS[i].minXp) {
                currentLevel = LEVELS[i];
                nextLevel = LEVELS[i + 1] || null;
                break;
            }
        }
    } else {
        // Scalable progression beyond level 15
        const overflow = xp - maxPresetLevel.minXp;
        const extraLevels = Math.floor(overflow / 3000);
        const levelNum = maxPresetLevel.level + extraLevels;
        const currentBase = maxPresetLevel.minXp + (extraLevels * 3000);
        const nextTarget = currentBase + 3000;
        currentLevel = {
            level: levelNum,
            title: extraLevels === 0 ? maxPresetLevel.title : `Luminary Tier ${extraLevels + 1}`,
            minXp: currentBase,
            maxXp: nextTarget,
            icon: "🌌"
        };
        nextLevel = {
            level: levelNum + 1,
            title: `Luminary Tier ${extraLevels + 2}`,
            minXp: nextTarget,
            maxXp: nextTarget + 3000,
            icon: "✨"
        };
    }

    const currentBaseXp = currentLevel.minXp;
    const nextTargetXp = nextLevel ? nextLevel.minXp : currentLevel.maxXp;
    const xpInLevel = xp - currentBaseXp;
    const xpNeededForNext = nextLevel ? Math.max(0, nextTargetXp - xp) : 0;
    const span = Math.max(1, nextTargetXp - currentBaseXp);
    const progressPercent = Math.min(100, Math.max(0, Math.round((xpInLevel / span) * 100)));

    return {
        levelNumber: currentLevel.level,
        title: currentLevel.title,
        icon: currentLevel.icon,
        totalXp: xp,
        currentBaseXp,
        nextTargetXp,
        xpInLevel,
        xpNeededForNext,
        progressPercent,
        isMaxLevel: false
    };
}

// ========================================================
// 4. DAILY MISSIONS ENGINE
// ========================================================

function getTodayString() {
    return new Date().toISOString().slice(0, 10);
}

function getDailyMissions(studentId) {
    const store = loadStore();
    const today = getTodayString();
    if (!store.daily_missions[today]) store.daily_missions[today] = {};

    if (!store.daily_missions[today][studentId]) {
        store.daily_missions[today][studentId] = [
            {
                id: "mission_quiz",
                title: "Complete 1 Assessment",
                description: "Take any adaptive AI quiz or practice test today.",
                icon: "fa-graduation-cap",
                target: 1,
                current: 0,
                completed: false,
                xpReward: 30,
                coinsReward: 15
            },
            {
                id: "mission_correct",
                title: "Answer 4 Questions Correctly",
                description: "Show strong conceptual accuracy on today's questions.",
                icon: "fa-circle-check",
                target: 4,
                current: 0,
                completed: false,
                xpReward: 30,
                coinsReward: 15
            },
            {
                id: "mission_score",
                title: "Score 70% or Higher",
                description: "Demonstrate solid mastery on at least one quiz.",
                icon: "fa-bullseye",
                target: 1,
                current: 0,
                completed: false,
                xpReward: 30,
                coinsReward: 15
            },
            {
                id: "mission_weak",
                title: "Practice a Growth Area",
                description: "Target a concept that needs strengthening.",
                icon: "fa-seedling",
                target: 1,
                current: 0,
                completed: false,
                xpReward: 35,
                coinsReward: 20
            }
        ];
        saveStore();
    }
    return store.daily_missions[today][studentId];
}

function updateDailyMissions(studentId, { quizCompleted = false, correctCount = 0, scorePercentage = 0, weakPractice = false }) {
    const store = loadStore();
    const missions = getDailyMissions(studentId);
    let newlyCompleted = [];
    let bonusXp = 0;
    let bonusCoins = 0;

    for (const mission of missions) {
        if (mission.completed) continue;
        if (mission.id === "mission_quiz" && quizCompleted) {
            mission.current = Math.min(mission.target, mission.current + 1);
        } else if (mission.id === "mission_correct") {
            mission.current = Math.min(mission.target, mission.current + correctCount);
        } else if (mission.id === "mission_score" && scorePercentage >= 70) {
            mission.current = Math.min(mission.target, mission.current + 1);
        } else if (mission.id === "mission_weak" && weakPractice) {
            mission.current = Math.min(mission.target, mission.current + 1);
        }

        if (mission.current >= mission.target && !mission.completed) {
            mission.completed = true;
            bonusXp += mission.xpReward;
            bonusCoins += mission.coinsReward;
            newlyCompleted.push(mission);
        }
    }

    const allCompleted = missions.every(m => m.completed);
    let allCompletedBonus = false;
    if (allCompleted && newlyCompleted.length > 0) {
        // Daily sweep bonus: +50 XP and +25 Coins
        bonusXp += 50;
        bonusCoins += 25;
        allCompletedBonus = true;
    }

    saveStore();
    return {
        missions,
        newlyCompleted,
        allCompleted,
        allCompletedBonus,
        bonusXp,
        bonusCoins
    };
}

// ========================================================
// 4B. CLASS-SPECIFIC DAILY CHALLENGES CATALOG & HANDLERS
// ========================================================

const CLASS_CHALLENGES = {
    5: [
        {
            id: "c5_math_add",
            subject: "Mathematics",
            title: "Arithmetic Sprint: Addition & Decimals",
            description: "Complete 10 addition and decimal operations with high accuracy.",
            icon: "fa-calculator",
            target: 10,
            xpReward: 60,
            coinsReward: 25,
            interactiveType: "concept_task",
            taskQuestions: [
                { q: "Calculate: 145 + 289 = ?", options: ["424", "434", "444", "414"], correct: 1, explanation: "145 + 289 = 434" },
                { q: "What is 3.5 + 4.25?", options: ["7.5", "7.75", "7.25", "8.0"], correct: 1, explanation: "3.5 + 4.25 = 7.75" },
                { q: "Find the sum: 99 + 999 = ?", options: ["1088", "1098", "1108", "1099"], correct: 1, explanation: "99 + 999 = 1098" }
            ]
        },
        {
            id: "c5_math_sub",
            subject: "Mathematics",
            title: "Problem Solver: 5 Subtraction Challenges",
            description: "Solve 5 subtraction & word problems carefully.",
            icon: "fa-minus",
            target: 5,
            xpReward: 70,
            coinsReward: 30,
            interactiveType: "concept_task",
            taskQuestions: [
                { q: "A store had 450 notebooks and sold 185. How many are left?", options: ["265", "275", "255", "285"], correct: 0, explanation: "450 - 185 = 265 notebooks left." },
                { q: "Calculate: 1000 - 347 = ?", options: ["643", "653", "663", "657"], correct: 1, explanation: "1000 - 347 = 653." }
            ]
        },
        {
            id: "c5_error_detect",
            subject: "Science & Logic",
            title: "Detective Challenge: Find & Correct 3 Mistakes",
            description: "Spot the errors in everyday arithmetic and scientific statements.",
            icon: "fa-magnifying-glass",
            target: 3,
            xpReward: 80,
            coinsReward: 35,
            interactiveType: "concept_task",
            taskQuestions: [
                { q: "Find the error: 'Pure water freezes at 100°C and boils at 0°C.'", options: ["The units should be Kelvin", "Values are swapped: freezes at 0°C, boils at 100°C", "Water cannot boil", "Freezing point is -100°C"], correct: 1, explanation: "Water freezes at 0°C and boils at 100°C." },
                { q: "Find the math error: 7 × 8 = 54", options: ["7 × 8 is actually 56", "7 × 8 is actually 64", "7 × 8 is actually 48", "There is no error"], correct: 0, explanation: "7 × 8 = 56." }
            ]
        },
        {
            id: "c5_concept_shapes",
            subject: "Mathematics",
            title: "Geometric Angles & Perimeter Challenge",
            description: "Classify acute, right, and obtuse angles and calculate rectangle perimeters.",
            icon: "fa-shapes",
            target: 4,
            xpReward: 65,
            coinsReward: 25,
            interactiveType: "concept_task",
            taskQuestions: [
                { q: "An angle measuring exactly 90° is called a:", options: ["Acute Angle", "Right Angle", "Obtuse Angle", "Straight Angle"], correct: 1, explanation: "A 90° angle is a Right Angle." },
                { q: "A rectangle has length 8 cm and width 5 cm. What is its perimeter?", options: ["26 cm", "40 cm", "13 cm", "28 cm"], correct: 0, explanation: "Perimeter = 2 × (8 + 5) = 26 cm." }
            ]
        }
    ],
    6: [
        {
            id: "c6_math_fractions",
            subject: "Mathematics",
            title: "Fractions & Decimals Precision",
            description: "Solve 8 fraction operations and simplify to lowest terms.",
            icon: "fa-percent",
            target: 8,
            xpReward: 70,
            coinsReward: 30,
            interactiveType: "concept_task",
            taskQuestions: [
                { q: "What is 2/3 + 1/6 in simplest form?", options: ["5/6", "3/9", "1/2", "3/6"], correct: 0, explanation: "4/6 + 1/6 = 5/6." },
                { q: "Convert 0.75 to a simplified fraction:", options: ["7/10", "3/4", "75/10", "4/5"], correct: 1, explanation: "0.75 = 75/100 = 3/4." }
            ]
        },
        {
            id: "c6_science_energy",
            subject: "Science",
            title: "Motion & Energy Concept Challenge",
            description: "Identify 3 misconceptions about kinetic vs potential energy.",
            icon: "fa-bolt",
            target: 3,
            xpReward: 75,
            coinsReward: 30,
            interactiveType: "concept_task",
            taskQuestions: [
                { q: "A boulder poised at the top of a hill has:", options: ["Kinetic Energy", "Gravitational Potential Energy", "Chemical Energy", "Thermal Energy"], correct: 1, explanation: "Energy stored due to vertical elevation is potential energy." },
                { q: "As the boulder rolls down the hill, potential energy transforms into:", options: ["Kinetic Energy", "Nuclear Energy", "Sound only", "Lost permanently"], correct: 0, explanation: "Potential energy converts into kinetic energy." }
            ]
        },
        {
            id: "c6_eq_balance",
            subject: "Mathematics",
            title: "Whole Number Equation Balance",
            description: "Balance 5 equations with missing variables.",
            icon: "fa-scale-balanced",
            target: 5,
            xpReward: 80,
            coinsReward: 35,
            interactiveType: "concept_task",
            taskQuestions: [
                { q: "Find x: x + 15 = 42", options: ["25", "27", "29", "31"], correct: 1, explanation: "x = 42 - 15 = 27." },
                { q: "Find y: 4y = 36", options: ["8", "9", "7", "6"], correct: 1, explanation: "y = 36 / 4 = 9." }
            ]
        },
        {
            id: "c6_english_vocab",
            subject: "English",
            title: "Grammar & Root Words Sprint",
            description: "Identify prefixes, suffixes, and active vs passive voices.",
            icon: "fa-book",
            target: 4,
            xpReward: 65,
            coinsReward: 25,
            interactiveType: "concept_task",
            taskQuestions: [
                { q: "Which prefix transforms 'possible' into its opposite?", options: ["un-", "in-", "im-", "dis-"], correct: 2, explanation: "The prefix 'im-' creates 'impossible'." },
                { q: "Identify the tense: 'She has submitted her quiz.'", options: ["Past Simple", "Present Perfect", "Present Continuous", "Past Perfect"], correct: 1, explanation: "'Has + past participle' is Present Perfect." }
            ]
        }
    ],
    7: [
        {
            id: "c7_math_integers",
            subject: "Mathematics",
            title: "Integers & Rational Numbers Sprint",
            description: "Solve 6 integer operations with negative signs and absolute values.",
            icon: "fa-arrow-down-up-across-line",
            target: 6,
            xpReward: 75,
            coinsReward: 30,
            interactiveType: "concept_task",
            taskQuestions: [
                { q: "Calculate: (-12) - (-25) = ?", options: ["-37", "13", "-13", "37"], correct: 1, explanation: "-12 + 25 = 13." },
                { q: "Calculate: (-8) × (-6) = ?", options: ["-48", "48", "-14", "14"], correct: 1, explanation: "Negative times negative yields positive 48." }
            ]
        },
        {
            id: "c7_math_errors",
            subject: "Mathematics",
            title: "Algebraic Sign Detective: Fix 3 Mistakes",
            description: "Identify and correct sign errors in negative bracket distribution.",
            icon: "fa-magnifying-glass-plus",
            target: 3,
            xpReward: 85,
            coinsReward: 40,
            interactiveType: "concept_task",
            taskQuestions: [
                { q: "Spot error: -(3x - 5) was expanded as -3x - 5.", options: ["Should be -3x + 5", "Should be +3x - 5", "Should be -8x", "There is no error"], correct: 0, explanation: "Distributing the minus gives -3x + 5." }
            ]
        },
        {
            id: "c7_science_chem",
            subject: "Science",
            title: "Acids, Bases & Indicators Lab Challenge",
            description: "Classify 5 everyday substances using litmus and pH indicators.",
            icon: "fa-flask-vial",
            target: 5,
            xpReward: 80,
            coinsReward: 35,
            interactiveType: "concept_task",
            taskQuestions: [
                { q: "Lemon juice turns blue litmus paper:", options: ["Red", "Green", "Yellow", "No change"], correct: 0, explanation: "Acids turn blue litmus paper red." },
                { q: "Baking soda solution is:", options: ["Acidic (pH < 7)", "Basic (pH > 7)", "Neutral (pH = 7)", "Strong Acid"], correct: 1, explanation: "Baking soda is slightly alkaline (pH ~ 8.4)." }
            ]
        },
        {
            id: "c7_math_percentages",
            subject: "Mathematics",
            title: "Speed Challenge: 7 Percentage Conversions",
            description: "Convert ratios, fractions, and decimals to percentages instantly.",
            icon: "fa-gauge-high",
            target: 7,
            xpReward: 70,
            coinsReward: 30,
            interactiveType: "concept_task",
            taskQuestions: [
                { q: "Convert 3/5 to a percentage:", options: ["35%", "60%", "75%", "50%"], correct: 1, explanation: "(3 / 5) × 100 = 60%." }
            ]
        }
    ],
    8: [
        {
            id: "c8_math_linear",
            subject: "Mathematics",
            title: "Linear Equations in One Variable",
            description: "Solve 5 algebraic linear equations with bracket expansions.",
            icon: "fa-square-root-variable",
            target: 5,
            xpReward: 80,
            coinsReward: 35,
            interactiveType: "concept_task",
            taskQuestions: [
                { q: "Solve for x: 3(x - 4) = 15", options: ["x = 7", "x = 9", "x = 8", "x = 6"], correct: 1, explanation: "3x - 12 = 15 -> 3x = 27 -> x = 9." },
                { q: "Solve: 2x + 5 = 5x - 7", options: ["x = 3", "x = 4", "x = 2", "x = 5"], correct: 1, explanation: "12 = 3x -> x = 4." }
            ]
        },
        {
            id: "c8_science_cells",
            subject: "Science",
            title: "Cell Structure & Organelle Functions",
            description: "Compare plant vs animal cells and organelle roles.",
            icon: "fa-dna",
            target: 4,
            xpReward: 85,
            coinsReward: 35,
            interactiveType: "concept_task",
            taskQuestions: [
                { q: "Which organelle is termed the 'powerhouse of the cell'?", options: ["Ribosome", "Mitochondria", "Golgi Body", "Endoplasmic Reticulum"], correct: 1, explanation: "Mitochondria produce cellular ATP." },
                { q: "Which structure is present in plant cells but absent in animal cells?", options: ["Cell membrane", "Cell wall & chloroplast", "Nucleus", "Cytoplasm"], correct: 1, explanation: "Cell walls and chloroplasts are found only in plant cells." }
            ]
        },
        {
            id: "c8_math_factoring",
            subject: "Mathematics",
            title: "Algebraic Factoring & Identity Inspection",
            description: "Find and correct 3 algebraic factoring mistakes using identities.",
            icon: "fa-magnifying-glass-chart",
            target: 3,
            xpReward: 90,
            coinsReward: 40,
            interactiveType: "concept_task",
            taskQuestions: [
                { q: "Factor: a² - b²", options: ["(a - b)²", "(a + b)(a - b)", "(a + b)²", "a(a - b)"], correct: 1, explanation: "Difference of squares formula: (a + b)(a - b)." },
                { q: "Identify the missing middle term: (x + 3)² = x² + ___ + 9", options: ["3x", "6x", "9x", "2x"], correct: 1, explanation: "2 × 3 × x = 6x." }
            ]
        },
        {
            id: "c8_science_force",
            subject: "Science",
            title: "Force, Friction & Pressure Sprint",
            description: "Calculate pressure = Force / Area and analyze frictional forces.",
            icon: "fa-arrows-down-to-line",
            target: 4,
            xpReward: 75,
            coinsReward: 30,
            interactiveType: "concept_task",
            taskQuestions: [
                { q: "Pressure is calculated as:", options: ["Force × Area", "Force / Area", "Mass × Acceleration", "Work / Time"], correct: 1, explanation: "Pressure = Force per unit area (P = F/A)." }
            ]
        }
    ],
    9: [
        {
            id: "c9_math_poly",
            subject: "Mathematics",
            title: "Polynomials & Remainder Theorem",
            description: "Evaluate polynomial values and test factors.",
            icon: "fa-function",
            target: 5,
            xpReward: 90,
            coinsReward: 40,
            interactiveType: "concept_task",
            taskQuestions: [
                { q: "If p(x) = x² - 4x + 3, what is p(2)?", options: ["-1", "1", "0", "3"], correct: 0, explanation: "p(2) = 4 - 8 + 3 = -1." }
            ]
        },
        {
            id: "c9_physics_laws",
            subject: "Physics",
            title: "Newton's Laws of Motion & Momentum",
            description: "Apply F = ma across force and acceleration problems.",
            icon: "fa-gauge",
            target: 4,
            xpReward: 95,
            coinsReward: 45,
            interactiveType: "concept_task",
            taskQuestions: [
                { q: "A 5 kg block accelerates at 4 m/s². What net force acts on it?", options: ["10 N", "20 N", "25 N", "1.25 N"], correct: 1, explanation: "F = m × a = 5 × 4 = 20 N." }
            ]
        },
        {
            id: "c9_chem_atoms",
            subject: "Chemistry",
            title: "Atoms, Molecules & Chemical Formulas",
            description: "Write correct chemical formulas and valency pairings.",
            icon: "fa-atom",
            target: 4,
            xpReward: 85,
            coinsReward: 35,
            interactiveType: "concept_task",
            taskQuestions: [
                { q: "What is the chemical formula for Aluminium Oxide?", options: ["AlO", "Al₂O₃", "Al₃O₂", "AlO₂"], correct: 1, explanation: "Al³⁺ and O²⁻ combine as Al₂O₃." }
            ]
        }
    ],
    10: [
        {
            id: "c10_math_quad",
            subject: "Mathematics",
            title: "Quadratic Equations & Discriminant Analysis",
            description: "Find roots and evaluate discriminant b² - 4ac for real/equal roots.",
            icon: "fa-chart-line",
            target: 5,
            xpReward: 95,
            coinsReward: 45,
            interactiveType: "concept_task",
            taskQuestions: [
                { q: "For 2x² - 4x + 2 = 0, what is the discriminant?", options: ["16", "0", "-16", "4"], correct: 1, explanation: "D = (-4)² - 4(2)(2) = 16 - 16 = 0 (two equal real roots)." },
                { q: "What are the roots of x² - 5x + 6 = 0?", options: ["x = 2, 3", "x = -2, -3", "x = 1, 6", "x = -1, -6"], correct: 0, explanation: "(x - 2)(x - 3) = 0 -> x = 2 or x = 3." }
            ]
        },
        {
            id: "c10_chem_rxn",
            subject: "Chemistry",
            title: "Chemical Reactions & Redox Balance",
            description: "Balance 4 chemical equations and identify oxidation vs reduction.",
            icon: "fa-flask",
            target: 4,
            xpReward: 100,
            coinsReward: 50,
            interactiveType: "concept_task",
            taskQuestions: [
                { q: "Balance: _Fe + _O₂ -> 2Fe₂O₃. What is the coefficient for Fe?", options: ["2", "3", "4", "1"], correct: 2, explanation: "4Fe + 3O₂ -> 2Fe₂O₃." },
                { q: "Loss of electrons in a redox reaction is termed:", options: ["Reduction", "Oxidation", "Precipitation", "Neutralization"], correct: 1, explanation: "Oxidation is loss of electrons." }
            ]
        },
        {
            id: "c10_physics_light",
            subject: "Physics",
            title: "Light: Reflection, Refraction & Lens Formula",
            description: "Find and correct 3 focal length and sign convention errors.",
            icon: "fa-eye",
            target: 3,
            xpReward: 90,
            coinsReward: 40,
            interactiveType: "concept_task",
            taskQuestions: [
                { q: "The focal length of a concave mirror according to Cartesian sign convention is:", options: ["Positive", "Negative", "Zero", "Variable"], correct: 1, explanation: "Left of pole -> negative." }
            ]
        },
        {
            id: "c10_bio_heredity",
            subject: "Biology",
            title: "Mendelian Genetics & Punnett Squares",
            description: "Predict phenotypic ratios for monohybrid crosses (3:1).",
            icon: "fa-dna",
            target: 4,
            xpReward: 85,
            coinsReward: 40,
            interactiveType: "concept_task",
            taskQuestions: [
                { q: "In a monohybrid cross of Tt × Tt, what is the expected phenotypic ratio of Tall to Short?", options: ["1:1", "3:1", "1:2:1", "9:3:3:1"], correct: 1, explanation: "Phenotypic ratio is 3 Tall : 1 Dwarf." }
            ]
        }
    ]
};

function getStudentDailyChallenges(studentId, classNum = 10) {
    const store = loadStore();
    const today = getTodayString();
    if (!store.student_challenges) store.student_challenges = {};
    if (!store.student_challenges[today]) store.student_challenges[today] = {};
    if (!store.student_challenges[today][studentId]) store.student_challenges[today][studentId] = {};

    const userRecord = store.student_challenges[today][studentId];
    const parsedNum = Number.parseInt(String(classNum).replace(/\D/g, ""), 10);
    const cNum = Number.isSafeInteger(parsedNum) && CLASS_CHALLENGES[parsedNum] ? parsedNum : 10;
    const baseList = CLASS_CHALLENGES[cNum] || CLASS_CHALLENGES[10];

    const challenges = baseList.map(item => {
        const status = userRecord[item.id] || { completed: false, claimed: false, current: 0 };
        return {
            ...item,
            classLevel: cNum,
            className: `Class ${cNum}`,
            completed: Boolean(status.completed),
            claimed: Boolean(status.claimed),
            current: typeof status.current === "number" ? status.current : (status.completed ? item.target : 0),
            completedAt: status.completedAt || null
        };
    });

    const completedCount = challenges.filter(c => c.completed).length;
    const claimedCount = challenges.filter(c => c.claimed).length;

    return {
        today,
        classNumber: cNum,
        className: `Class ${cNum}`,
        total: challenges.length,
        completedCount,
        claimedCount,
        allClaimed: claimedCount === challenges.length,
        challenges
    };
}

async function completeDailyChallenge(studentId, challengeId, classNum = 10) {
    const store = loadStore();
    const today = getTodayString();
    if (!store.student_challenges) store.student_challenges = {};
    if (!store.student_challenges[today]) store.student_challenges[today] = {};
    if (!store.student_challenges[today][studentId]) store.student_challenges[today][studentId] = {};

    const studentState = ensureStudentState(studentId);
    const parsedNum = Number.parseInt(String(classNum).replace(/\D/g, ""), 10);
    const cNum = Number.isSafeInteger(parsedNum) && CLASS_CHALLENGES[parsedNum] ? parsedNum : 10;
    const pool = CLASS_CHALLENGES[cNum] || CLASS_CHALLENGES[10];
    const challenge = pool.find(c => c.id === challengeId);
    if (!challenge) {
        throw new Error("Challenge not found for this class level.");
    }

    const currentStatus = store.student_challenges[today][studentId][challengeId] || {};
    if (currentStatus.claimed) {
        throw new Error("This daily challenge reward has already been claimed today.");
    }

    // Mark as completed & claimed
    store.student_challenges[today][studentId][challengeId] = {
        completed: true,
        claimed: true,
        current: challenge.target,
        completedAt: new Date().toISOString()
    };

    // Calculate XP and Coins
    let currentXp = studentState.xp || 0;
    if (supabase) {
        try {
            const { data: prof } = await supabase.from("profiles")
                .select("xp, streak")
                .or(`user_id.eq.${studentId},id.eq.${studentId}`)
                .maybeSingle();
            if (prof && typeof prof.xp === "number") {
                currentXp = Math.max(currentXp, prof.xp);
            }
        } catch (err) {
            console.warn("Supabase profile fetch warning:", err.message);
        }
    }

    const earnedXp = challenge.xpReward || 50;
    const earnedCoins = challenge.coinsReward || 20;
    const newTotalXp = currentXp + earnedXp;

    studentState.xp = newTotalXp;
    studentState.recentXpGained = earnedXp;
    studentState.coins = (studentState.coins || 0) + earnedCoins;

    store.xp_transactions.push({
        id: crypto.randomUUID(),
        studentId,
        amount: earnedXp,
        source: "daily_challenge",
        referenceId: challengeId,
        createdAt: new Date().toISOString()
    });

    saveStore();

    if (supabase) {
        try {
            await supabase.from("profiles")
                .update({ xp: newTotalXp })
                .or(`user_id.eq.${studentId},id.eq.${studentId}`);
        } catch (syncErr) {
            console.warn("Supabase profile XP sync warning on challenge:", syncErr.message);
        }
    }

    const newLevelData = calculateLevel(newTotalXp);
    const feedbackMessage = `+${earnedXp} XP 🎉 → Challenge Complete → ${newLevelData.xpNeededForNext} XP to Next Level`;

    return {
        success: true,
        challengeId,
        earnedXp,
        earnedCoins,
        xp: newTotalXp,
        totalXp: newTotalXp,
        level: newLevelData,
        xpNeededForNext: newLevelData.xpNeededForNext,
        feedbackMessage
    };
}

// ========================================================
// 5. STREAK CALCULATOR WITH WEEKDAY CALENDAR
// ========================================================

function computeStreakData(studentId, existingStreak = 0) {
    const store = loadStore();
    const userSubmissions = store.submissions
        .filter(s => s.studentId === studentId)
        .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));

    const today = getTodayString();
    const submissionDates = new Set(userSubmissions.map(s => s.submittedAt.slice(0, 10)));
    submissionDates.add(today); // Include today if action taken

    // Weekday tracker for the current week (Monday - Sunday)
    const now = new Date();
    const currentDayOfWeek = (now.getDay() + 6) % 7; // Monday = 0, Sunday = 6
    const monday = new Date(now);
    monday.setDate(now.getDate() - currentDayOfWeek);

    const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((dayName, index) => {
        const d = new Date(monday);
        d.setDate(monday.getDate() + index);
        const dateStr = d.toISOString().slice(0, 10);
        const hasActivity = submissionDates.has(dateStr);
        const isPastOrToday = dateStr <= today;
        const isToday = dateStr === today;
        return {
            day: dayName,
            date: dateStr,
            active: hasActivity,
            isPastOrToday,
            isToday
        };
    });

    return {
        streakDays: Math.max(1, existingStreak),
        weekDays
    };
}

// ========================================================
// 6. ACHIEVEMENTS EVALUATOR
// ========================================================

function checkAchievements(studentId, currentTotalXp, currentStreak, totalQuizzes, totalCorrect, latestScore, previousScore) {
    const store = loadStore();
    if (!store.student_achievements[studentId]) store.student_achievements[studentId] = [];
    const unlockedIds = new Set(store.student_achievements[studentId].map(a => a.achievementId));

    const newUnlocked = [];
    const studentLvl = calculateLevel(currentTotalXp).levelNumber;

    for (const ach of ACHIEVEMENTS) {
        if (unlockedIds.has(ach.id)) continue;

        let shouldUnlock = false;
        if (ach.id === "first_step" && totalQuizzes >= 1) shouldUnlock = true;
        if (ach.id === "on_fire" && currentStreak >= 3) shouldUnlock = true;
        if (ach.id === "week_warrior" && currentStreak >= 7) shouldUnlock = true;
        if (ach.id === "rising_star" && studentLvl >= 5) shouldUnlock = true;
        if (ach.id === "perfect_score" && latestScore === 100) shouldUnlock = true;
        if (ach.id === "comeback" && previousScore !== null && latestScore >= previousScore + 15) shouldUnlock = true;
        if (ach.id === "problem_solver" && totalCorrect >= 25) shouldUnlock = true;
        if (ach.id === "consistent_learner" && totalQuizzes >= 5) shouldUnlock = true;
        if (ach.id === "mastery_unlocked" && latestScore >= 85) shouldUnlock = true;

        if (shouldUnlock) {
            store.student_achievements[studentId].push({
                achievementId: ach.id,
                unlockedAt: new Date().toISOString()
            });
            newUnlocked.push(ach);
        }
    }

    if (newUnlocked.length > 0) saveStore();
    return newUnlocked;
}

// ========================================================
// 7. CORE QUIZ GAMIFICATION PROCESSOR (ATOMIC & VERIFIED)
// ========================================================

async function processQuizSubmission({ studentId, studentName = "Student", quiz, answers, analysis }) {
    const store = loadStore();
    ensureStudentState(studentId);

    // Anti-cheat rate limit: minimum 3 seconds between consecutive submissions
    const nowMs = Date.now();
    const lastSubMs = store.submission_timestamps[studentId] || 0;
    if (nowMs - lastSubMs < 3000) {
        throw new Error("Assessment submission rate limit exceeded. Please wait a moment.");
    }
    store.submission_timestamps[studentId] = nowMs;

    // Load student current profile from Supabase or fallback
    let currentXp = 0;
    let currentStreak = 1;
    let studentClass = "Class 10";

    if (supabase) {
        try {
            const { data: prof } = await supabase.from("profiles")
                .select("xp, streak, class")
                .or(`user_id.eq.${studentId},id.eq.${studentId}`)
                .maybeSingle();
            if (prof) {
                currentXp = prof.xp || 0;
                currentStreak = prof.streak || 0;
                studentClass = prof.class ? `Class ${prof.class}` : "Class 10";
            }
        } catch (err) {
            console.warn("Supabase fetch profile warning:", err.message);
        }
    }

    // Determine previous attempt on same topic/subject for improvement calculation
    const pastSubmissions = store.submissions.filter(s => s.studentId === studentId);
    const prevSameTopic = pastSubmissions
        .filter(s => (s.topic && quiz.topic && s.topic.toLowerCase() === quiz.topic.toLowerCase()) ||
                     (s.subject && quiz.subject && s.subject.toLowerCase() === quiz.subject.toLowerCase()))
        .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))[0] || null;

    const previousScore = prevSameTopic ? prevSameTopic.scorePercentage : null;
    const currentScore = analysis.scorePercentage;
    const isImproved = previousScore !== null && currentScore > previousScore;
    const improvementPercent = isImproved ? Math.round(currentScore - previousScore) : 0;
    const isWeakTopicPractice = (analysis.weakConcepts && analysis.weakConcepts.length > 0) ||
                                (prevSameTopic && prevSameTopic.scorePercentage < 65);

    // --- Verified XP Breakdown ---
    const xpBreakdown = [];
    let earnedXp = 0;

    // 1. Base completion
    const baseXp = 20;
    earnedXp += baseXp;
    xpBreakdown.push({ label: "Assessment Completed", amount: baseXp, icon: "fa-check" });

    // 2. Correct answers
    const correctXp = (analysis.correctCount || 0) * 5;
    if (correctXp > 0) {
        earnedXp += correctXp;
        xpBreakdown.push({ label: `${analysis.correctCount} Correct Answers (+5 each)`, amount: correctXp, icon: "fa-bullseye" });
    }

    // 3. Perfect Score Bonus
    if (currentScore === 100) {
        const perfectBonus = 30;
        earnedXp += perfectBonus;
        xpBreakdown.push({ label: "Perfect 100% Score Bonus", amount: perfectBonus, icon: "fa-star" });
    }

    // 4. Score Improvement Bonus
    if (isImproved && improvementPercent >= 10) {
        const improveBonus = 25;
        earnedXp += improveBonus;
        xpBreakdown.push({ label: `Comeback Improvement (+${improvementPercent}%)`, amount: improveBonus, icon: "fa-chart-line" });
    }

    // 5. Weak topic targeted practice
    if (isWeakTopicPractice) {
        const weakPracticeBonus = 25;
        earnedXp += weakPracticeBonus;
        xpBreakdown.push({ label: "Growth-Focus Topic Practice", amount: weakPracticeBonus, icon: "fa-seedling" });
    }

    // --- LearnCoins Breakdown ---
    let earnedCoins = 10; // Base
    const coinsBreakdown = [{ label: "Assessment Completion", amount: 10, icon: "fa-coins" }];

    if (currentScore >= 80) {
        earnedCoins += 10;
        coinsBreakdown.push({ label: "High Mastery Bonus (≥80%)", amount: 10, icon: "fa-medal" });
    }
    if (currentScore === 100) {
        earnedCoins += 15;
        coinsBreakdown.push({ label: "Flawless Score Bonus", amount: 15, icon: "fa-trophy" });
    }
    if (isImproved && improvementPercent >= 10) {
        earnedCoins += 10;
        coinsBreakdown.push({ label: "Score Improvement Reward", amount: 10, icon: "fa-arrow-trend-up" });
    }

    // --- Streak Computation ---
    const lastSub = pastSubmissions.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))[0] || null;
    const todayStr = getTodayString();
    const lastDateStr = lastSub ? lastSub.submittedAt.slice(0, 10) : null;

    let newStreak = currentStreak;
    if (!lastDateStr) {
        newStreak = 1;
    } else if (lastDateStr === todayStr) {
        newStreak = Math.max(1, currentStreak);
    } else {
        const dayDiff = Math.floor((Date.parse(`${todayStr}T00:00:00Z`) - Date.parse(`${lastDateStr}T00:00:00Z`)) / 86400000);
        if (dayDiff === 1) {
            newStreak = currentStreak + 1;
        } else if (dayDiff > 1) {
            // Check streak freeze
            const studentState = store.students[studentId];
            if (studentState.streakFreezeCount > 0 && dayDiff === 2) {
                studentState.streakFreezeCount -= 1;
                newStreak = currentStreak + 1;
            } else {
                newStreak = 1;
            }
        }
    }

    // Streak Milestone Bonuses
    let streakBonusXp = 0;
    let streakBonusCoins = 0;
    if (newStreak === 3) { streakBonusXp = 25; streakBonusCoins = 10; }
    else if (newStreak === 7) { streakBonusXp = 75; streakBonusCoins = 30; }
    else if (newStreak === 14) { streakBonusXp = 150; streakBonusCoins = 60; }
    else if (newStreak === 30) { streakBonusXp = 350; streakBonusCoins = 150; }

    if (streakBonusXp > 0) {
        earnedXp += streakBonusXp;
        earnedCoins += streakBonusCoins;
        xpBreakdown.push({ label: `🔥 ${newStreak}-Day Streak Milestone Bonus`, amount: streakBonusXp, icon: "fa-fire" });
        coinsBreakdown.push({ label: `🔥 ${newStreak}-Day Streak Coins`, amount: streakBonusCoins, icon: "fa-fire" });
    }

    // --- Daily Missions Update ---
    const missionUpdate = updateDailyMissions(studentId, {
        quizCompleted: true,
        correctCount: analysis.correctCount,
        scorePercentage: currentScore,
        weakPractice: isWeakTopicPractice
    });

    if (missionUpdate.bonusXp > 0) {
        earnedXp += missionUpdate.bonusXp;
        earnedCoins += missionUpdate.bonusCoins;
        xpBreakdown.push({ label: "Daily Mission Completion", amount: missionUpdate.bonusXp, icon: "fa-list-check" });
        coinsBreakdown.push({ label: "Daily Mission Coins", amount: missionUpdate.bonusCoins, icon: "fa-coins" });
    }

    // Old Level vs New Level
    const oldLevelData = calculateLevel(currentXp);
    const newTotalXp = currentXp + earnedXp;
    const newLevelData = calculateLevel(newTotalXp);
    const isLevelUp = newLevelData.levelNumber > oldLevelData.levelNumber;

    // Credit Coins
    store.students[studentId].coins = (store.students[studentId].coins || 0) + earnedCoins;

    // Log XP & Coin transactions
    const submissionId = crypto.randomUUID();
    store.xp_transactions.push({
        id: crypto.randomUUID(),
        studentId,
        amount: earnedXp,
        source: "quiz_submission",
        referenceId: submissionId,
        createdAt: new Date().toISOString()
    });
    store.coin_transactions.push({
        id: crypto.randomUUID(),
        studentId,
        amount: earnedCoins,
        source: "quiz_submission",
        referenceId: submissionId,
        createdAt: new Date().toISOString()
    });

    // Record submission
    const submissionRecord = {
        id: submissionId,
        studentId,
        quizId: quiz.id || crypto.randomUUID(),
        title: quiz.title || "Assessment",
        subject: quiz.subject || "Mathematics",
        topic: quiz.topic || quiz.title || "General",
        classLevel: quiz.classLevel || studentClass,
        scorePercentage: currentScore,
        correctCount: analysis.correctCount,
        totalQuestions: analysis.totalQuestions,
        xpEarned: earnedXp,
        coinsEarned: earnedCoins,
        aiInsight: analysis.aiInsight,
        submittedAt: new Date().toISOString()
    };
    store.submissions.push(submissionRecord);
    store.students[studentId].xp = newTotalXp;
    store.students[studentId].recentXpGained = earnedXp;
    saveStore();

    // Sync updated XP and streak to Supabase profiles table
    if (supabase) {
        try {
            await supabase.from("profiles")
                .update({ xp: newTotalXp, streak: newStreak })
                .or(`user_id.eq.${studentId},id.eq.${studentId}`);
        } catch (syncErr) {
            console.warn("Supabase profile XP/streak sync warning:", syncErr.message);
        }
    }

    // Check newly unlocked achievements
    const allStudentSubs = store.submissions.filter(s => s.studentId === studentId);
    const totalCorrect = allStudentSubs.reduce((acc, s) => acc + (s.correctCount || 0), 0);
    const newlyUnlockedAchievements = checkAchievements(
        studentId,
        newTotalXp,
        newStreak,
        allStudentSubs.length,
        totalCorrect,
        currentScore,
        previousScore
    );

    // Check newly unlocked avatars
    const unlockedAvatars = getUnlockedAvatars(studentId, newTotalXp, newStreak, store.student_achievements[studentId] || []);

    const feedbackMessage = `+${earnedXp} XP 🎉 → Quiz Complete → ${newLevelData.xpNeededForNext} XP to Next Level`;

    return {
        submissionId,
        earnedXp,
        earnedCoins,
        xp: newTotalXp,
        totalXp: newTotalXp,
        recentXpGained: earnedXp,
        feedbackMessage,
        totalCoins: store.students[studentId].coins,
        xpBreakdown,
        coinsBreakdown,
        streakDays: newStreak,
        isStreakMaintained: true,
        isImproved,
        previousScore,
        currentScore,
        improvementPercent,
        oldLevel: oldLevelData,
        newLevel: newLevelData,
        isLevelUp,
        newAchievements: newlyUnlockedAchievements,
        missionUpdate,
        unlockedAvatars
    };
}

// ========================================================
// 8. AVATAR UNLOCKS EVALUATION
// ========================================================

function getUnlockedAvatars(studentId, totalXp, streakDays, achievementsList) {
    const store = loadStore();
    const student = ensureStudentState(studentId);
    const lvl = calculateLevel(totalXp).levelNumber;
    const achCount = (achievementsList || []).length;

    const available = [];
    for (const av of AVATARS) {
        let unlocked = student.unlockedAvatars.includes(av.id);
        if (!unlocked) {
            if (av.unlockType === "level" && lvl >= av.unlockValue) unlocked = true;
            if (av.unlockType === "streak" && streakDays >= av.unlockValue) unlocked = true;
            if (av.unlockType === "achievements" && achCount >= av.unlockValue) unlocked = true;
            if (unlocked) {
                student.unlockedAvatars.push(av.id);
            }
        }
        available.push({
            ...av,
            unlocked,
            isCurrent: student.activeAvatar === av.id
        });
    }
    saveStore();
    return available;
}

// ========================================================
// 9. COMPLETE STUDENT GAMIFICATION PROFILE
// ========================================================

async function getStudentGamificationProfile(studentId, userMetadata = {}) {
    const store = loadStore();
    const student = ensureStudentState(studentId);

    let totalXp = student.xp || 0;
    let streakDays = 1;
    let name = userMetadata.name || "Student";
    let email = userMetadata.email || "";
    let classLevel = userMetadata.class ? userMetadata.class : "Class 10";
    let classNumber = 10;

    if (supabase) {
        try {
            const { data: prof } = await supabase.from("profiles")
                .select("name, email, xp, streak, class")
                .or(`user_id.eq.${studentId},id.eq.${studentId}`)
                .maybeSingle();
            if (prof) {
                if (typeof prof.xp === "number") {
                    totalXp = Math.max(totalXp, prof.xp);
                    student.xp = totalXp;
                }
                streakDays = prof.streak || 1;
                if (prof.name) name = prof.name;
                if (prof.email) email = prof.email;
                if (prof.class) {
                    classNumber = Number(prof.class);
                    classLevel = `Class ${prof.class}`;
                }
            }
        } catch (e) {
            console.warn("Profile fetch warning:", e.message);
        }
    }

    const levelData = calculateLevel(totalXp);
    const streakData = computeStreakData(studentId, streakDays);
    const missions = getDailyMissions(studentId);
    const dailyChallenges = getStudentDailyChallenges(studentId, classNumber);

    const userAchList = store.student_achievements[studentId] || [];
    const unlockedAchMap = new Map(userAchList.map(a => [a.achievementId, a.unlockedAt]));

    const achievementsView = ACHIEVEMENTS.map(ach => ({
        ...ach,
        unlocked: unlockedAchMap.has(ach.id),
        unlockedAt: unlockedAchMap.get(ach.id) || null
    }));

    const avatarsView = getUnlockedAvatars(studentId, totalXp, streakDays, userAchList);
    const currentAvatarObj = avatarsView.find(a => a.id === student.activeAvatar) || avatarsView[0];

    // Quiz statistics
    const userSubs = store.submissions.filter(s => s.studentId === studentId);
    const totalAssessments = userSubs.length;
    const avgScore = totalAssessments > 0
        ? Math.round(userSubs.reduce((acc, s) => acc + s.scorePercentage, 0) / totalAssessments)
        : 0;
    const totalQuestionsAnswered = userSubs.reduce((acc, s) => acc + (s.totalQuestions || 0), 0);
    const totalCorrectAnswers = userSubs.reduce((acc, s) => acc + (s.correctCount || 0), 0);

    // Learning Journey stages
    const journeyStages = LEVELS.map(lvl => ({
        level: lvl.level,
        title: lvl.title,
        icon: lvl.icon,
        minXp: lvl.minXp,
        completed: totalXp >= lvl.minXp,
        isCurrent: levelData.levelNumber === lvl.level
    }));

    // Reward shop items with purchased/equipped status
    const shopItems = REWARD_SHOP_ITEMS.map(item => ({
        ...item,
        purchased: student.unlockedItems.includes(item.id),
        equipped: Object.values(student.equipped || {}).includes(item.id)
    }));

    return {
        studentId,
        name,
        email,
        classLevel,
        classNumber,
        xp: totalXp,
        totalXp,
        recentXpGained: student.recentXpGained || 0,
        dailyChallenges,
        learnCoins: student.coins || 0,
        streakDays,
        streakData,
        level: levelData,
        avatar: currentAvatarObj,
        equipped: student.equipped || {},
        avatars: avatarsView,
        achievements: achievementsView,
        unlockedAchievementsCount: userAchList.length,
        totalAchievementsCount: ACHIEVEMENTS.length,
        dailyMissions: missions,
        learningJourney: journeyStages,
        rewardShop: shopItems,
        stats: {
            totalAssessments,
            avgScore,
            totalQuestionsAnswered,
            totalCorrectAnswers,
            highestScore: userSubs.length ? Math.max(...userSubs.map(s => s.scorePercentage)) : 0
        },
        recentHistory: userSubs.slice(-10).reverse()
    };
}

// ========================================================
// 10. REWARD REDEMPTION & CUSTOMIZATION
// ========================================================

function redeemShopItem(studentId, itemId) {
    const store = loadStore();
    const student = ensureStudentState(studentId);
    const item = REWARD_SHOP_ITEMS.find(i => i.id === itemId);

    if (!item) {
        throw new Error("Item not found in reward catalog.");
    }
    if (student.unlockedItems.includes(itemId) && item.type !== "powerup") {
        throw new Error("You already own this item.");
    }
    if ((student.coins || 0) < item.costCoins) {
        throw new Error(`Insufficient LearnCoins. You have ${student.coins || 0} 🪙, but this item costs ${item.costCoins} 🪙.`);
    }

    // Deduct coins & add to inventory
    student.coins -= item.costCoins;
    if (item.type === "powerup") {
        student.streakFreezeCount = (student.streakFreezeCount || 0) + 1;
    } else {
        student.unlockedItems.push(itemId);
        // Automatically equip
        student.equipped[item.type] = itemId;
    }

    // Log transaction
    store.coin_transactions.push({
        id: crypto.randomUUID(),
        studentId,
        amount: -item.costCoins,
        source: "shop_redemption",
        referenceId: itemId,
        createdAt: new Date().toISOString()
    });

    // Check "smart_shopper" achievement
    if (!store.student_achievements[studentId]) store.student_achievements[studentId] = [];
    const hasShopperAch = store.student_achievements[studentId].some(a => a.achievementId === "smart_shopper");
    if (!hasShopperAch) {
        store.student_achievements[studentId].push({
            achievementId: "smart_shopper",
            unlockedAt: new Date().toISOString()
        });
    }

    saveStore();
    return {
        item,
        remainingCoins: student.coins,
        equipped: student.equipped
    };
}

function selectActiveAvatar(studentId, avatarId) {
    const store = loadStore();
    const student = ensureStudentState(studentId);
    const avatar = AVATARS.find(a => a.id === avatarId);

    if (!avatar) throw new Error("Avatar not found.");
    if (!student.unlockedAvatars.includes(avatarId)) {
        throw new Error("This avatar is currently locked. Complete more learning milestones to unlock it!");
    }

    student.activeAvatar = avatarId;
    saveStore();
    return { activeAvatar: avatar };
}

// ========================================================
// 11. TEACHER GAMIFICATION OVERVIEW
// ========================================================

async function getTeacherGamificationOverview() {
    const store = loadStore();
    let profilesList = [];

    if (supabase) {
        try {
            const { data } = await supabase.from("profiles")
                .select("id, user_id, name, email, role, class, xp, streak")
                .eq("role", "student");
            if (data) profilesList = data;
        } catch (e) {
            console.warn("Supabase profiles query warning:", e.message);
        }
    }

    const studentsOverview = profilesList.map(prof => {
        const sid = prof.user_id || prof.id;
        const studentGam = store.students[sid] || { coins: 0 };
        const subs = store.submissions.filter(s => s.studentId === sid);
        const achs = store.student_achievements[sid] || [];
        const lvl = calculateLevel(prof.xp || 0);

        // Calculate improvement
        let scoreGrowth = 0;
        if (subs.length >= 2) {
            const first = subs[0].scorePercentage;
            const latest = subs[subs.length - 1].scorePercentage;
            scoreGrowth = latest - first;
        }

        return {
            id: sid,
            name: prof.name || "Student",
            email: prof.email || "",
            classLevel: prof.class ? `Class ${prof.class}` : "Class 10",
            totalXp: prof.xp || 0,
            level: lvl,
            coins: studentGam.coins || 0,
            streak: prof.streak || 0,
            assessmentsCount: subs.length,
            achievementsCount: achs.length,
            scoreGrowth
        };
    });

    // Segmentations for Educational Insights
    const mostImproved = [...studentsOverview]
        .filter(s => s.scoreGrowth > 0)
        .sort((a, b) => b.scoreGrowth - a.scoreGrowth)
        .slice(0, 5);

    const consistencyChampions = [...studentsOverview]
        .sort((a, b) => b.streak - a.streak)
        .slice(0, 5);

    const topXpEarners = [...studentsOverview]
        .sort((a, b) => b.totalXp - a.totalXp)
        .slice(0, 5);

    return {
        totalStudents: studentsOverview.length,
        students: studentsOverview,
        mostImproved,
        consistencyChampions,
        topXpEarners
    };
}

module.exports = {
    LEVELS,
    AVATARS,
    ACHIEVEMENTS,
    REWARD_SHOP_ITEMS,
    CLASS_CHALLENGES,
    calculateLevel,
    getDailyMissions,
    getStudentDailyChallenges,
    completeDailyChallenge,
    computeStreakData,
    processQuizSubmission,
    getStudentGamificationProfile,
    redeemShopItem,
    selectActiveAvatar,
    getTeacherGamificationOverview
};
