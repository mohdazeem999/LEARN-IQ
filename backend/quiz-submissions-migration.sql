-- LearnIQ - Quiz Submissions Idempotency & Unique Constraints Migration
-- Target Table: public.quiz_submissions
-- Note: SQL only - do not apply automatically. Execute via Supabase SQL Editor if desired.

-- 1. Add idempotency_key column if not already present
ALTER TABLE public.quiz_submissions
ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

-- 2. Unique index on idempotency_key (ignoring NULLs)
CREATE UNIQUE INDEX IF NOT EXISTS idx_quiz_submissions_idempotency
ON public.quiz_submissions (idempotency_key)
WHERE idempotency_key IS NOT NULL;

-- 3. Unique index on (student_id, quiz_id) to prevent duplicate submissions for the same quiz attempt
CREATE UNIQUE INDEX IF NOT EXISTS idx_quiz_submissions_student_quiz_unique
ON public.quiz_submissions (student_id, quiz_id);
