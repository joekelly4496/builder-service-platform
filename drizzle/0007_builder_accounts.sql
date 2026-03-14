-- Builder accounts table (links Supabase auth to builder record)
CREATE TABLE IF NOT EXISTS "builder_accounts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "supabase_user_id" text NOT NULL UNIQUE,
  "builder_id" uuid NOT NULL REFERENCES "builders"("id"),
  "email" text NOT NULL,
  "role" text NOT NULL DEFAULT 'owner',
  "created_at" timestamp DEFAULT now() NOT NULL
);

-- Add onboarding status to builders
ALTER TABLE "builders" ADD COLUMN IF NOT EXISTS "onboarding_status" text DEFAULT 'company_info';
