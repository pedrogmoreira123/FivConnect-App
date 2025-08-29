import { 
  type User, 
  type InsertUser,
  type Client,
  type InsertClient,
  type Session,
  type InsertSession,
  type Announcement,
  type InsertAnnouncement,
  type Conversation,
  type InsertConversation,
  type Message,
  type InsertMessage,
  type Queue,
  type InsertQueue,
  type Settings,
  type InsertSettings,
  type AiAgentConfig,
  type InsertAiAgentConfig,
  type Feedback,
  type InsertFeedback,
  type InstanceConfig,
  type InsertInstanceConfig,
  type StatusCheckLog,
  type InsertStatusCheckLog,
  type Plan,
  type InsertPlan,
  type Subscription,
  type InsertSubscription,
  type Invoice,
  type InsertInvoice,
  type Payment,
  type InsertPayment,
  users,
  clients,
  sessions,
  announcements,
  conversations,
  messages,
  queues,
  settings,
  aiAgentConfig,
  feedbacks,
  instanceConfig,
  statusCheckLogs,
  plans,
  subscriptions,
  invoices,
  payments
} from "@shared/schema";
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto-js";
import { db } from "./db";
import { eq, and, asc, desc } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: Partial<InsertUser>): Promise<User>;
  deleteUser(id: string): Promise<boolean>;
  getAllUsers(): Promise<User[]>;
  
  // Authentication operations
  authenticateUser(email: string, password: string): Promise<User | null>;
  changePassword(userId: string, newPassword: string): Promise<boolean>;
  
  // Session operations
  createSession(session: InsertSession): Promise<Session>;
  getSession(token: string): Promise<Session | undefined>;
  deleteSession(token: string): Promise<boolean>;
  deleteUserSessions(userId: string): Promise<boolean>;
  
  // Client operations
  getClient(id: string): Promise<Client | undefined>;
  getClientByPhone(phone: string): Promise<Client | undefined>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: string, client: Partial<InsertClient>): Promise<Client>;
  deleteClient(id: string): Promise<boolean>;
  getAllClients(): Promise<Client[]>;
  
  // Announcement operations
  getAnnouncement(id: string): Promise<Announcement | undefined>;
  createAnnouncement(announcement: InsertAnnouncement): Promise<Announcement>;
  updateAnnouncement(id: string, announcement: Partial<InsertAnnouncement>): Promise<Announcement>;
  deleteAnnouncement(id: string): Promise<boolean>;
  getAllAnnouncements(): Promise<Announcement[]>;
  getActiveAnnouncements(): Promise<Announcement[]>;

  // Conversation operations
  getConversation(id: string): Promise<Conversation | undefined>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  updateConversation(id: string, conversation: Partial<InsertConversation>): Promise<Conversation>;
  deleteConversation(id: string): Promise<boolean>;
  getConversationsByStatus(status: string): Promise<Conversation[]>;
  getConversationsByAgent(agentId: string): Promise<Conversation[]>;
  getAllConversations(): Promise<Conversation[]>;

  // Message operations
  getMessage(id: string): Promise<Message | undefined>;
  createMessage(message: InsertMessage): Promise<Message>;
  getMessagesByConversation(conversationId: string): Promise<Message[]>;
  deleteMessage(id: string): Promise<boolean>;

  // Queue operations
  getQueue(id: string): Promise<Queue | undefined>;
  createQueue(queue: InsertQueue): Promise<Queue>;
  updateQueue(id: string, queue: Partial<InsertQueue>): Promise<Queue>;
  deleteQueue(id: string): Promise<boolean>;
  getAllQueues(): Promise<Queue[]>;

  // Settings operations
  getSetting(key: string): Promise<Settings | undefined>;
  setSetting(setting: InsertSettings): Promise<Settings>;
  updateSetting(key: string, value: string): Promise<Settings>;
  getAllSettings(): Promise<Settings[]>;

  // AI Agent operations
  getAiAgentConfig(): Promise<AiAgentConfig | undefined>;
  updateAiAgentConfig(config: InsertAiAgentConfig): Promise<AiAgentConfig>;

  // Feedback operations
  getFeedback(id: string): Promise<Feedback | undefined>;
  createFeedback(feedback: InsertFeedback): Promise<Feedback>;
  updateFeedback(id: string, feedback: Partial<InsertFeedback>): Promise<Feedback>;
  deleteFeedback(id: string): Promise<boolean>;
  getAllFeedbacks(): Promise<Feedback[]>;
  getFeedbacksBySubmitter(submitterId: string): Promise<Feedback[]>;

  // Instance configuration operations
  getInstanceConfig(): Promise<InstanceConfig | undefined>;
  createOrUpdateInstanceConfig(config: InsertInstanceConfig): Promise<InstanceConfig>;
  updateInstanceStatus(status: string, billingStatus: string, enabledFeatures: any): Promise<InstanceConfig>;
  lockInstance(lockMessage: string): Promise<boolean>;
  unlockInstance(): Promise<boolean>;
  markPaymentNotificationShown(): Promise<boolean>;
  
  // Status check operations  
  performStatusCheck(checkType: 'startup' | 'scheduled' | 'manual'): Promise<any>;
  createStatusCheckLog(log: InsertStatusCheckLog): Promise<StatusCheckLog>;
  getStatusCheckLogs(limit?: number): Promise<StatusCheckLog[]>;

  // Financial operations - Plans
  getPlan(id: string): Promise<Plan | undefined>;
  createPlan(plan: InsertPlan): Promise<Plan>;
  updatePlan(id: string, plan: Partial<InsertPlan>): Promise<Plan>;
  deletePlan(id: string): Promise<boolean>;
  getAllPlans(): Promise<Plan[]>;
  getActivePlans(): Promise<Plan[]>;

  // Financial operations - Subscriptions
  getSubscription(id: string): Promise<Subscription | undefined>;
  getSubscriptionByUser(userId: string): Promise<Subscription | undefined>;
  createSubscription(subscription: InsertSubscription): Promise<Subscription>;
  updateSubscription(id: string, subscription: Partial<InsertSubscription>): Promise<Subscription>;
  deleteSubscription(id: string): Promise<boolean>;
  getAllSubscriptions(): Promise<Subscription[]>;

  // Financial operations - Invoices
  getInvoice(id: string): Promise<Invoice | undefined>;
  getInvoicesBySubscription(subscriptionId: string): Promise<Invoice[]>;
  getOpenInvoicesByUser(userId: string): Promise<Invoice[]>;
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
  updateInvoice(id: string, invoice: Partial<InsertInvoice>): Promise<Invoice>;
  deleteInvoice(id: string): Promise<boolean>;
  getAllInvoices(): Promise<Invoice[]>;

  // Financial operations - Payments
  getPayment(id: string): Promise<Payment | undefined>;
  getPaymentsByInvoice(invoiceId: string): Promise<Payment[]>;
  createPayment(payment: InsertPayment): Promise<Payment>;
  updatePayment(id: string, payment: Partial<InsertPayment>): Promise<Payment>;
  deletePayment(id: string): Promise<boolean>;
  getAllPayments(): Promise<Payment[]>;
}

