-- ============================================================
-- Ambil Obat — Fix RLS Policy Recursion on pharmacy_staff
-- Run this in your Supabase SQL Editor
-- ============================================================

-- 1. Drop the recursive policy if it exists
DROP POLICY IF EXISTS "Admin can view pharmacy staff" ON public.pharmacy_staff;

-- 2. Create a SECURITY DEFINER function to safely check if the user is a pharmacy admin/owner
-- This bypasses RLS on pharmacy_staff during execution to prevent infinite recursion
CREATE OR REPLACE FUNCTION public.is_pharmacy_admin(p_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.pharmacy_staff
    WHERE user_id = auth.uid() 
      AND pharmacy_id = p_id
      AND staff_role IN ('owner', 'admin') 
      AND is_active = TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Re-create the policy using the security definer function
CREATE POLICY "Admin can view pharmacy staff" ON public.pharmacy_staff
  FOR SELECT TO authenticated USING (
    public.is_pharmacy_admin(pharmacy_id) OR public.is_super_admin()
  );
