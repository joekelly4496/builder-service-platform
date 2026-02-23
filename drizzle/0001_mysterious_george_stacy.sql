ALTER TABLE "builders" ADD COLUMN "calendar_token" text;--> statement-breakpoint
ALTER TABLE "homes" ADD COLUMN "calendar_token" text;--> statement-breakpoint
ALTER TABLE "subcontractors" ADD COLUMN "calendar_token" text;--> statement-breakpoint
ALTER TABLE "builders" ADD CONSTRAINT "builders_calendar_token_unique" UNIQUE("calendar_token");--> statement-breakpoint
ALTER TABLE "homes" ADD CONSTRAINT "homes_calendar_token_unique" UNIQUE("calendar_token");--> statement-breakpoint
ALTER TABLE "subcontractors" ADD CONSTRAINT "subcontractors_calendar_token_unique" UNIQUE("calendar_token");