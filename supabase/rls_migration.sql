-- ============================================================
-- DoublYellow — Row Level Security Migration
-- Run this in the Supabase SQL Editor (doubleyellow project)
-- https://supabase.com/dashboard/project/mihqpweuziyjuualslrp/sql
-- ============================================================
--
-- TABLES COVERED:
--   profiles        — user profiles (username, points, rank, push_token, tier)
--   parked_sessions — active parking sessions with location
--   warden_reports  — warden sighting reports
--   settings        — per-user notification/radius preferences
--   thanks          — thank-you messages between users
--
-- NOTES:
--   • Edge Functions (notify-warden, send-thanks) use the service_role key
--     and automatically bypass RLS — no changes needed there.
--   • "authenticated" = logged-in app user (has a valid JWT)
--   • (select auth.uid()) is used instead of auth.uid() for better performance
-- ============================================================


-- ──────────────────────────────────────────────────────────────
-- 1. PROFILES
-- ──────────────────────────────────────────────────────────────
alter table public.profiles enable row level security;

-- Anyone logged in can read any profile (needed for leaderboard,
-- username display, and thank-you screens)
create policy "profiles: authenticated users can read all"
  on public.profiles for select
  to authenticated
  using (true);

-- Users can only insert their own profile row (on signup)
create policy "profiles: users insert own"
  on public.profiles for insert
  to authenticated
  with check (id = (select auth.uid()));

-- Users can only update their own profile
create policy "profiles: users update own"
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Users can delete their own profile (account deletion)
create policy "profiles: users delete own"
  on public.profiles for delete
  to authenticated
  using (id = (select auth.uid()));


-- ──────────────────────────────────────────────────────────────
-- 2. PARKED SESSIONS
-- ──────────────────────────────────────────────────────────────
alter table public.parked_sessions enable row level security;

-- Users can only read their own parking sessions
-- (The notify-warden Edge Function reads ALL sessions but uses
--  service_role key, so it bypasses RLS automatically)
create policy "parked_sessions: users read own"
  on public.parked_sessions for select
  to authenticated
  using (user_id = (select auth.uid()));

-- Users can start their own session
create policy "parked_sessions: users insert own"
  on public.parked_sessions for insert
  to authenticated
  with check (user_id = (select auth.uid()));

-- Users can update their own session (e.g. deactivate it)
create policy "parked_sessions: users update own"
  on public.parked_sessions for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Users can delete their own session
create policy "parked_sessions: users delete own"
  on public.parked_sessions for delete
  to authenticated
  using (user_id = (select auth.uid()));


-- ──────────────────────────────────────────────────────────────
-- 3. WARDEN REPORTS
-- ──────────────────────────────────────────────────────────────
alter table public.warden_reports enable row level security;

-- All logged-in users can read warden reports — this is the core
-- feature: seeing warden sightings on the map
create policy "warden_reports: authenticated users can read all"
  on public.warden_reports for select
  to authenticated
  using (true);

-- Any logged-in user can submit a warden report
create policy "warden_reports: authenticated users can insert"
  on public.warden_reports for insert
  to authenticated
  with check (user_id = (select auth.uid()));

-- Only the original reporter can update their own report
create policy "warden_reports: users update own"
  on public.warden_reports for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Only the original reporter can delete their own report
create policy "warden_reports: users delete own"
  on public.warden_reports for delete
  to authenticated
  using (user_id = (select auth.uid()));


-- ──────────────────────────────────────────────────────────────
-- 4. SETTINGS
-- ──────────────────────────────────────────────────────────────
alter table public.settings enable row level security;

-- Users can only read their own settings
create policy "settings: users read own"
  on public.settings for select
  to authenticated
  using (user_id = (select auth.uid()));

-- Users can insert their own settings row
create policy "settings: users insert own"
  on public.settings for insert
  to authenticated
  with check (user_id = (select auth.uid()));

-- Users can update their own settings
create policy "settings: users update own"
  on public.settings for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Users can delete their own settings
create policy "settings: users delete own"
  on public.settings for delete
  to authenticated
  using (user_id = (select auth.uid()));


-- ──────────────────────────────────────────────────────────────
-- 5. THANKS
-- ──────────────────────────────────────────────────────────────
alter table public.thanks enable row level security;

-- Users can read thanks they sent or received
create policy "thanks: users read own"
  on public.thanks for select
  to authenticated
  using (
    from_user_id = (select auth.uid()) or
    to_user_id   = (select auth.uid())
  );

-- Any authenticated user can send thanks
-- (send-thanks Edge Function uses service_role and bypasses RLS,
--  but this policy keeps direct API calls safe too)
create policy "thanks: authenticated users can insert"
  on public.thanks for insert
  to authenticated
  with check (from_user_id = (select auth.uid()));

-- Users can delete thanks they sent
create policy "thanks: users delete own"
  on public.thanks for delete
  to authenticated
  using (from_user_id = (select auth.uid()));


-- ──────────────────────────────────────────────────────────────
-- DONE — verify with:
-- select tablename, rowsecurity from pg_tables
-- where schemaname = 'public';
-- ──────────────────────────────────────────────────────────────
