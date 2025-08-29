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
  type InsertAiAgentConfig
} from "@shared/schema";
import { randomUUID } from "crypto";

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

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private conversations: Map<string, Conversation>;
  private messages: Map<string, Message>;
  private queues: Map<string, Queue>;
  private settings: Map<string, Settings>;
  private aiAgentConfig: AiAgentConfig | undefined;

  constructor() {
    this.users = new Map();
    this.conversations = new Map();
    this.messages = new Map();
    this.queues = new Map();
    this.settings = new Map();
    this.aiAgentConfig = undefined;
    this.initializeDefaultData();
  }

  private initializeDefaultData() {
    // Create default admin user
    const adminUser: User = {
      id: randomUUID(),
      name: "John Doe",
      email: "admin@company.com",
      password: "password",
      role: "admin",
      isOnline: true,
      createdAt: new Date()
    };
    this.users.set(adminUser.id, adminUser);

    // Create default queues
    const techSupportQueue: Queue = {
      id: randomUUID(),
      name: "Technical Support",
      description: "Help with technical issues",
      workingHours: { days: "Mon-Fri", hours: "9:00-18:00" },
      messageInsideHours: "Welcome to Technical Support. An agent will be with you shortly.",
      messageOutsideHours: "We're currently closed. Please leave a message and we'll get back to you.",
      isActive: true,
      createdAt: new Date()
    };
    
    const salesQueue: Queue = {
      id: randomUUID(),
      name: "Sales",
      description: "Sales inquiries and quotes",
      workingHours: { days: "Mon-Sat", hours: "8:00-20:00" },
      messageInsideHours: "Welcome to Sales! How can we help you today?",
      messageOutsideHours: "Our sales team is currently unavailable. Please leave a message.",
      isActive: true,
      createdAt: new Date()
    };

    this.queues.set(techSupportQueue.id, techSupportQueue);
    this.queues.set(salesQueue.id, salesQueue);

    // Create default settings
    const defaultSettings = [
      { key: "companyName", value: "Fi.V App" },
      { key: "cnpj", value: "" },
      { key: "primaryColor", value: "#3B82F6" },
      { key: "secondaryColor", value: "#64748B" },
      { key: "whatsappConnected", value: "true" }
    ];

    defaultSettings.forEach(setting => {
      const settingRecord: Settings = {
        id: randomUUID(),
        key: setting.key,
        value: setting.value,
        updatedAt: new Date()
      };
      this.settings.set(setting.key, settingRecord);
    });

    // Create default AI agent config
    this.aiAgentConfig = {
      id: randomUUID(),
      isEnabled: true,
      welcomeMessage: "Hello! I'm your virtual assistant. How can I help you today?",
      responseDelay: 3,
      updatedAt: new Date()
    };
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = {
      ...insertUser,
      id,
      role: insertUser.role || "agent",
      isOnline: false,
      createdAt: new Date()
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: string, updates: Partial<InsertUser>): Promise<User> {
    const user = this.users.get(id);
    if (!user) throw new Error("User not found");
    
    const updatedUser = { ...user, ...updates };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async deleteUser(id: string): Promise<boolean> {
    return this.users.delete(id);
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  // Conversation operations
  async getConversation(id: string): Promise<Conversation | undefined> {
    return this.conversations.get(id);
  }

  async createConversation(insertConversation: InsertConversation): Promise<Conversation> {
    const id = randomUUID();
    const conversation: Conversation = {
      ...insertConversation,
      id,
      status: insertConversation.status || "waiting",
      assignedAgentId: insertConversation.assignedAgentId || null,
      queueId: insertConversation.queueId || null,
      lastMessageAt: new Date(),
      createdAt: new Date()
    };
    this.conversations.set(id, conversation);
    return conversation;
  }

  async updateConversation(id: string, updates: Partial<InsertConversation>): Promise<Conversation> {
    const conversation = this.conversations.get(id);
    if (!conversation) throw new Error("Conversation not found");
    
    const updatedConversation = { ...conversation, ...updates, lastMessageAt: new Date() };
    this.conversations.set(id, updatedConversation);
    return updatedConversation;
  }

  async deleteConversation(id: string): Promise<boolean> {
    return this.conversations.delete(id);
  }

  async getConversationsByStatus(status: string): Promise<Conversation[]> {
    return Array.from(this.conversations.values()).filter(conv => conv.status === status);
  }

  async getConversationsByAgent(agentId: string): Promise<Conversation[]> {
    return Array.from(this.conversations.values()).filter(conv => conv.assignedAgentId === agentId);
  }

  async getAllConversations(): Promise<Conversation[]> {
    return Array.from(this.conversations.values());
  }

  // Message operations
  async getMessage(id: string): Promise<Message | undefined> {
    return this.messages.get(id);
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const id = randomUUID();
    const message: Message = {
      ...insertMessage,
      id,
      messageType: insertMessage.messageType || "text",
      sentAt: new Date()
    };
    this.messages.set(id, message);
    return message;
  }

  async getMessagesByConversation(conversationId: string): Promise<Message[]> {
    return Array.from(this.messages.values())
      .filter(message => message.conversationId === conversationId)
      .sort((a, b) => a.sentAt!.getTime() - b.sentAt!.getTime());
  }

  async deleteMessage(id: string): Promise<boolean> {
    return this.messages.delete(id);
  }

  // Queue operations
  async getQueue(id: string): Promise<Queue | undefined> {
    return this.queues.get(id);
  }

  async createQueue(insertQueue: InsertQueue): Promise<Queue> {
    const id = randomUUID();
    const queue: Queue = {
      ...insertQueue,
      id,
      description: insertQueue.description || null,
      workingHours: insertQueue.workingHours || null,
      messageInsideHours: insertQueue.messageInsideHours || null,
      messageOutsideHours: insertQueue.messageOutsideHours || null,
      isActive: insertQueue.isActive !== undefined ? insertQueue.isActive : true,
      createdAt: new Date()
    };
    this.queues.set(id, queue);
    return queue;
  }

  async updateQueue(id: string, updates: Partial<InsertQueue>): Promise<Queue> {
    const queue = this.queues.get(id);
    if (!queue) throw new Error("Queue not found");
    
    const updatedQueue = { ...queue, ...updates };
    this.queues.set(id, updatedQueue);
    return updatedQueue;
  }

  async deleteQueue(id: string): Promise<boolean> {
    return this.queues.delete(id);
  }

  async getAllQueues(): Promise<Queue[]> {
    return Array.from(this.queues.values());
  }

  // Settings operations
  async getSetting(key: string): Promise<Settings | undefined> {
    return this.settings.get(key);
  }

  async setSetting(insertSetting: InsertSettings): Promise<Settings> {
    const id = randomUUID();
    const setting: Settings = {
      ...insertSetting,
      id,
      updatedAt: new Date()
    };
    this.settings.set(insertSetting.key, setting);
    return setting;
  }

  async updateSetting(key: string, value: string): Promise<Settings> {
    const setting = this.settings.get(key);
    if (!setting) {
      return this.setSetting({ key, value });
    }
    
    const updatedSetting = { ...setting, value, updatedAt: new Date() };
    this.settings.set(key, updatedSetting);
    return updatedSetting;
  }

  async getAllSettings(): Promise<Settings[]> {
    return Array.from(this.settings.values());
  }

  // AI Agent operations
  async getAiAgentConfig(): Promise<AiAgentConfig | undefined> {
    return this.aiAgentConfig;
  }

  async updateAiAgentConfig(config: InsertAiAgentConfig): Promise<AiAgentConfig> {
    if (!this.aiAgentConfig) {
      this.aiAgentConfig = {
        id: randomUUID(),
        isEnabled: config.isEnabled !== undefined ? config.isEnabled : false,
        welcomeMessage: config.welcomeMessage || null,
        responseDelay: config.responseDelay || null,
        updatedAt: new Date()
      };
    } else {
      this.aiAgentConfig = {
        ...this.aiAgentConfig,
        isEnabled: config.isEnabled !== undefined ? config.isEnabled : this.aiAgentConfig.isEnabled,
        welcomeMessage: config.welcomeMessage !== undefined ? config.welcomeMessage : this.aiAgentConfig.welcomeMessage,
        responseDelay: config.responseDelay !== undefined ? config.responseDelay : this.aiAgentConfig.responseDelay,
        updatedAt: new Date()
      };
    }
    return this.aiAgentConfig;
  }
}

export const storage = new MemStorage();
