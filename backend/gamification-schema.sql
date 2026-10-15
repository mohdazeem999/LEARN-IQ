-- ====================================================================
-- LearnIQ Complete Gamification & Student Data Migration Schema
-- Run this in your Supabase Project -> SQL Editor -> New Query -> Run
-- ====================================================================

-- 0. Ensure profiles table has coins and gamification columns
ALTER TABLE public.profiles 
    ADD COLUMN IF NOT EXISTS coins INT DEFAULT 50,
    ADD COLUMN IF NOT EXISTS active_avatar TEXT DEFAULT 'avatar_explorer',
    ADD COLUMN IF NOT EXISTS equipped_frame TEXT DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS equipped_theme TEXT DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS equipped_title TEXT DEFAULT NULL;

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

CREATE INDEX IF NOT EXISTS idx_quizzes_subject ON public.quizzes(subject);
CREATE INDEX IF NOT EXISTS idx_quizzes_class ON public.quizzes(class_level);
CREATE INDEX IF NOT EXISTS idx_quizzes_created_at ON public.quizzes(created_at DESC);

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

CREATE INDEX IF NOT EXISTS idx_quiz_subs_student ON public.quiz_submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_quiz_subs_quiz ON public.quiz_submissions(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_subs_submitted ON public.quiz_submissions(submitted_at DESC);

-- 3. XP Transaction Audit Log
CREATE TABLE IF NOT EXISTS public.xp_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id TEXT NOT NULL,
    amount INT NOT NULL,
    source TEXT NOT NULL,
    reference_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_xp_tx_student ON public.xp_transactions(student_id);
CREATE INDEX IF NOT EXISTS idx_xp_tx_created ON public.xp_transactions(created_at DESC);

-- 4. Student Achievements Table
CREATE TABLE IF NOT EXISTS public.student_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id TEXT NOT NULL,
    achievement_id TEXT NOT NULL,
    unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(student_id, achievement_id)
);

CREATE INDEX IF NOT EXISTS idx_achievements_student ON public.student_achievements(student_id);

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

-- Seed Initial Reward Catalog
INSERT INTO public.reward_items (id, name, type, icon, cost_coins, description)
VALUES 
    ('frame_neon', 'Cyber Neon Glow Frame', 'frame', 'fa-circle-notch', 80, 'Vibrant glowing border for your avatar card.'),
    ('frame_gold', 'Golden Scholar Frame', 'frame', 'fa-crown', 120, 'Prestigious gold border reflecting academic dedication.'),
    ('theme_matrix', 'Matrix Code Backdrop', 'theme', 'fa-terminal', 150, 'High-tech emerald code backdrop for your student card.'),
    ('theme_nebula', 'Deep Space Nebula Theme', 'theme', 'fa-meteor', 180, 'Galactic purple-blue gradient backdrop.'),
    ('title_math', 'Title: "Math Prodigy"', 'title', 'fa-certificate', 100, 'Display "Math Prodigy" badge under your name.'),
    ('title_ai', 'Title: "AI Pioneer"', 'title', 'fa-wand-magic-sparkles', 120, 'Display "AI Pioneer" badge under your name.'),
    ('title_thinker', 'Title: "Curious Thinker"', 'title', 'fa-lightbulb', 90, 'Display "Curious Thinker" title on your profile.'),
    ('streak_shield', 'Streak Freeze Shield', 'powerup', 'fa-shield', 200, 'Protects your learning streak if you miss a single day.')
ON CONFLICT (id) DO NOTHING;

-- 6. Student Reward Redemptions
CREATE TABLE IF NOT EXISTS public.reward_redemptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id TEXT NOT NULL,
    item_id TEXT REFERENCES public.reward_items(id) ON DELETE SET NULL,
    item_name TEXT NOT NULL,
    cost_coins INT NOT NULL,
    redeemed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_redemptions_student ON public.reward_redemptions(student_id);

-- 7. Enable Row Level Security (RLS)
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.xp_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_redemptions ENABLE ROW LEVEL SECURITY;

-- 8. RLS Policies
-- Allow anyone authenticated to read quizzes & reward catalog
CREATE POLICY "Public read quizzes" ON public.quizzes FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "Public read reward items" ON public.reward_items FOR SELECT TO authenticated, anon USING (true);

-- Allow students to read their own records
CREATE POLICY "Students read own submissions" ON public.quiz_submissions 
    FOR SELECT TO authenticated 
    USING (student_id = auth.uid()::text);

CREATE POLICY "Students read own achievements" ON public.student_achievements 
    FOR SELECT TO authenticated 
    USING (student_id = auth.uid()::text);

CREATE POLICY "Students read own redemptions" ON public.reward_redemptions 
    FOR SELECT TO authenticated 
    USING (student_id = auth.uid()::text);

CREATE POLICY "Students read own xp transactions" ON public.xp_transactions 
    FOR SELECT TO authenticated 
    USING (student_id = auth.uid()::text);

-- Allow Service Role full access to insert/update across tables
CREATE POLICY "Service role manages quizzes" ON public.quizzes FOR ALL TO service_role USING (true);
CREATE POLICY "Service role manages submissions" ON public.quiz_submissions FOR ALL TO service_role USING (true);
CREATE POLICY "Service role manages xp transactions" ON public.xp_transactions FOR ALL TO service_role USING (true);
CREATE POLICY "Service role manages achievements" ON public.student_achievements FOR ALL TO service_role USING (true);
CREATE POLICY "Service role manages reward items" ON public.reward_items FOR ALL TO service_role USING (true);
CREATE POLICY "Service role manages redemptions" ON public.reward_redemptions FOR ALL TO service_role USING (true);
