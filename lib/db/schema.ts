import { pgTable, uuid, text, timestamp, integer, jsonb, pgEnum, boolean } from "drizzle-orm/pg-core";

export const statusEnum = pgEnum("status", [
  "submitted",
  "acknowledged",
  "scheduled",
  "in_progress",
  "completed",
  "escalated",
  "cancelled",
  "closed",
]);

export const priorityEnum = pgEnum("priority", ["urgent", "normal", "low"]);

export const tradeCategoryEnum = pgEnum("trade_category", [
  "plumbing",
  "electrical",
  "hvac",
  "roofing",
  "flooring",
  "painting",
  "landscaping",
  "drywall",
  "carpentry",
  "general",
]);

export const actorTypeEnum = pgEnum("actor_type", [
  "homeowner",
  "subcontractor",
  "builder",
  "system",
]);

export const builders = pgTable("builders", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyName: text("company_name").notNull(),
  contactName: text("contact_name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  customTradeCategories: jsonb("custom_trade_categories"),
  slaUrgentAcknowledgeMinutes: integer("sla_urgent_acknowledge_minutes").default(120),
  slaUrgentScheduleMinutes: integer("sla_urgent_schedule_minutes").default(240),
  slaNormalAcknowledgeMinutes: integer("sla_normal_acknowledge_minutes").default(2880),
  slaNormalScheduleMinutes: integer("sla_normal_schedule_minutes").default(7200),
  slaLowAcknowledgeMinutes: integer("sla_low_acknowledge_minutes").default(7200),
  slaLowScheduleMinutes: integer("sla_low_schedule_minutes").default(14400),
  calendarToken: text("calendar_token").unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const homes = pgTable("homes", {
  id: uuid("id").primaryKey().defaultRandom(),
  builderId: uuid("builder_id").references(() => builders.id).notNull(),
  address: text("address").notNull(),
  city: text("city").notNull(),
  state: text("state").notNull(),
  zipCode: text("zip_code").notNull(),
  homeownerName: text("homeowner_name").notNull(),
  homeownerEmail: text("homeowner_email").notNull(),
  homeownerPhone: text("homeowner_phone"),
  calendarToken: text("calendar_token").unique(),
  projectCompletedAt: timestamp("project_completed_at"),
  warrantyExpiresAt: timestamp("warranty_expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const subcontractors = pgTable("subcontractors", {
  id: uuid("id").primaryKey().defaultRandom(),
  builderId: uuid("builder_id").references(() => builders.id).notNull(),
  companyName: text("company_name").notNull(),
  contactName: text("contact_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  tradeCategories: jsonb("trade_categories").notNull(),
  status: text("status").default("active"),
  calendarToken: text("calendar_token").unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const homeTradeAssignments = pgTable("home_trade_assignments", {
  id: uuid("id").primaryKey().defaultRandom(),
  homeId: uuid("home_id").references(() => homes.id).notNull(),
  subcontractorId: uuid("subcontractor_id").references(() => subcontractors.id).notNull(),
  tradeCategory: text("trade_category").notNull(),
  notes: text("notes"),
  assignedAt: timestamp("assigned_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const serviceRequests = pgTable("service_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  homeId: uuid("home_id").references(() => homes.id).notNull(),
  assignedSubcontractorId: uuid("assigned_subcontractor_id").references(() => subcontractors.id).notNull(),
  tradeCategory: text("trade_category").notNull(),
  priority: priorityEnum("priority").notNull().default("normal"),
  status: statusEnum("status").notNull().default("submitted"),
  homeownerDescription: text("homeowner_description"),
  homeownerContactPreference: text("homeowner_contact_preference"),
  subcontractorNotes: text("subcontractor_notes"),
  completionNotes: text("completion_notes"),
  photos: jsonb("photos").$type<string[]>(),
  photoUrls: jsonb("photo_urls").$type<string[]>(),
  completionPhotos: jsonb("completion_photos").$type<string[]>(),
  escalatedAt: timestamp("escalated_at"),
  slaAcknowledgeDeadline: timestamp("sla_acknowledge_deadline").notNull(),
  slaScheduleDeadline: timestamp("sla_schedule_deadline").notNull(),
  slaReminderSent: boolean("sla_reminder_sent").default(false),
  acknowledgedAt: timestamp("acknowledged_at"),
  scheduledFor: timestamp("scheduled_for"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const serviceRequestAuditLog = pgTable("service_request_audit_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  serviceRequestId: uuid("service_request_id").references(() => serviceRequests.id).notNull(),
  actorType: actorTypeEnum("actor_type").notNull(),
  actorEmail: text("actor_email"),
  action: text("action").notNull(),
  oldStatus: text("old_status"),
  newStatus: text("new_status"),
  metadata: jsonb("metadata"),
  ipAddress: text("ip_address"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export const subcontractorMagicLinks = pgTable("subcontractor_magic_links", {
  id: uuid("id").primaryKey().defaultRandom(),
  subcontractorId: uuid("subcontractor_id").references(() => subcontractors.id).notNull(),
  serviceRequestId: uuid("service_request_id").references(() => serviceRequests.id).notNull(),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const serviceRequestMessages = pgTable("service_request_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  serviceRequestId: uuid("service_request_id").references(() => serviceRequests.id).notNull(),
  senderType: actorTypeEnum("sender_type").notNull(),
  senderName: text("sender_name").notNull(),
  senderEmail: text("sender_email").notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const homeownerMagicLinks = pgTable("homeowner_magic_links", {
  id: uuid("id").primaryKey().defaultRandom(),
  homeId: uuid("home_id").references(() => homes.id).notNull(),
  serviceRequestId: uuid("service_request_id").references(() => serviceRequests.id).notNull(),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const homeownerAccounts = pgTable("homeowner_accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  supabaseUserId: text("supabase_user_id").notNull().unique(),
  homeId: uuid("home_id").references(() => homes.id).notNull(),
  email: text("email").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const subcontractorAccounts = pgTable("subcontractor_accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  supabaseUserId: text("supabase_user_id").notNull().unique(),
  subcontractorId: uuid("subcontractor_id").references(() => subcontractors.id).notNull(),
  email: text("email").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const serviceRequestRatings = pgTable("service_request_ratings", {
  id: uuid("id").primaryKey().defaultRandom(),
  serviceRequestId: uuid("service_request_id").references(() => serviceRequests.id).notNull(),
  homeId: uuid("home_id").references(() => homes.id).notNull(),
  rating: integer("rating").notNull(),
  review: text("review"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const scheduleApprovals = pgTable("schedule_approvals", {
  id: uuid("id").primaryKey().defaultRandom(),
  serviceRequestId: uuid("service_request_id").references(() => serviceRequests.id).notNull(),
  status: text("status").notNull().default("pending"),
  homeownerResponse: text("homeowner_response"),
  respondedAt: timestamp("responded_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const maintenanceItems = pgTable("maintenance_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  homeId: uuid("home_id").references(() => homes.id).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  tradeCategory: text("trade_category").notNull(),
  installedAt: timestamp("installed_at"),
  installNotes: text("install_notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const maintenanceReminders = pgTable("maintenance_reminders", {
  id: uuid("id").primaryKey().defaultRandom(),
  maintenanceItemId: uuid("maintenance_item_id").references(() => maintenanceItems.id).notNull(),
  homeId: uuid("home_id").references(() => homes.id).notNull(),
  title: text("title").notNull(),
  description: text("description"),
  intervalDays: integer("interval_days").notNull(),
  nextDueDate: timestamp("next_due_date").notNull(),
  lastCompletedAt: timestamp("last_completed_at"),
  lastReminderSentAt: timestamp("last_reminder_sent_at"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});