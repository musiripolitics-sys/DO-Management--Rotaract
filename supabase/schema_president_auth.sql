-- President password hash — stored per-profile, only populated for presidents
-- Run this in the Supabase SQL editor
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS president_password_hash TEXT;
