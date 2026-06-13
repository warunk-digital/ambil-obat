-- ============================================================
-- Add cancel_reason column to delivery_requests
-- ============================================================

ALTER TABLE public.delivery_requests ADD COLUMN IF NOT EXISTS cancel_reason TEXT;
