-- Add stripe_usage_reported to sms_logs
ALTER TABLE "sms_logs" ADD COLUMN IF NOT EXISTS "stripe_usage_reported" boolean DEFAULT false;

-- Create subscription_status enum
DO $$ BEGIN
  CREATE TYPE "subscription_status" AS ENUM('pending', 'active', 'past_due', 'cancelled', 'paused');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create invoice_status enum
DO $$ BEGIN
  CREATE TYPE "invoice_status" AS ENUM('draft', 'sent', 'paid', 'overdue', 'cancelled', 'void');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create builder_pricing table
CREATE TABLE IF NOT EXISTS "builder_pricing" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "builder_id" uuid NOT NULL REFERENCES "builders"("id") UNIQUE,
  "portal_access_monthly_price" integer NOT NULL DEFAULT 1500,
  "sms_addon_monthly_price" integer NOT NULL DEFAULT 1000,
  "per_message_price" integer NOT NULL DEFAULT 5,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Create homeowner_subscriptions table
CREATE TABLE IF NOT EXISTS "homeowner_subscriptions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "home_id" uuid NOT NULL REFERENCES "homes"("id"),
  "builder_id" uuid NOT NULL REFERENCES "builders"("id"),
  "homeowner_account_id" uuid REFERENCES "homeowner_accounts"("id"),
  "stripe_customer_id" text,
  "stripe_subscription_id" text,
  "stripe_payment_method_id" text,
  "status" "subscription_status" NOT NULL DEFAULT 'pending',
  "monthly_price_cents" integer NOT NULL,
  "sms_addon_enabled" boolean DEFAULT false,
  "sms_addon_price_cents" integer,
  "per_message_price_cents" integer,
  "billing_start_date" timestamp NOT NULL,
  "billing_anchor_day" integer NOT NULL,
  "next_billing_date" timestamp,
  "cancelled_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Create invoices table
CREATE TABLE IF NOT EXISTS "invoices" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "home_id" uuid NOT NULL REFERENCES "homes"("id"),
  "builder_id" uuid NOT NULL REFERENCES "builders"("id"),
  "homeowner_account_id" uuid REFERENCES "homeowner_accounts"("id"),
  "stripe_invoice_id" text,
  "stripe_payment_intent_id" text,
  "status" "invoice_status" NOT NULL DEFAULT 'draft',
  "subtotal_cents" integer NOT NULL,
  "platform_fee_cents" integer NOT NULL DEFAULT 0,
  "total_cents" integer NOT NULL,
  "description" text,
  "due_date" timestamp,
  "paid_at" timestamp,
  "payment_url" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Create invoice_line_items table
CREATE TABLE IF NOT EXISTS "invoice_line_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "invoice_id" uuid NOT NULL REFERENCES "invoices"("id"),
  "description" text NOT NULL,
  "quantity" integer NOT NULL DEFAULT 1,
  "unit_price_cents" integer NOT NULL,
  "total_cents" integer NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

-- Add indexes
CREATE INDEX IF NOT EXISTS "idx_homeowner_subs_builder" ON "homeowner_subscriptions" ("builder_id");
CREATE INDEX IF NOT EXISTS "idx_homeowner_subs_home" ON "homeowner_subscriptions" ("home_id");
CREATE INDEX IF NOT EXISTS "idx_homeowner_subs_status" ON "homeowner_subscriptions" ("builder_id", "status");
CREATE INDEX IF NOT EXISTS "idx_homeowner_subs_stripe" ON "homeowner_subscriptions" ("stripe_subscription_id");
CREATE INDEX IF NOT EXISTS "idx_invoices_builder" ON "invoices" ("builder_id");
CREATE INDEX IF NOT EXISTS "idx_invoices_home" ON "invoices" ("home_id");
CREATE INDEX IF NOT EXISTS "idx_invoices_stripe" ON "invoices" ("stripe_invoice_id");
CREATE INDEX IF NOT EXISTS "idx_invoice_line_items_invoice" ON "invoice_line_items" ("invoice_id");
CREATE INDEX IF NOT EXISTS "idx_builder_pricing_builder" ON "builder_pricing" ("builder_id");
