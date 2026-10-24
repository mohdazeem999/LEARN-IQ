-- ====================================================================
-- LearnIQ Daily Curriculum Challenges & Idempotency Migration
-- DO NOT APPLY AUTOMATICALLY. Run in Supabase SQL Editor upon approval.
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.student_challenge_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id TEXT NOT NULL,
    challenge_id TEXT NOT NULL,
    date_key TEXT NOT NULL, -- Format: 'YYYY-MM-DD'
    score_percentage INT NOT NULL DEFAULT 0,
    correct_count INT NOT NULL DEFAULT 0,
    total_questions INT NOT NULL DEFAULT 0,
    earned_xp INT NOT NULL DEFAULT 0,
    earned_coins INT NOT NULL DEFAULT 0,
    completed BOOLEAN NOT NULL DEFAULT false,
    claimed BOOLEAN NOT NULL DEFAULT false,
    submitted_answers JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_student_daily_challenge UNIQUE (student_id, challenge_id, date_key)
);

CREATE INDEX IF NOT EXISTS idx_challenge_attempts_student_date 
    ON public.student_challenge_attempts (student_id, date_key);

CREATE INDEX IF NOT EXISTS idx_challenge_attempts_challenge 
    ON public.student_challenge_attempts (challenge_id);

-- Enable RLS
ALTER TABLE public.student_challenge_attempts ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Students read own challenge attempts" 
    ON public.student_challenge_attempts 
    FOR SELECT 
    TO authenticated 
    USING (student_id = auth.uid()::text);

CREATE POLICY "Service role manages challenge attempts" 
    ON public.student_challenge_attempts 
    FOR ALL 
    TO service_role 
    USING (true);
