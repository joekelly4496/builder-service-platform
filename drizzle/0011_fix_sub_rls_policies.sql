-- Fix RLS policies for subcontractors working across multiple builders
--
-- Problem: All existing RLS policies use builder_id = auth_builder_id().
-- Subcontractors don't have a builder_id in their JWT — they have subcontractor_id.
-- This means subs are blocked from reading their own assigned requests, messages, etc.
--
-- Solution: Add parallel RLS policies that allow subs to access rows where
-- they are the assigned subcontractor. The original builder tenant_isolation
-- policies remain unchanged.

-- ==================== HELPER: Extract subcontractor_id from JWT ====================

CREATE OR REPLACE FUNCTION public.auth_subcontractor_id()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT coalesce(
    current_setting('request.jwt.claims', true)::jsonb ->> 'subcontractor_id',
    (current_setting('request.jwt.claim.subcontractor_id', true))
  );
$$;

-- ==================== HELPER: Extract user_role from JWT ====================

CREATE OR REPLACE FUNCTION public.auth_user_role()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT coalesce(
    current_setting('request.jwt.claims', true)::jsonb ->> 'user_role',
    (current_setting('request.jwt.claim.user_role', true))
  );
$$;

-- ==================== SUB ACCESS POLICIES ====================

-- service_requests: sub can see requests assigned to them
CREATE POLICY "sub_assigned_access" ON service_requests
  FOR ALL USING (
    assigned_subcontractor_id::text = public.auth_subcontractor_id()
  );

-- service_request_messages: sub can see messages on requests assigned to them
CREATE POLICY "sub_assigned_access" ON service_request_messages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM service_requests sr
      WHERE sr.id = service_request_messages.service_request_id
      AND sr.assigned_subcontractor_id::text = public.auth_subcontractor_id()
    )
  );

-- service_request_audit_log: sub can see audit logs for their assigned requests
CREATE POLICY "sub_assigned_access" ON service_request_audit_log
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM service_requests sr
      WHERE sr.id = service_request_audit_log.service_request_id
      AND sr.assigned_subcontractor_id::text = public.auth_subcontractor_id()
    )
  );

-- service_request_ratings: sub can see ratings on their assigned requests
CREATE POLICY "sub_assigned_access" ON service_request_ratings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM service_requests sr
      WHERE sr.id = service_request_ratings.service_request_id
      AND sr.assigned_subcontractor_id::text = public.auth_subcontractor_id()
    )
  );

-- schedule_approvals: sub can see schedule approvals for their assigned requests
CREATE POLICY "sub_assigned_access" ON schedule_approvals
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM service_requests sr
      WHERE sr.id = schedule_approvals.service_request_id
      AND sr.assigned_subcontractor_id::text = public.auth_subcontractor_id()
    )
  );

-- homes: sub can see homes that have requests assigned to them
CREATE POLICY "sub_assigned_access" ON homes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM service_requests sr
      WHERE sr.home_id = homes.id
      AND sr.assigned_subcontractor_id::text = public.auth_subcontractor_id()
    )
  );

-- builder_subcontractor_relationships: sub can see their own relationships
-- (needed for sub dashboard to know which builders they work with)
CREATE POLICY "sub_own_relationships" ON builder_subcontractor_relationships
  FOR SELECT USING (
    subcontractor_id::text = public.auth_subcontractor_id()
  );

-- ==================== HOMEOWNER ACCESS POLICIES ====================
-- Homeowners have builder_id in their JWT so existing policies already work.
-- But add explicit homeowner policies for tables they query by home_id,
-- so access doesn't depend solely on the builder_id claim matching.

-- homeowner_accounts: homeowner can see their own account
CREATE POLICY "homeowner_own_account" ON homeowner_accounts
  FOR SELECT USING (
    supabase_user_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')
  );

-- ==================== NOTES ====================
-- Multiple policies on the same table use OR logic in PostgreSQL.
-- So a row is accessible if ANY policy grants access.
-- This means:
--   - Builders see rows matching their builder_id (tenant_isolation policy)
--   - Subs see rows where they're assigned (sub_assigned_access policy)
--   - Homeowners see rows matching their builder_id (tenant_isolation policy)
-- The service role key bypasses RLS entirely (for cron jobs, webhooks, etc.)
