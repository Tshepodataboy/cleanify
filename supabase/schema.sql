-- CleanCommons Supabase PostgreSQL Schema with Row-Level Security (RLS)
-- Run this script in your Supabase Dashboard -> SQL Editor

create table if not exists public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  display_name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.cleanup_spots (
  id text primary key,
  owner_id uuid references auth.users(id) on delete set null,
  owner_email text,
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

-- Safe idempotent column additions for existing deployments
alter table public.cleanup_spots add column if not exists owner_id uuid references auth.users(id) on delete set null;
alter table public.cleanup_spots add column if not exists owner_email text;

create index if not exists idx_cleanup_spots_status on public.cleanup_spots (status);
create index if not exists idx_cleanup_spots_created_at on public.cleanup_spots (created_at desc);
create index if not exists idx_cleanup_spots_owner_id on public.cleanup_spots (owner_id);

create table if not exists public.cleanup_events (
  id text primary key,
  spot_id text references public.cleanup_spots(id) on delete set null,
  owner_id uuid references auth.users(id) on delete set null,
  owner_email text,
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

alter table public.cleanup_events add column if not exists owner_id uuid references auth.users(id) on delete set null;
alter table public.cleanup_events add column if not exists owner_email text;

create index if not exists idx_cleanup_events_date on public.cleanup_events (date asc);
create index if not exists idx_cleanup_events_spot_id on public.cleanup_events (spot_id);
create index if not exists idx_cleanup_events_owner_id on public.cleanup_events (owner_id);

-- Private RSVPs table protected by Row-Level Security (only the volunteer or event/spot reporter can read rows)
create table if not exists public.event_rsvps (
  id text primary key,
  event_id text not null references public.cleanup_events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  volunteer_name text not null,
  joined_at timestamptz not null default now(),
  unique (event_id, user_id)
);

create index if not exists idx_event_rsvps_event_id on public.event_rsvps (event_id);
create index if not exists idx_event_rsvps_user_id on public.event_rsvps (user_id);

-- Enable Row Level Security on all tables
alter table public.user_profiles enable row level security;
alter table public.cleanup_spots enable row level security;
alter table public.cleanup_events enable row level security;
alter table public.event_rsvps enable row level security;

-- user_profiles RLS: users can read, insert, and update only their own profile row
drop policy if exists "Users read own profile" on public.user_profiles;
create policy "Users read own profile"
  on public.user_profiles for select
  to authenticated
  using (auth.uid() = id);

drop policy if exists "Users insert own profile" on public.user_profiles;
create policy "Users insert own profile"
  on public.user_profiles for insert
  to authenticated
  with check (auth.uid() = id);

drop policy if exists "Users update own profile" on public.user_profiles;
create policy "Users update own profile"
  on public.user_profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- cleanup_spots RLS: public read, authenticated insert, strict owner-only update & delete
drop policy if exists "Public read cleanup_spots" on public.cleanup_spots;
create policy "Public read cleanup_spots"
  on public.cleanup_spots for select
  using (true);

drop policy if exists "Authenticated insert own cleanup_spots" on public.cleanup_spots;
create policy "Authenticated insert own cleanup_spots"
  on public.cleanup_spots for insert
  to authenticated
  with check (auth.uid() = owner_id);

drop policy if exists "Owner update cleanup_spots" on public.cleanup_spots;
create policy "Owner update cleanup_spots"
  on public.cleanup_spots for update
  to authenticated
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

drop policy if exists "Owner delete cleanup_spots" on public.cleanup_spots;
create policy "Owner delete cleanup_spots"
  on public.cleanup_spots for delete
  to authenticated
  using (auth.uid() = owner_id);

-- cleanup_events RLS: public read (with volunteers redacted by API), authenticated insert, owner-only update & delete
drop policy if exists "Public read cleanup_events" on public.cleanup_events;
create policy "Public read cleanup_events"
  on public.cleanup_events for select
  using (true);

drop policy if exists "Authenticated insert own cleanup_events" on public.cleanup_events;
create policy "Authenticated insert own cleanup_events"
  on public.cleanup_events for insert
  to authenticated
  with check (auth.uid() = owner_id);

drop policy if exists "Owner update cleanup_events" on public.cleanup_events;
create policy "Owner update cleanup_events"
  on public.cleanup_events for update
  to authenticated
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

drop policy if exists "Owner delete cleanup_events" on public.cleanup_events;
create policy "Owner delete cleanup_events"
  on public.cleanup_events for delete
  to authenticated
  using (auth.uid() = owner_id);

-- event_rsvps RLS: volunteer can read/insert/delete only their own row; spot/event owner can read full roster
drop policy if exists "Read own RSVP or reporter roster" on public.event_rsvps;
create policy "Read own RSVP or reporter roster"
  on public.event_rsvps for select
  to authenticated
  using (
    auth.uid() = user_id
    or exists (
      select 1
      from public.cleanup_events e
      left join public.cleanup_spots s on s.id = e.spot_id
      where e.id = event_rsvps.event_id
        and (e.owner_id = auth.uid() or s.owner_id = auth.uid())
    )
  );

drop policy if exists "Insert own RSVP" on public.event_rsvps;
create policy "Insert own RSVP"
  on public.event_rsvps for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Delete own RSVP" on public.event_rsvps;
create policy "Delete own RSVP"
  on public.event_rsvps for delete
  to authenticated
  using (auth.uid() = user_id);

-- Optional Storage bucket for uploaded before/after cleanup photos
insert into storage.buckets (id, name, public)
values ('cleanup-photos', 'cleanup-photos', true)
on conflict (id) do nothing;

drop policy if exists "Public read cleanup photos" on storage.objects;
create policy "Public read cleanup photos"
  on storage.objects for select
  using (bucket_id = 'cleanup-photos');

