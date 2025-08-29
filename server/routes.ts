import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertUserSchema,
  insertConversationSchema,
  insertMessageSchema,
  insertQueueSchema,
  insertSettingsSchema,
  insertAiAgentConfigSchema
} from "@shared/schema";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication routes
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = loginSchema.parse(req.body);
      
      const user = await storage.getUserByEmail(email);
      if (!user || user.password !== password) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Update user online status
      await storage.updateUser(user.id, { isOnline: true });
      
      res.json({ 
        user: { 
          id: user.id, 
          name: user.name, 
          email: user.email, 
          role: user.role,
          isOnline: true
        } 
      });
    } catch (error) {
      res.status(400).json({ message: "Invalid request" });
    }
  });

  app.post('/api/auth/logout', async (req, res) => {
    // In a real app, this would handle session management
    res.json({ message: "Logged out successfully" });
  });

  // User management routes
  app.get('/api/users', async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.post('/api/users', async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const user = await storage.createUser(userData);
      res.status(201).json(user);
    } catch (error) {
      res.status(400).json({ message: "Invalid user data" });
    }
  });

  app.put('/api/users/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const userData = insertUserSchema.partial().parse(req.body);
      const user = await storage.updateUser(id, userData);
      res.json(user);
    } catch (error) {
      res.status(400).json({ message: "Failed to update user" });
    }
  });

  app.delete('/api/users/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteUser(id);
      if (success) {
        res.json({ message: "User deleted successfully" });
      } else {
        res.status(404).json({ message: "User not found" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // Conversation routes
  app.get('/api/conversations', async (req, res) => {
    try {
      const { status, agentId } = req.query;
      
      let conversations;
      if (status) {
        conversations = await storage.getConversationsByStatus(status as string);
      } else if (agentId) {
        conversations = await storage.getConversationsByAgent(agentId as string);
      } else {
        conversations = await storage.getAllConversations();
      }
      
      res.json(conversations);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch conversations" });
    }
  });

  app.post('/api/conversations', async (req, res) => {
    try {
      const conversationData = insertConversationSchema.parse(req.body);
      const conversation = await storage.createConversation(conversationData);
      res.status(201).json(conversation);
    } catch (error) {
      res.status(400).json({ message: "Invalid conversation data" });
    }
  });

  app.put('/api/conversations/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const conversationData = insertConversationSchema.partial().parse(req.body);
      const conversation = await storage.updateConversation(id, conversationData);
      res.json(conversation);
    } catch (error) {
      res.status(400).json({ message: "Failed to update conversation" });
    }
  });

  // Message routes
  app.get('/api/conversations/:conversationId/messages', async (req, res) => {
    try {
      const { conversationId } = req.params;
      const messages = await storage.getMessagesByConversation(conversationId);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.post('/api/conversations/:conversationId/messages', async (req, res) => {
    try {
      const { conversationId } = req.params;
      const messageData = insertMessageSchema.parse({
        ...req.body,
        conversationId
      });
      const message = await storage.createMessage(messageData);
      res.status(201).json(message);
    } catch (error) {
      res.status(400).json({ message: "Invalid message data" });
    }
  });

  // Queue routes
  app.get('/api/queues', async (req, res) => {
    try {
      const queues = await storage.getAllQueues();
      res.json(queues);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch queues" });
    }
  });

  app.post('/api/queues', async (req, res) => {
    try {
      const queueData = insertQueueSchema.parse(req.body);
      const queue = await storage.createQueue(queueData);
      res.status(201).json(queue);
    } catch (error) {
      res.status(400).json({ message: "Invalid queue data" });
    }
  });

  app.put('/api/queues/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const queueData = insertQueueSchema.partial().parse(req.body);
      const queue = await storage.updateQueue(id, queueData);
      res.json(queue);
    } catch (error) {
      res.status(400).json({ message: "Failed to update queue" });
    }
  });

  app.delete('/api/queues/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteQueue(id);
      if (success) {
        res.json({ message: "Queue deleted successfully" });
      } else {
        res.status(404).json({ message: "Queue not found" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to delete queue" });
    }
  });

  // Settings routes
  app.get('/api/settings', async (req, res) => {
    try {
      const settings = await storage.getAllSettings();
      const settingsObject = settings.reduce((acc, setting) => {
        acc[setting.key] = setting.value;
        return acc;
      }, {} as Record<string, string>);
      res.json(settingsObject);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch settings" });
    }
  });

  app.put('/api/settings/:key', async (req, res) => {
    try {
      const { key } = req.params;
      const { value } = req.body;
      
      if (!value) {
        return res.status(400).json({ message: "Value is required" });
      }
      
      const setting = await storage.updateSetting(key, value);
      res.json(setting);
    } catch (error) {
      res.status(400).json({ message: "Failed to update setting" });
    }
  });

  // AI Agent routes
  app.get('/api/ai-agent/config', async (req, res) => {
    try {
      const config = await storage.getAiAgentConfig();
      res.json(config || { isEnabled: false, welcomeMessage: "", responseDelay: 3 });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch AI agent config" });
    }
  });

  app.put('/api/ai-agent/config', async (req, res) => {
    try {
      const configData = insertAiAgentConfigSchema.parse(req.body);
      const config = await storage.updateAiAgentConfig(configData);
      res.json(config);
    } catch (error) {
      res.status(400).json({ message: "Invalid AI agent config" });
    }
  });

  // Dashboard/Analytics routes
  app.get('/api/analytics/kpi', async (req, res) => {
    try {
      const allConversations = await storage.getAllConversations();
      const allUsers = await storage.getAllUsers();
      
      const openConversations = allConversations.filter(c => c.status === 'in_progress').length;
      const onlineAgents = allUsers.filter(u => u.isOnline).length;
      const completedToday = allConversations.filter(c => 
        c.status === 'completed' && 
        c.lastMessageAt && 
        new Date(c.lastMessageAt).toDateString() === new Date().toDateString()
      ).length;
      
      res.json({
        openConversations,
        onlineAgents,
        avgWaitingTime: "2m 30s", // Mock calculation
        completedConversations: completedToday
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  app.get('/api/analytics/queue-volume', async (req, res) => {
    try {
      const queues = await storage.getAllQueues();
      const conversations = await storage.getAllConversations();
      
      const queueVolume = queues.map(queue => ({
        name: queue.name,
        count: conversations.filter(c => c.queueId === queue.id).length
      }));
      
      res.json({
        labels: queueVolume.map(q => q.name),
        data: queueVolume.map(q => q.count)
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch queue volume" });
    }
  });

  app.get('/api/analytics/weekly-performance', async (req, res) => {
    try {
      // Mock weekly performance data
      res.json({
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        data: [45, 52, 38, 65, 59, 42, 28]
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch weekly performance" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
