import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, json, integer, serial, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  username: text("username").notNull().unique(), // New field for username-based login
  email: text("email").notNull().unique(),
  password: text("password").notNull(), // Will store hashed passwords
  role: text("role", { enum: ["superadmin", "admin", "supervisor", "agent"] }).notNull().default("agent"),
  isOnline: boolean("is_online").default(false),
  // Theme customization fields
  customTheme: json("custom_theme"), // Store user's custom theme colors
  // Environment field to separate test from production data
  environment: text("environment", { enum: ["development", "production"] }).notNull().default("production"),
  createdAt: timestamp("created_at").defaultNow(),
});

// WhatsApp Connections table (must be defined before conversations that reference it)
export const whatsappConnections = pgTable("whatsapp_connections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull(), // Company that owns this connection
  connectionName: text("connection_name").notNull(), // User-friendly connection name
  instanceName: text("instance_name").notNull(), // Evolution API instance name
  name: text("name").notNull(), // User-friendly connection name (for display)
  phone: text("phone"), // WhatsApp phone number when connected
  qrcode: text("qr_code"), // Current QR code for connection
  profilePictureUrl: text("profile_picture_url"), // Profile picture URL
  status: text("status", { 
    enum: ["disconnected", "connecting", "connected", "qr_ready", "destroyed"] 
  }).notNull().default("disconnected"),
  isDefault: boolean("is_default").default(false), // Default connection for new conversations
  sessionData: json("session_data"), // WhatsApp session data
  lastSeen: timestamp("last_seen"),
  // Whapi.Cloud Integration Fields (NOVO)
  whapiChannelId: text("whapi_channel_id"), // ID do canal na Whapi.Cloud
  whapiToken: text("whapi_token"), // Token do cliente (será criptografado)
  providerType: text("provider_type", {
    enum: ["evolution", "whapi", "baileys"]
  }).notNull().default("whapi"), // Tipo de provider
  webhookUrl: text("webhook_url"), // URL do webhook configurada
  autoAssignEnabled: boolean("auto_assign_enabled").default(false), // Atribuição automática inteligente
  // Environment field to separate test from production data
  environment: text("environment", { enum: ["development", "production"] }).notNull().default("production"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Channels table - Nova tabela para abstração de providers
export const channels = pgTable("channels", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ownerId: varchar("owner_id").notNull(), // FK para usuário/empresa
  providerName: text("provider_name").notNull(), // 'whapi', 'evolution', etc.
  providerTokenEncrypted: text("provider_token_encrypted").notNull(), // Token criptografado
  phoneNumber: text("phone_number"), // Número do WhatsApp
  status: text("status", { 
    enum: ["active", "inactive", "error", "connecting"] 
  }).notNull().default("inactive"),
  // Environment field to separate test from production data
  environment: text("environment", { enum: ["development", "production"] }).notNull().default("production"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const conversations = pgTable("conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contactName: text("contact_name").notNull(),
  contactPhone: text("contact_phone").notNull(),
  profilePictureUrl: text("profile_picture_url"), // WhatsApp profile picture URL
  clientId: varchar("client_id").references(() => clients.id), // Link to clients table
  companyId: varchar("company_id").notNull(), // Company that owns this conversation
  whatsappConnectionId: varchar("whatsapp_connection_id").references(() => whatsappConnections.id), // NEW: Link to WhatsApp connection
  status: text("status", { enum: ["in_progress", "waiting", "completed", "closed"] }).notNull().default("waiting"),
  assignedAgentId: varchar("assigned_agent_id").references(() => users.id),
  queueId: varchar("queue_id").references(() => queues.id),
  priority: text("priority", { enum: ["low", "medium", "high", "urgent"] }).default("medium"),
  tags: json("tags"), // Store conversation tags as JSON array
  isGroup: boolean("is_group").default(false), // NEW: WhatsApp group conversations
  // NOVO: Sistema de Protocolo de Atendimento
  protocolNumber: text("protocol_number").unique(), // Formato: DDMMAA + número sequencial (ex: 0910250001)
  isFinished: boolean("is_finished").default(false), // Marca se a conversa foi finalizada
  finishedAt: timestamp("finished_at"), // Data/hora da finalização
  finishedBy: varchar("finished_by").references(() => users.id), // Quem finalizou a conversa
  // Environment field to separate test from production data
  environment: text("environment", { enum: ["development", "production"] }).notNull().default("production"),
  lastMessageAt: timestamp("last_message_at").defaultNow(),
  lastMessage: text("last_message"), // Última mensagem para exibição na lista
  lastMessageType: text("last_message_type"), // Tipo da última mensagem
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: varchar("conversation_id").notNull().references(() => conversations.id),
  senderId: varchar("sender_id").references(() => users.id), // For outgoing messages from agents
  content: text("content").notNull(),
  messageType: text("message_type", { 
    enum: [
      "text", "image", "audio", "video", "document", "voice", 
      "sticker", "location", "contact", "reaction", "gif", 
      "short_video", "link_preview", "poll", "interactive"
    ] 
  }).default("text"),
  direction: text("direction", { enum: ["incoming", "outgoing"] }).notNull(),
  mediaUrl: text("media_url"), // For media messages
  caption: text("caption"), // For media messages with caption
  fileName: text("file_name"), // For document messages
  quotedMessageId: varchar("quoted_message_id"), // For reply messages
  externalId: varchar("external_id"), // For preventing duplicate messages from external APIs
  chatId: text("chat_id"), // Chat ID do Whapi.Cloud (ex: 5511943274695@s.whatsapp.net)
  metadata: json("metadata"), // For storing additional data like emoji reactions, location data, etc.
  processedAt: timestamp("processed_at"), // Timestamp when message was processed by Whapi.Cloud
  // Environment field to separate test from production data
  environment: text("environment", { enum: ["development", "production"] }).notNull().default("production"),
  isRead: boolean("is_read").default(false),
  readAt: timestamp("read_at"), // Timestamp when message was read
  status: text("status", { enum: ["sent", "delivered", "read", "failed"] }).default("sent"),
  sentAt: timestamp("sent_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Chat Sessions table - Nova tabela para gerenciar sessões de chat
export const chatSessions = pgTable("chat_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  chatId: text("chat_id").notNull(), // Chat ID do Whapi.Cloud (ex: 5511943274695@s.whatsapp.net)
  clientId: varchar("client_id").notNull(), // Referência ao cliente
  agentId: varchar("agent_id"), // ID do agente que assumiu a conversa (pode ser null se não assumida)
  companyId: varchar("company_id").notNull(), // Empresa da conversa
  status: text("status", {
    enum: ["waiting", "in_progress", "finished", "transferred"]
  }).notNull().default("waiting"),
  priority: text("priority", {
    enum: ["low", "medium", "high", "urgent"]
  }).notNull().default("medium"),
  protocolNumber: integer("protocol_number"), // Número do protocolo da conversa
  startedAt: timestamp("started_at").defaultNow(), // Quando a sessão começou
  finishedAt: timestamp("finished_at"), // Quando a sessão foi finalizada
  lastMessageAt: timestamp("last_message_at"), // Timestamp da última mensagem
  // Environment field to separate test from production data
  environment: text("environment", { enum: ["development", "production"] }).notNull().default("production"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Tags table
export const tags = pgTable("tags", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  color: text("color").notNull().default("#3b82f6"), // Cor da tag em hex
  companyId: varchar("company_id").notNull(), // Empresa que criou a tag
  description: text("description"), // Descrição opcional da tag
  // Environment field to separate test from production data
  environment: text("environment", { enum: ["development", "production"] }).notNull().default("production"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Conversation Tags table (relacionamento N:N)
export const conversationTags = pgTable("conversation_tags", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: varchar("conversation_id").notNull(),
  tagId: varchar("tag_id").notNull(),
  // Environment field to separate test from production data
  environment: text("environment", { enum: ["development", "production"] }).notNull().default("production"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Message Templates table
export const messageTemplates = pgTable("message_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  content: text("content").notNull(),
  category: text("category").notNull().default("geral"),
  companyId: varchar("company_id").notNull(),
  isActive: boolean("is_active").default(true),
  variables: json("variables"), // Array de variáveis disponíveis
  // Environment field to separate test from production data
  environment: text("environment", { enum: ["development", "production"] }).notNull().default("production"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Auto-assign Rules table
export const autoAssignRules = pgTable("auto_assign_rules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  companyId: varchar("company_id").notNull(),
  isActive: boolean("is_active").default(true),
  priority: integer("priority").default(1), // 1 = mais alta, 10 = mais baixa
  conditions: json("conditions").notNull(), // Regras de condição
  actions: json("actions").notNull(), // Ações a executar
  // Environment field to separate test from production data
  environment: text("environment", { enum: ["development", "production"] }).notNull().default("production"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Audit Log table
export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  entityType: text("entity_type").notNull(), // 'conversation', 'message', 'user', etc.
  entityId: varchar("entity_id").notNull(),
  action: text("action").notNull(), // 'created', 'updated', 'deleted', 'assigned', etc.
  userId: varchar("user_id"), // Usuário que executou a ação
  companyId: varchar("company_id").notNull(),
  oldValues: json("old_values"), // Valores anteriores
  newValues: json("new_values"), // Novos valores
  metadata: json("metadata"), // Dados adicionais
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  // Environment field to separate test from production data
  environment: text("environment", { enum: ["development", "production"] }).notNull().default("production"),
  createdAt: timestamp("created_at").defaultNow(),
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
  profilePictureUrl: text("profile_picture_url"), // WhatsApp profile picture URL
  companyId: varchar("company_id").notNull(), // Company that owns this client
  // Environment field to separate test from production data
  environment: text("environment", { enum: ["development", "production"] }).notNull().default("production"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Session management table
export const sessions = pgTable("sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  token: text("token").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
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

// Multi-tenant Chatbot Configuration table
export const chatbotConfigs = pgTable("chatbot_configs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull(), // Removido .unique() para permitir múltiplos chatbots
  name: varchar("name", { length: 255 }), // Nome do chatbot (ex: "Bot Atendimento")
  whatsappConnectionId: varchar("whatsapp_connection_id").references(() => whatsappConnections.id, { onDelete: 'set null' }), // Canal vinculado
  mode: text("mode", { enum: ["simple_bot", "ai_agent", "disabled"] }).notNull().default("disabled"),
  isEnabled: boolean("is_enabled").default(false),

  // Simple Bot Configuration
  simpleBotConfig: json("simple_bot_config").$type<{
    welcomeMessage?: string;
    queueSelectionMessage?: string;
    outsideHoursMessage?: string;
    closingMessage?: string;
    transferMessage?: string;
    responseDelay?: number;
    workingHours?: {
      enabled: boolean;
      timezone: string;
      schedule: {
        [key: string]: { start: string; end: string; enabled: boolean };
      };
    };
  }>(),

  // AI Agent Configuration (API keys will be encrypted)
  aiAgentConfig: json("ai_agent_config").$type<{
    provider?: 'gemini' | 'openai' | 'custom';
    apiKey?: string; // Encrypted
    systemPrompt?: string;
    temperature?: number;
    maxTokens?: number;
    contextMemory?: boolean;
  }>(),

  // Trigger Rules
  triggerRules: json("trigger_rules").$type<{
    autoReplyEnabled?: boolean;
    businessHoursOnly?: boolean;
    maxMessagesBeforeTransfer?: number;
    transferToHumanKeywords?: string[];
    enableSmartRouting?: boolean;
    enableSentimentAnalysis?: boolean;
  }>(),

  // Environment field to separate test from production data
  environment: text("environment", { enum: ["development", "production"] }).notNull().default("production"),
  createdAt: timestamp("created_at").defaultNow(),
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
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
}).extend({
  username: z.string().optional(), // Username agora é opcional
});

export const insertClientSchema = createInsertSchema(clients).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSessionSchema = createInsertSchema(sessions).omit({
  id: true,
  createdAt: true,
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
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Client = typeof clients.$inferSelect;
export type InsertClient = z.infer<typeof insertClientSchema>;
export type Session = typeof sessions.$inferSelect;
export type InsertSession = z.infer<typeof insertSessionSchema>;
export type Announcement = typeof announcements.$inferSelect;
export type InsertAnnouncement = z.infer<typeof insertAnnouncementSchema>;
export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type ChatSession = typeof chatSessions.$inferSelect;
export type InsertChatSession = typeof chatSessions.$inferInsert;

export type Tag = typeof tags.$inferSelect;
export type InsertTag = typeof tags.$inferInsert;

export type ConversationTag = typeof conversationTags.$inferSelect;
export type InsertConversationTag = typeof conversationTags.$inferInsert;

export type MessageTemplate = typeof messageTemplates.$inferSelect;
export type InsertMessageTemplate = typeof messageTemplates.$inferInsert;

export type AutoAssignRule = typeof autoAssignRules.$inferSelect;
export type InsertAutoAssignRule = typeof autoAssignRules.$inferInsert;

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;
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
  sessions: many(sessions),
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

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
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

export const insertChannelSchema = createInsertSchema(channels).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Type definitions
export type QuickReply = typeof quickReplies.$inferSelect;
export type InsertQuickReply = z.infer<typeof insertQuickReplySchema>;

export type WhatsappConnection = typeof whatsappConnections.$inferSelect;
export type InsertWhatsappConnection = z.infer<typeof insertWhatsappConnectionSchema>;

export type Channel = typeof channels.$inferSelect;
export type InsertChannel = z.infer<typeof insertChannelSchema>;

// Companies/Tenants Table - WhaTicket inspired multi-tenant architecture
export const companies = pgTable("companies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  document: text("document"), // CNPJ/CPF for Brazilian companies
  logoUrl: text("logo_url"),
  // Novos campos para sistema de convites
  contactName: text("contact_name"), // Nome do responsável
  contactEmail: text("contact_email"), // Email do responsável (usado no convite)
  subscriptionPlan: text("subscription_plan", { enum: ["basic", "professional", "enterprise"] }), // Plano de assinatura
  planId: varchar("plan_id").references(() => plans.id),
  status: text("status", { enum: ["active", "suspended", "canceled", "trial", "pending"] }).notNull().default("trial"),
  maxUsers: integer("max_users").default(1),
  maxConnections: integer("max_connections").default(1),
  maxQueues: integer("max_queues").default(3),
  // NOVA COLUNA: Limite de canais WhatsApp por empresa
  whatsappChannelLimit: integer("whatsapp_channel_limit").default(1).notNull(),
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
  role: text("role", { enum: ["admin", "supervisor", "agent"] }).notNull().default("agent"),
  isActive: boolean("is_active").default(true),
  isOwner: boolean("is_owner").default(false), // Deprecated: mantido para compatibilidade
  createdAt: timestamp("created_at").defaultNow(),
});

// Company Invites - Sistema de convites para primeiro acesso
export const companyInvites = pgTable("company_invites", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: 'cascade' }),
  email: varchar("email").notNull(),
  token: varchar("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCompanyInviteSchema = z.object({
  companyId: z.string(),
  email: z.string().email(),
  token: z.string(),
  expiresAt: z.date(),
});

export type CompanyInvite = typeof companyInvites.$inferSelect;
export type InsertCompanyInvite = z.infer<typeof insertCompanyInviteSchema>;

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


