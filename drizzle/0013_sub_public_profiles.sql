-- Phase 1: Subcontractor Public Profiles
-- Add fields for license/insurance document uploads and pricing ranges

ALTER TABLE "subcontractors" ADD COLUMN IF NOT EXISTS "license_url" text;
ALTER TABLE "subcontractors" ADD COLUMN IF NOT EXISTS "insurance_url" text;
ALTER TABLE "subcontractors" ADD COLUMN IF NOT EXISTS "pricing_ranges" jsonb;
