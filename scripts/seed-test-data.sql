-- ============================================================
-- HOMEFRONT SEED SCRIPT — Test Builder 2, Homes, Subs
-- ============================================================
-- Run in Supabase SQL Editor AFTER the cleanup script.
-- Password for ALL test accounts: TestPassword123!
-- ============================================================

BEGIN;

-- ============================================================
-- STEP 1: Create Auth Users
-- ============================================================
-- Password: TestPassword123! for all accounts

-- 1a. North Shore builder login (northshoredev44@gmail.com)
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at,
  aud, role, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, recovery_token
) VALUES (
  'a1000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'northshoredev44@gmail.com',
  crypt('TestPassword123!', gen_salt('bf')),
  now(), 'authenticated', 'authenticated',
  '{"provider": "email", "providers": ["email"]}',
  '{"name": "Joe Kelly"}',
  now(), now(), '', ''
);

-- 1b. Test Builder 2 login (kelster38@hotmail.com)
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at,
  aud, role, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, recovery_token
) VALUES (
  'a2000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000000',
  'kelster38@hotmail.com',
  crypt('TestPassword123!', gen_salt('bf')),
  now(), 'authenticated', 'authenticated',
  '{"provider": "email", "providers": ["email"]}',
  '{"name": "Kelsey Test"}',
  now(), now(), '', ''
);

-- 1c. Homeowner 1 — North Shore home 1
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at,
  aud, role, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, recovery_token
) VALUES (
  'b1000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'homeowner1@test.com',
  crypt('TestPassword123!', gen_salt('bf')),
  now(), 'authenticated', 'authenticated',
  '{"provider": "email", "providers": ["email"]}',
  '{"name": "Alice Johnson"}',
  now(), now(), '', ''
);

-- 1d. Homeowner 2 — North Shore home 2
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at,
  aud, role, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, recovery_token
) VALUES (
  'b2000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000000',
  'homeowner2@test.com',
  crypt('TestPassword123!', gen_salt('bf')),
  now(), 'authenticated', 'authenticated',
  '{"provider": "email", "providers": ["email"]}',
  '{"name": "Bob Smith"}',
  now(), now(), '', ''
);

-- 1e. Homeowner 3 — Builder 2 home 1
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at,
  aud, role, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, recovery_token
) VALUES (
  'b3000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000000',
  'homeowner3@test.com',
  crypt('TestPassword123!', gen_salt('bf')),
  now(), 'authenticated', 'authenticated',
  '{"provider": "email", "providers": ["email"]}',
  '{"name": "Carol Davis"}',
  now(), now(), '', ''
);

-- 1f. Homeowner 4 — Builder 2 home 2
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at,
  aud, role, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, recovery_token
) VALUES (
  'b4000000-0000-0000-0000-000000000004',
  '00000000-0000-0000-0000-000000000000',
  'homeowner4@test.com',
  crypt('TestPassword123!', gen_salt('bf')),
  now(), 'authenticated', 'authenticated',
  '{"provider": "email", "providers": ["email"]}',
  '{"name": "Dan Wilson"}',
  now(), now(), '', ''
);

-- 1g. Sub auth: ACT Plumbing (reuse existing profile 7ab486e6)
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at,
  aud, role, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, recovery_token
) VALUES (
  'c1000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'actplumbing@test.com',
  crypt('TestPassword123!', gen_salt('bf')),
  now(), 'authenticated', 'authenticated',
  '{"provider": "email", "providers": ["email"]}',
  '{"name": "ACT Plumbing"}',
  now(), now(), '', ''
);

-- 1h. Sub auth: Powertown Electric (reuse existing profile b76bbe32)
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at,
  aud, role, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, recovery_token
) VALUES (
  'c2000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000000',
  'powertown@test.com',
  crypt('TestPassword123!', gen_salt('bf')),
  now(), 'authenticated', 'authenticated',
  '{"provider": "email", "providers": ["email"]}',
  '{"name": "Powertown Electric"}',
  now(), now(), '', ''
);

-- 1i. Sub auth: Trim Guys (reuse existing profile ae52dee3)
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at,
  aud, role, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, recovery_token
) VALUES (
  'c3000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000000',
  'trimguys@test.com',
  crypt('TestPassword123!', gen_salt('bf')),
  now(), 'authenticated', 'authenticated',
  '{"provider": "email", "providers": ["email"]}',
  '{"name": "Trim Guys"}',
  now(), now(), '', ''
);

