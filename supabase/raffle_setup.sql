-- Run this in the Supabase SQL editor

-- 1. Add raffle_tickets column to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS raffle_tickets integer NOT NULL DEFAULT 0;

-- 2. RPC to increment raffle tickets safely (atomic)
CREATE OR REPLACE FUNCTION increment_raffle_tickets(p_user_id uuid, p_count integer)
RETURNS void
LANGUAGE sql
AS $$
  UPDATE profiles
  SET raffle_tickets = raffle_tickets + p_count
  WHERE id = p_user_id;
$$;
