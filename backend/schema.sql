-- ========================================================
-- LearnIQ Supabase Database Schema
-- Paste this script into your Supabase SQL Editor
-- ========================================================

-- 1. Profiles Table (Students and Teachers)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'student', -- 'student' | 'teacher'
    class_level TEXT DEFAULT 'Class 10',
    xp_points INT DEFAULT 2480,
    streak_days INT DEFAULT 12,
    rank_position INT DEFAULT 7,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Quizzes Table (AI Generated Quizzes)
CREATE TABLE IF NOT EXISTS public.quizzes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    subject TEXT NOT NULL,
    class_level TEXT NOT NULL,
    difficulty TEXT NOT NULL,
    created_by TEXT DEFAULT 'AI_Generator',
    questions JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Quiz Submissions & AI Gap Analysis Table
CREATE TABLE IF NOT EXISTS public.quiz_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id UUID REFERENCES public.quizzes(id) ON DELETE CASCADE,
    student_id TEXT NOT NULL,
    score_percentage INT NOT NULL,
    correct_count INT NOT NULL,
    total_questions INT NOT NULL,
    xp_earned INT NOT NULL,
    ai_insight TEXT,
    mistake_categories JSONB,
    concept_stats JSONB,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Classroom Learning Maps Table
CREATE TABLE IF NOT EXISTS public.class_learning_maps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_name TEXT NOT NULL,
    concept_name TEXT NOT NULL,
    mastery_percentage INT NOT NULL,
    status TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Rewards Store Catalog Table
CREATE TABLE IF NOT EXISTS public.rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    cost_xp INT NOT NULL,
    icon_name TEXT DEFAULT 'fa-medal',
    stock_available INT DEFAULT 50,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Student Reward Redemptions Table
CREATE TABLE IF NOT EXISTS public.reward_redemptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id TEXT NOT NULL,
    reward_title TEXT NOT NULL,
    cost_xp INT NOT NULL,
    status TEXT DEFAULT 'approved',
    redeemed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed Sample Rewards Data
INSERT INTO public.rewards (title, description, cost_xp, icon_name)
VALUES
    ('Scholar Badge', 'Show your learning achievement on your profile', 500, 'fa-medal'),
    ('Learning Rocket', 'Awarded for consistent 7-day improvement', 800, 'fa-rocket'),
    ('Master Crown', 'Demonstrate 90%+ concept mastery', 1500, 'fa-crown'),
    ('30 Day Streak', 'Celebrate long-term consistency', 2000, 'fa-fire')
ON CONFLICT DO NOTHING;