-- ============================================================
-- STEP 2: Create auth.identities for each user
-- (Required by Supabase for email/password login to work)
-- ============================================================

INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
VALUES
  ('a1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', '{"sub": "a1000000-0000-0000-0000-000000000001", "email": "northshoredev44@gmail.com"}', 'email', 'a1000000-0000-0000-0000-000000000001', now(), now(), now()),
  ('a2000000-0000-0000-0000-000000000002', 'a2000000-0000-0000-0000-000000000002', '{"sub": "a2000000-0000-0000-0000-000000000002", "email": "kelster38@hotmail.com"}', 'email', 'a2000000-0000-0000-0000-000000000002', now(), now(), now()),
  ('b1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', '{"sub": "b1000000-0000-0000-0000-000000000001", "email": "homeowner1@test.com"}', 'email', 'b1000000-0000-0000-0000-000000000001', now(), now(), now()),
  ('b2000000-0000-0000-0000-000000000002', 'b2000000-0000-0000-0000-000000000002', '{"sub": "b2000000-0000-0000-0000-000000000002", "email": "homeowner2@test.com"}', 'email', 'b2000000-0000-0000-0000-000000000002', now(), now(), now()),
  ('b3000000-0000-0000-0000-000000000003', 'b3000000-0000-0000-0000-000000000003', '{"sub": "b3000000-0000-0000-0000-000000000003", "email": "homeowner3@test.com"}', 'email', 'b3000000-0000-0000-0000-000000000003', now(), now(), now()),
  ('b4000000-0000-0000-0000-000000000004', 'b4000000-0000-0000-0000-000000000004', '{"sub": "b4000000-0000-0000-0000-000000000004", "email": "homeowner4@test.com"}', 'email', 'b4000000-0000-0000-0000-000000000004', now(), now(), now()),
  ('c1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', '{"sub": "c1000000-0000-0000-0000-000000000001", "email": "actplumbing@test.com"}', 'email', 'c1000000-0000-0000-0000-000000000001', now(), now(), now()),
  ('c2000000-0000-0000-0000-000000000002', 'c2000000-0000-0000-0000-000000000002', '{"sub": "c2000000-0000-0000-0000-000000000002", "email": "powertown@test.com"}', 'email', 'c2000000-0000-0000-0000-000000000002', now(), now(), now()),
  ('c3000000-0000-0000-0000-000000000003', 'c3000000-0000-0000-0000-000000000003', '{"sub": "c3000000-0000-0000-0000-000000000003", "email": "trimguys@test.com"}', 'email', 'c3000000-0000-0000-0000-000000000003', now(), now(), now());

-- ============================================================
-- STEP 3: Create Test Builder 2
-- ============================================================

INSERT INTO builders (id, company_name, contact_name, email, phone, slug, plan_tier, is_active, onboarding_status, created_at, updated_at)
VALUES (
  'e2000000-0000-0000-0000-000000000002',
  'Kelsey Custom Homes',
  'Kelsey Test',
  'kelster38@hotmail.com',
  '555-222-3333',
  'kelsey-custom-homes',
  'starter',
  true,
  'complete',
  now(), now()
);

-- ============================================================
-- STEP 4: Create builder_accounts (link auth → builders)
-- ============================================================

-- North Shore → northshoredev44@gmail.com
INSERT INTO builder_accounts (supabase_user_id, builder_id, email, role)
VALUES ('a1000000-0000-0000-0000-000000000001', '9d4b6bbd-dbbd-4077-8a4c-df082346a4a2', 'northshoredev44@gmail.com', 'owner');

-- Builder 2 → kelster38@hotmail.com
INSERT INTO builder_accounts (supabase_user_id, builder_id, email, role)
VALUES ('a2000000-0000-0000-0000-000000000002', 'e2000000-0000-0000-0000-000000000002', 'kelster38@hotmail.com', 'owner');

-- ============================================================
-- STEP 5: Create Homes (2 per builder)
-- ============================================================

