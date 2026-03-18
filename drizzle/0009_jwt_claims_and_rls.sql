-- JWT Custom Claims + Row Level Security Policies
-- This migration sets up the database-level security layer for multi-tenancy.

-- ==================== JWT CUSTOM CLAIMS FUNCTION ====================
-- This function is called by Supabase Auth on every token refresh.
-- It injects builder_id into the JWT so RLS policies can use it.

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  claims jsonb;
  user_id text;
  found_builder_id uuid;
  found_homeowner_id uuid;
  found_sub_id uuid;
  user_role text;
BEGIN
  -- Extract the user ID from the event
  user_id := event->>'user_id';
  claims := event->'claims';

  -- Check if user is a builder (via builder_accounts)
  SELECT ba.builder_id INTO found_builder_id
  FROM builder_accounts ba
  WHERE ba.supabase_user_id = user_id
  LIMIT 1;

  IF found_builder_id IS NOT NULL THEN
    claims := jsonb_set(claims, '{builder_id}', to_jsonb(found_builder_id::text));
    claims := jsonb_set(claims, '{user_role}', '"builder"');
    RETURN jsonb_set(event, '{claims}', claims);
  END IF;

  -- Check if user is a homeowner (via homeowner_accounts)
  SELECT ha.builder_id, ha.id INTO found_builder_id, found_homeowner_id
  FROM homeowner_accounts ha
  WHERE ha.supabase_user_id = user_id
  LIMIT 1;

  IF found_homeowner_id IS NOT NULL THEN
    claims := jsonb_set(claims, '{builder_id}', to_jsonb(found_builder_id::text));
    claims := jsonb_set(claims, '{homeowner_id}', to_jsonb(found_homeowner_id::text));
    claims := jsonb_set(claims, '{user_role}', '"homeowner"');
    RETURN jsonb_set(event, '{claims}', claims);
  END IF;

  -- Check if user is a subcontractor (via subcontractor_accounts)
  SELECT sa.subcontractor_id INTO found_sub_id
  FROM subcontractor_accounts sa
  WHERE sa.supabase_user_id = user_id
  LIMIT 1;

  IF found_sub_id IS NOT NULL THEN
    claims := jsonb_set(claims, '{subcontractor_id}', to_jsonb(found_sub_id::text));
    claims := jsonb_set(claims, '{user_role}', '"subcontractor"');
    RETURN jsonb_set(event, '{claims}', claims);
  END IF;

  -- No account found — return claims unchanged
  RETURN event;
END;
$$;

-- Grant execute permission to supabase_auth_admin (required for auth hooks)
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;

-- Revoke from other roles for security
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM authenticated, anon, public;

-- Grant SELECT on the lookup tables so the hook can query them
GRANT SELECT ON TABLE public.builder_accounts TO supabase_auth_admin;
GRANT SELECT ON TABLE public.homeowner_accounts TO supabase_auth_admin;
GRANT SELECT ON TABLE public.subcontractor_accounts TO supabase_auth_admin;

-- ==================== ENABLE RLS ON ALL TENANT-SCOPED TABLES ====================

ALTER TABLE homes ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_request_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_request_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE home_trade_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE homeowner_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_request_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE builder_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE homeowner_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE builder_subcontractor_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_records ENABLE ROW LEVEL SECURITY;

-- ==================== RLS POLICIES ====================
-- Pattern: builder_id in JWT must match builder_id on the row.
-- Service role bypasses RLS automatically.

-- Helper: extract builder_id from JWT
CREATE OR REPLACE FUNCTION public.auth_builder_id()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT coalesce(
    current_setting('request.jwt.claims', true)::jsonb ->> 'builder_id',
    (current_setting('request.jwt.claim.builder_id', true))
  );
$$;

-- homes
CREATE POLICY "tenant_isolation" ON homes
  FOR ALL USING (builder_id::text = public.auth_builder_id());

-- service_requests
CREATE POLICY "tenant_isolation" ON service_requests
  FOR ALL USING (builder_id::text = public.auth_builder_id());

-- service_request_audit_log
CREATE POLICY "tenant_isolation" ON service_request_audit_log
  FOR ALL USING (builder_id::text = public.auth_builder_id());

-- service_request_messages
CREATE POLICY "tenant_isolation" ON service_request_messages
  FOR ALL USING (builder_id::text = public.auth_builder_id());

-- home_trade_assignments
CREATE POLICY "tenant_isolation" ON home_trade_assignments
  FOR ALL USING (builder_id::text = public.auth_builder_id());

-- homeowner_accounts
CREATE POLICY "tenant_isolation" ON homeowner_accounts
  FOR ALL USING (builder_id::text = public.auth_builder_id());

-- service_request_ratings
CREATE POLICY "tenant_isolation" ON service_request_ratings
  FOR ALL USING (builder_id::text = public.auth_builder_id());

-- schedule_approvals
CREATE POLICY "tenant_isolation" ON schedule_approvals
  FOR ALL USING (builder_id::text = public.auth_builder_id());

-- maintenance_items
CREATE POLICY "tenant_isolation" ON maintenance_items
  FOR ALL USING (builder_id::text = public.auth_builder_id());

-- maintenance_reminders
CREATE POLICY "tenant_isolation" ON maintenance_reminders
  FOR ALL USING (builder_id::text = public.auth_builder_id());

-- notifications
CREATE POLICY "tenant_isolation" ON notifications
  FOR ALL USING (builder_id::text = public.auth_builder_id());

-- notification_preferences
CREATE POLICY "tenant_isolation" ON notification_preferences
  FOR ALL USING (builder_id::text = public.auth_builder_id());

-- sms_logs
CREATE POLICY "tenant_isolation" ON sms_logs
  FOR ALL USING (builder_id::text = public.auth_builder_id());

-- builder_pricing
CREATE POLICY "tenant_isolation" ON builder_pricing
  FOR ALL USING (builder_id::text = public.auth_builder_id());

-- homeowner_subscriptions
CREATE POLICY "tenant_isolation" ON homeowner_subscriptions
  FOR ALL USING (builder_id::text = public.auth_builder_id());

-- invoices
CREATE POLICY "tenant_isolation" ON invoices
  FOR ALL USING (builder_id::text = public.auth_builder_id());

-- invoice_line_items (via invoice → builder_id)
CREATE POLICY "tenant_isolation" ON invoice_line_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = invoice_line_items.invoice_id
      AND invoices.builder_id::text = public.auth_builder_id()
    )
  );

-- builder_subcontractor_relationships
CREATE POLICY "tenant_isolation" ON builder_subcontractor_relationships
  FOR ALL USING (builder_id::text = public.auth_builder_id());

-- staff_users
CREATE POLICY "tenant_isolation" ON staff_users
  FOR ALL USING (builder_id::text = public.auth_builder_id());

-- billing_records
CREATE POLICY "tenant_isolation" ON billing_records
  FOR ALL USING (builder_id::text = public.auth_builder_id());

-- ==================== IMPORTANT NOTES ====================
-- After running this migration:
-- 1. Go to Supabase Dashboard → Authentication → Hooks
-- 2. Enable the "Customize Access Token" hook
-- 3. Select the function: public.custom_access_token_hook
-- 4. Test with two builder accounts to verify isolation
