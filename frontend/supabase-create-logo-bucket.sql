-- ============================================================
-- Sobat — Create Storage Bucket for Pharmacy Logos & Set RLS Policies
-- Run this in your Supabase SQL Editor
-- ============================================================

-- 1. Register the bucket if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('pharmacy-logos', 'pharmacy-logos', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Create select policy (Public Access)
CREATE POLICY "Public access to pharmacy-logos" ON storage.objects
  FOR SELECT USING (bucket_id = 'pharmacy-logos');

-- 3. Create modify policy (Pharmacy staff can manage their own folder)
CREATE POLICY "Pharmacy staff can manage logos" ON storage.objects
  FOR ALL USING (
    bucket_id = 'pharmacy-logos' AND
    (EXISTS (
      SELECT 1 FROM public.pharmacy_staff ps
      WHERE ps.user_id = auth.uid()
        AND ps.pharmacy_id::text = split_part(name, '/', 1)
        AND ps.staff_role IN ('owner', 'admin')
        AND ps.is_active = true
    ))
  );
