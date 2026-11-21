-- CleanCommons Supabase PostgreSQL Schema
-- Run this script once in your Supabase Dashboard -> SQL Editor

create table if not exists public.cleanup_spots (
  id text primary key,
  title text not null,
  description text not null default '',
  address text not null,
  neighborhood text not null default 'Neighborhood',
  lat double precision not null,
  lng double precision not null,
  priority text not null check (priority in ('high', 'medium', 'low')) default 'medium',
  status text not null check (status in ('needs_cleanup', 'scheduled', 'cleaned')) default 'needs_cleanup',
  waste_types text[] not null default '{}',
  photo_url text not null,
  after_photo_url text,
  reported_by text not null default 'Community Member',
  created_at timestamptz not null default now(),
  cleaned_at timestamptz,
  bags_collected integer,
  upvotes integer not null default 1
);

create index if not exists idx_cleanup_spots_status on public.cleanup_spots (status);
create index if not exists idx_cleanup_spots_created_at on public.cleanup_spots (created_at desc);

create table if not exists public.cleanup_events (
  id text primary key,
  spot_id text references public.cleanup_spots(id) on delete set null,
  title text not null,
  description text not null default '',
  location_name text not null,
  meeting_point text not null default '',
  lat double precision not null,
  lng double precision not null,
  date text not null,
  start_time text not null default '09:30',
  duration_hours double precision not null default 2,
  organizer text not null default 'Neighborhood Host',
  supplies_provided text[] not null default '{}',
  max_volunteers integer not null default 15,
  volunteers jsonb not null default '[]'::jsonb,
  comments jsonb not null default '[]'::jsonb,
  banner_url text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_cleanup_events_date on public.cleanup_events (date asc);
create index if not exists idx_cleanup_events_spot_id on public.cleanup_events (spot_id);

-- Enable Row Level Security (server uses SUPABASE_SERVICE_ROLE_KEY, which safely enforces validation in Express)
alter table public.cleanup_spots enable row level security;
alter table public.cleanup_events enable row level security;

-- Public read-only access if queried directly; all mutations flow through the Express backend
drop policy if exists "Public read cleanup_spots" on public.cleanup_spots;
create policy "Public read cleanup_spots"
  on public.cleanup_spots for select
  using (true);

drop policy if exists "Public read cleanup_events" on public.cleanup_events;
create policy "Public read cleanup_events"
  on public.cleanup_events for select
  using (true);

-- Optional Storage bucket for uploaded before/after cleanup photos
insert into storage.buckets (id, name, public)
values ('cleanup-photos', 'cleanup-photos', true)
on conflict (id) do nothing;

drop policy if exists "Public read cleanup photos" on storage.objects;
create policy "Public read cleanup photos"
  on storage.objects for select
  using (bucket_id = 'cleanup-photos');
