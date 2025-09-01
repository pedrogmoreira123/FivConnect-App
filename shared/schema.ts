import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, json, integer, serial, numeric, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: json("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table for Replit Auth.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  firstName: text("first_name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password"), // Optional for OAuth users
  role: text("role", { enum: ["superadmin", "admin", "supervisor", "agent"] }).notNull().default("agent"),
  isOnline: boolean("is_online").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  customTheme: json("custom_theme"), // Store user's custom theme colors
  environment: text("environment", { enum: ["development", "production"] }).notNull().default("production"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// WhatsApp Connections table (must be defined before conversations that reference it)
export const whatsappConnections = pgTable("whatsapp_connections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(), // Connection name/label
  phone: text("phone"), // WhatsApp phone number when connected
  qrCode: text("qr_code"), // Current QR code for connection
  status: text("status", { 
    enum: ["disconnected", "connecting", "connected", "qr_ready", "destroyed"] 
  }).notNull().default("disconnected"),
  isDefault: boolean("is_default").default(false), // Default connection for new conversations
  sessionData: json("session_data"), // WhatsApp session data
  lastSeen: timestamp("last_seen"),
  // Environment field to separate test from production data  
  environment: text("environment", { enum: ["development", "production"] }).notNull().default("production"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const conversations = pgTable("conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contactName: text("contact_name").notNull(),
  contactPhone: text("contact_phone").notNull(),
  clientId: varchar("client_id").references(() => clients.id), // Link to clients table
  whatsappConnectionId: varchar("whatsapp_connection_id").references(() => whatsappConnections.id), // NEW: Link to WhatsApp connection
  status: text("status", { enum: ["in_progress", "waiting", "completed", "closed"] }).notNull().default("waiting"),
  assignedAgentId: varchar("assigned_agent_id").references(() => users.id),
  queueId: varchar("queue_id").references(() => queues.id),
  priority: text("priority", { enum: ["low", "medium", "high", "urgent"] }).default("medium"),
  tags: json("tags"), // Store conversation tags as JSON array
  isGroup: boolean("is_group").default(false), // NEW: WhatsApp group conversations
  // Environment field to separate test from production data
  environment: text("environment", { enum: ["development", "production"] }).notNull().default("production"),
  lastMessageAt: timestamp("last_message_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: varchar("conversation_id").notNull().references(() => conversations.id),
  senderId: varchar("sender_id").references(() => users.id), // For outgoing messages from agents
  content: text("content").notNull(),
  messageType: text("message_type", { enum: ["text", "image", "audio", "video", "document"] }).default("text"),
  direction: text("direction", { enum: ["incoming", "outgoing"] }).notNull(),
  mediaUrl: text("media_url"), // For media messages
  // Environment field to separate test from production data
  environment: text("environment", { enum: ["development", "production"] }).notNull().default("production"),
  isRead: boolean("is_read").default(false),
  sentAt: timestamp("sent_at").defaultNow(),
});

export const queues = pgTable("queues", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  workingHours: json("working_hours"),
  messageInsideHours: text("message_inside_hours"),
  messageOutsideHours: text("message_outside_hours"),
  isActive: boolean("is_active").default(true),
  // Environment field to separate test from production data
  environment: text("environment", { enum: ["development", "production"] }).notNull().default("production"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const settings = pgTable("settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Client/Contact information table
export const clients = pgTable("clients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  phone: text("phone").notNull().unique(),
  email: text("email"),
  notes: text("notes"),
  // Environment field to separate test from production data
  environment: text("environment", { enum: ["development", "production"] }).notNull().default("production"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});


// Announcements table
export const announcements = pgTable("announcements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  content: text("content").notNull(),
  authorId: varchar("author_id").notNull().references(() => users.id),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Enhanced AI/ChatBot configuration table (extends existing ai_agent_config)
export const aiAgentConfig = pgTable("ai_agent_config", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  mode: text("mode", { enum: ["chatbot", "ai_agent"] }).default("chatbot"),
  isEnabled: boolean("is_enabled").default(false),
  // AI Agent specific fields
  geminiApiKey: text("gemini_api_key"), // Will be encrypted
  agentPrompt: text("agent_prompt"),
  // ChatBot specific fields
  welcomeMessage: text("welcome_message"),
  responseDelay: integer("response_delay").default(3),
  // General settings
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Feedback and suggestions table
export const feedbacks = pgTable("feedbacks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description").notNull(),
  type: text("type", { enum: ["bug", "suggestion", "feature_request", "complaint", "compliment"] }).notNull(),
  priority: text("priority", { enum: ["low", "medium", "high", "urgent"] }).default("medium"),
  status: text("status", { enum: ["pending", "in_review", "in_progress", "resolved", "closed"] }).default("pending"),
  submittedById: varchar("submitted_by_id").notNull().references(() => users.id),
  assignedToId: varchar("assigned_to_id").references(() => users.id),
  response: text("response"),
  respondedById: varchar("responded_by_id").references(() => users.id),
  respondedAt: timestamp("responded_at"),
  category: text("category"), // e.g., "UI/UX", "Performance", "Security", etc.
  attachments: json("attachments"), // Store file URLs or references
  tags: json("tags"), // Store tags as JSON array
  votes: integer("votes").default(0), // For upvoting/downvoting suggestions
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});


// Financial system tables

// Plans table - Available subscription plans
export const plans = pgTable("plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  price: integer("price").notNull(), // Price in cents
  currency: text("currency").notNull().default("BRL"),
  billingInterval: text("billing_interval", { enum: ["monthly", "yearly"] }).notNull(),
  features: json("features").notNull(), // Array of features included
  maxUsers: integer("max_users").default(1),
  maxConversations: integer("max_conversations").default(100),
  storageLimit: integer("storage_limit").default(1000), // In MB
  isActive: boolean("is_active").default(true),
  stripeProductId: text("stripe_product_id"), // Stripe product ID
  stripePriceId: text("stripe_price_id"), // Stripe price ID
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User subscriptions table
export const subscriptions = pgTable("subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  planId: varchar("plan_id").notNull().references(() => plans.id),
  status: text("status", { enum: ["active", "inactive", "past_due", "canceled", "trialing"] }).notNull(),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  currentPeriodStart: timestamp("current_period_start"),
  currentPeriodEnd: timestamp("current_period_end"),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false),
  trialStart: timestamp("trial_start"),
  trialEnd: timestamp("trial_end"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Invoices table
export const invoices = pgTable("invoices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  subscriptionId: varchar("subscription_id").notNull().references(() => subscriptions.id),
  stripeInvoiceId: text("stripe_invoice_id"),
  number: text("number"), // Invoice number
  amount: integer("amount").notNull(), // Amount in cents
  currency: text("currency").notNull().default("BRL"),
  status: text("status", { enum: ["draft", "open", "paid", "uncollectible", "void"] }).notNull(),
  dueDate: timestamp("due_date"),
  paidAt: timestamp("paid_at"),
  description: text("description"),
  invoiceUrl: text("invoice_url"), // Stripe hosted invoice URL
  downloadUrl: text("download_url"), // PDF download URL
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Payments table
export const payments = pgTable("payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  invoiceId: varchar("invoice_id").notNull().references(() => invoices.id),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  amount: integer("amount").notNull(), // Amount in cents
  currency: text("currency").notNull().default("BRL"),
  status: text("status", { enum: ["pending", "succeeded", "failed", "canceled", "refunded"] }).notNull(),
  paymentMethod: text("payment_method"), // e.g., "card", "pix", "boleto"
  description: text("description"),
  refundedAmount: integer("refunded_amount").default(0),
  failureReason: text("failure_reason"),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Insert schemas
// Replit Auth types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertClientSchema = createInsertSchema(clients).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});


export const insertAnnouncementSchema = createInsertSchema(announcements).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertConversationSchema = createInsertSchema(conversations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastMessageAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  sentAt: true,
});

export const insertQueueSchema = createInsertSchema(queues).omit({
  id: true,
  createdAt: true,
});

export const insertSettingsSchema = createInsertSchema(settings).omit({
  id: true,
  updatedAt: true,
});

export const insertAiAgentConfigSchema = createInsertSchema(aiAgentConfig).omit({
  id: true,
  updatedAt: true,
});

export const insertFeedbackSchema = createInsertSchema(feedbacks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  respondedAt: true,
});


export const insertPlanSchema = createInsertSchema(plans).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSubscriptionSchema = createInsertSchema(subscriptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertInvoiceSchema = createInsertSchema(invoices).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPaymentSchema = createInsertSchema(payments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Client = typeof clients.$inferSelect;
export type InsertClient = z.infer<typeof insertClientSchema>;
export type Announcement = typeof announcements.$inferSelect;
export type InsertAnnouncement = z.infer<typeof insertAnnouncementSchema>;
export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Queue = typeof queues.$inferSelect;
export type InsertQueue = z.infer<typeof insertQueueSchema>;
export type Settings = typeof settings.$inferSelect;
export type InsertSettings = z.infer<typeof insertSettingsSchema>;
export type AiAgentConfig = typeof aiAgentConfig.$inferSelect;
export type InsertAiAgentConfig = z.infer<typeof insertAiAgentConfigSchema>;
export type Feedback = typeof feedbacks.$inferSelect;
export type InsertFeedback = z.infer<typeof insertFeedbackSchema>;
export type Plan = typeof plans.$inferSelect;
export type InsertPlan = z.infer<typeof insertPlanSchema>;
export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;
export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type Payment = typeof payments.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  assignedConversations: many(conversations),
  announcements: many(announcements),
  sentMessages: many(messages),
  submittedFeedbacks: many(feedbacks, { relationName: "submittedFeedbacks" }),
  assignedFeedbacks: many(feedbacks, { relationName: "assignedFeedbacks" }),
  respondedFeedbacks: many(feedbacks, { relationName: "respondedFeedbacks" }),
  subscriptions: many(subscriptions),
}));

export const clientsRelations = relations(clients, ({ many }) => ({
  conversations: many(conversations),
}));


export const announcementsRelations = relations(announcements, ({ one }) => ({
  author: one(users, {
    fields: [announcements.authorId],
    references: [users.id],
  }),
}));

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  assignedAgent: one(users, {
    fields: [conversations.assignedAgentId],
    references: [users.id],
  }),
  client: one(clients, {
    fields: [conversations.clientId],
    references: [clients.id],
  }),
  queue: one(queues, {
    fields: [conversations.queueId],
    references: [queues.id],
  }),
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
  }),
}));

export const queuesRelations = relations(queues, ({ many }) => ({
  conversations: many(conversations),
}));

export const feedbacksRelations = relations(feedbacks, ({ one }) => ({
  submittedBy: one(users, {
    fields: [feedbacks.submittedById],
    references: [users.id],
    relationName: "submittedFeedbacks",
  }),
  assignedTo: one(users, {
    fields: [feedbacks.assignedToId],
    references: [users.id],
    relationName: "assignedFeedbacks",
  }),
  respondedBy: one(users, {
    fields: [feedbacks.respondedById],
    references: [users.id],
    relationName: "respondedFeedbacks",
  }),
}));


export const plansRelations = relations(plans, ({ many }) => ({
  subscriptions: many(subscriptions),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one, many }) => ({
  user: one(users, {
    fields: [subscriptions.userId],
    references: [users.id],
  }),
  plan: one(plans, {
    fields: [subscriptions.planId],
    references: [plans.id],
  }),
  invoices: many(invoices),
}));

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  subscription: one(subscriptions, {
    fields: [invoices.subscriptionId],
    references: [subscriptions.id],
  }),
  payments: many(payments),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  invoice: one(invoices, {
    fields: [payments.invoiceId],
    references: [invoices.id],
  }),
}));

