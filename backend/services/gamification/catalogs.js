/**
 * Gamification Catalogs: Levels, Avatars, Achievements, and Reward Shop Items
 */

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

module.exports = {
    LEVELS,
    AVATARS,
    ACHIEVEMENTS,
    REWARD_SHOP_ITEMS
};
