-- ============================================================
-- Ambil Obat — Super Admin RLS Policies Fix
-- Run this in your Supabase SQL Editor to fix permission errors
-- ============================================================

-- 1. Create a helper function to safely check if the logged in user is a Super Admin
-- This uses SECURITY DEFINER to bypass RLS recursion on the public.users table
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN COALESCE(
    (SELECT role = 'super_admin' FROM public.users WHERE id = auth.uid()),
    FALSE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Grant ALL permissions on pharmacies to Super Admins
CREATE POLICY "Superadmins can manage pharmacies" ON public.pharmacies
  FOR ALL TO authenticated USING (public.is_super_admin());

-- 3. Grant ALL permissions on pharmacy_staff to Super Admins
CREATE POLICY "Superadmins can manage pharmacy staff" ON public.pharmacy_staff
  FOR ALL TO authenticated USING (public.is_super_admin());

-- 4. Allow Super Admins to SELECT all user profiles
CREATE POLICY "Superadmins can view all users" ON public.users
  FOR SELECT TO authenticated USING (auth.uid() = id OR public.is_super_admin());

-- 5. Allow Super Admins to UPDATE any user (useful for setting roles)
CREATE POLICY "Superadmins can update all users" ON public.users
  FOR UPDATE TO authenticated USING (auth.uid() = id OR public.is_super_admin());

-- 6. Allow Super Admins to view all delivery requests for dashboard metrics
CREATE POLICY "Superadmins can view all requests" ON public.delivery_requests
  FOR SELECT TO authenticated USING (public.is_super_admin());