-- North Shore Home 1
INSERT INTO homes (id, builder_id, address, city, state, zip_code, homeowner_name, homeowner_email, homeowner_phone, project_completed_at, warranty_expires_at, created_at, updated_at)
VALUES (
  'd1000000-0000-0000-0000-000000000001',
  '9d4b6bbd-dbbd-4077-8a4c-df082346a4a2',
  '31 W Maple Rd',
  'Fort Lauderdale', 'FL', '33311',
  'Alice Johnson', 'homeowner1@test.com', '555-100-0001',
  now() - interval '6 months',
  now() + interval '6 months',
  now(), now()
);

-- North Shore Home 2
INSERT INTO homes (id, builder_id, address, city, state, zip_code, homeowner_name, homeowner_email, homeowner_phone, project_completed_at, warranty_expires_at, created_at, updated_at)
VALUES (
  'd2000000-0000-0000-0000-000000000002',
  '9d4b6bbd-dbbd-4077-8a4c-df082346a4a2',
  '456 Oak Avenue',
  'Fort Lauderdale', 'FL', '33312',
  'Bob Smith', 'homeowner2@test.com', '555-100-0002',
  now() - interval '3 months',
  now() + interval '9 months',
  now(), now()
);

-- Builder 2 Home 1
INSERT INTO homes (id, builder_id, address, city, state, zip_code, homeowner_name, homeowner_email, homeowner_phone, project_completed_at, warranty_expires_at, created_at, updated_at)
VALUES (
  'd3000000-0000-0000-0000-000000000003',
  'e2000000-0000-0000-0000-000000000002',
  '789 Pine Street',
  'Pompano Beach', 'FL', '33060',
  'Carol Davis', 'homeowner3@test.com', '555-100-0003',
  now() - interval '4 months',
  now() + interval '8 months',
  now(), now()
);

-- Builder 2 Home 2
INSERT INTO homes (id, builder_id, address, city, state, zip_code, homeowner_name, homeowner_email, homeowner_phone, project_completed_at, warranty_expires_at, created_at, updated_at)
VALUES (
  'd4000000-0000-0000-0000-000000000004',
  'e2000000-0000-0000-0000-000000000002',
  '101 Elm Drive',
  'Pompano Beach', 'FL', '33062',
  'Dan Wilson', 'homeowner4@test.com', '555-100-0004',
  now() - interval '2 months',
  now() + interval '10 months',
  now(), now()
);

-- ============================================================
-- STEP 6: Create homeowner_accounts (link auth → homes)
-- ============================================================

INSERT INTO homeowner_accounts (builder_id, supabase_user_id, home_id, email)
VALUES
  ('9d4b6bbd-dbbd-4077-8a4c-df082346a4a2', 'b1000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000001', 'homeowner1@test.com'),
  ('9d4b6bbd-dbbd-4077-8a4c-df082346a4a2', 'b2000000-0000-0000-0000-000000000002', 'd2000000-0000-0000-0000-000000000002', 'homeowner2@test.com'),
  ('e2000000-0000-0000-0000-000000000002', 'b3000000-0000-0000-0000-000000000003', 'd3000000-0000-0000-0000-000000000003', 'homeowner3@test.com'),
  ('e2000000-0000-0000-0000-000000000002', 'b4000000-0000-0000-0000-000000000004', 'd4000000-0000-0000-0000-000000000004', 'homeowner4@test.com');

-- ============================================================
-- STEP 7: Create subcontractor_accounts (link auth → sub profiles)
-- ============================================================
-- Reusing existing global sub profiles that survived cleanup

-- ACT Plumbing (7ab486e6)
INSERT INTO subcontractor_accounts (supabase_user_id, subcontractor_id, email)
VALUES ('c1000000-0000-0000-0000-000000000001', '7ab486e6-f47d-43f9-9e27-742af069eb6a', 'actplumbing@test.com');

-- Powertown Electric (b76bbe32)
INSERT INTO subcontractor_accounts (supabase_user_id, subcontractor_id, email)
VALUES ('c2000000-0000-0000-0000-000000000002', 'b76bbe32-761e-4338-a74b-1606905267d9', 'powertown@test.com');

-- Trim Guys (ae52dee3)
INSERT INTO subcontractor_accounts (supabase_user_id, subcontractor_id, email)
VALUES ('c3000000-0000-0000-0000-000000000003', 'ae52dee3-5061-4cc8-bf45-406cb72eba75', 'trimguys@test.com');

