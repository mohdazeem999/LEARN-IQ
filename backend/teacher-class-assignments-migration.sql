-- ========================================================
-- LearnIQ Database Migration: Teacher Class Assignments
-- ========================================================
-- This migration enforces class-scoped access control for educators:
-- Teachers can only view learning maps, students, and gamification
-- metrics for classes explicitly assigned to them by an administrator.

CREATE TABLE IF NOT EXISTS public.teacher_class_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    class INT NOT NULL CHECK (class >= 5 AND class <= 12),
    section TEXT DEFAULT 'Section A',
    subject TEXT DEFAULT 'All Curriculum Subjects',
    assigned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT teacher_class_section_unique UNIQUE (teacher_id, class, section)
);

-- Optimize class-scoping queries
CREATE INDEX IF NOT EXISTS idx_teacher_class_assignments_teacher
    ON public.teacher_class_assignments(teacher_id);

CREATE INDEX IF NOT EXISTS idx_teacher_class_assignments_class
    ON public.teacher_class_assignments(class);

-- Enable Row Level Security (RLS)
ALTER TABLE public.teacher_class_assignments ENABLE ROW LEVEL SECURITY;

-- Note: In LearnIQ architecture, all database queries are routed through
-- the server-side backend API using authenticated sessions with role validation.
