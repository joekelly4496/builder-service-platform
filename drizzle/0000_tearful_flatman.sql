CREATE TYPE "public"."actor_type" AS ENUM('homeowner', 'subcontractor', 'builder', 'system');--> statement-breakpoint
CREATE TYPE "public"."communication_channel" AS ENUM('email', 'sms');--> statement-breakpoint
CREATE TYPE "public"."communication_status" AS ENUM('sent', 'delivered', 'bounced', 'opened', 'clicked', 'failed');--> statement-breakpoint
CREATE TYPE "public"."priority" AS ENUM('urgent', 'normal', 'low');--> statement-breakpoint
CREATE TYPE "public"."status" AS ENUM('submitted', 'acknowledged', 'scheduled', 'in_progress', 'completed', 'escalated', 'cancelled', 'closed');--> statement-breakpoint
CREATE TABLE "builders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_name" text NOT NULL,
	"contact_name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"custom_trade_categories" jsonb DEFAULT '[]'::jsonb,
	"sla_urgent_acknowledge_minutes" integer DEFAULT 120,
	"sla_urgent_schedule_minutes" integer DEFAULT 240,
	"sla_normal_acknowledge_minutes" integer DEFAULT 2880,
	"sla_normal_schedule_minutes" integer DEFAULT 7200,
	"sla_low_acknowledge_minutes" integer DEFAULT 7200,
	"sla_low_schedule_minutes" integer DEFAULT 14400,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "builders_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "communications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"service_request_id" uuid NOT NULL,
	"from_type" "actor_type" NOT NULL,
	"from_email" text,
	"to_type" "actor_type" NOT NULL,
	"to_email" text NOT NULL,
	"channel" "communication_channel" DEFAULT 'email' NOT NULL,
	"subject" text,
	"body" text NOT NULL,
	"status" "communication_status" DEFAULT 'sent' NOT NULL,
	"sent_at" timestamp DEFAULT now() NOT NULL,
	"delivered_at" timestamp,
	"opened_at" timestamp,
	"clicked_at" timestamp,
	"metadata" jsonb DEFAULT '{}'::jsonb
);
--> statement-breakpoint
CREATE TABLE "home_trade_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"home_id" uuid NOT NULL,
	"subcontractor_id" uuid NOT NULL,
	"trade_category" text NOT NULL,
	"notes" text,
	"assigned_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "home_trade_assignments_home_id_trade_category_unique" UNIQUE("home_id","trade_category")
);
--> statement-breakpoint
CREATE TABLE "homes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"builder_id" uuid NOT NULL,
	"address" text NOT NULL,
	"city" text NOT NULL,
	"state" text NOT NULL,
	"zip_code" text NOT NULL,
	"homeowner_name" text NOT NULL,
	"homeowner_email" text NOT NULL,
	"homeowner_phone" text,
	"project_completed_at" timestamp,
	"warranty_expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "magic_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token" text NOT NULL,
	"type" text NOT NULL,
	"related_id" uuid NOT NULL,
	"email" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "magic_links_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "service_request_audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"service_request_id" uuid NOT NULL,
	"actor_type" "actor_type" NOT NULL,
	"actor_email" text,
	"action" text NOT NULL,
	"old_status" "status",
	"new_status" "status",
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"ip_address" text,
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"home_id" uuid NOT NULL,
	"assigned_subcontractor_id" uuid NOT NULL,
	"trade_category" text NOT NULL,
	"priority" "priority" DEFAULT 'normal' NOT NULL,
	"status" "status" DEFAULT 'submitted' NOT NULL,
	"homeowner_description" text NOT NULL,
	"homeowner_contact_preference" text,
	"photos" jsonb DEFAULT '[]'::jsonb,
	"sla_acknowledge_deadline" timestamp NOT NULL,
	"sla_schedule_deadline" timestamp NOT NULL,
	"acknowledged_at" timestamp,
	"scheduled_for" timestamp,
	"completed_at" timestamp,
	"completion_notes" text,
	"completion_photos" jsonb DEFAULT '[]'::jsonb,
	"escalated_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subcontractors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"builder_id" uuid NOT NULL,
	"company_name" text NOT NULL,
	"contact_name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"trade_categories" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "communications" ADD CONSTRAINT "communications_service_request_id_service_requests_id_fk" FOREIGN KEY ("service_request_id") REFERENCES "public"."service_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "home_trade_assignments" ADD CONSTRAINT "home_trade_assignments_home_id_homes_id_fk" FOREIGN KEY ("home_id") REFERENCES "public"."homes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "home_trade_assignments" ADD CONSTRAINT "home_trade_assignments_subcontractor_id_subcontractors_id_fk" FOREIGN KEY ("subcontractor_id") REFERENCES "public"."subcontractors"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "homes" ADD CONSTRAINT "homes_builder_id_builders_id_fk" FOREIGN KEY ("builder_id") REFERENCES "public"."builders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_request_audit_log" ADD CONSTRAINT "service_request_audit_log_service_request_id_service_requests_id_fk" FOREIGN KEY ("service_request_id") REFERENCES "public"."service_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_home_id_homes_id_fk" FOREIGN KEY ("home_id") REFERENCES "public"."homes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_assigned_subcontractor_id_subcontractors_id_fk" FOREIGN KEY ("assigned_subcontractor_id") REFERENCES "public"."subcontractors"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subcontractors" ADD CONSTRAINT "subcontractors_builder_id_builders_id_fk" FOREIGN KEY ("builder_id") REFERENCES "public"."builders"("id") ON DELETE cascade ON UPDATE no action;