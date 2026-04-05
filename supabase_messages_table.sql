-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS messages (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title        text NOT NULL,
  body         text NOT NULL,
  read         boolean DEFAULT false NOT NULL,
  sender_type  text DEFAULT 'admin' NOT NULL, -- 'admin' | 'user'
  created_at   timestamptz DEFAULT now() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Users can read their own messages
CREATE POLICY "Users can view own messages"
  ON messages FOR SELECT
  USING (auth.uid() = user_id);

-- Users can mark their own messages as read
CREATE POLICY "Users can update own messages"
  ON messages FOR UPDATE
  USING (auth.uid() = user_id);

-- Admins (service role / Supabase dashboard) can insert for any user
-- Regular users can also insert (for future thank-you messages user→user)
CREATE POLICY "Authenticated users can insert messages"
  ON messages FOR INSERT
  WITH CHECK (true);

-- Example: send a message to a specific user (run from Supabase dashboard)
-- INSERT INTO messages (user_id, title, body)
-- VALUES ('<target-user-uuid>', 'Welcome to the Beta!', 'Thanks for being one of our first testers. We really appreciate your support — let us know how you get on!');

-- Example: broadcast to ALL users (run from Supabase dashboard)
-- INSERT INTO messages (user_id, title, body)
-- SELECT id, 'New Update Available', 'Version 1.1 is now live with improved warden detection. Update your app to get the latest features!'
-- FROM auth.users;
