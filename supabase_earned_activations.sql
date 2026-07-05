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

-- Users can mark their own credits as used (update used_at only — not grant new ones)
-- This restricts UPDATE so used_at can only be set to a non-null timestamp,
-- preventing a user from un-using a credit by setting used_at back to NULL.
CREATE POLICY "Users can mark own earned activations as used"
  ON earned_activations FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (used_at IS NOT NULL);

-- ─────────────────────────────────────────────────────────────────────────────
-- SECURITY: Credits are granted by a DB trigger, NOT by the client app.
-- This prevents users from inserting credits for themselves via the API.
-- ─────────────────────────────────────────────────────────────────────────────

-- Function: grant a credit whenever a user hits a new multiple of 10
-- photo-verified warden reports.
CREATE OR REPLACE FUNCTION grant_earned_activation()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_tier        text;
  v_verified    int;
  v_granted     int;
  v_should_have int;
  v_expires_at  timestamptz;
BEGIN
  -- Only fire on photo-verified reports
  IF NEW.photo_verified IS NOT TRUE THEN
    RETURN NEW;
  END IF;

  -- Count total photo-verified reports for this user
  SELECT COUNT(*) INTO v_verified
    FROM warden_reports
   WHERE user_id = NEW.user_id AND photo_verified = TRUE;

  -- Count credits already granted from reports
  SELECT COUNT(*) INTO v_granted
    FROM earned_activations
   WHERE user_id = NEW.user_id AND source = 'warden_report';

  v_should_have := FLOOR(v_verified / 10);

  IF v_should_have > v_granted THEN
    -- Look up user tier for expiry logic
    SELECT tier INTO v_tier FROM profiles WHERE id = NEW.user_id;

    -- Free tier credits expire in 14 days; Pro credits never expire
    IF v_tier = 'free' OR v_tier IS NULL THEN
      v_expires_at := now() + INTERVAL '14 days';
    ELSE
      v_expires_at := NULL;
    END IF;

    INSERT INTO earned_activations (user_id, expires_at, source)
    VALUES (NEW.user_id, v_expires_at, 'warden_report');
  END IF;

  RETURN NEW;
END;
$$;

-- Attach the trigger to warden_reports
DROP TRIGGER IF EXISTS trg_grant_earned_activation ON warden_reports;
CREATE TRIGGER trg_grant_earned_activation
  AFTER INSERT ON warden_reports
  FOR EACH ROW EXECUTE FUNCTION grant_earned_activation();