export class DatabaseStorage implements IStorage {
  constructor() {
    this.initializeDefaultData();
  }

  private async initializeDefaultData() {
    try {
      // Check if we already have data
      const existingUsers = await db.select().from(users).limit(1);
      if (existingUsers.length > 0) return;

      // Create default admin user with hashed password
      const hashedPassword = await bcrypt.hash("admin123", 10);
      await db.insert(users).values({
        name: "System Administrator",
        email: "admin@company.com",
        password: hashedPassword,
        role: "admin",
        isOnline: true
      });

      // Create default queues
      await db.insert(queues).values([
        {
          name: "Technical Support",
          description: "Help with technical issues",
          workingHours: { days: "Mon-Fri", hours: "9:00-18:00" },
          messageInsideHours: "Welcome to Technical Support. An agent will be with you shortly.",
          messageOutsideHours: "We're currently closed. Please leave a message and we'll get back to you.",
          isActive: true
        },
        {
          name: "Sales",
          description: "Sales inquiries and quotes",
          workingHours: { days: "Mon-Sat", hours: "8:00-20:00" },
          messageInsideHours: "Welcome to Sales! How can we help you today?",
          messageOutsideHours: "Our sales team is currently unavailable. Please leave a message.",
          isActive: true
        }
      ]);

      // Create default settings
      const defaultSettings = [
        { key: "companyName", value: "Fi.V App" },
        { key: "cnpj", value: "" },
        { key: "primaryColor", value: "#3B82F6" },
        { key: "secondaryColor", value: "#64748B" },
        { key: "whatsappConnected", value: "true" }
      ];

      await db.insert(settings).values(defaultSettings);

      // Create default AI agent config
      await db.insert(aiAgentConfig).values({
        mode: "chatbot",
        isEnabled: true,
        welcomeMessage: "Hello! I'm your virtual assistant. How can I help you today?",
        responseDelay: 3
      });
      
      console.log("✅ Default data initialized successfully");
      console.log("📧 Default admin email: admin@company.com");
      console.log("🔑 Default admin password: admin123");
    } catch (error) {
      // Ignore errors during initialization (table might not exist yet)
      console.warn("Could not initialize default data:", error);
    }
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: string, updates: Partial<InsertUser>): Promise<User> {
    const [user] = await db.update(users).set(updates).where(eq(users.id, id)).returning();
    if (!user) throw new Error("User not found");
    return user;
  }

