-- Link existing profiles to Supabase Auth users by their existing email.
-- Apply in the Supabase SQL Editor before deploying the updated backend.
-- Rename legacy profile fields to the names used by the current backend.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'full_name')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'name') THEN
        ALTER TABLE public.profiles RENAME COLUMN full_name TO name;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'class_level')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'class') THEN
        ALTER TABLE public.profiles RENAME COLUMN class_level TO class;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'xp_points')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'xp') THEN
        ALTER TABLE public.profiles RENAME COLUMN xp_points TO xp;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'streak_days')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'streak') THEN
        ALTER TABLE public.profiles RENAME COLUMN streak_days TO streak;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'rank_position')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'rank') THEN
        ALTER TABLE public.profiles RENAME COLUMN rank_position TO rank;
    END IF;
END $$;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.profiles ALTER COLUMN class TYPE INT USING
    CASE WHEN class::TEXT ~ '[0-9]+' THEN substring(class::TEXT from '[0-9]+')::INT ELSE 10 END;

ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

UPDATE public.profiles AS profile
SET user_id = auth_user.id
FROM auth.users AS auth_user
WHERE profile.user_id IS NULL
  AND profile.email IS NOT NULL
  AND lower(profile.email) = lower(auth_user.email);

CREATE UNIQUE INDEX IF NOT EXISTS profiles_user_id_unique
    ON public.profiles (user_id);

-- Profile reads and writes go through the authenticated backend using its
-- server-only Supabase key; do not grant direct anon access to this table.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
