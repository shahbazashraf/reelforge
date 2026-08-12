-- ============================================================
-- ReelForge — Supabase SQL Schema
-- Run this in your Supabase project → SQL Editor
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ── Profiles (extends auth.users) ────────────────────────────────────────
create table public.profiles (
  id           uuid references auth.users(id) on delete cascade primary key,
  full_name    text,
  avatar_url   text,
  plan         text default 'free' check (plan in ('free','pro','team')),
  created_at   timestamptz default now()
);
alter table public.profiles enable row level security;
create policy "Users can view/update own profile"
  on public.profiles for all using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles(id, full_name, avatar_url)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── Projects ─────────────────────────────────────────────────────────────
create table public.projects (
  id            uuid default uuid_generate_v4() primary key,
  user_id       uuid references auth.users(id) on delete cascade not null,
  title         text not null default 'Untitled Project',
  status        text default 'draft' check (status in ('draft','processing','ready','published','scheduled')),
  aspect_ratio  text default '9:16' check (aspect_ratio in ('9:16','1:1','16:9','4:5')),
  caption       text,
  hashtags      text,
  output_url    text,
  thumbnail_url text,
  total_views   bigint default 0,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);
alter table public.projects enable row level security;
create policy "Users manage own projects"
  on public.projects for all using (auth.uid() = user_id);

-- Auto update updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;
create trigger projects_updated_at
  before update on public.projects
  for each row execute procedure public.set_updated_at();

-- ── Scenes ───────────────────────────────────────────────────────────────
create table public.scenes (
  id          uuid default uuid_generate_v4() primary key,
  project_id  uuid references public.projects(id) on delete cascade not null,
  "order"     int not null default 0,
  image_url   text,
  text        text,
  duration_ms int default 5000,
  transition  text default 'fade' check (transition in ('fade','slide','zoom','none')),
  ai_prompt   text,
  created_at  timestamptz default now()
);
alter table public.scenes enable row level security;
create policy "Users manage scenes via projects"
  on public.scenes for all
  using (exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid()));

-- ── Audio Tracks ─────────────────────────────────────────────────────────
create table public.audio_tracks (
  id          uuid default uuid_generate_v4() primary key,
  project_id  uuid references public.projects(id) on delete cascade not null,
  type        text default 'music' check (type in ('music','voice','sfx')),
  name        text not null,
  url         text not null,
  start_ms    int default 0,
  volume      float default 1.0,
  loop        boolean default false,
  created_at  timestamptz default now()
);
alter table public.audio_tracks enable row level security;
create policy "Users manage audio via projects"
  on public.audio_tracks for all
  using (exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid()));

-- ── Social Accounts ───────────────────────────────────────────────────────
create table public.social_accounts (
  id            uuid default uuid_generate_v4() primary key,
  user_id       uuid references auth.users(id) on delete cascade not null,
  platform      text not null check (platform in ('instagram','tiktok','facebook','twitter','youtube','snapchat')),
  username      text,
  display_name  text,
  profile_pic   text,
  page_id       text,
  platform_user_id text,        -- platform-specific user/page ID for posting
  followers     int default 0,
  status        text default 'active' check (status in ('active','error','expired')),
  access_token  text,           -- store encrypted; use Supabase vault in prod
  refresh_token text,
  token_expires timestamptz,
  created_at    timestamptz default now(),
  unique(user_id, platform)     -- one account per platform per user
);
alter table public.social_accounts enable row level security;
create policy "Users manage own social accounts"
  on public.social_accounts for all using (auth.uid() = user_id);

-- If table already exists, run this migration to add the column:
-- ALTER TABLE public.social_accounts ADD COLUMN IF NOT EXISTS platform_user_id text;

-- ── Publish Jobs ──────────────────────────────────────────────────────────
create table public.publish_jobs (
  id            uuid default uuid_generate_v4() primary key,
  project_id    uuid references public.projects(id) on delete cascade not null,
  user_id       uuid references auth.users(id) on delete cascade not null,
  platform      text not null,
  account_id    uuid references public.social_accounts(id),
  status        text default 'pending' check (status in ('pending','processing','published','failed','cancelled')),
  scheduled_at  timestamptz,
  published_at  timestamptz,
  post_url      text,
  post_id       text,
  error_msg     text,
  created_at    timestamptz default now()
);
alter table public.publish_jobs enable row level security;
create policy "Users manage own publish jobs"
  on public.publish_jobs for all using (auth.uid() = user_id);

-- ── Storage buckets ────────────────────────────────────────────────────────
-- Run in Supabase Dashboard → Storage → New Bucket
-- Bucket: "media"   → private, 50MB file limit
-- Bucket: "outputs" → private, 500MB file limit
-- Bucket: "avatars" → public,  5MB file limit

-- Storage policies (after creating buckets):
-- insert into storage.policies ...
-- (Use Supabase Dashboard UI for storage policies — easier)
