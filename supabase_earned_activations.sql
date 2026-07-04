-- ─────────────────────────────────────────────────────────────────────────────
-- Earned Activations Table
-- Run this in the Supabase SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS earned_activations (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  granted_at  timestamptz NOT NULL DEFAULT now(),
  expires_at  timestamptz,           -- NULL = never expires (Pro tier earns never expire)
  used_at     timestamptz,           -- NULL = not yet used
  source      text        NOT NULL DEFAULT 'warden_report',
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Index for fast per-user lookups
CREATE INDEX IF NOT EXISTS earned_activations_user_id_idx ON earned_activations(user_id);

-- Row Level Security
ALTER TABLE earned_activations ENABLE ROW LEVEL SECURITY;

-- Users can read their own credits
CREATE POLICY "Users can view own earned activations"
  ON earned_activations FOR SELECT
  USING (auth.uid() = user_id);

-- Users can mark their own credits as used (update used_at)
CREATE POLICY "Users can update own earned activations"
  ON earned_activations FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can insert their own earned credits (granted by app logic after report)
CREATE POLICY "Users can insert own earned activations"
  ON earned_activations FOR INSERT
  WITH CHECK (auth.uid() = user_id);
