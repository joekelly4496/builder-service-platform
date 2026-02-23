CREATE TYPE "public"."trade_category" AS ENUM('plumbing', 'electrical', 'hvac', 'roofing', 'flooring', 'painting', 'landscaping', 'drywall', 'carpentry', 'general');--> statement-breakpoint
CREATE TABLE "subcontractor_magic_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subcontractor_id" uuid NOT NULL,
	"service_request_id" uuid NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "subcontractor_magic_links_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "communications" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "magic_links" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "communications" CASCADE;--> statement-breakpoint
DROP TABLE "magic_links" CASCADE;--> statement-breakpoint
ALTER TABLE "home_trade_assignments" DROP CONSTRAINT "home_trade_assignments_home_id_trade_category_unique";--> statement-breakpoint
ALTER TABLE "home_trade_assignments" DROP CONSTRAINT "home_trade_assignments_home_id_homes_id_fk";
--> statement-breakpoint
ALTER TABLE "home_trade_assignments" DROP CONSTRAINT "home_trade_assignments_subcontractor_id_subcontractors_id_fk";
--> statement-breakpoint
ALTER TABLE "homes" DROP CONSTRAINT "homes_builder_id_builders_id_fk";
--> statement-breakpoint
ALTER TABLE "service_request_audit_log" DROP CONSTRAINT "service_request_audit_log_service_request_id_service_requests_id_fk";
--> statement-breakpoint
ALTER TABLE "service_requests" DROP CONSTRAINT "service_requests_home_id_homes_id_fk";
--> statement-breakpoint
ALTER TABLE "service_requests" DROP CONSTRAINT "service_requests_assigned_subcontractor_id_subcontractors_id_fk";
--> statement-breakpoint
ALTER TABLE "subcontractors" DROP CONSTRAINT "subcontractors_builder_id_builders_id_fk";
--> statement-breakpoint
ALTER TABLE "builders" ALTER COLUMN "custom_trade_categories" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "service_request_audit_log" ALTER COLUMN "old_status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "service_request_audit_log" ALTER COLUMN "new_status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "service_request_audit_log" ALTER COLUMN "metadata" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "service_requests" ALTER COLUMN "homeowner_description" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "subcontractors" ALTER COLUMN "trade_categories" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "subcontractors" ALTER COLUMN "status" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "service_requests" ADD COLUMN "subcontractor_notes" text;--> statement-breakpoint
ALTER TABLE "service_requests" ADD COLUMN "photo_urls" jsonb;--> statement-breakpoint
ALTER TABLE "subcontractor_magic_links" ADD CONSTRAINT "subcontractor_magic_links_subcontractor_id_subcontractors_id_fk" FOREIGN KEY ("subcontractor_id") REFERENCES "public"."subcontractors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subcontractor_magic_links" ADD CONSTRAINT "subcontractor_magic_links_service_request_id_service_requests_id_fk" FOREIGN KEY ("service_request_id") REFERENCES "public"."service_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "home_trade_assignments" ADD CONSTRAINT "home_trade_assignments_home_id_homes_id_fk" FOREIGN KEY ("home_id") REFERENCES "public"."homes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "home_trade_assignments" ADD CONSTRAINT "home_trade_assignments_subcontractor_id_subcontractors_id_fk" FOREIGN KEY ("subcontractor_id") REFERENCES "public"."subcontractors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "homes" ADD CONSTRAINT "homes_builder_id_builders_id_fk" FOREIGN KEY ("builder_id") REFERENCES "public"."builders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_request_audit_log" ADD CONSTRAINT "service_request_audit_log_service_request_id_service_requests_id_fk" FOREIGN KEY ("service_request_id") REFERENCES "public"."service_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_home_id_homes_id_fk" FOREIGN KEY ("home_id") REFERENCES "public"."homes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_assigned_subcontractor_id_subcontractors_id_fk" FOREIGN KEY ("assigned_subcontractor_id") REFERENCES "public"."subcontractors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subcontractors" ADD CONSTRAINT "subcontractors_builder_id_builders_id_fk" FOREIGN KEY ("builder_id") REFERENCES "public"."builders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "home_trade_assignments" DROP COLUMN "notes";--> statement-breakpoint
ALTER TABLE "home_trade_assignments" DROP COLUMN "assigned_at";--> statement-breakpoint
ALTER TABLE "homes" DROP COLUMN "project_completed_at";--> statement-breakpoint
ALTER TABLE "homes" DROP COLUMN "warranty_expires_at";--> statement-breakpoint
ALTER TABLE "service_request_audit_log" DROP COLUMN "ip_address";--> statement-breakpoint
ALTER TABLE "service_requests" DROP COLUMN "photos";--> statement-breakpoint
ALTER TABLE "service_requests" DROP COLUMN "completion_photos";--> statement-breakpoint
ALTER TABLE "service_requests" DROP COLUMN "escalated_at";--> statement-breakpoint
DROP TYPE "public"."communication_channel";--> statement-breakpoint
DROP TYPE "public"."communication_status";