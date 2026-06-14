ALTER TABLE public.pharmacies 
ADD COLUMN delivery_fee_base_km DOUBLE PRECISION NOT NULL DEFAULT 1;
