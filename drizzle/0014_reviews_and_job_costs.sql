-- Phase 2: Reviews + Job Cost Tracking

-- Reviewer type enum
DO $$ BEGIN
  CREATE TYPE reviewer_type AS ENUM ('builder', 'homeowner');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subcontractor_id UUID NOT NULL REFERENCES subcontractors(id),
  service_request_id UUID REFERENCES service_requests(id),
  builder_id UUID REFERENCES builders(id),
  home_id UUID REFERENCES homes(id),
  reviewer_type reviewer_type NOT NULL,
  reviewer_name TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  trade_category TEXT,
  is_public BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP DEFAULT now() NOT NULL
);

-- Indexes for reviews
CREATE INDEX IF NOT EXISTS idx_reviews_subcontractor_id ON reviews(subcontractor_id);
CREATE INDEX IF NOT EXISTS idx_reviews_service_request_id ON reviews(service_request_id);
CREATE INDEX IF NOT EXISTS idx_reviews_builder_id ON reviews(builder_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating);

-- Job cost column on service_requests
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS job_cost_cents INTEGER;

-- RLS for reviews (tenant isolation)
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Builders can see reviews for subs they work with
CREATE POLICY reviews_builder_access ON reviews
  FOR ALL USING (
    builder_id::text = public.auth_builder_id()
    OR public.auth_user_role() = 'subcontractor'
  );

-- Public read access for reviews marked as public (for public profile pages)
CREATE POLICY reviews_public_read ON reviews
  FOR SELECT USING (is_public = true);