// Quick Replies/Respostas Rápidas table
export const quickReplies = pgTable("quick_replies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  shortcut: text("shortcut").notNull().unique(), // Ex: "/ola", "/info"
  message: text("message").notNull(),
  userId: varchar("user_id").references(() => users.id), // Owner of the quick reply
  isGlobal: boolean("is_global").default(false), // Global for all users or personal
  // Environment field to separate test from production data
  environment: text("environment", { enum: ["development", "production"] }).notNull().default("production"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Create insert schemas for the new tables
export const insertQuickReplySchema = createInsertSchema(quickReplies).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWhatsappConnectionSchema = createInsertSchema(whatsappConnections).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Type definitions
export type QuickReply = typeof quickReplies.$inferSelect;
export type InsertQuickReply = z.infer<typeof insertQuickReplySchema>;

export type WhatsappConnection = typeof whatsappConnections.$inferSelect;
export type InsertWhatsappConnection = z.infer<typeof insertWhatsappConnectionSchema>;

// Companies/Tenants Table - WhaTicket inspired multi-tenant architecture
export const companies = pgTable("companies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  document: text("document"), // CNPJ/CPF for Brazilian companies
  planId: varchar("plan_id").references(() => plans.id),
  status: text("status", { enum: ["active", "suspended", "canceled", "trial"] }).notNull().default("trial"),
  maxUsers: integer("max_users").default(1),
  maxConnections: integer("max_connections").default(1),
  maxQueues: integer("max_queues").default(3),
  trialEndsAt: timestamp("trial_ends_at"),
  // Environment field
  environment: text("environment", { enum: ["development", "production"] }).notNull().default("production"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User-Company relationship (Multi-tenant support)
export const userCompanies = pgTable("user_companies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  companyId: varchar("company_id").references(() => companies.id, { onDelete: 'cascade' }).notNull(),
  role: text("role", { enum: ["owner", "admin", "supervisor", "agent"] }).notNull().default("agent"),
  isActive: boolean("is_active").default(true),
  isOwner: boolean("is_owner").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Update existing tables to support multi-tenant
// Note: We'll add companyId to existing tables via migrations

// Company settings (per-tenant settings)
export const companySettings = pgTable("company_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").references(() => companies.id, { onDelete: 'cascade' }).notNull(),
  key: text("key").notNull(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Create insert schemas for the new tables
export const insertCompanySchema = createInsertSchema(companies).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserCompanySchema = createInsertSchema(userCompanies).omit({
  id: true,
  createdAt: true,
});

export const insertCompanySettingsSchema = createInsertSchema(companySettings).omit({
  id: true,
  updatedAt: true,
});

// Type definitions for new tables
export type Company = typeof companies.$inferSelect;
export type InsertCompany = z.infer<typeof insertCompanySchema>;

export type UserCompany = typeof userCompanies.$inferSelect;
export type InsertUserCompany = z.infer<typeof insertUserCompanySchema>;

export type CompanySettings = typeof companySettings.$inferSelect;
export type InsertCompanySettings = z.infer<typeof insertCompanySettingsSchema>;
