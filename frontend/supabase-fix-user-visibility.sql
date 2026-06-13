-- ============================================================
-- Fix User Visibility for Pharmacy Staff
-- ============================================================

-- 1. Allow pharmacy staff to view other staff members in the same pharmacy
-- This is needed so admins can see courier names and details.
CREATE POLICY "Staff can view other staff in same pharmacy" ON public.users
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.pharmacy_staff ps1
      JOIN public.pharmacy_staff ps2 ON ps1.pharmacy_id = ps2.pharmacy_id
      WHERE ps1.user_id = auth.uid() AND ps2.user_id = users.id
    )
  );

-- 2. Allow pharmacy staff to view customers who have ordered from their pharmacy
-- This is needed so admins and couriers can see the customer's phone number and name.
CREATE POLICY "Staff can view customers of their pharmacy" ON public.users
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.delivery_requests dr
      JOIN public.pharmacy_staff ps ON ps.pharmacy_id = dr.pharmacy_id
      WHERE dr.user_id = users.id 
      AND ps.user_id = auth.uid()
    )
  );
