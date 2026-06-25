-- ============================================================
-- Sobat — Add Patient and Doctor Fields & Drop Medicine Number Requirement
-- Run this in your Supabase SQL Editor
-- ============================================================

-- 1. Make medicine_number nullable
ALTER TABLE public.delivery_requests 
  ALTER COLUMN medicine_number DROP NOT NULL;

-- 2. Add patient_name, patient_dob, and doctor_name fields
ALTER TABLE public.delivery_requests
  ADD COLUMN IF NOT EXISTS patient_name TEXT,
  ADD COLUMN IF NOT EXISTS patient_dob DATE,
  ADD COLUMN IF NOT EXISTS doctor_name TEXT;
