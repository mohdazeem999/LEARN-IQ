const test = require("node:test");
const assert = require("node:assert/strict");
const gamificationService = require("../services/gamificationService");

test("level system accurately computes levels, titles, and progress bars", () => {
    // Level 1: Explorer (0-150)
    const lvl1 = gamificationService.calculateLevel(50);
    assert.equal(lvl1.levelNumber, 1);
    assert.equal(lvl1.title, "Explorer");
    assert.equal(lvl1.xpNeededForNext, 100);
    assert.equal(lvl1.progressPercent, 33);

    // Level 2: Learner (150-350)
    const lvl2 = gamificationService.calculateLevel(250);
    assert.equal(lvl2.levelNumber, 2);
    assert.equal(lvl2.title, "Learner");
    assert.equal(lvl2.xpInLevel, 100);
    assert.equal(lvl2.progressPercent, 50); // 100 / 200 span

    // Level 5: Achiever (1200-1800)
    const lvl5 = gamificationService.calculateLevel(1500);
    assert.equal(lvl5.levelNumber, 5);
    assert.equal(lvl5.title, "Achiever");

    // Level 11: Master (7200-9000)
    const lvl11 = gamificationService.calculateLevel(8500);
    assert.equal(lvl11.levelNumber, 11);
    assert.equal(lvl11.title, "Master");

    // Level 15: Supreme Luminary
    const lvl15 = gamificationService.calculateLevel(18000);
    assert.equal(lvl15.levelNumber, 15);
    assert.equal(lvl15.title, "Supreme Luminary");

    // Scalable levels beyond preset
    const lvl17 = gamificationService.calculateLevel(25000);
    assert.equal(lvl17.levelNumber, 17);
    assert.equal(lvl17.title, "Luminary Tier 3");
});

test("daily missions generation provides structured educational goals", () => {
    const studentId = "test_student_missions_123";
    const missions = gamificationService.getDailyMissions(studentId);
    assert.ok(Array.isArray(missions));
    assert.equal(missions.length, 4);
    assert.ok(missions.some(m => m.id === "mission_quiz"));
    assert.ok(missions.some(m => m.id === "mission_correct"));
    assert.ok(missions.some(m => m.id === "mission_score"));
    assert.ok(missions.some(m => m.id === "mission_weak"));
});

test("streak calculation creates an active weekday tracker", () => {
    const studentId = "test_student_streak_456";
    const streakData = gamificationService.computeStreakData(studentId, 5);
    assert.equal(streakData.streakDays, 5);
    assert.equal(streakData.weekDays.length, 7);
    assert.ok(streakData.weekDays.some(w => w.day === "Mon"));
    assert.ok(streakData.weekDays.some(w => w.day === "Fri"));
});

test("reward shop verifies coin balances and prevents fraudulent redemptions", () => {
    const studentId = "test_student_shop_789";

    // Attempt purchase of expensive item without sufficient balance
    assert.throws(() => {
        gamificationService.redeemShopItem(studentId, "streak_shield"); // costs 200 coins, student starts with 50
    }, /Insufficient LearnCoins/);
});

test("avatar system enforces progression-based unlocking", () => {
    const studentId = "test_student_avatar_001";
    // Attempt selecting locked avatar
    assert.throws(() => {
        gamificationService.selectActiveAvatar(studentId, "avatar_master_scholar");
    }, /This avatar is currently locked/);

    // Default explorer avatar is unlocked and selectable
    const selected = gamificationService.selectActiveAvatar(studentId, "avatar_explorer");
    assert.equal(selected.activeAvatar.id, "avatar_explorer");
});
