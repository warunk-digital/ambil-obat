-- ============================================================
-- Ambil Obat — Database Schema
-- Run this in your Supabase SQL Editor
-- ============================================================

-- 1. Users (extends Supabase Auth)
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'customer'
    CHECK (role IN ('customer', 'admin', 'super_admin')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, full_name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', NEW.phone)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Pharmacies
CREATE TABLE public.pharmacies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  phone TEXT,
  logo_url TEXT,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  delivery_radius_km DOUBLE PRECISION NOT NULL DEFAULT 10,
  delivery_fee_base INTEGER NOT NULL DEFAULT 5000,
  delivery_fee_per_km INTEGER NOT NULL DEFAULT 2000,
  operating_hours JSONB DEFAULT '{
    "mon": {"open": "08:00", "close": "21:00"},
    "tue": {"open": "08:00", "close": "21:00"},
    "wed": {"open": "08:00", "close": "21:00"},
    "thu": {"open": "08:00", "close": "21:00"},
    "fri": {"open": "08:00", "close": "21:00"},
    "sat": {"open": "08:00", "close": "17:00"},
    "sun": {"open": "closed", "close": "closed"}
  }'::jsonb,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Haversine distance function
CREATE OR REPLACE FUNCTION calculate_distance_km(
  lat1 DOUBLE PRECISION, lng1 DOUBLE PRECISION,
  lat2 DOUBLE PRECISION, lng2 DOUBLE PRECISION
) RETURNS DOUBLE PRECISION AS $$
BEGIN
  RETURN 6371 * acos(
    LEAST(1.0, GREATEST(-1.0,
      cos(radians(lat1)) * cos(radians(lat2)) *
      cos(radians(lng2) - radians(lng1)) +
      sin(radians(lat1)) * sin(radians(lat2))
    ))
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Check if within delivery radius
CREATE OR REPLACE FUNCTION is_within_delivery_radius(
  pharmacy_lat DOUBLE PRECISION,
  pharmacy_lng DOUBLE PRECISION,
  dest_lat DOUBLE PRECISION,
  dest_lng DOUBLE PRECISION,
  radius_km DOUBLE PRECISION
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN calculate_distance_km(pharmacy_lat, pharmacy_lng, dest_lat, dest_lng) <= radius_km;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 3. Pharmacy Staff (admin & courier)
CREATE TABLE public.pharmacy_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  pharmacy_id UUID NOT NULL REFERENCES public.pharmacies(id) ON DELETE CASCADE,
  staff_role TEXT NOT NULL DEFAULT 'courier'
    CHECK (staff_role IN ('owner', 'admin', 'courier')),
  is_active BOOLEAN DEFAULT TRUE,
  is_available BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, pharmacy_id)
);

-- 4. Addresses
CREATE TABLE public.addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  label TEXT NOT NULL DEFAULT 'Rumah',
  full_address TEXT NOT NULL,
  detail TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Delivery Requests (main table)
CREATE TABLE public.delivery_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_number TEXT UNIQUE NOT NULL DEFAULT '',
  user_id UUID NOT NULL REFERENCES public.users(id),
  pharmacy_id UUID NOT NULL REFERENCES public.pharmacies(id),
  address_id UUID NOT NULL REFERENCES public.addresses(id),
  courier_id UUID REFERENCES public.users(id),
  medicine_number TEXT NOT NULL,
  medicine_description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'confirmed', 'courier_assigned',
    'picked_up', 'on_delivery', 'delivered', 'cancelled'
  )),
  delivery_fee INTEGER NOT NULL DEFAULT 0,
  distance_km DOUBLE PRECISION,
  payment_method TEXT DEFAULT 'cod' CHECK (payment_method IN ('cod')),
  payment_status TEXT DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid')),
  notes TEXT,
  delivery_proof_url TEXT,
  estimated_delivery TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-generate request number
CREATE OR REPLACE FUNCTION generate_request_number()
RETURNS TRIGGER AS $$
DECLARE
  today_count INTEGER;
  today_str TEXT;
