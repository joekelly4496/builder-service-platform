-- Fix: Add SECURITY DEFINER and SET search_path to custom_access_token_hook
--
-- Root cause of "Database error querying schema" on builder login:
-- The hook function was running as SECURITY INVOKER (default), meaning it
-- executed with supabase_auth_admin's permissions. Without SECURITY DEFINER
-- and an explicit search_path, Supabase Auth cannot resolve table references
-- inside the function, causing the generic "Database error querying schema" error.
--
-- Fix: Recreate the function with SECURITY DEFINER + SET search_path = public.
-- This matches Supabase's recommended pattern for custom access token hooks.

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
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

-- Re-grant permissions (CREATE OR REPLACE preserves grants, but be explicit)
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM authenticated, anon, public;

-- Ensure supabase_auth_admin can read the lookup tables
GRANT SELECT ON TABLE public.builder_accounts TO supabase_auth_admin;
GRANT SELECT ON TABLE public.homeowner_accounts TO supabase_auth_admin;
GRANT SELECT ON TABLE public.subcontractor_accounts TO supabase_auth_admin;
