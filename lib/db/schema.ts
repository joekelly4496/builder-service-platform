import { pgTable, uuid, text, timestamp, pgEnum, integer, jsonb, unique } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Enums
export const priorityEnum = pgEnum("priority", ["urgent", "normal", "low"]);
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
export const actorTypeEnum = pgEnum("actor_type", ["homeowner", "subcontractor", "builder", "system"]);
export const communicationChannelEnum = pgEnum("communication_channel", ["email", "sms"]);
export const communicationStatusEnum = pgEnum("communication_status", [
  "sent",
  "delivered",
  "bounced",
  "opened",
  "clicked",
  "failed",
]);

// Default trade categories
export const defaultTradeCategories = [
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
] as const;

// ==================== BUILDERS ====================
export const builders = pgTable("builders", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyName: text("company_name").notNull(),
  contactName: text("contact_name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  customTradeCategories: jsonb("custom_trade_categories").$type<string[]>().default([]),
  slaUrgentAcknowledgeMinutes: integer("sla_urgent_acknowledge_minutes").default(120),
  slaUrgentScheduleMinutes: integer("sla_urgent_schedule_minutes").default(240),
  slaNormalAcknowledgeMinutes: integer("sla_normal_acknowledge_minutes").default(2880),
  slaNormalScheduleMinutes: integer("sla_normal_schedule_minutes").default(7200),
  slaLowAcknowledgeMinutes: integer("sla_low_acknowledge_minutes").default(7200),
  slaLowScheduleMinutes: integer("sla_low_schedule_minutes").default(14400),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ==================== HOMES ====================
export const homes = pgTable("homes", {
  id: uuid("id").primaryKey().defaultRandom(),
  builderId: uuid("builder_id")
    .notNull()
    .references(() => builders.id, { onDelete: "cascade" }),
  address: text("address").notNull(),
  city: text("city").notNull(),
  state: text("state").notNull(),
  zipCode: text("zip_code").notNull(),
  homeownerName: text("homeowner_name").notNull(),
  homeownerEmail: text("homeowner_email").notNull(),
  homeownerPhone: text("homeowner_phone"),
  projectCompletedAt: timestamp("project_completed_at"),
  warrantyExpiresAt: timestamp("warranty_expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ==================== SUBCONTRACTORS ====================
export const subcontractors = pgTable("subcontractors", {
  id: uuid("id").primaryKey().defaultRandom(),
  builderId: uuid("builder_id")
    .notNull()
    .references(() => builders.id, { onDelete: "cascade" }),
  companyName: text("company_name").notNull(),
  contactName: text("contact_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  tradeCategories: jsonb("trade_categories").$type<string[]>().notNull().default([]),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ==================== HOME TRADE ASSIGNMENTS ====================
export const homeTradeAssignments = pgTable(
  "home_trade_assignments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    homeId: uuid("home_id")
      .notNull()
      .references(() => homes.id, { onDelete: "cascade" }),
    subcontractorId: uuid("subcontractor_id")
      .notNull()
      .references(() => subcontractors.id, { onDelete: "restrict" }),
    tradeCategory: text("trade_category").notNull(),
    notes: text("notes"),
    assignedAt: timestamp("assigned_at").defaultNow().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    uniqueHomeTrade: unique().on(table.homeId, table.tradeCategory),
  })
);

// ==================== SERVICE REQUESTS (TICKETS) ====================
export const serviceRequests = pgTable("service_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  homeId: uuid("home_id")
    .notNull()
    .references(() => homes.id, { onDelete: "cascade" }),
  assignedSubcontractorId: uuid("assigned_subcontractor_id")
    .notNull()
    .references(() => subcontractors.id, { onDelete: "restrict" }),
  tradeCategory: text("trade_category").notNull(),
  priority: priorityEnum("priority").notNull().default("normal"),
  status: statusEnum("status").notNull().default("submitted"),
  homeownerDescription: text("homeowner_description").notNull(),
  homeownerContactPreference: text("homeowner_contact_preference"),
  photos: jsonb("photos").$type<string[]>().default([]),
  slaAcknowledgeDeadline: timestamp("sla_acknowledge_deadline").notNull(),
  slaScheduleDeadline: timestamp("sla_schedule_deadline").notNull(),
  acknowledgedAt: timestamp("acknowledged_at"),
  scheduledFor: timestamp("scheduled_for"),
  completedAt: timestamp("completed_at"),
  completionNotes: text("completion_notes"),
  completionPhotos: jsonb("completion_photos").$type<string[]>().default([]),
  escalatedAt: timestamp("escalated_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ==================== AUDIT LOG ====================
export const serviceRequestAuditLog = pgTable("service_request_audit_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  serviceRequestId: uuid("service_request_id")
    .notNull()
    .references(() => serviceRequests.id, { onDelete: "cascade" }),
  actorType: actorTypeEnum("actor_type").notNull(),
  actorEmail: text("actor_email"),
  action: text("action").notNull(),
  oldStatus: statusEnum("old_status"),
  newStatus: statusEnum("new_status"),
  metadata: jsonb("metadata").$type<Record<string, any>>().default({}),
  ipAddress: text("ip_address"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

// ==================== COMMUNICATIONS ====================
export const communications = pgTable("communications", {
  id: uuid("id").primaryKey().defaultRandom(),
  serviceRequestId: uuid("service_request_id")
    .notNull()
    .references(() => serviceRequests.id, { onDelete: "cascade" }),
  fromType: actorTypeEnum("from_type").notNull(),
  fromEmail: text("from_email"),
  toType: actorTypeEnum("to_type").notNull(),
  toEmail: text("to_email").notNull(),
  channel: communicationChannelEnum("channel").notNull().default("email"),
  subject: text("subject"),
  body: text("body").notNull(),
  status: communicationStatusEnum("status").notNull().default("sent"),
  sentAt: timestamp("sent_at").defaultNow().notNull(),
  deliveredAt: timestamp("delivered_at"),
  openedAt: timestamp("opened_at"),
  clickedAt: timestamp("clicked_at"),
  metadata: jsonb("metadata").$type<Record<string, any>>().default({}),
});

// ==================== MAGIC LINKS ====================
export const magicLinks = pgTable("magic_links", {
  id: uuid("id").primaryKey().defaultRandom(),
  token: text("token").notNull().unique(),
  type: text("type").notNull(),
  relatedId: uuid("related_id").notNull(),
  email: text("email").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ==================== RELATIONS ====================
export const buildersRelations = relations(builders, ({ many }) => ({
  homes: many(homes),
  subcontractors: many(subcontractors),
}));

export const homesRelations = relations(homes, ({ one, many }) => ({
  builder: one(builders, {
    fields: [homes.builderId],
    references: [builders.id],
  }),
  tradeAssignments: many(homeTradeAssignments),
  serviceRequests: many(serviceRequests),
}));

export const subcontractorsRelations = relations(subcontractors, ({ one, many }) => ({
  builder: one(builders, {
    fields: [subcontractors.builderId],
    references: [builders.id],
  }),
  tradeAssignments: many(homeTradeAssignments),
  serviceRequests: many(serviceRequests),
}));

export const homeTradeAssignmentsRelations = relations(homeTradeAssignments, ({ one }) => ({
  home: one(homes, {
    fields: [homeTradeAssignments.homeId],
    references: [homes.id],
  }),
  subcontractor: one(subcontractors, {
    fields: [homeTradeAssignments.subcontractorId],
    references: [subcontractors.id],
  }),
}));

export const serviceRequestsRelations = relations(serviceRequests, ({ one, many }) => ({
  home: one(homes, {
    fields: [serviceRequests.homeId],
    references: [homes.id],
  }),
  assignedSubcontractor: one(subcontractors, {
    fields: [serviceRequests.assignedSubcontractorId],
    references: [subcontractors.id],
  }),
  auditLogs: many(serviceRequestAuditLog),
  communications: many(communications),
}));

export const serviceRequestAuditLogRelations = relations(serviceRequestAuditLog, ({ one }) => ({
  serviceRequest: one(serviceRequests, {
    fields: [serviceRequestAuditLog.serviceRequestId],
    references: [serviceRequests.id],
  }),
}));

export const communicationsRelations = relations(communications, ({ one }) => ({
  serviceRequest: one(serviceRequests, {
    fields: [communications.serviceRequestId],
    references: [serviceRequests.id],
  }),
}));
