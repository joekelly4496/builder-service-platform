-- Multi-tenancy schema migration
-- Adds tenant scoping (builderId) to all indirect tables,
-- creates new enums, enhances builders table, creates new tables,
-- and restructures subcontractors as global profiles.

-- ==================== NEW ENUMS ====================

DO $$ BEGIN
  CREATE TYPE "public"."plan_tier" AS ENUM('intro', 'starter', 'growth', 'pro');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "public"."staff_role" AS ENUM('owner', 'admin', 'manager', 'field_tech');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "public"."billing_record_type" AS ENUM('subscription', 'usage', 'payment', 'refund', 'credit');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "public"."builder_sub_relationship_status" AS ENUM('invited', 'active', 'paused', 'removed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ==================== ENHANCE BUILDERS TABLE ====================

ALTER TABLE "builders" ADD COLUMN IF NOT EXISTS "slug" varchar(100) UNIQUE;
ALTER TABLE "builders" ADD COLUMN IF NOT EXISTS "plan_tier" "plan_tier" DEFAULT 'intro';
ALTER TABLE "builders" ADD COLUMN IF NOT EXISTS "stripe_customer_id" varchar(255);
ALTER TABLE "builders" ADD COLUMN IF NOT EXISTS "branding_config" jsonb;
ALTER TABLE "builders" ADD COLUMN IF NOT EXISTS "is_active" boolean NOT NULL DEFAULT true;

-- ==================== ENHANCE SUBCONTRACTORS (GLOBAL PROFILE) ====================

-- Add new global profile fields
ALTER TABLE "subcontractors" ADD COLUMN IF NOT EXISTS "slug" varchar(100) UNIQUE;
ALTER TABLE "subcontractors" ADD COLUMN IF NOT EXISTS "bio" text;
ALTER TABLE "subcontractors" ADD COLUMN IF NOT EXISTS "service_area" text;
ALTER TABLE "subcontractors" ADD COLUMN IF NOT EXISTS "license_number" text;
ALTER TABLE "subcontractors" ADD COLUMN IF NOT EXISTS "insurance_expires_at" timestamp;
ALTER TABLE "subcontractors" ADD COLUMN IF NOT EXISTS "is_verified" boolean NOT NULL DEFAULT false;

-- Make email unique (global profile)
-- Note: May fail if duplicates exist — handle in data migration
ALTER TABLE "subcontractors" ADD CONSTRAINT "subcontractors_email_unique" UNIQUE ("email");

-- ==================== NEW TABLES ====================

CREATE TABLE IF NOT EXISTS "builder_subcontractor_relationships" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "builder_id" uuid NOT NULL REFERENCES "builders"("id"),
  "subcontractor_id" uuid NOT NULL REFERENCES "subcontractors"("id"),
  "status" "builder_sub_relationship_status" NOT NULL DEFAULT 'active',
  "invited_at" timestamp,
  "notes" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "staff_users" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "builder_id" uuid NOT NULL REFERENCES "builders"("id"),
  "supabase_user_id" text NOT NULL UNIQUE,
  "email" text NOT NULL,
  "name" text NOT NULL,
  "role" "staff_role" NOT NULL DEFAULT 'field_tech',
  "is_active" boolean NOT NULL DEFAULT true,
  "invited_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "billing_records" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "builder_id" uuid NOT NULL REFERENCES "builders"("id"),
  "type" "billing_record_type" NOT NULL,
  "amount_cents" integer NOT NULL,
  "description" text,
  "stripe_payment_id" varchar(255),
  "period_start" timestamp,
  "period_end" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL
);

-- ==================== ADD builderId TO INDIRECT TABLES ====================

-- homeTradeAssignments
ALTER TABLE "home_trade_assignments" ADD COLUMN IF NOT EXISTS "builder_id" uuid REFERENCES "builders"("id");

-- serviceRequests
ALTER TABLE "service_requests" ADD COLUMN IF NOT EXISTS "builder_id" uuid REFERENCES "builders"("id");

-- serviceRequestAuditLog
ALTER TABLE "service_request_audit_log" ADD COLUMN IF NOT EXISTS "builder_id" uuid REFERENCES "builders"("id");

-- serviceRequestMessages
ALTER TABLE "service_request_messages" ADD COLUMN IF NOT EXISTS "builder_id" uuid REFERENCES "builders"("id");

-- homeownerAccounts
ALTER TABLE "homeowner_accounts" ADD COLUMN IF NOT EXISTS "builder_id" uuid REFERENCES "builders"("id");

-- serviceRequestRatings
ALTER TABLE "service_request_ratings" ADD COLUMN IF NOT EXISTS "builder_id" uuid REFERENCES "builders"("id");

-- scheduleApprovals
ALTER TABLE "schedule_approvals" ADD COLUMN IF NOT EXISTS "builder_id" uuid REFERENCES "builders"("id");

-- maintenanceItems
ALTER TABLE "maintenance_items" ADD COLUMN IF NOT EXISTS "builder_id" uuid REFERENCES "builders"("id");

-- maintenanceReminders
ALTER TABLE "maintenance_reminders" ADD COLUMN IF NOT EXISTS "builder_id" uuid REFERENCES "builders"("id");

-- notifications
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "builder_id" uuid REFERENCES "builders"("id");

