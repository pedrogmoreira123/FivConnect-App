import { 
  type User, 
  type InsertUser,
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
  users,
  conversations,
  messages,
  queues,
  settings,
  aiAgentConfig
} from "@shared/schema";
import { randomUUID } from "crypto";
import { db } from "./db";
import { eq, and, asc } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: Partial<InsertUser>): Promise<User>;
  deleteUser(id: string): Promise<boolean>;
  getAllUsers(): Promise<User[]>;

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

      // Create default admin user
      await db.insert(users).values({
        name: "John Doe",
        email: "admin@company.com",
        password: "password",
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
        isEnabled: true,
        welcomeMessage: "Hello! I'm your virtual assistant. How can I help you today?",
        responseDelay: 3
      });
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
}

export const storage = new DatabaseStorage();
