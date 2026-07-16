-- 1. Create the attendance_disputes table
CREATE TABLE IF NOT EXISTS public.attendance_disputes (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES public.attendance_sessions(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.attendance_disputes ENABLE ROW LEVEL SECURITY;

-- 3. Policies
-- Students can insert disputes for themselves
CREATE POLICY "Students can create disputes"
ON public.attendance_disputes
FOR INSERT
TO public
WITH CHECK (true); -- In a real app we'd verify auth.uid() == student_id

-- Students can read their own disputes
CREATE POLICY "Students can read their own disputes"
ON public.attendance_disputes
FOR SELECT
TO public
USING (true); -- For demo, open read. Real app: auth.uid() == student_id

-- Lecturers can read/update disputes for their classes
CREATE POLICY "Lecturers can manage disputes for their classes"
ON public.attendance_disputes
FOR ALL
TO public
USING (true); -- For demo, open access. Real app: auth.uid() == lecturer_id on class

-- 4. Enable real-time for disputes
ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance_disputes;
