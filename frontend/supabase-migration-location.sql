-- ============================================================
-- Ambil Obat — Location Fields Migration
-- Run this in your Supabase SQL Editor to support Kabupaten, Kecamatan, and Desa
-- ============================================================

-- Add columns to pharmacies table
ALTER TABLE public.pharmacies ADD COLUMN IF NOT EXISTS kabupaten TEXT;
ALTER TABLE public.pharmacies ADD COLUMN IF NOT EXISTS kecamatan TEXT;
ALTER TABLE public.pharmacies ADD COLUMN IF NOT EXISTS desa TEXT;

-- Add columns to addresses table
ALTER TABLE public.addresses ADD COLUMN IF NOT EXISTS kabupaten TEXT;
ALTER TABLE public.addresses ADD COLUMN IF NOT EXISTS kecamatan TEXT;
ALTER TABLE public.addresses ADD COLUMN IF NOT EXISTS desa TEXT;
