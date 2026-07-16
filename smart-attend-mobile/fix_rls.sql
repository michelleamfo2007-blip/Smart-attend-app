-- Disable RLS since the app uses custom authentication
ALTER TABLE public.attendance_sessions DISABLE ROW LEVEL SECURITY;

-- Alternatively, if you want to keep RLS enabled but allow all operations:
DROP POLICY IF EXISTS "Lecturers can create sessions" ON public.attendance_sessions;
DROP POLICY IF EXISTS "Lecturers can update their own sessions" ON public.attendance_sessions;
DROP POLICY IF EXISTS "Everyone can view attendance sessions" ON public.attendance_sessions;

CREATE POLICY "Allow all operations for anon" ON public.attendance_sessions
    FOR ALL USING (true) WITH CHECK (true);
