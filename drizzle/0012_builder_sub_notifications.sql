-- Builder notifications table
CREATE TABLE IF NOT EXISTS "builder_notifications" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "builder_id" uuid NOT NULL REFERENCES "builders"("id"),
  "type" text NOT NULL,
  "title" text NOT NULL,
  "message" text NOT NULL,
  "link_url" text,
  "is_read" boolean DEFAULT false NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX idx_builder_notifications_builder_id ON "builder_notifications"("builder_id");
CREATE INDEX idx_builder_notifications_is_read ON "builder_notifications"("builder_id", "is_read");

-- Subcontractor notifications table
CREATE TABLE IF NOT EXISTS "sub_notifications" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "subcontractor_id" uuid NOT NULL REFERENCES "subcontractors"("id"),
  "type" text NOT NULL,
  "title" text NOT NULL,
  "message" text NOT NULL,
  "link_url" text,
  "is_read" boolean DEFAULT false NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX idx_sub_notifications_sub_id ON "sub_notifications"("subcontractor_id");
CREATE INDEX idx_sub_notifications_is_read ON "sub_notifications"("subcontractor_id", "is_read");
