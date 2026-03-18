-- ============================================================
-- HOMEFRONT DATABASE CLEANUP SCRIPT
-- ============================================================
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- This script:
--   1. Deletes ALL tenant-scoped data (everything is test data)
--   2. Keeps North Shore Dev (9d4b6bbd) as the sole real builder
--   3. Deletes Demo Construction (75c73c79), duplicate North Shore (648b5e89), Pleasantview (89964aff)
--   4. Preserves global subcontractor profiles (they're marketplace-level)
--   5. Deletes all Supabase Auth users so you can re-create them cleanly
-- ============================================================

BEGIN;

-- ============================================================
-- STEP 1: Delete all child data (deepest dependencies first)
-- ============================================================

-- Billing leaf tables
DELETE FROM invoice_line_items;
DELETE FROM invoices;
DELETE FROM homeowner_subscriptions;
DELETE FROM billing_records;
DELETE FROM builder_pricing;

-- Notification tables (depend on homeowner_accounts)
DELETE FROM notifications;
DELETE FROM notification_preferences;

-- SMS logs
DELETE FROM sms_logs;

-- Maintenance (reminders depend on items)
DELETE FROM maintenance_reminders;
DELETE FROM maintenance_items;

-- Service request children
DELETE FROM schedule_approvals;
DELETE FROM service_request_ratings;
DELETE FROM service_request_messages;
DELETE FROM subcontractor_magic_links;
DELETE FROM homeowner_magic_links;
DELETE FROM service_request_audit_log;

-- Service requests themselves
DELETE FROM service_requests;

-- Home-level assignments
DELETE FROM home_trade_assignments;

-- Builder-sub relationships
DELETE FROM builder_subcontractor_relationships;

-- Auth/account tables
DELETE FROM homeowner_accounts;
DELETE FROM subcontractor_accounts;
DELETE FROM staff_users;
DELETE FROM builder_accounts;

-- Homes
DELETE FROM homes;

-- ============================================================
-- STEP 2: Delete builders we don't want
-- ============================================================

-- Delete Demo Construction Co
DELETE FROM builders WHERE id = '75c73c79-029b-44a0-a9e3-4d6366ac141d';

-- Delete duplicate North Shore Dev (joekelly4496@gmail.com)
DELETE FROM builders WHERE id = '648b5e89-8c74-48a5-8c72-353c7176f9e6';

-- Delete Pleasantview Homes
DELETE FROM builders WHERE id = '89964aff-9437-4c4f-b76b-89033b3e474c';

-- ============================================================
-- STEP 3: Verify North Shore is the only builder remaining
-- ============================================================

-- Should return exactly 1 row: 9d4b6bbd North Shore Development
SELECT id, company_name, email FROM builders;

-- ============================================================
-- STEP 4: Delete ALL Supabase Auth users (clean slate)
-- ============================================================
-- This removes every user from auth.users so you can re-create
-- fresh accounts with proper roles.

DELETE FROM auth.users;

-- ============================================================
-- STEP 5: Verify everything is clean
-- ============================================================

-- All of these should return 0 rows:
SELECT 'homes' AS tbl, count(*) FROM homes
UNION ALL SELECT 'service_requests', count(*) FROM service_requests
UNION ALL SELECT 'homeowner_accounts', count(*) FROM homeowner_accounts
UNION ALL SELECT 'builder_accounts', count(*) FROM builder_accounts
UNION ALL SELECT 'subcontractor_accounts', count(*) FROM subcontractor_accounts
UNION ALL SELECT 'staff_users', count(*) FROM staff_users
UNION ALL SELECT 'builder_sub_relationships', count(*) FROM builder_subcontractor_relationships;

-- Should still have subcontractor profiles (global/marketplace):
SELECT 'subcontractors (kept)', count(*) FROM subcontractors;

-- Should have exactly 1 builder:
SELECT 'builders', count(*) FROM builders;

COMMIT;

-- ============================================================
-- DONE! Next steps:
-- ============================================================
-- 1. Create auth user for northshoredev44@gmail.com (builder login)
-- 2. Create auth user for kelster38@hotmail.com (test builder 2)
-- 3. Insert test builder 2 into builders table
-- 4. Create builder_accounts rows linking auth users → builders
-- 5. Add test homes, homeowners, and subs
-- ============================================================