  async deleteUser(id: string): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }
  
  // Authentication operations
  async authenticateUser(email: string, password: string): Promise<User | null> {
    const user = await this.getUserByEmail(email);
    if (!user) return null;
    
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) return null;
    
    // Update online status
    await this.updateUser(user.id, { isOnline: true });
    return user;
  }
  
  async changePassword(userId: string, newPassword: string): Promise<boolean> {
    try {
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await this.updateUser(userId, { password: hashedPassword });
      return true;
    } catch (error) {
      return false;
    }
  }
  
  // Session operations
  async createSession(insertSession: InsertSession): Promise<Session> {
    const [session] = await db.insert(sessions).values(insertSession).returning();
    return session;
  }
  
  async getSession(token: string): Promise<Session | undefined> {
    const [session] = await db.select().from(sessions).where(eq(sessions.token, token));
    if (!session) return undefined;
    
    // Check if session is expired
    if (new Date() > session.expiresAt) {
      await this.deleteSession(token);
      return undefined;
    }
    
    return session;
  }
  
  async deleteSession(token: string): Promise<boolean> {
    const result = await db.delete(sessions).where(eq(sessions.token, token));
    return (result.rowCount ?? 0) > 0;
  }
  
  async deleteUserSessions(userId: string): Promise<boolean> {
    const result = await db.delete(sessions).where(eq(sessions.userId, userId));
    return (result.rowCount ?? 0) > 0;
  }
  
  // Client operations
  async getClient(id: string): Promise<Client | undefined> {
    const [client] = await db.select().from(clients).where(eq(clients.id, id));
    return client || undefined;
  }
  
  async getClientByPhone(phone: string): Promise<Client | undefined> {
    const [client] = await db.select().from(clients).where(eq(clients.phone, phone));
    return client || undefined;
  }
  
  async createClient(insertClient: InsertClient): Promise<Client> {
    const [client] = await db.insert(clients).values(insertClient).returning();
    return client;
  }
  
  async updateClient(id: string, updates: Partial<InsertClient>): Promise<Client> {
    const [client] = await db.update(clients).set(updates).where(eq(clients.id, id)).returning();
    if (!client) throw new Error("Client not found");
    return client;
  }
  
  async deleteClient(id: string): Promise<boolean> {
    const result = await db.delete(clients).where(eq(clients.id, id));
    return (result.rowCount ?? 0) > 0;
  }
  
  async getAllClients(): Promise<Client[]> {
    return await db.select().from(clients).orderBy(desc(clients.createdAt));
  }
  
  // Announcement operations
  async getAnnouncement(id: string): Promise<Announcement | undefined> {
    const [announcement] = await db.select().from(announcements).where(eq(announcements.id, id));
    return announcement || undefined;
  }
  
  async createAnnouncement(insertAnnouncement: InsertAnnouncement): Promise<Announcement> {
    const [announcement] = await db.insert(announcements).values(insertAnnouncement).returning();
    return announcement;
  }
  
  async updateAnnouncement(id: string, updates: Partial<InsertAnnouncement>): Promise<Announcement> {
    const [announcement] = await db.update(announcements).set(updates).where(eq(announcements.id, id)).returning();
    if (!announcement) throw new Error("Announcement not found");
    return announcement;
  }
  
  async deleteAnnouncement(id: string): Promise<boolean> {
    const result = await db.delete(announcements).where(eq(announcements.id, id));
    return (result.rowCount ?? 0) > 0;
  }
  
  async getAllAnnouncements(): Promise<Announcement[]> {
    return await db.select().from(announcements).orderBy(desc(announcements.createdAt));
  }
  
  async getActiveAnnouncements(): Promise<Announcement[]> {
    return await db.select().from(announcements)
      .where(eq(announcements.isActive, true))
      .orderBy(desc(announcements.createdAt));
  }

  // Conversation operations
  async getConversation(id: string): Promise<Conversation | undefined> {
    const [conversation] = await db.select().from(conversations).where(eq(conversations.id, id));
    return conversation || undefined;
  }

  async createConversation(insertConversation: InsertConversation): Promise<Conversation> {
    const [conversation] = await db.insert(conversations).values(insertConversation).returning();
    return conversation;
  }

  async updateConversation(id: string, updates: Partial<InsertConversation>): Promise<Conversation> {
    const [conversation] = await db.update(conversations).set(updates).where(eq(conversations.id, id)).returning();
    if (!conversation) throw new Error("Conversation not found");
    return conversation;
  }

  async deleteConversation(id: string): Promise<boolean> {
    const result = await db.delete(conversations).where(eq(conversations.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async getConversationsByStatus(status: string): Promise<Conversation[]> {
    return await db.select().from(conversations).where(eq(conversations.status, status as any));
  }

  async getConversationsByAgent(agentId: string): Promise<Conversation[]> {
    return await db.select().from(conversations).where(eq(conversations.assignedAgentId, agentId));
  }

  async getAllConversations(): Promise<Conversation[]> {
    return await db.select().from(conversations);
  }

  // Message operations
  async getMessage(id: string): Promise<Message | undefined> {
    const [message] = await db.select().from(messages).where(eq(messages.id, id));
    return message || undefined;
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const [message] = await db.insert(messages).values(insertMessage).returning();
    return message;
  }

  async getMessagesByConversation(conversationId: string): Promise<Message[]> {
    return await db.select().from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(asc(messages.sentAt));
  }

  async deleteMessage(id: string): Promise<boolean> {
    const result = await db.delete(messages).where(eq(messages.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Queue operations
  async getQueue(id: string): Promise<Queue | undefined> {
    const [queue] = await db.select().from(queues).where(eq(queues.id, id));
    return queue || undefined;
  }

  async createQueue(insertQueue: InsertQueue): Promise<Queue> {
    const [queue] = await db.insert(queues).values(insertQueue).returning();
    return queue;
  }

  async updateQueue(id: string, updates: Partial<InsertQueue>): Promise<Queue> {
    const [queue] = await db.update(queues).set(updates).where(eq(queues.id, id)).returning();
    if (!queue) throw new Error("Queue not found");
    return queue;
  }

  async deleteQueue(id: string): Promise<boolean> {
    const result = await db.delete(queues).where(eq(queues.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async getAllQueues(): Promise<Queue[]> {
    return await db.select().from(queues);
  }

  // Settings operations
  async getSetting(key: string): Promise<Settings | undefined> {
    const [setting] = await db.select().from(settings).where(eq(settings.key, key));
    return setting || undefined;
  }

  async setSetting(insertSetting: InsertSettings): Promise<Settings> {
    const [setting] = await db.insert(settings).values(insertSetting).returning();
    return setting;
  }

  async updateSetting(key: string, value: string): Promise<Settings> {
    const existingSetting = await this.getSetting(key);
    if (!existingSetting) {
      return this.setSetting({ key, value });
    }
    
    const [setting] = await db.update(settings).set({ value }).where(eq(settings.key, key)).returning();
    return setting;
  }

  async getAllSettings(): Promise<Settings[]> {
    return await db.select().from(settings);
  }

  // AI Agent operations
  async getAiAgentConfig(): Promise<AiAgentConfig | undefined> {
    const [config] = await db.select().from(aiAgentConfig).limit(1);
    return config || undefined;
  }

  async updateAiAgentConfig(config: InsertAiAgentConfig): Promise<AiAgentConfig> {
    const existingConfig = await this.getAiAgentConfig();
    if (!existingConfig) {
      const [newConfig] = await db.insert(aiAgentConfig).values(config).returning();
      return newConfig;
    } else {
      const [updatedConfig] = await db.update(aiAgentConfig).set(config).where(eq(aiAgentConfig.id, existingConfig.id)).returning();
      return updatedConfig;
    }
  }

  // Feedback operations
  async getFeedback(id: string): Promise<Feedback | undefined> {
    const [feedback] = await db.select().from(feedbacks).where(eq(feedbacks.id, id));
    return feedback || undefined;
  }

  async createFeedback(insertFeedback: InsertFeedback): Promise<Feedback> {
    const [feedback] = await db.insert(feedbacks).values(insertFeedback).returning();
    return feedback;
  }

  async updateFeedback(id: string, updateData: Partial<InsertFeedback>): Promise<Feedback> {
    const [feedback] = await db.update(feedbacks).set(updateData).where(eq(feedbacks.id, id)).returning();
    return feedback;
  }

  async deleteFeedback(id: string): Promise<boolean> {
    const result = await db.delete(feedbacks).where(eq(feedbacks.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async getAllFeedbacks(): Promise<Feedback[]> {
    return await db.select().from(feedbacks).orderBy(desc(feedbacks.createdAt));
  }

  async getFeedbacksBySubmitter(submitterId: string): Promise<Feedback[]> {
    return await db.select().from(feedbacks).where(eq(feedbacks.submittedById, submitterId)).orderBy(desc(feedbacks.createdAt));
  }

  // Instance configuration operations
  async getInstanceConfig(): Promise<InstanceConfig | undefined> {
    const [config] = await db.select().from(instanceConfig).limit(1);
    return config || undefined;
  }

  async createOrUpdateInstanceConfig(insertConfig: InsertInstanceConfig): Promise<InstanceConfig> {
    const existingConfig = await this.getInstanceConfig();
    
    if (!existingConfig) {
      const [config] = await db.insert(instanceConfig).values(insertConfig).returning();
      return config;
    } else {
      const [config] = await db.update(instanceConfig)
        .set({ ...insertConfig, updatedAt: new Date() })
        .where(eq(instanceConfig.id, existingConfig.id))
        .returning();
      return config;
    }
  }

  async updateInstanceStatus(status: string, billingStatus: string, enabledFeatures: any): Promise<InstanceConfig> {
    const existingConfig = await this.getInstanceConfig();
    
    if (!existingConfig) {
      throw new Error("Instance configuration not found");
    }

    const [config] = await db.update(instanceConfig)
      .set({
        status: status as any,
        billingStatus: billingStatus as any,
        enabledFeatures,
        lastSuccessfulCheck: new Date(),
        updatedAt: new Date()
      })
      .where(eq(instanceConfig.id, existingConfig.id))
      .returning();
    
    return config;
  }

  async lockInstance(lockMessage: string): Promise<boolean> {
    const existingConfig = await this.getInstanceConfig();
    
    if (!existingConfig) {
      return false;
    }

    await db.update(instanceConfig)
      .set({
        isLocked: true,
        lockMessage,
        updatedAt: new Date()
      })
      .where(eq(instanceConfig.id, existingConfig.id));
    
    return true;
  }

  async unlockInstance(): Promise<boolean> {
    const existingConfig = await this.getInstanceConfig();
    
    if (!existingConfig) {
      return false;
    }

    await db.update(instanceConfig)
      .set({
        isLocked: false,
        lockMessage: null,
        updatedAt: new Date()
      })
      .where(eq(instanceConfig.id, existingConfig.id));
    
    return true;
  }

  async markPaymentNotificationShown(): Promise<boolean> {
    const existingConfig = await this.getInstanceConfig();
    
    if (!existingConfig) {
      return false;
    }

    await db.update(instanceConfig)
      .set({
        paymentNotificationShown: true,
        updatedAt: new Date()
      })
      .where(eq(instanceConfig.id, existingConfig.id));
    
    return true;
  }

  // Status check operations
  async performStatusCheck(checkType: 'startup' | 'scheduled' | 'manual'): Promise<any> {
    const config = await this.getInstanceConfig();
    
    if (!config) {
      throw new Error("Instance configuration not found. Please configure the instance first.");
    }

    const startTime = Date.now();
    
    try {
      // Make request to Fi.V Connect API
      const response = await fetch(`${config.connectApiUrl}/api/v1/instances/status`, {
        method: 'GET',
        headers: {
          'X-Instance-Key': config.instanceKey,
          'Content-Type': 'application/json'
        }
      });

      const responseTime = Date.now() - startTime;

      if (!response.ok) {
        throw new Error(`API returned ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // Update instance configuration with new status
      await this.updateInstanceStatus(data.status, data.billingStatus, data.enabledFeatures);

      // Handle status-specific actions
      if (data.status === 'suspended') {
        await this.lockInstance("This account has been suspended. Please contact support.");
      } else if (data.status === 'active') {
        await this.unlockInstance();
      }

      // Log successful check
      await this.createStatusCheckLog({
        instanceConfigId: config.id,
        checkType,
        success: true,
        statusReceived: data.status,
        billingStatusReceived: data.billingStatus,
        featuresReceived: data.enabledFeatures,
        responseTime
      });

      return {
        success: true,
        status: data.status,
        billingStatus: data.billingStatus,
        enabledFeatures: data.enabledFeatures,
        responseTime
      };

    } catch (error) {
      const responseTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Log failed check
      await this.createStatusCheckLog({
        instanceConfigId: config.id,
        checkType,
        success: false,
        errorMessage,
        responseTime
      });

      // Update last check time even on failure
      await db.update(instanceConfig)
        .set({
          lastStatusCheck: new Date(),
          updatedAt: new Date()
        })
        .where(eq(instanceConfig.id, config.id));

      throw error;
    }
  }

  async createStatusCheckLog(insertLog: InsertStatusCheckLog): Promise<StatusCheckLog> {
    const [log] = await db.insert(statusCheckLogs).values(insertLog).returning();
    return log;
  }

  async getStatusCheckLogs(limit: number = 50): Promise<StatusCheckLog[]> {
    return await db.select()
      .from(statusCheckLogs)
      .orderBy(desc(statusCheckLogs.createdAt))
      .limit(limit);
  }

  // Financial operations - Plans
  async getPlan(id: string): Promise<Plan | undefined> {
    const [plan] = await db.select().from(plans).where(eq(plans.id, id));
    return plan || undefined;
  }

  async createPlan(insertPlan: InsertPlan): Promise<Plan> {
    const [plan] = await db.insert(plans).values(insertPlan).returning();
    return plan;
  }

  async updatePlan(id: string, updates: Partial<InsertPlan>): Promise<Plan> {
    const [plan] = await db.update(plans).set({ ...updates, updatedAt: new Date() }).where(eq(plans.id, id)).returning();
    if (!plan) throw new Error("Plan not found");
    return plan;
  }

  async deletePlan(id: string): Promise<boolean> {
    const result = await db.delete(plans).where(eq(plans.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async getAllPlans(): Promise<Plan[]> {
    return await db.select().from(plans).orderBy(asc(plans.price));
  }

  async getActivePlans(): Promise<Plan[]> {
    return await db.select().from(plans).where(eq(plans.isActive, true)).orderBy(asc(plans.price));
  }

  // Financial operations - Subscriptions
  async getSubscription(id: string): Promise<Subscription | undefined> {
    const [subscription] = await db.select().from(subscriptions).where(eq(subscriptions.id, id));
    return subscription || undefined;
  }

  async getSubscriptionByUser(userId: string): Promise<Subscription | undefined> {
    const [subscription] = await db.select().from(subscriptions)
      .where(eq(subscriptions.userId, userId))
      .orderBy(desc(subscriptions.createdAt))
      .limit(1);
    return subscription || undefined;
  }

  async createSubscription(insertSubscription: InsertSubscription): Promise<Subscription> {
    const [subscription] = await db.insert(subscriptions).values(insertSubscription).returning();
    return subscription;
  }

  async updateSubscription(id: string, updates: Partial<InsertSubscription>): Promise<Subscription> {
    const [subscription] = await db.update(subscriptions)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(subscriptions.id, id))
      .returning();
    if (!subscription) throw new Error("Subscription not found");
    return subscription;
  }

  async deleteSubscription(id: string): Promise<boolean> {
    const result = await db.delete(subscriptions).where(eq(subscriptions.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async getAllSubscriptions(): Promise<Subscription[]> {
    return await db.select().from(subscriptions).orderBy(desc(subscriptions.createdAt));
  }

  // Financial operations - Invoices
  async getInvoice(id: string): Promise<Invoice | undefined> {
    const [invoice] = await db.select().from(invoices).where(eq(invoices.id, id));
    return invoice || undefined;
  }

  async getInvoicesBySubscription(subscriptionId: string): Promise<Invoice[]> {
    return await db.select().from(invoices)
      .where(eq(invoices.subscriptionId, subscriptionId))
      .orderBy(desc(invoices.createdAt));
  }

  async getOpenInvoicesByUser(userId: string): Promise<Invoice[]> {
    const results = await db.select({
        id: invoices.id,
        subscriptionId: invoices.subscriptionId,
        stripeInvoiceId: invoices.stripeInvoiceId,
        number: invoices.number,
        amount: invoices.amount,
        currency: invoices.currency,
        status: invoices.status,
        dueDate: invoices.dueDate,
        paidAt: invoices.paidAt,
        description: invoices.description,
        invoiceUrl: invoices.invoiceUrl,
        downloadUrl: invoices.downloadUrl,
        createdAt: invoices.createdAt,
        updatedAt: invoices.updatedAt
      })
      .from(invoices)
      .innerJoin(subscriptions, eq(invoices.subscriptionId, subscriptions.id))
      .where(and(
        eq(subscriptions.userId, userId),
        eq(invoices.status, 'open')
      ))
      .orderBy(desc(invoices.createdAt));
    
    return results;
  }

  async createInvoice(insertInvoice: InsertInvoice): Promise<Invoice> {
    const [invoice] = await db.insert(invoices).values(insertInvoice).returning();
    return invoice;
  }

  async updateInvoice(id: string, updates: Partial<InsertInvoice>): Promise<Invoice> {
    const [invoice] = await db.update(invoices)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(invoices.id, id))
      .returning();
    if (!invoice) throw new Error("Invoice not found");
    return invoice;
  }

  async deleteInvoice(id: string): Promise<boolean> {
    const result = await db.delete(invoices).where(eq(invoices.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async getAllInvoices(): Promise<Invoice[]> {
    return await db.select().from(invoices).orderBy(desc(invoices.createdAt));
  }

  // Financial operations - Payments
  async getPayment(id: string): Promise<Payment | undefined> {
    const [payment] = await db.select().from(payments).where(eq(payments.id, id));
    return payment || undefined;
  }

  async getPaymentsByInvoice(invoiceId: string): Promise<Payment[]> {
    return await db.select().from(payments)
      .where(eq(payments.invoiceId, invoiceId))
      .orderBy(desc(payments.createdAt));
  }

  async createPayment(insertPayment: InsertPayment): Promise<Payment> {
    const [payment] = await db.insert(payments).values(insertPayment).returning();
    return payment;
  }

  async updatePayment(id: string, updates: Partial<InsertPayment>): Promise<Payment> {
    const [payment] = await db.update(payments)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(payments.id, id))
      .returning();
    if (!payment) throw new Error("Payment not found");
    return payment;
  }

  async deletePayment(id: string): Promise<boolean> {
    const result = await db.delete(payments).where(eq(payments.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async getAllPayments(): Promise<Payment[]> {
    return await db.select().from(payments).orderBy(desc(payments.createdAt));
  }
}

export const storage = new DatabaseStorage();
