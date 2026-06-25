-- ============================================================
-- Sobat — Add Pickup Date Column
-- Run this in your Supabase SQL Editor
-- ============================================================

ALTER TABLE public.delivery_requests
  ADD COLUMN IF NOT EXISTS pickup_date DATE;
