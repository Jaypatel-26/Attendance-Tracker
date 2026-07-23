-- ========================================================
-- SUPABASE SCHEMA FOR ATTENDANCE TRACKER
-- Run this script in your Supabase SQL Editor
-- ========================================================

-- 1. Create Students Table
CREATE TABLE IF NOT EXISTS public.students (
    enrollment TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    batch TEXT NOT NULL,
    elective TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create Attendance Records Table
CREATE TABLE IF NOT EXISTS public.attendance_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    enrollment TEXT REFERENCES public.students(enrollment) ON DELETE CASCADE,
    date DATE NOT NULL,
    slots_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_locked BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(enrollment, date)
);

-- 3. Set up Realtime
-- Enable Realtime for the attendance_records table so the Admin Panel updates instantly
ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance_records;
ALTER PUBLICATION supabase_realtime ADD TABLE public.students;

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

-- 5. Create Policies (Permissive for development purposes)
-- NOTE: In a real production app, you would restrict these based on authentication!
CREATE POLICY "Allow public read access on students" ON public.students FOR SELECT USING (true);
CREATE POLICY "Allow public insert on students" ON public.students FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on students" ON public.students FOR UPDATE USING (true);

CREATE POLICY "Allow public read access on attendance_records" ON public.attendance_records FOR SELECT USING (true);
CREATE POLICY "Allow public insert on attendance_records" ON public.attendance_records FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on attendance_records" ON public.attendance_records FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on attendance_records" ON public.attendance_records FOR DELETE USING (true);
