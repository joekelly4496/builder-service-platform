import { pgTable, uuid, text, timestamp, integer, jsonb, pgEnum, boolean, varchar } from "drizzle-orm/pg-core";

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

export const planTierEnum = pgEnum("plan_tier", [
  "intro",
  "starter",
  "growth",
  "pro",
]);

export const staffRoleEnum = pgEnum("staff_role", [
  "owner",
  "admin",
  "manager",
  "field_tech",
]);

export const billingRecordTypeEnum = pgEnum("billing_record_type", [
  "subscription",
  "usage",
  "payment",
  "refund",
  "credit",
]);

export const builderSubRelationshipStatusEnum = pgEnum("builder_sub_relationship_status", [
  "invited",
  "active",
  "paused",
  "removed",
]);

export const builders = pgTable("builders", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyName: text("company_name").notNull(),
  contactName: text("contact_name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  // Multi-tenancy fields
  slug: varchar("slug", { length: 100 }).unique(),
  planTier: planTierEnum("plan_tier").default("intro"),
  stripeCustomerId: varchar("stripe_customer_id", { length: 255 }),
  brandingConfig: jsonb("branding_config").$type<{
    logo?: string;
    primaryColor?: string;
    companyName?: string;
  }>(),
  isActive: boolean("is_active").default(true).notNull(),
  // Existing fields
  customTradeCategories: jsonb("custom_trade_categories"),
  slaUrgentAcknowledgeMinutes: integer("sla_urgent_acknowledge_minutes").default(120),
  slaUrgentScheduleMinutes: integer("sla_urgent_schedule_minutes").default(240),
  slaNormalAcknowledgeMinutes: integer("sla_normal_acknowledge_minutes").default(2880),
  slaNormalScheduleMinutes: integer("sla_normal_schedule_minutes").default(7200),
  slaLowAcknowledgeMinutes: integer("sla_low_acknowledge_minutes").default(7200),
  slaLowScheduleMinutes: integer("sla_low_schedule_minutes").default(14400),
  calendarToken: text("calendar_token").unique(),
  // SMS / Twilio fields
  smsEnabled: boolean("sms_enabled").default(false).notNull(),
  twilioPhoneNumber: text("twilio_phone_number"),
  twilioPhoneNumberSid: text("twilio_phone_number_sid"),
  // Stripe Connect fields
  stripeConnectAccountId: text("stripe_connect_account_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  stripeSmsSubscriptionItemId: text("stripe_sms_subscription_item_id"),
  onboardingStatus: text("onboarding_status").default("company_info"),
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

// Subcontractors are global profiles — not tied to a single builder.
// Builder-specific relationships are managed via builderSubcontractorRelationships.
export const subcontractors = pgTable("subcontractors", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyName: text("company_name").notNull(),
  contactName: text("contact_name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  tradeCategories: jsonb("trade_categories").notNull(),
  slug: varchar("slug", { length: 100 }).unique(),
  bio: text("bio"),
  serviceArea: text("service_area"),
  licenseNumber: text("license_number"),
  licenseUrl: text("license_url"),
  insuranceUrl: text("insurance_url"),
  insuranceExpiresAt: timestamp("insurance_expires_at"),
  pricingRanges: jsonb("pricing_ranges"),
  isVerified: boolean("is_verified").default(false).notNull(),
  status: text("status").default("active"),
  calendarToken: text("calendar_token").unique(),
  // Sub Pro subscription fields
  isSubPro: boolean("is_sub_pro").default(false).notNull(),
  stripeCustomerId: varchar("stripe_customer_id", { length: 255 }),
  stripeSubscriptionId: varchar("stripe_subscription_id", { length: 255 }),
  stripeSmsSubscriptionItemId: varchar("stripe_sms_subscription_item_id", { length: 255 }),
  // SMS business number fields
  smsEnabled: boolean("sms_enabled").default(false).notNull(),
  twilioPhoneNumber: text("twilio_phone_number"),
  twilioPhoneNumberSid: text("twilio_phone_number_sid"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const builderSubcontractorRelationships = pgTable("builder_subcontractor_relationships", {
  id: uuid("id").primaryKey().defaultRandom(),
  builderId: uuid("builder_id").references(() => builders.id).notNull(),
  subcontractorId: uuid("subcontractor_id").references(() => subcontractors.id).notNull(),
  status: builderSubRelationshipStatusEnum("status").notNull().default("active"),
  invitedAt: timestamp("invited_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const homeTradeAssignments = pgTable("home_trade_assignments", {
  id: uuid("id").primaryKey().defaultRandom(),
  builderId: uuid("builder_id").references(() => builders.id).notNull(),
  homeId: uuid("home_id").references(() => homes.id).notNull(),
  subcontractorId: uuid("subcontractor_id").references(() => subcontractors.id).notNull(),
  tradeCategory: text("trade_category").notNull(),
  notes: text("notes"),
  assignedAt: timestamp("assigned_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const serviceRequests = pgTable("service_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  builderId: uuid("builder_id").references(() => builders.id).notNull(),
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
  jobCostCents: integer("job_cost_cents"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const serviceRequestAuditLog = pgTable("service_request_audit_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  builderId: uuid("builder_id").references(() => builders.id).notNull(),
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
  builderId: uuid("builder_id").references(() => builders.id).notNull(),
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
  builderId: uuid("builder_id").references(() => builders.id).notNull(),
  supabaseUserId: text("supabase_user_id").notNull().unique(),
  homeId: uuid("home_id").references(() => homes.id).notNull(),
  email: text("email").notNull(),
  phoneNumber: text("phone_number"),
  smsOptIn: boolean("sms_opt_in").default(false).notNull(),
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
  builderId: uuid("builder_id").references(() => builders.id).notNull(),
  serviceRequestId: uuid("service_request_id").references(() => serviceRequests.id).notNull(),
  homeId: uuid("home_id").references(() => homes.id).notNull(),
  rating: integer("rating").notNull(),
  review: text("review"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const scheduleApprovals = pgTable("schedule_approvals", {
  id: uuid("id").primaryKey().defaultRandom(),
  builderId: uuid("builder_id").references(() => builders.id).notNull(),
  serviceRequestId: uuid("service_request_id").references(() => serviceRequests.id).notNull(),
  status: text("status").notNull().default("pending"),
  homeownerResponse: text("homeowner_response"),
  respondedAt: timestamp("responded_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const maintenanceItems = pgTable("maintenance_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  builderId: uuid("builder_id").references(() => builders.id).notNull(),
  homeId: uuid("home_id").references(() => homes.id).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  tradeCategory: text("trade_category").notNull(),
  installedAt: timestamp("installed_at"),
  installNotes: text("install_notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const notificationTypeEnum = pgEnum("notification_type", [
  "maintenance_due",
  "request_status_change",
  "new_message",
  "schedule_approval",
  "request_completed",
]);

export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  builderId: uuid("builder_id").references(() => builders.id).notNull(),
  homeownerId: uuid("homeowner_id").references(() => homeownerAccounts.id).notNull(),
  type: notificationTypeEnum("type").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  linkUrl: text("link_url"),
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const notificationPreferences = pgTable("notification_preferences", {
  id: uuid("id").primaryKey().defaultRandom(),
  builderId: uuid("builder_id").references(() => builders.id).notNull(),
  homeownerId: uuid("homeowner_id").references(() => homeownerAccounts.id).notNull().unique(),
  emailEnabled: boolean("email_enabled").default(true).notNull(),
  smsEnabled: boolean("sms_enabled").default(false).notNull(),
  inAppEnabled: boolean("in_app_enabled").default(true).notNull(),
  phoneNumber: text("phone_number"),
  maintenanceEmail: boolean("maintenance_email").default(true).notNull(),
  maintenanceSms: boolean("maintenance_sms").default(false).notNull(),
  maintenanceInApp: boolean("maintenance_in_app").default(true).notNull(),
  requestUpdatesEmail: boolean("request_updates_email").default(true).notNull(),
  requestUpdatesSms: boolean("request_updates_sms").default(false).notNull(),
  requestUpdatesInApp: boolean("request_updates_in_app").default(true).notNull(),
  messagesEmail: boolean("messages_email").default(true).notNull(),
  messagesSms: boolean("messages_sms").default(false).notNull(),
  messagesInApp: boolean("messages_in_app").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});


export const maintenanceReminders = pgTable("maintenance_reminders", {
  id: uuid("id").primaryKey().defaultRandom(),
  builderId: uuid("builder_id").references(() => builders.id).notNull(),
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

export const smsLogs = pgTable("sms_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  builderId: uuid("builder_id").references(() => builders.id).notNull(),
  homeId: uuid("home_id").references(() => homes.id),
  toNumber: text("to_number").notNull(),
  message: text("message").notNull(),
  twilioMessageSid: text("twilio_message_sid"),
  costCents: integer("cost_cents"),
  status: text("status").default("sent"),
  stripeUsageReported: boolean("stripe_usage_reported").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ==================== BILLING TABLES ====================

export const builderPricing = pgTable("builder_pricing", {
  id: uuid("id").primaryKey().defaultRandom(),
  builderId: uuid("builder_id").references(() => builders.id).notNull().unique(),
  portalAccessMonthlyPrice: integer("portal_access_monthly_price").notNull().default(1500), // $15.00 in cents
  smsAddonMonthlyPrice: integer("sms_addon_monthly_price").notNull().default(1000), // $10.00 in cents
  perMessagePrice: integer("per_message_price").notNull().default(5), // $0.05 in cents
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "pending",
  "active",
  "past_due",
  "cancelled",
  "paused",
]);

export const homeownerSubscriptions = pgTable("homeowner_subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  homeId: uuid("home_id").references(() => homes.id).notNull(),
  builderId: uuid("builder_id").references(() => builders.id).notNull(),
  homeownerAccountId: uuid("homeowner_account_id").references(() => homeownerAccounts.id),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  stripePaymentMethodId: text("stripe_payment_method_id"),
  status: subscriptionStatusEnum("status").notNull().default("pending"),
  monthlyPriceCents: integer("monthly_price_cents").notNull(),
  smsAddonEnabled: boolean("sms_addon_enabled").default(false),
  smsAddonPriceCents: integer("sms_addon_price_cents"),
  perMessagePriceCents: integer("per_message_price_cents"),
  billingStartDate: timestamp("billing_start_date").notNull(),
  billingAnchorDay: integer("billing_anchor_day").notNull(), // day of month (1-28)
  nextBillingDate: timestamp("next_billing_date"),
  cancelledAt: timestamp("cancelled_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const invoiceStatusEnum = pgEnum("invoice_status", [
  "draft",
  "sent",
  "paid",
  "overdue",
  "cancelled",
  "void",
]);

export const invoices = pgTable("invoices", {
  id: uuid("id").primaryKey().defaultRandom(),
  homeId: uuid("home_id").references(() => homes.id).notNull(),
  builderId: uuid("builder_id").references(() => builders.id).notNull(),
  homeownerAccountId: uuid("homeowner_account_id").references(() => homeownerAccounts.id),
  stripeInvoiceId: text("stripe_invoice_id"),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  status: invoiceStatusEnum("status").notNull().default("draft"),
  subtotalCents: integer("subtotal_cents").notNull(),
  platformFeeCents: integer("platform_fee_cents").notNull().default(0),
  totalCents: integer("total_cents").notNull(),
  description: text("description"),
  dueDate: timestamp("due_date"),
  paidAt: timestamp("paid_at"),
  paymentUrl: text("payment_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const builderAccounts = pgTable("builder_accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  supabaseUserId: text("supabase_user_id").notNull().unique(),
  builderId: uuid("builder_id").references(() => builders.id).notNull(),
  email: text("email").notNull(),
  role: text("role").default("owner").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const onboardingStatusEnum = pgEnum("onboarding_status", [
  "company_info",
  "add_homes",
  "add_subcontractors",
  "completed",
]);

export const invoiceLineItems = pgTable("invoice_line_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  invoiceId: uuid("invoice_id").references(() => invoices.id).notNull(),
  description: text("description").notNull(),
  quantity: integer("quantity").notNull().default(1),
  unitPriceCents: integer("unit_price_cents").notNull(),
  totalCents: integer("total_cents").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ==================== MULTI-TENANCY TABLES ====================

export const staffUsers = pgTable("staff_users", {
  id: uuid("id").primaryKey().defaultRandom(),
  builderId: uuid("builder_id").references(() => builders.id).notNull(),
  supabaseUserId: text("supabase_user_id").notNull().unique(),
  email: text("email").notNull(),
  name: text("name").notNull(),
  role: staffRoleEnum("role").notNull().default("field_tech"),
  isActive: boolean("is_active").default(true).notNull(),
  invitedAt: timestamp("invited_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const builderNotifications = pgTable("builder_notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  builderId: uuid("builder_id").references(() => builders.id).notNull(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  linkUrl: text("link_url"),
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const subNotifications = pgTable("sub_notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  subcontractorId: uuid("subcontractor_id").references(() => subcontractors.id).notNull(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  linkUrl: text("link_url"),
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ==================== REVIEWS ====================

export const reviewerTypeEnum = pgEnum("reviewer_type", [
  "builder",
  "homeowner",
]);

export const reviews = pgTable("reviews", {
  id: uuid("id").primaryKey().defaultRandom(),
  subcontractorId: uuid("subcontractor_id").references(() => subcontractors.id).notNull(),
  serviceRequestId: uuid("service_request_id").references(() => serviceRequests.id),
  builderId: uuid("builder_id").references(() => builders.id),
  homeId: uuid("home_id").references(() => homes.id),
  reviewerType: reviewerTypeEnum("reviewer_type").notNull(),
  reviewerName: text("reviewer_name").notNull(),
  rating: integer("rating").notNull(), // 1-5
  comment: text("comment"),
  tradeCategory: text("trade_category"),
  isPublic: boolean("is_public").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const billingRecords = pgTable("billing_records", {
  id: uuid("id").primaryKey().defaultRandom(),
  builderId: uuid("builder_id").references(() => builders.id).notNull(),
  type: billingRecordTypeEnum("type").notNull(),
  amountCents: integer("amount_cents").notNull(),
  description: text("description"),
  stripePaymentId: varchar("stripe_payment_id", { length: 255 }),
  periodStart: timestamp("period_start"),
  periodEnd: timestamp("period_end"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ==================== SUB SMS MESSAGES ====================

export const subSmsMessages = pgTable("sub_sms_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  subcontractorId: uuid("subcontractor_id").references(() => subcontractors.id).notNull(),
  serviceRequestId: uuid("service_request_id").references(() => serviceRequests.id),
  direction: text("direction").notNull(), // 'outbound' | 'inbound'
  fromNumber: text("from_number").notNull(),
  toNumber: text("to_number").notNull(),
  body: text("body").notNull(),
  twilioMessageSid: text("twilio_message_sid"),
  costCents: integer("cost_cents"),
  status: text("status").default("sent"),
  stripeUsageReported: boolean("stripe_usage_reported").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const subSmsOptOuts = pgTable("sub_sms_opt_outs", {
  id: uuid("id").primaryKey().defaultRandom(),
  subcontractorId: uuid("subcontractor_id").references(() => subcontractors.id).notNull(),
  phoneNumber: text("phone_number").notNull(),
  optedOutAt: timestamp("opted_out_at").defaultNow().notNull(),
});