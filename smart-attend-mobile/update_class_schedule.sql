-- Add start_time and end_time to classes table
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS start_time TIME;
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS end_time TIME;

-- Update ONLY L5 Second Semester classes to 9:00 AM - 12:10 PM
UPDATE public.classes 
SET start_time = '09:00:00', end_time = '12:10:00' 
WHERE level = '5' AND semester ILIKE '%Second%';
