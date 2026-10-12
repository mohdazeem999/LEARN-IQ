-- ========================================================
-- LearnIQ Gamification & Student Rewards Database Schema
-- Paste this script into your Supabase SQL Editor
-- ========================================================

-- 1. Quizzes Table (AI Generated Quizzes)
CREATE TABLE IF NOT EXISTS public.quizzes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    subject TEXT NOT NULL,
    class_level TEXT NOT NULL,
    difficulty TEXT NOT NULL,
    created_by TEXT,
    questions JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Quiz Submissions & AI Gap Analysis Table
CREATE TABLE IF NOT EXISTS public.quiz_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id UUID REFERENCES public.quizzes(id) ON DELETE CASCADE,
    student_id TEXT NOT NULL,
    score_percentage INT NOT NULL,
    correct_count INT NOT NULL,
    total_questions INT NOT NULL,
    xp_earned INT NOT NULL,
    coins_earned INT DEFAULT 0,
    ai_insight TEXT,
    mistake_categories JSONB,
    concept_stats JSONB,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. XP Transaction Audit Log
CREATE TABLE IF NOT EXISTS public.xp_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id TEXT NOT NULL,
    amount INT NOT NULL,
    source TEXT NOT NULL,
    reference_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Student Achievements Table
CREATE TABLE IF NOT EXISTS public.student_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id TEXT NOT NULL,
    achievement_id TEXT NOT NULL,
    unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(student_id, achievement_id)
);

-- 5. Digital Rewards Catalog
CREATE TABLE IF NOT EXISTS public.reward_items (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    icon TEXT,
    cost_coins INT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Student Reward Redemptions
CREATE TABLE IF NOT EXISTS public.reward_redemptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id TEXT NOT NULL,
    item_id TEXT,
    item_name TEXT NOT NULL,
    cost_coins INT NOT NULL,
    redeemed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
