-- 1. Add the invite_code column to the classes table.
-- We use a UNIQUE constraint so no two classes have the exact same invite code.
ALTER TABLE public.classes
ADD COLUMN IF NOT EXISTS invite_code TEXT UNIQUE;

-- 2. Ensure that users who are NOT logged in yet (during registration)
-- can securely check if an invite_code exists in the classes table.
-- We create a policy to allow public reads for the classes table.
-- First, drop if exists to prevent errors.
DROP POLICY IF EXISTS "Allow public read access to classes for registration" ON public.classes;

CREATE POLICY "Allow public read access to classes for registration"
ON public.classes
FOR SELECT
TO public
USING (true);