-- ============================================================
-- STEP 8: Create builder_subcontractor_relationships
-- ============================================================
-- Both builders get access to all 3 subs (they're marketplace-global)

-- North Shore ↔ ACT Plumbing
INSERT INTO builder_subcontractor_relationships (builder_id, subcontractor_id, status)
VALUES ('9d4b6bbd-dbbd-4077-8a4c-df082346a4a2', '7ab486e6-f47d-43f9-9e27-742af069eb6a', 'active');

-- North Shore ↔ Powertown Electric
INSERT INTO builder_subcontractor_relationships (builder_id, subcontractor_id, status)
VALUES ('9d4b6bbd-dbbd-4077-8a4c-df082346a4a2', 'b76bbe32-761e-4338-a74b-1606905267d9', 'active');

-- North Shore ↔ Trim Guys
INSERT INTO builder_subcontractor_relationships (builder_id, subcontractor_id, status)
VALUES ('9d4b6bbd-dbbd-4077-8a4c-df082346a4a2', 'ae52dee3-5061-4cc8-bf45-406cb72eba75', 'active');

-- Builder 2 ↔ ACT Plumbing
INSERT INTO builder_subcontractor_relationships (builder_id, subcontractor_id, status)
VALUES ('e2000000-0000-0000-0000-000000000002', '7ab486e6-f47d-43f9-9e27-742af069eb6a', 'active');

-- Builder 2 ↔ Powertown Electric
INSERT INTO builder_subcontractor_relationships (builder_id, subcontractor_id, status)
VALUES ('e2000000-0000-0000-0000-000000000002', 'b76bbe32-761e-4338-a74b-1606905267d9', 'active');

-- Builder 2 ↔ Trim Guys
INSERT INTO builder_subcontractor_relationships (builder_id, subcontractor_id, status)
VALUES ('e2000000-0000-0000-0000-000000000002', 'ae52dee3-5061-4cc8-bf45-406cb72eba75', 'active');

-- ============================================================
-- STEP 9: Verify everything
-- ============================================================

SELECT '--- BUILDERS ---' AS section;
SELECT id, company_name, email FROM builders;

SELECT '--- BUILDER ACCOUNTS ---' AS section;
SELECT supabase_user_id, builder_id, email, role FROM builder_accounts;

SELECT '--- HOMES ---' AS section;
SELECT id, builder_id, address, homeowner_name, homeowner_email FROM homes;

SELECT '--- HOMEOWNER ACCOUNTS ---' AS section;
SELECT supabase_user_id, home_id, email FROM homeowner_accounts;

SELECT '--- SUB ACCOUNTS ---' AS section;
SELECT supabase_user_id, subcontractor_id, email FROM subcontractor_accounts;

SELECT '--- BUILDER-SUB RELATIONSHIPS ---' AS section;
SELECT b.company_name AS builder, s.company_name AS sub, bsr.status
FROM builder_subcontractor_relationships bsr
JOIN builders b ON b.id = bsr.builder_id
JOIN subcontractors s ON s.id = bsr.subcontractor_id;

SELECT '--- AUTH USERS ---' AS section;
SELECT id, email FROM auth.users ORDER BY email;

COMMIT;

-- ============================================================
-- DONE! Test accounts summary:
-- ============================================================
--
-- BUILDERS:
--   northshoredev44@gmail.com → North Shore Development (owner)
--   kelster38@hotmail.com     → Kelsey Custom Homes (owner)
--
-- HOMEOWNERS:
--   homeowner1@test.com → Alice Johnson, 31 W Maple Rd (North Shore)
--   homeowner2@test.com → Bob Smith, 456 Oak Avenue (North Shore)
--   homeowner3@test.com → Carol Davis, 789 Pine Street (Builder 2)
--   homeowner4@test.com → Dan Wilson, 101 Elm Drive (Builder 2)
--
-- SUBCONTRACTORS (login via sub portal):
--   actplumbing@test.com → ACT Plumbing (plumbing)
--   powertown@test.com   → Powertown Electric (electrical)
--   trimguys@test.com    → Trim Guys (carpentry)
--
-- ALL PASSWORDS: TestPassword123!
-- ============================================================