BEGIN
  today_str := TO_CHAR(NOW(), 'YYYYMMDD');
  SELECT COUNT(*) + 1 INTO today_count
  FROM public.delivery_requests
  WHERE TO_CHAR(created_at, 'YYYYMMDD') = today_str;

  NEW.request_number := 'REQ-' || today_str || '-' || LPAD(today_count::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_request_number
  BEFORE INSERT ON public.delivery_requests
  FOR EACH ROW
  WHEN (NEW.request_number IS NULL OR NEW.request_number = '')
  EXECUTE FUNCTION generate_request_number();

-- 6. Request Status Logs
CREATE TABLE public.request_status_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.delivery_requests(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  note TEXT,
  changed_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-log status changes
CREATE OR REPLACE FUNCTION log_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.request_status_logs (request_id, status, note, changed_by)
    VALUES (NEW.id, NEW.status, 'Status: ' || OLD.status || ' → ' || NEW.status, NULL);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_status_change
  AFTER UPDATE ON public.delivery_requests
  FOR EACH ROW EXECUTE FUNCTION log_status_change();

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pharmacies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pharmacy_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.request_status_logs ENABLE ROW LEVEL SECURITY;

-- USERS
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- PHARMACIES
CREATE POLICY "Anyone can view active pharmacies" ON public.pharmacies
  FOR SELECT USING (is_active = TRUE);
CREATE POLICY "Staff can update own pharmacy" ON public.pharmacies
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.pharmacy_staff
      WHERE user_id = auth.uid() AND pharmacy_id = pharmacies.id
      AND staff_role IN ('owner', 'admin') AND is_active = TRUE
    )
  );

-- PHARMACY_STAFF
CREATE POLICY "Staff can view own record" ON public.pharmacy_staff
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Admin can view pharmacy staff" ON public.pharmacy_staff
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.pharmacy_staff ps
      WHERE ps.user_id = auth.uid() AND ps.pharmacy_id = pharmacy_staff.pharmacy_id
      AND ps.staff_role IN ('owner', 'admin')
    )
  );

-- ADDRESSES
CREATE POLICY "Users manage own addresses" ON public.addresses
  FOR ALL USING (auth.uid() = user_id);

-- DELIVERY_REQUESTS
CREATE POLICY "Customers view own requests" ON public.delivery_requests
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Pharmacy staff view pharmacy requests" ON public.delivery_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.pharmacy_staff
      WHERE user_id = auth.uid() AND pharmacy_id = delivery_requests.pharmacy_id
      AND is_active = TRUE
    )
  );
CREATE POLICY "Courier view assigned requests" ON public.delivery_requests
  FOR SELECT USING (auth.uid() = courier_id);
CREATE POLICY "Customers can create requests" ON public.delivery_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Staff can update pharmacy requests" ON public.delivery_requests
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.pharmacy_staff
      WHERE user_id = auth.uid() AND pharmacy_id = delivery_requests.pharmacy_id
      AND is_active = TRUE
    )
  );
CREATE POLICY "Courier can update assigned requests" ON public.delivery_requests
  FOR UPDATE USING (auth.uid() = courier_id);

-- STATUS LOGS
CREATE POLICY "Users view related status logs" ON public.request_status_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.delivery_requests dr
      WHERE dr.id = request_id AND (
        dr.user_id = auth.uid() OR
        dr.courier_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.pharmacy_staff
          WHERE user_id = auth.uid() AND pharmacy_id = dr.pharmacy_id
        )
      )
    )
  );
CREATE POLICY "Auth users can insert status logs" ON public.request_status_logs
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX idx_delivery_requests_user ON public.delivery_requests(user_id);
CREATE INDEX idx_delivery_requests_pharmacy ON public.delivery_requests(pharmacy_id);
CREATE INDEX idx_delivery_requests_courier ON public.delivery_requests(courier_id);
CREATE INDEX idx_delivery_requests_status ON public.delivery_requests(status);
CREATE INDEX idx_delivery_requests_created ON public.delivery_requests(created_at DESC);
CREATE INDEX idx_pharmacy_staff_user ON public.pharmacy_staff(user_id);
CREATE INDEX idx_pharmacy_staff_pharmacy ON public.pharmacy_staff(pharmacy_id);
CREATE INDEX idx_addresses_user ON public.addresses(user_id);
CREATE INDEX idx_request_status_logs_request ON public.request_status_logs(request_id);