-- notificationPreferences
ALTER TABLE "notification_preferences" ADD COLUMN IF NOT EXISTS "builder_id" uuid REFERENCES "builders"("id");

-- ==================== BACKFILL builderId FROM EXISTING DATA ====================

-- Backfill homeTradeAssignments via homes
UPDATE "home_trade_assignments" hta
SET "builder_id" = h."builder_id"
FROM "homes" h
WHERE hta."home_id" = h."id"
AND hta."builder_id" IS NULL;

-- Backfill serviceRequests via homes
UPDATE "service_requests" sr
SET "builder_id" = h."builder_id"
FROM "homes" h
WHERE sr."home_id" = h."id"
AND sr."builder_id" IS NULL;

-- Backfill serviceRequestAuditLog via serviceRequests → homes
UPDATE "service_request_audit_log" sra
SET "builder_id" = h."builder_id"
FROM "service_requests" sr
JOIN "homes" h ON sr."home_id" = h."id"
WHERE sra."service_request_id" = sr."id"
AND sra."builder_id" IS NULL;

-- Backfill serviceRequestMessages via serviceRequests → homes
UPDATE "service_request_messages" srm
SET "builder_id" = h."builder_id"
FROM "service_requests" sr
JOIN "homes" h ON sr."home_id" = h."id"
WHERE srm."service_request_id" = sr."id"
AND srm."builder_id" IS NULL;

-- Backfill homeownerAccounts via homes
UPDATE "homeowner_accounts" ha
SET "builder_id" = h."builder_id"
FROM "homes" h
WHERE ha."home_id" = h."id"
AND ha."builder_id" IS NULL;

-- Backfill serviceRequestRatings via homes
UPDATE "service_request_ratings" srr
SET "builder_id" = h."builder_id"
FROM "homes" h
WHERE srr."home_id" = h."id"
AND srr."builder_id" IS NULL;

-- Backfill scheduleApprovals via serviceRequests → homes
UPDATE "schedule_approvals" sa
SET "builder_id" = h."builder_id"
FROM "service_requests" sr
JOIN "homes" h ON sr."home_id" = h."id"
WHERE sa."service_request_id" = sr."id"
AND sa."builder_id" IS NULL;

-- Backfill maintenanceItems via homes
UPDATE "maintenance_items" mi
SET "builder_id" = h."builder_id"
FROM "homes" h
WHERE mi."home_id" = h."id"
AND mi."builder_id" IS NULL;

-- Backfill maintenanceReminders via homes
UPDATE "maintenance_reminders" mr
SET "builder_id" = h."builder_id"
FROM "homes" h
WHERE mr."home_id" = h."id"
AND mr."builder_id" IS NULL;

-- Backfill notifications via homeownerAccounts → homes
UPDATE "notifications" n
SET "builder_id" = h."builder_id"
FROM "homeowner_accounts" ha
JOIN "homes" h ON ha."home_id" = h."id"
WHERE n."homeowner_id" = ha."id"
AND n."builder_id" IS NULL;

-- Backfill notificationPreferences via homeownerAccounts → homes
UPDATE "notification_preferences" np
SET "builder_id" = h."builder_id"
FROM "homeowner_accounts" ha
JOIN "homes" h ON ha."home_id" = h."id"
WHERE np."homeowner_id" = ha."id"
AND np."builder_id" IS NULL;

-- ==================== MIGRATE SUBCONTRACTOR RELATIONSHIPS ====================

-- Create builderSubcontractorRelationships from existing subcontractors.builder_id
INSERT INTO "builder_subcontractor_relationships" ("builder_id", "subcontractor_id", "status")
SELECT "builder_id", "id", 'active'
FROM "subcontractors"
WHERE "builder_id" IS NOT NULL
ON CONFLICT DO NOTHING;

-- Drop the builder_id column from subcontractors (now managed via relationships table)
ALTER TABLE "subcontractors" DROP COLUMN IF EXISTS "builder_id";

-- ==================== MAKE builderId NOT NULL (after backfill) ====================
-- Note: These will fail if any rows have NULL builder_id after backfill.
-- Run backfill first, then uncomment these if needed:

-- ALTER TABLE "home_trade_assignments" ALTER COLUMN "builder_id" SET NOT NULL;
-- ALTER TABLE "service_requests" ALTER COLUMN "builder_id" SET NOT NULL;
-- ALTER TABLE "service_request_audit_log" ALTER COLUMN "builder_id" SET NOT NULL;
-- ALTER TABLE "service_request_messages" ALTER COLUMN "builder_id" SET NOT NULL;
-- ALTER TABLE "homeowner_accounts" ALTER COLUMN "builder_id" SET NOT NULL;
-- ALTER TABLE "service_request_ratings" ALTER COLUMN "builder_id" SET NOT NULL;
-- ALTER TABLE "schedule_approvals" ALTER COLUMN "builder_id" SET NOT NULL;
-- ALTER TABLE "maintenance_items" ALTER COLUMN "builder_id" SET NOT NULL;
-- ALTER TABLE "maintenance_reminders" ALTER COLUMN "builder_id" SET NOT NULL;
-- ALTER TABLE "notifications" ALTER COLUMN "builder_id" SET NOT NULL;
-- ALTER TABLE "notification_preferences" ALTER COLUMN "builder_id" SET NOT NULL;
