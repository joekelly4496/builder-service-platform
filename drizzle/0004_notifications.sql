-- Create notification_type enum
DO $$ BEGIN
  CREATE TYPE "notification_type" AS ENUM('maintenance_due', 'request_status_change', 'new_message', 'schedule_approval', 'request_completed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create notifications table
CREATE TABLE IF NOT EXISTS "notifications" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "homeowner_id" uuid NOT NULL REFERENCES "homeowner_accounts"("id"),
  "type" "notification_type" NOT NULL,
  "title" text NOT NULL,
  "message" text NOT NULL,
  "link_url" text,
  "is_read" boolean NOT NULL DEFAULT false,
  "created_at" timestamp DEFAULT now() NOT NULL
);

-- Create notification_preferences table
CREATE TABLE IF NOT EXISTS "notification_preferences" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "homeowner_id" uuid NOT NULL REFERENCES "homeowner_accounts"("id") UNIQUE,
  "email_enabled" boolean NOT NULL DEFAULT true,
  "sms_enabled" boolean NOT NULL DEFAULT false,
  "in_app_enabled" boolean NOT NULL DEFAULT true,
  "phone_number" text,
  "maintenance_email" boolean NOT NULL DEFAULT true,
  "maintenance_sms" boolean NOT NULL DEFAULT false,
  "maintenance_in_app" boolean NOT NULL DEFAULT true,
  "request_updates_email" boolean NOT NULL DEFAULT true,
  "request_updates_sms" boolean NOT NULL DEFAULT false,
  "request_updates_in_app" boolean NOT NULL DEFAULT true,
  "messages_email" boolean NOT NULL DEFAULT true,
  "messages_sms" boolean NOT NULL DEFAULT false,
  "messages_in_app" boolean NOT NULL DEFAULT true,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS "idx_notifications_homeowner" ON "notifications" ("homeowner_id");
CREATE INDEX IF NOT EXISTS "idx_notifications_unread" ON "notifications" ("homeowner_id", "is_read") WHERE "is_read" = false;
CREATE INDEX IF NOT EXISTS "idx_notifications_created" ON "notifications" ("created_at" DESC);
