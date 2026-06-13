-- ============================================================
-- Add Soft Delete to Addresses Table
-- ============================================================

-- 1. Add the new column
ALTER TABLE public.addresses ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;

-- 2. Create an index to optimize filtering out deleted addresses
CREATE INDEX IF NOT EXISTS idx_addresses_is_deleted ON public.addresses(is_deleted);
