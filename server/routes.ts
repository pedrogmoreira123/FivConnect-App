import type { Express } from "express";
import { createServer, type Server } from "http";
import "./types"; // Import type extensions
import { storage } from "./storage";
import { 
  insertUserSchema,
  insertClientSchema,
  insertAnnouncementSchema,
  insertConversationSchema,
  insertMessageSchema,
  insertQueueSchema,
  insertSettingsSchema,
  insertAiAgentConfigSchema,
  insertFeedbackSchema,
  insertInstanceConfigSchema,
  insertStatusCheckLogSchema,
  insertPlanSchema,
  insertSubscriptionSchema,
  insertInvoiceSchema,
  insertPaymentSchema
} from "@shared/schema";
import { 
  authenticateUser,
  logoutUser,
  requireAuth,
  requireRole,
  encryptData,
  decryptData
} from "./auth";
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
      
      const result = await authenticateUser(
        email, 
        password, 
        req.ip,
        req.get('User-Agent')
      );
      
      if (!result) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      res.json({
        message: "Login successful",
        user: result.user,
        token: result.token,
        expiresAt: result.expiresAt
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.post('/api/auth/logout', requireAuth, async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader?.substring(7); // Remove 'Bearer ' prefix
      
      if (token) {
        await logoutUser(token);
        // Update user offline status
        await storage.updateUser(req.user.id, { isOnline: false });
      }
      
      res.json({ message: "Logged out successfully" });
    } catch (error) {
      res.status(500).json({ message: "Logout failed" });
    }
  });
  
  // Get current user profile
  app.get('/api/auth/me', requireAuth, async (req, res) => {
    res.json({ user: req.user });
  });
  
  // Change password
  app.post('/api/auth/change-password', requireAuth, async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Current and new passwords are required" });
      }
      
      // Verify current password
      const user = await storage.authenticateUser(req.user.email, currentPassword);
      if (!user) {
        return res.status(401).json({ message: "Current password is incorrect" });
      }
      
      // Change password
      const success = await storage.changePassword(req.user.id, newPassword);
      if (success) {
        res.json({ message: "Password changed successfully" });
      } else {
        res.status(500).json({ message: "Failed to change password" });
      }
    } catch (error) {
      res.status(500).json({ message: "Password change failed" });
    }
  });

  // User management routes (protected)
  app.get('/api/users', requireAuth, requireRole(['admin', 'supervisor']), async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      // Remove passwords from response
      const safeUsers = users.map(({ password, ...user }) => user);
      res.json(safeUsers);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.post('/api/users', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      // Hash password before creating user
      const hashedPassword = await require('bcryptjs').hash(userData.password, 10);
      const userWithHashedPassword = { ...userData, password: hashedPassword };
      
      const user = await storage.createUser(userWithHashedPassword);
      // Remove password from response
      const { password, ...safeUser } = user;
      res.status(201).json(safeUser);
    } catch (error) {
      res.status(400).json({ message: "Invalid user data" });
    }
  });

  app.put('/api/users/:id', requireAuth, requireRole(['admin', 'supervisor']), async (req, res) => {
    try {
      const { id } = req.params;
      const userData = insertUserSchema.partial().parse(req.body);
      
      // If password is being updated, hash it
      if (userData.password) {
        userData.password = await require('bcryptjs').hash(userData.password, 10);
      }
      
      const user = await storage.updateUser(id, userData);
      // Remove password from response
      const { password, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      res.status(400).json({ message: "Failed to update user" });
    }
  });

  app.delete('/api/users/:id', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { id } = req.params;
      
      // Prevent deleting self
      if (id === req.user.id) {
        return res.status(400).json({ message: "Cannot delete your own account" });
      }
      
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
  
  // Client management routes
  app.get('/api/clients', requireAuth, async (req, res) => {
    try {
      const clients = await storage.getAllClients();
      res.json(clients);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch clients" });
    }
  });

  app.post('/api/clients', requireAuth, async (req, res) => {
    try {
      const clientData = insertClientSchema.parse(req.body);
      const client = await storage.createClient(clientData);
      res.status(201).json(client);
    } catch (error) {
      res.status(400).json({ message: "Invalid client data" });
    }
  });

  app.put('/api/clients/:id', requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const clientData = insertClientSchema.partial().parse(req.body);
      const client = await storage.updateClient(id, clientData);
      res.json(client);
    } catch (error) {
      res.status(400).json({ message: "Failed to update client" });
    }
  });

  app.delete('/api/clients/:id', requireAuth, requireRole(['admin', 'supervisor']), async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteClient(id);
      if (success) {
        res.json({ message: "Client deleted successfully" });
      } else {
        res.status(404).json({ message: "Client not found" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to delete client" });
    }
  });
  
  // Announcement routes
  app.get('/api/announcements', requireAuth, async (req, res) => {
    try {
      const announcements = await storage.getAllAnnouncements();
      res.json(announcements);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch announcements" });
    }
  });

  app.get('/api/announcements/active', requireAuth, async (req, res) => {
    try {
      const announcements = await storage.getActiveAnnouncements();
      res.json(announcements);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch active announcements" });
    }
  });

  app.post('/api/announcements', requireAuth, requireRole(['admin', 'supervisor']), async (req, res) => {
    try {
      const announcementData = insertAnnouncementSchema.parse({
        ...req.body,
        authorId: req.user.id
      });
      const announcement = await storage.createAnnouncement(announcementData);
      res.status(201).json(announcement);
    } catch (error) {
      res.status(400).json({ message: "Invalid announcement data" });
    }
  });

  app.put('/api/announcements/:id', requireAuth, requireRole(['admin', 'supervisor']), async (req, res) => {
    try {
      const { id } = req.params;
      const announcementData = insertAnnouncementSchema.partial().parse(req.body);
      const announcement = await storage.updateAnnouncement(id, announcementData);
      res.json(announcement);
    } catch (error) {
      res.status(400).json({ message: "Failed to update announcement" });
    }
  });

  app.delete('/api/announcements/:id', requireAuth, requireRole(['admin', 'supervisor']), async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteAnnouncement(id);
      if (success) {
        res.json({ message: "Announcement deleted successfully" });
      } else {
        res.status(404).json({ message: "Announcement not found" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to delete announcement" });
    }
  });

  // Conversation routes (protected)
  app.get('/api/conversations', requireAuth, async (req, res) => {
    try {
      const { status, agentId } = req.query;
      
      let conversations;
      if (status) {
        conversations = await storage.getConversationsByStatus(status as string);
      } else if (agentId) {
        conversations = await storage.getConversationsByAgent(agentId as string);
      } else {
        // Agents can only see their own conversations unless they're admin/supervisor
        if (req.user.role === 'agent') {
          conversations = await storage.getConversationsByAgent(req.user.id);
        } else {
          conversations = await storage.getAllConversations();
        }
      }
      
      res.json(conversations);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch conversations" });
    }
  });

  app.post('/api/conversations', requireAuth, async (req, res) => {
    try {
      const conversationData = insertConversationSchema.parse(req.body);
      const conversation = await storage.createConversation(conversationData);
      res.status(201).json(conversation);
    } catch (error) {
      res.status(400).json({ message: "Invalid conversation data" });
    }
  });

  app.put('/api/conversations/:id', requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const conversationData = insertConversationSchema.partial().parse(req.body);
      const conversation = await storage.updateConversation(id, conversationData);
      res.json(conversation);
    } catch (error) {
      res.status(400).json({ message: "Failed to update conversation" });
    }
  });

  // Message routes (protected)
  app.get('/api/conversations/:conversationId/messages', requireAuth, async (req, res) => {
    try {
      const { conversationId } = req.params;
      const messages = await storage.getMessagesByConversation(conversationId);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.post('/api/conversations/:conversationId/messages', requireAuth, async (req, res) => {
    try {
      const { conversationId } = req.params;
      const messageData = insertMessageSchema.parse({
        ...req.body,
        conversationId,
        senderId: req.user.id,
        direction: 'outgoing'
      });
      const message = await storage.createMessage(messageData);
      res.status(201).json(message);
    } catch (error) {
      res.status(400).json({ message: "Invalid message data" });
    }
  });
  
  // Inbound message webhook (for WhatsApp API integration)
  app.post('/api/webhook/inbound-message', async (req, res) => {
    try {
      const { 
        phone, 
        content, 
        messageType = 'text', 
        mediaUrl,
        contactName 
      } = req.body;
      
      if (!phone || !content) {
        return res.status(400).json({ message: "Phone and content are required" });
      }
      
      // Find or create client
      let client = await storage.getClientByPhone(phone);
      if (!client) {
        client = await storage.createClient({
          name: contactName || `Contact ${phone}`,
          phone: phone,
          notes: 'Created from inbound message'
        });
      }
      
      // Find or create conversation
      const conversations = await storage.getAllConversations();
      let conversation = conversations.find(c => c.contactPhone === phone && c.status !== 'completed');
      
      if (!conversation) {
        conversation = await storage.createConversation({
          contactName: client.name,
          contactPhone: phone,
          clientId: client.id,
          status: 'waiting'
        });
      }
      
      // Create the message
      const message = await storage.createMessage({
        conversationId: conversation.id,
        content,
        messageType: messageType as any,
        direction: 'incoming',
        mediaUrl,
        isRead: false
      });
      
      // Update conversation last message time
      await storage.updateConversation(conversation.id, {
        status: conversation.status // Keep the same status for now
      });
      
      res.status(201).json({
        message: 'Message received successfully',
        conversationId: conversation.id,
        messageId: message.id
      });
      
    } catch (error) {
      console.error('Webhook error:', error);
      res.status(500).json({ message: "Failed to process inbound message" });
    }
  });

  // Queue routes (protected)
  app.get('/api/queues', requireAuth, async (req, res) => {
    try {
      const queues = await storage.getAllQueues();
      res.json(queues);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch queues" });
    }
  });

  app.post('/api/queues', requireAuth, requireRole(['admin', 'supervisor']), async (req, res) => {
    try {
      const queueData = insertQueueSchema.parse(req.body);
      const queue = await storage.createQueue(queueData);
      res.status(201).json(queue);
    } catch (error) {
      res.status(400).json({ message: "Invalid queue data" });
    }
  });

  app.put('/api/queues/:id', requireAuth, requireRole(['admin', 'supervisor']), async (req, res) => {
    try {
      const { id } = req.params;
      const queueData = insertQueueSchema.partial().parse(req.body);
      const queue = await storage.updateQueue(id, queueData);
      res.json(queue);
    } catch (error) {
      res.status(400).json({ message: "Failed to update queue" });
    }
  });

  app.delete('/api/queues/:id', requireAuth, requireRole(['admin']), async (req, res) => {
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

  // Settings routes (protected)
  app.get('/api/settings', requireAuth, async (req, res) => {
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

  app.put('/api/settings/:key', requireAuth, requireRole(['admin', 'supervisor']), async (req, res) => {
    try {
      const { key } = req.params;
      const { value } = req.body;
      
      if (!value && value !== '') {
        return res.status(400).json({ message: "Value is required" });
      }
      
      const setting = await storage.updateSetting(key, value);
      res.json(setting);
    } catch (error) {
      res.status(400).json({ message: "Failed to update setting" });
    }
  });
  
  // User theme settings
  app.get('/api/settings/theme/:userId', requireAuth, async (req, res) => {
    try {
      const { userId } = req.params;
      
      // Users can only access their own theme or admins can access any
      if (req.user.id !== userId && req.user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json({ customTheme: user.customTheme });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user theme" });
    }
  });
  
  app.put('/api/settings/theme/:userId', requireAuth, async (req, res) => {
    try {
      const { userId } = req.params;
      const { customTheme } = req.body;
      
      // Users can only update their own theme
      if (req.user.id !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const user = await storage.updateUser(userId, { customTheme });
      res.json({ customTheme: user.customTheme });
    } catch (error) {
      res.status(400).json({ message: "Failed to update user theme" });
    }
  });

  // AI Agent routes (protected)
  app.get('/api/ai-agent/config', requireAuth, requireRole(['admin', 'supervisor']), async (req, res) => {
    try {
      const config = await storage.getAiAgentConfig();
      if (config && config.geminiApiKey) {
        // Don't expose the encrypted API key in responses
        const { geminiApiKey, ...safeConfig } = config;
        res.json({ ...safeConfig, hasApiKey: !!geminiApiKey });
      } else {
        res.json(config || { mode: 'chatbot', isEnabled: false, welcomeMessage: "", responseDelay: 3, hasApiKey: false });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch AI agent config" });
    }
  });

  app.put('/api/ai-agent/config', requireAuth, requireRole(['admin', 'supervisor']), async (req, res) => {
    try {
      const configData = insertAiAgentConfigSchema.parse(req.body);
      
      // Encrypt API key if provided
      if (configData.geminiApiKey) {
        configData.geminiApiKey = encryptData(configData.geminiApiKey);
      }
      
      const config = await storage.updateAiAgentConfig(configData);
      
      // Don't expose the encrypted API key in response
      const { geminiApiKey, ...safeConfig } = config;
      res.json({ ...safeConfig, hasApiKey: !!geminiApiKey });
    } catch (error) {
      res.status(400).json({ message: "Invalid AI agent config" });
    }
  });

  // Dashboard/Analytics routes (protected)
  app.get('/api/analytics/kpi', requireAuth, async (req, res) => {
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

  app.get('/api/analytics/queue-volume', requireAuth, async (req, res) => {
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

  app.get('/api/analytics/weekly-performance', requireAuth, async (req, res) => {
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

  // Feedback routes (protected)
  app.get('/api/feedbacks', requireAuth, async (req, res) => {
    try {
      const { status, type, priority, assignedTo } = req.query;
      
      let feedbacks;
      if (req.user.role === 'agent') {
        // Agents can only see their own submitted feedbacks
        feedbacks = await storage.getFeedbacksBySubmitter(req.user.id);
      } else {
        // Admins and supervisors can see all feedbacks
        feedbacks = await storage.getAllFeedbacks();
      }
      
      // Apply filters if provided
      if (status && typeof status === 'string') {
        feedbacks = feedbacks.filter(f => f.status === status);
      }
      if (type && typeof type === 'string') {
        feedbacks = feedbacks.filter(f => f.type === type);
      }
      if (priority && typeof priority === 'string') {
        feedbacks = feedbacks.filter(f => f.priority === priority);
      }
      if (assignedTo && typeof assignedTo === 'string') {
        feedbacks = feedbacks.filter(f => f.assignedToId === assignedTo);
      }
      
      res.json(feedbacks);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch feedbacks" });
    }
  });

  app.get('/api/feedbacks/:id', requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const feedback = await storage.getFeedback(id);
      
      if (!feedback) {
        return res.status(404).json({ message: "Feedback not found" });
      }
      
      // Check permissions - users can only view their own feedbacks unless admin/supervisor
      if (req.user.role === 'agent' && feedback.submittedById !== req.user.id) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      res.json(feedback);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch feedback" });
    }
  });

  app.post('/api/feedbacks', requireAuth, async (req, res) => {
    try {
      const feedbackData = insertFeedbackSchema.parse({
        ...req.body,
        submittedById: req.user.id
      });
      const feedback = await storage.createFeedback(feedbackData);
      res.status(201).json(feedback);
    } catch (error) {
      res.status(400).json({ message: "Invalid feedback data" });
    }
  });

  app.put('/api/feedbacks/:id', requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      let feedbackData = insertFeedbackSchema.partial().parse(req.body);
      
      const existingFeedback = await storage.getFeedback(id);
      if (!existingFeedback) {
        return res.status(404).json({ message: "Feedback not found" });
      }
      
      // Check permissions - users can only edit their own feedback if status is pending
      if (req.user.role === 'agent') {
        if (existingFeedback.submittedById !== req.user.id) {
          return res.status(403).json({ message: "Access denied" });
        }
        if (existingFeedback.status !== 'pending') {
          return res.status(403).json({ message: "Cannot edit feedback once it's being reviewed" });
        }
        // Agents can only edit title, description, type, priority, category, tags
        const allowedFields = ['title', 'description', 'type', 'priority', 'category', 'tags'];
        const filteredData = Object.keys(feedbackData)
          .filter(key => allowedFields.includes(key))
          .reduce((obj, key) => {
            obj[key] = feedbackData[key];
            return obj;
          }, {} as any);
        feedbackData = filteredData;
      }
      
      const feedback = await storage.updateFeedback(id, feedbackData);
      res.json(feedback);
    } catch (error) {
      res.status(400).json({ message: "Failed to update feedback" });
    }
  });

  app.delete('/api/feedbacks/:id', requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      
      const existingFeedback = await storage.getFeedback(id);
      if (!existingFeedback) {
        return res.status(404).json({ message: "Feedback not found" });
      }
      
      // Check permissions - users can only delete their own pending feedback
      if (req.user.role === 'agent') {
        if (existingFeedback.submittedById !== req.user.id) {
          return res.status(403).json({ message: "Access denied" });
        }
        if (existingFeedback.status !== 'pending') {
          return res.status(403).json({ message: "Cannot delete feedback once it's being reviewed" });
        }
      }
      
      const success = await storage.deleteFeedback(id);
      if (success) {
        res.json({ message: "Feedback deleted successfully" });
      } else {
        res.status(404).json({ message: "Feedback not found" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to delete feedback" });
    }
  });

  // Respond to feedback (admin/supervisor only)
  app.post('/api/feedbacks/:id/respond', requireAuth, requireRole(['admin', 'supervisor']), async (req, res) => {
    try {
      const { id } = req.params;
      const { response } = req.body;
      
      if (!response) {
        return res.status(400).json({ message: "Response is required" });
      }
      
      const feedback = await storage.updateFeedback(id, {
        response,
        respondedById: req.user.id,
        respondedAt: new Date(),
        status: 'resolved'
      });
      
      res.json(feedback);
    } catch (error) {
      res.status(400).json({ message: "Failed to respond to feedback" });
    }
  });

  // Vote on feedback (for feature requests and suggestions)
  app.post('/api/feedbacks/:id/vote', requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { vote } = req.body; // +1 or -1
      
      if (vote !== 1 && vote !== -1) {
        return res.status(400).json({ message: "Vote must be +1 or -1" });
      }
      
      const feedback = await storage.getFeedback(id);
      if (!feedback) {
        return res.status(404).json({ message: "Feedback not found" });
      }
      
      // Only allow voting on suggestions and feature requests
      if (feedback.type !== 'suggestion' && feedback.type !== 'feature_request') {
        return res.status(400).json({ message: "Can only vote on suggestions and feature requests" });
      }
      
      const updatedFeedback = await storage.updateFeedback(id, {
        votes: feedback.votes + vote
      });
      
      res.json(updatedFeedback);
    } catch (error) {
      res.status(400).json({ message: "Failed to vote on feedback" });
    }
  });

  // Fi.V Connect Integration API endpoints
  
  // Simulate Fi.V Connect panel API - /api/v1/instances/status
  // This endpoint simulates what the central Fi.V Connect panel would provide
  app.get('/api/v1/instances/status', async (req, res) => {
    try {
      const instanceKey = req.headers['x-instance-key'] as string;
      
      if (!instanceKey) {
        return res.status(401).json({ error: "Missing instance key" });
      }
      
      // In a real implementation, this would validate the instanceKey against the central database
      // For simulation, we'll return a default response based on the key
      const instanceId = instanceKey.startsWith('dev_') ? 'dev-instance-123' : 'client-abc-123';
      
      // Simulate different statuses based on instance key for testing
      let status = 'active';
      let billingStatus = 'paid';
      let enabledFeatures = { chat: true, chatbot: true, ai_agent: false };
      
      if (instanceKey.includes('suspended')) {
        status = 'suspended';
      } else if (instanceKey.includes('payment')) {
        status = 'pending_payment';
        billingStatus = 'overdue';
      } else if (instanceKey.includes('premium')) {
        enabledFeatures.ai_agent = true;
      }
      
      const response = {
        instanceId,
        status,
        billingStatus,
        enabledFeatures
      };
      
      res.json(response);
    } catch (error) {
      console.error('Fi.V Connect API error:', error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Instance configuration management endpoints
  
  // Get current instance configuration
  app.get('/api/instance/config', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const config = await storage.getInstanceConfig();
      res.json(config);
    } catch (error) {
      console.error('Failed to get instance config:', error);
      res.status(500).json({ message: "Failed to get instance configuration" });
    }
  });

  // Create or update instance configuration
  app.post('/api/instance/config', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const configData = insertInstanceConfigSchema.parse(req.body);
      const config = await storage.createOrUpdateInstanceConfig(configData);
      res.json(config);
    } catch (error) {
      console.error('Failed to update instance config:', error);
      res.status(400).json({ message: "Failed to update instance configuration" });
    }
  });

  // Manual status check - triggers immediate check with Fi.V Connect
  app.post('/api/instance/check-status', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const result = await storage.performStatusCheck('manual');
      res.json(result);
    } catch (error) {
      console.error('Manual status check failed:', error);
      res.status(500).json({ message: "Status check failed" });
    }
  });

  // Get status check logs
  app.get('/api/instance/status-logs', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const logs = await storage.getStatusCheckLogs();
      res.json(logs);
    } catch (error) {
      console.error('Failed to get status logs:', error);
      res.status(500).json({ message: "Failed to get status logs" });
    }
  });

  // Get current instance status (for UI components)
  app.get('/api/instance/status', async (req, res) => {
    try {
      const config = await storage.getInstanceConfig();
      
      if (!config) {
        return res.json({
          status: 'active',
          billingStatus: 'paid',
          enabledFeatures: { chat: true, chatbot: true, ai_agent: false },
          isLocked: false,
          needsPaymentNotification: false
        });
      }

      res.json({
        status: config.status,
        billingStatus: config.billingStatus,
        enabledFeatures: config.enabledFeatures,
        isLocked: config.isLocked,
        needsPaymentNotification: config.status === 'pending_payment' && !config.paymentNotificationShown,
        lockMessage: config.lockMessage,
        lastStatusCheck: config.lastStatusCheck,
        lastSuccessfulCheck: config.lastSuccessfulCheck
      });
    } catch (error) {
      console.error('Failed to get instance status:', error);
      res.status(500).json({ message: "Failed to get instance status" });
    }
  });

  // Mark payment notification as shown
  app.post('/api/instance/mark-notification-shown', async (req, res) => {
    try {
      await storage.markPaymentNotificationShown();
      res.json({ success: true });
    } catch (error) {
      console.error('Failed to mark notification as shown:', error);
      res.status(500).json({ message: "Failed to update notification status" });
    }
  });

  // Financial routes - Plans
  app.get('/api/plans', requireAuth, async (req, res) => {
    try {
      const plans = await storage.getAllPlans();
      res.json(plans);
    } catch (error) {
      console.error('Failed to fetch plans:', error);
      res.status(500).json({ message: "Failed to fetch plans" });
    }
  });

  app.get('/api/plans/active', requireAuth, async (req, res) => {
    try {
      const plans = await storage.getActivePlans();
      res.json(plans);
    } catch (error) {
      console.error('Failed to fetch active plans:', error);
      res.status(500).json({ message: "Failed to fetch active plans" });
    }
  });

  app.post('/api/plans', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const planData = insertPlanSchema.parse(req.body);
      const plan = await storage.createPlan(planData);
      res.status(201).json(plan);
    } catch (error) {
      console.error('Failed to create plan:', error);
      res.status(400).json({ message: "Failed to create plan" });
    }
  });

  app.put('/api/plans/:id', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { id } = req.params;
      const updates = insertPlanSchema.partial().parse(req.body);
      const plan = await storage.updatePlan(id, updates);
      res.json(plan);
    } catch (error) {
      console.error('Failed to update plan:', error);
      res.status(400).json({ message: "Failed to update plan" });
    }
  });

  app.delete('/api/plans/:id', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deletePlan(id);
      if (success) {
        res.json({ message: "Plan deleted successfully" });
      } else {
        res.status(404).json({ message: "Plan not found" });
      }
    } catch (error) {
      console.error('Failed to delete plan:', error);
      res.status(500).json({ message: "Failed to delete plan" });
    }
  });

  // Financial routes - Subscriptions
  app.get('/api/subscriptions', requireAuth, requireRole(['admin', 'supervisor']), async (req, res) => {
    try {
      const subscriptions = await storage.getAllSubscriptions();
      res.json(subscriptions);
    } catch (error) {
      console.error('Failed to fetch subscriptions:', error);
      res.status(500).json({ message: "Failed to fetch subscriptions" });
    }
  });

  app.get('/api/subscriptions/my', requireAuth, async (req, res) => {
    try {
      const subscription = await storage.getSubscriptionByUser(req.user.id);
      res.json(subscription || null);
    } catch (error) {
      console.error('Failed to fetch user subscription:', error);
      res.status(500).json({ message: "Failed to fetch subscription" });
    }
  });

  app.post('/api/subscriptions', requireAuth, async (req, res) => {
    try {
      const subscriptionData = insertSubscriptionSchema.parse({
        ...req.body,
        userId: req.user.id
      });
      const subscription = await storage.createSubscription(subscriptionData);
      res.status(201).json(subscription);
    } catch (error) {
      console.error('Failed to create subscription:', error);
      res.status(400).json({ message: "Failed to create subscription" });
    }
  });

  app.put('/api/subscriptions/:id', requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = insertSubscriptionSchema.partial().parse(req.body);
      const subscription = await storage.updateSubscription(id, updates);
      res.json(subscription);
    } catch (error) {
      console.error('Failed to update subscription:', error);
      res.status(400).json({ message: "Failed to update subscription" });
    }
  });

  // Financial routes - Invoices
  app.get('/api/invoices', requireAuth, requireRole(['admin', 'supervisor']), async (req, res) => {
    try {
      const invoices = await storage.getAllInvoices();
      res.json(invoices);
    } catch (error) {
      console.error('Failed to fetch invoices:', error);
      res.status(500).json({ message: "Failed to fetch invoices" });
    }
  });

  app.get('/api/invoices/my/open', requireAuth, async (req, res) => {
    try {
      const invoices = await storage.getOpenInvoicesByUser(req.user.id);
      res.json(invoices);
    } catch (error) {
      console.error('Failed to fetch open invoices:', error);
      res.status(500).json({ message: "Failed to fetch open invoices" });
    }
  });

  app.post('/api/invoices', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const invoiceData = insertInvoiceSchema.parse(req.body);
      const invoice = await storage.createInvoice(invoiceData);
      res.status(201).json(invoice);
    } catch (error) {
      console.error('Failed to create invoice:', error);
      res.status(400).json({ message: "Failed to create invoice" });
    }
  });

  app.put('/api/invoices/:id', requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = insertInvoiceSchema.partial().parse(req.body);
      const invoice = await storage.updateInvoice(id, updates);
      res.json(invoice);
    } catch (error) {
      console.error('Failed to update invoice:', error);
      res.status(400).json({ message: "Failed to update invoice" });
    }
  });

  // Financial routes - Payments
  app.get('/api/payments', requireAuth, requireRole(['admin', 'supervisor']), async (req, res) => {
    try {
      const payments = await storage.getAllPayments();
      res.json(payments);
    } catch (error) {
      console.error('Failed to fetch payments:', error);
      res.status(500).json({ message: "Failed to fetch payments" });
    }
  });

  app.get('/api/payments/invoice/:invoiceId', requireAuth, async (req, res) => {
    try {
      const { invoiceId } = req.params;
      const payments = await storage.getPaymentsByInvoice(invoiceId);
      res.json(payments);
    } catch (error) {
      console.error('Failed to fetch payments for invoice:', error);
      res.status(500).json({ message: "Failed to fetch payments" });
    }
  });

  app.post('/api/payments', requireAuth, async (req, res) => {
    try {
      const paymentData = insertPaymentSchema.parse(req.body);
      const payment = await storage.createPayment(paymentData);
      res.status(201).json(payment);
    } catch (error) {
      console.error('Failed to create payment:', error);
      res.status(400).json({ message: "Failed to create payment" });
    }
  });

  app.put('/api/payments/:id', requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = insertPaymentSchema.partial().parse(req.body);
      const payment = await storage.updatePayment(id, updates);
      res.json(payment);
    } catch (error) {
      console.error('Failed to update payment:', error);
      res.status(400).json({ message: "Failed to update payment" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
