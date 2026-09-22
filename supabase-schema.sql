-- ============================================================
-- Student Course Registration System — Supabase schema
-- Run this once in Supabase: Dashboard → SQL Editor → New query
-- ============================================================

-- 1. Courses table
create table if not exists public.courses (
  id            uuid primary key default gen_random_uuid(),
  code          text not null unique,        -- e.g. CS201
  title         text not null,               -- e.g. Data Structures
  instructor    text not null,
  credits       int  not null default 3,
  capacity      int  not null default 30,
  created_at    timestamptz not null default now()
);

-- 2. Registrations table (join table: one student <-> one course)
create table if not exists public.registrations (
  id            uuid primary key default gen_random_uuid(),
  student_id    uuid not null references auth.users(id) on delete cascade,
  course_id     uuid not null references public.courses(id) on delete cascade,
  registered_at timestamptz not null default now(),
  unique (student_id, course_id)              -- can't register twice for the same course
);

-- 3. A view that adds "seats_taken" and "seats_left" to every course
create or replace view public.courses_with_seats as
select
  c.*,
  coalesce(r.taken, 0) as seats_taken,
  c.capacity - coalesce(r.taken, 0) as seats_left
from public.courses c
left join (
  select course_id, count(*) as taken
  from public.registrations
  group by course_id
) r on r.course_id = c.id;

-- 4. Row Level Security
alter table public.courses enable row level security;
alter table public.registrations enable row level security;

-- Anyone signed in can view the course catalogue
create policy "Courses are viewable by logged in users"
  on public.courses for select
  to authenticated
  using (true);

-- A student can see only their own registrations
create policy "Students can view their own registrations"
  on public.registrations for select
  to authenticated
  using (auth.uid() = student_id);

-- A student can register themselves for a course
create policy "Students can register themselves"
  on public.registrations for insert
  to authenticated
  with check (auth.uid() = student_id);

-- A student can drop their own registration
create policy "Students can drop their own registration"
  on public.registrations for delete
  to authenticated
  using (auth.uid() = student_id);

-- 5. Seed a few sample courses (optional — remove if you don't want demo data)
insert into public.courses (code, title, instructor, credits, capacity) values
  ('CS201', 'Data Structures & Algorithms', 'Dr. R. Patil',      4, 3),
  ('CS305', 'Database Systems',              'Dr. A. Kulkarni',  3, 3),
  ('CS410', 'Machine Learning',              'Dr. S. Naik',      4, 2),
  ('MA210', 'Discrete Mathematics',          'Prof. V. Desai',   3, 40),
  ('EC150', 'Digital Electronics',           'Prof. M. Joshi',   3, 35)
on conflict (code) do nothing;
