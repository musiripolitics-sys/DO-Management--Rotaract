-- Run this in the Supabase SQL Editor

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ri_id TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES public.profiles(id);
