/**
 * Gamification Level Math: Computes student levels, titles, and progress
 */

const { LEVELS } = require("./catalogs");

/**
 * Calculates current level details based on total accumulated XP.
 * @param {number} totalXp
 * @returns {object} Level metadata and progress
 */
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

module.exports = {
    calculateLevel
};
