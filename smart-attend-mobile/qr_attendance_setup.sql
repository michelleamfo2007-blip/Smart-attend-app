-- Create attendance_sessions table
CREATE TABLE IF NOT EXISTS public.attendance_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    lecturer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed')),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.attendance_sessions ENABLE ROW LEVEL SECURITY;

-- Policies for attendance_sessions
-- Lecturers can create their own sessions
CREATE POLICY "Lecturers can create sessions" ON public.attendance_sessions
    FOR INSERT WITH CHECK (auth.uid() = lecturer_id);

-- Lecturers can update their own sessions (to close them)
CREATE POLICY "Lecturers can update their own sessions" ON public.attendance_sessions
    FOR UPDATE USING (auth.uid() = lecturer_id);

-- Everyone (students and lecturers) can read sessions
CREATE POLICY "Everyone can view attendance sessions" ON public.attendance_sessions
    FOR SELECT USING (true);

-- Add session_id to attendance table
ALTER TABLE public.attendance_records ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES public.attendance_sessions(id) ON DELETE CASCADE;

-- Add a unique constraint to ensure a student can only scan a session once
ALTER TABLE public.attendance_records DROP CONSTRAINT IF EXISTS unique_student_session;
ALTER TABLE public.attendance_records ADD CONSTRAINT unique_student_session UNIQUE (student_id, session_id);
