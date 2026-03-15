-- Add SMS/Twilio columns to builders table
ALTER TABLE "builders" ADD COLUMN IF NOT EXISTS "sms_enabled" boolean NOT NULL DEFAULT false;
ALTER TABLE "builders" ADD COLUMN IF NOT EXISTS "twilio_phone_number" text;
ALTER TABLE "builders" ADD COLUMN IF NOT EXISTS "twilio_phone_number_sid" text;

-- Add Stripe Connect columns to builders table
ALTER TABLE "builders" ADD COLUMN IF NOT EXISTS "stripe_connect_account_id" text;
ALTER TABLE "builders" ADD COLUMN IF NOT EXISTS "stripe_subscription_id" text;
ALTER TABLE "builders" ADD COLUMN IF NOT EXISTS "stripe_sms_subscription_item_id" text;

-- Add phone number and SMS opt-in to homeowner_accounts
ALTER TABLE "homeowner_accounts" ADD COLUMN IF NOT EXISTS "phone_number" text;
ALTER TABLE "homeowner_accounts" ADD COLUMN IF NOT EXISTS "sms_opt_in" boolean NOT NULL DEFAULT false;

-- Create sms_logs table
CREATE TABLE IF NOT EXISTS "sms_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "builder_id" uuid NOT NULL REFERENCES "builders"("id"),
  "home_id" uuid REFERENCES "homes"("id"),
  "to_number" text NOT NULL,
  "message" text NOT NULL,
  "twilio_message_sid" text,
  "cost_cents" integer,
  "status" text DEFAULT 'sent',
  "created_at" timestamp DEFAULT now() NOT NULL
);

-- Add indexes for SMS logs
CREATE INDEX IF NOT EXISTS "idx_sms_logs_builder" ON "sms_logs" ("builder_id");
CREATE INDEX IF NOT EXISTS "idx_sms_logs_builder_month" ON "sms_logs" ("builder_id", "created_at");
CREATE INDEX IF NOT EXISTS "idx_sms_logs_home" ON "sms_logs" ("home_id");

-- Add index for homeowner SMS opt-in lookups
CREATE INDEX IF NOT EXISTS "idx_homeowner_sms_optin" ON "homeowner_accounts" ("home_id") WHERE "sms_opt_in" = true;
