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
  insertPaymentSchema,
  insertCompanySchema,
  insertUserCompanySchema,
  type Company
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
import bcrypt from "bcryptjs";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication routes
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = loginSchema.parse(req.body);
      
      console.log(`🔐 Login attempt for: ${email} (Environment: ${storage.getCurrentEnvironment()})`);
      
      const result = await authenticateUser(
        email, 
        password, 
        undefined, // companyId - let it auto-select
        req.ip,
        req.get('User-Agent')
      );
      
      if (!result) {
        console.log(`❌ Login failed for: ${email} - Invalid credentials or no company association`);
        return res.status(401).json({ message: "Invalid email or password" });
      }

      console.log(`✅ Login successful for: ${email} (Company: ${result.user.company?.name})`);
      res.json({
        message: "Login successful",
        user: result.user,
        token: result.token,
        expiresAt: result.expiresAt
      });
    } catch (error) {
      console.error('🚨 Login error:', error);
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
        respondedById: req.user!.id,
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
  
  // Endpoint to fetch plans from Fi.V Connect
  app.get('/api/fiv-connect/plans', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const config = await storage.getInstanceConfig();
      
      if (!config) {
        return res.status(400).json({ 
          message: "Instance not configured for Fi.V Connect integration" 
        });
      }
      
      // Make request to Fi.V Connect API for plans
      const apiUrl = process.env.FIV_APP_API_URL || config.connectApiUrl;
      const apiKey = process.env.FIV_APP_API_KEY || config.instanceKey;
      
      const response = await fetch(`${apiUrl}/api/v1/plans`, {
        method: 'GET',
        headers: {
          'X-Instance-Key': apiKey,
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        }
      });

      if (!response.ok) {
        throw new Error(`Fi.V Connect API returned ${response.status}: ${response.statusText}`);
      }

      const plans = await response.json();
      
      res.json({
        success: true,
        plans: plans,
        source: 'fiv_connect',
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Failed to fetch plans from Fi.V Connect:', error);
      res.status(500).json({ 
        message: "Failed to fetch plans from Fi.V Connect",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Endpoint to fetch database instances from Fi.V Connect
  app.get('/api/fiv-connect/databases', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const config = await storage.getInstanceConfig();
      
      if (!config) {
        return res.status(400).json({ 
          message: "Instance not configured for Fi.V Connect integration" 
        });
      }
      
      // Make request to Fi.V Connect API for databases
      const apiUrl = process.env.FIV_APP_API_URL || config.connectApiUrl;
      const apiKey = process.env.FIV_APP_API_KEY || config.instanceKey;
      
      const response = await fetch(`${apiUrl}/api/v1/instances/${config.instanceId}/databases`, {
        method: 'GET',
        headers: {
          'X-Instance-Key': apiKey,
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        }
      });

      if (!response.ok) {
        throw new Error(`Fi.V Connect API returned ${response.status}: ${response.statusText}`);
      }

      const databases = await response.json();
      
      res.json({
        success: true,
        databases: databases,
        instanceId: config.instanceId,
        source: 'fiv_connect',
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Failed to fetch databases from Fi.V Connect:', error);
      res.status(500).json({ 
        message: "Failed to fetch databases from Fi.V Connect",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Endpoint to synchronize local plans with Fi.V Connect plans
  app.post('/api/fiv-connect/sync-plans', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const config = await storage.getInstanceConfig();
      
      if (!config) {
        return res.status(400).json({ 
          message: "Instance not configured for Fi.V Connect integration" 
        });
      }
      
      // Fetch plans from Fi.V Connect
      const apiUrl = process.env.FIV_APP_API_URL || config.connectApiUrl;
      const apiKey = process.env.FIV_APP_API_KEY || config.instanceKey;
      
      const response = await fetch(`${apiUrl}/api/v1/plans`, {
        method: 'GET',
        headers: {
          'X-Instance-Key': apiKey,
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        }
      });

      if (!response.ok) {
        throw new Error(`Fi.V Connect API returned ${response.status}: ${response.statusText}`);
      }

      const externalPlans = await response.json();
      
      // Sync plans to local database
      const syncResults = [];
      for (const plan of externalPlans) {
        try {
          const existingPlan = await storage.getPlanById(plan.id);
          
          if (existingPlan) {
            // Update existing plan
            await storage.updatePlan(plan.id, {
              name: plan.name,
              description: plan.description,
              price: plan.price,
              currency: plan.currency,
              billingInterval: plan.billingInterval,
              features: plan.features,
              maxUsers: plan.maxUsers,
              maxConversations: plan.maxConversations,
              storageLimit: plan.storageLimit,
              isActive: plan.isActive,
              stripeProductId: plan.stripeProductId,
              stripePriceId: plan.stripePriceId
            });
            syncResults.push({ action: 'updated', planId: plan.id, name: plan.name });
          } else {
            // Create new plan
            await storage.createPlan({
              name: plan.name,
              description: plan.description,
              price: plan.price,
              currency: plan.currency,
              billingInterval: plan.billingInterval,
              features: plan.features,
              maxUsers: plan.maxUsers,
              maxConversations: plan.maxConversations,
              storageLimit: plan.storageLimit,
              isActive: plan.isActive,
              stripeProductId: plan.stripeProductId,
              stripePriceId: plan.stripePriceId
            });
            syncResults.push({ action: 'created', planId: plan.id, name: plan.name });
          }
        } catch (error) {
          console.error(`Failed to sync plan ${plan.id}:`, error);
          syncResults.push({ action: 'error', planId: plan.id, name: plan.name, error: error.message });
        }
      }
      
      res.json({
        success: true,
        message: "Plans synchronized successfully",
        results: syncResults,
        totalProcessed: externalPlans.length,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Failed to sync plans:', error);
      res.status(500).json({ 
        message: "Failed to synchronize plans with Fi.V Connect",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Endpoint to report instance data back to Fi.V Connect
  app.post('/api/fiv-connect/report-usage', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const config = await storage.getInstanceConfig();
      
      if (!config) {
        return res.status(400).json({ 
          message: "Instance not configured for Fi.V Connect integration" 
        });
      }
      
      // Gather instance usage data
      const users = await storage.getAllUsers();
      const conversations = await storage.getAllConversations();
      const clients = await storage.getAllClients();
      const queues = await storage.getAllQueues();
      
      const usageData = {
        instanceId: config.instanceId,
        totalUsers: users.length,
        totalConversations: conversations.length,
        totalClients: clients.length,
        totalQueues: queues.length,
        activeConversations: conversations.filter(c => c.status === 'in_progress').length,
        environment: storage.getCurrentEnvironment(),
        lastActivity: new Date().toISOString(),
        features: config.enabledFeatures
      };
      
      // Send usage data to Fi.V Connect
      const apiUrl = process.env.FIV_APP_API_URL || config.connectApiUrl;
      const apiKey = process.env.FIV_APP_API_KEY || config.instanceKey;
      
      const response = await fetch(`${apiUrl}/api/v1/instances/${config.instanceId}/usage`, {
        method: 'POST',
        headers: {
          'X-Instance-Key': apiKey,
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(usageData)
      });

      if (!response.ok) {
        throw new Error(`Fi.V Connect API returned ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      res.json({
        success: true,
        message: "Usage data reported to Fi.V Connect successfully",
        usageData,
        response: result,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Failed to report usage to Fi.V Connect:', error);
      res.status(500).json({ 
        message: "Failed to report usage to Fi.V Connect",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Fi.V Connect panel API - /api/v1/plans
  // Fetch real plans from central Fi.V Connect panel
  app.get('/api/v1/plans', async (req, res) => {
    try {
      const instanceKey = req.headers['x-instance-key'] as string;
      
      if (!instanceKey) {
        return res.status(401).json({ error: "Missing instance key" });
      }

      // Check if we have Fi.V Connect API configuration
      const apiUrl = process.env.FIV_APP_API_URL;
      const apiKey = process.env.FIV_APP_API_KEY;
      
      if (!apiUrl || !apiKey) {
        // Fallback to mock data if Fi.V Connect not configured
        console.log('🔄 Fi.V Connect API not configured, using mock data');
        const mockPlans = [
          {
            id: "plan_starter",
            name: "Starter",
            description: "Basic plan for small businesses",
            price: 2900,
            currency: "BRL",
            billingInterval: "monthly",
            features: ["basic_chat", "email_support"],
            maxUsers: 2,
            maxConversations: 50,
            storageLimit: 500,
            isActive: true,
            stripeProductId: "prod_starter",
            stripePriceId: "price_starter"
          },
          {
            id: "plan_professional",
            name: "Professional",
            description: "Advanced plan for growing teams",
            price: 9900,
            currency: "BRL",
            billingInterval: "monthly",
            features: ["advanced_chat", "ai_chatbot", "priority_support", "analytics"],
            maxUsers: 10,
            maxConversations: 500,
            storageLimit: 5000,
            isActive: true,
            stripeProductId: "prod_professional",
            stripePriceId: "price_professional"
          }
        ];
        return res.json(mockPlans);
      }

      // Try real API call to Fi.V Connect
      console.log('🔗 Attempting to fetch plans from Fi.V Connect:', apiUrl);
      try {
        const response = await fetch(`${apiUrl}/v1/plans`, {
          method: 'GET',
          headers: {
            'X-Instance-Key': apiKey,
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          }
        });

        if (!response.ok) {
          throw new Error(`Fi.V Connect API returned ${response.status}: ${response.statusText}`);
        }

        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          throw new Error('Fi.V Connect API did not return JSON');
        }

        const plans = await response.json();
        res.json(plans);
      } catch (fetchError) {
        console.log('⚠️ Fi.V Connect API call failed, using mock data:', (fetchError as Error).message);
        // Fallback to mock data when Fi.V Connect is not available
        const mockPlans = [
          {
            id: "plan_starter",
            name: "Starter",
            description: "Basic plan for small businesses",
            price: 2900,
            currency: "BRL",
            billingInterval: "monthly",
            features: ["basic_chat", "email_support"],
            maxUsers: 2,
            maxConversations: 50,
            storageLimit: 500,
            isActive: true,
            stripeProductId: "prod_starter",
            stripePriceId: "price_starter"
          },
          {
            id: "plan_professional",
            name: "Professional",
            description: "Advanced plan for growing teams",
            price: 9900,
            currency: "BRL",
            billingInterval: "monthly",
            features: ["advanced_chat", "ai_chatbot", "priority_support", "analytics"],
            maxUsers: 10,
            maxConversations: 500,
            storageLimit: 5000,
            isActive: true,
            stripeProductId: "prod_professional",
            stripePriceId: "price_professional"
          }
        ];
        res.json(mockPlans);
      }
      
    } catch (error) {
      console.error('Fi.V Connect Plans API error:', error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Fi.V Connect panel API - /api/v1/instances/:instanceId/databases
  // Fetch real database info from central Fi.V Connect panel
  app.get('/api/v1/instances/:instanceId/databases', async (req, res) => {
    try {
      const instanceKey = req.headers['x-instance-key'] as string;
      const { instanceId } = req.params;
      
      if (!instanceKey) {
        return res.status(401).json({ error: "Missing instance key" });
      }

      // Check if we have Fi.V Connect API configuration
      const apiUrl = process.env.FIV_APP_API_URL;
      const apiKey = process.env.FIV_APP_API_KEY;
      
      if (!apiUrl || !apiKey) {
        // Fallback to mock data if Fi.V Connect not configured
        console.log('🔄 Fi.V Connect API not configured, using mock database data');
        const mockDatabases = [
          {
            id: `db_${instanceId}_main`,
            name: "Main Database",
            type: "postgresql",
            host: "db.fiv-connect.com",
            port: 5432,
            database: `fivapp_${instanceId}`,
            status: "active",
            created_at: "2025-01-01T00:00:00Z",
            size_mb: 250,
            connection_limit: 100,
            backup_enabled: true,
            last_backup: "2025-08-29T06:00:00Z"
          }
        ];
        return res.json(mockDatabases);
      }

      // Try real API call to Fi.V Connect
      console.log('🔗 Attempting to fetch databases from Fi.V Connect for instance:', instanceId);
      try {
        const response = await fetch(`${apiUrl}/v1/instances/${instanceId}/databases`, {
          method: 'GET',
          headers: {
            'X-Instance-Key': apiKey,
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          }
        });

        if (!response.ok) {
          throw new Error(`Fi.V Connect API returned ${response.status}: ${response.statusText}`);
        }

        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          throw new Error('Fi.V Connect API did not return JSON');
        }

        const databases = await response.json();
        res.json(databases);
      } catch (fetchError) {
        console.log('⚠️ Fi.V Connect API call failed, using mock data:', (fetchError as Error).message);
        // Fallback to mock data when Fi.V Connect is not available
        const mockDatabases = [
          {
            id: `db_${instanceId}_main`,
            name: "Main Database",
            type: "postgresql",
            host: "db.fiv-connect.com",
            port: 5432,
            database: `fivapp_${instanceId}`,
            status: "active",
            created_at: "2025-01-01T00:00:00Z",
            size_mb: 250,
            connection_limit: 100,
            backup_enabled: true,
            last_backup: "2025-08-29T06:00:00Z"
          }
        ];
        res.json(mockDatabases);
      }
      
    } catch (error) {
      console.error('Fi.V Connect Databases API error:', error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Fi.V Connect panel API - /api/v1/instances/:instanceId/users
  // Fetch real users from central Fi.V Connect panel
  app.get('/api/v1/instances/:instanceId/users', async (req, res) => {
    try {
      const instanceKey = req.headers['x-instance-key'] as string;
      const { instanceId } = req.params;
      
      if (!instanceKey) {
        return res.status(401).json({ error: "Missing instance key" });
      }

      // Check if we have Fi.V Connect API configuration
      const apiUrl = process.env.FIV_APP_API_URL;
      const apiKey = process.env.FIV_APP_API_KEY;
      
      if (!apiUrl || !apiKey) {
        // Fallback to mock data if Fi.V Connect not configured
        console.log('🔄 Fi.V Connect API not configured, using mock user data');
        const mockUsers = [
          {
            id: "user_001",
            email: "rodrigo@t4l.com.br",
            instanceId: instanceId,
            registeredAt: "2025-08-29T20:00:00Z",
            status: "active",
            plan: "plan_professional",
            role: "admin"
          }
        ];
        return res.json(mockUsers);
      }

      // Try real API call to Fi.V Connect
      console.log('🔗 Attempting to fetch users from Fi.V Connect for instance:', instanceId);
      const response = await fetch(`${apiUrl}/v1/instances/${instanceId}/users`, {
        method: 'GET',
        headers: {
          'X-Instance-Key': apiKey,
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        }
      });

      if (!response.ok) {
        throw new Error(`Fi.V Connect API returned ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Fi.V Connect API did not return JSON');
      }

      const users = await response.json();
      console.log('👥 Users received from Fi.V Connect:', users.length);
      res.json(users);
      
    } catch (error) {
      console.log('⚠️ Fi.V Connect API call failed, using fallback data:', error instanceof Error ? error.message : 'Unknown error');
      // Fallback to mock data when Fi.V Connect is not available
      const mockUsers = [
        {
          id: "user_001",
          email: "rodrigo@t4l.com.br",
          instanceId: instanceId,
          registeredAt: "2025-08-29T20:00:00Z",
          status: "active",
          plan: "plan_professional",
          role: "admin",
          company: "T4L",
          phone: "+55 11 99999-9999"
        }
      ];
      res.json(mockUsers);
    }
  });

  // Webhook to receive user registration notifications from Fi.V Connect
  app.post('/api/webhook/user-registration', async (req, res) => {
    try {
      const instanceKey = req.headers['x-instance-key'] as string;
      
      if (!instanceKey) {
        return res.status(401).json({ error: "Missing instance key" });
      }
      
      const {
        userId,
        email,
        instanceId,
        planId,
        registrationData
      } = req.body;
      
      if (!userId || !email || !instanceId) {
        return res.status(400).json({ error: "Missing required user registration data" });
      }
      
      console.log(`📨 New user registration received from Fi.V Connect:`, {
        userId,
        email,
        instanceId,
        planId
      });
      
      // Process the user registration
      // In a real implementation, you might want to:
      // 1. Create local user account
      // 2. Set up default configurations
      // 3. Send welcome email
      // 4. Initialize user workspace
      
      // For now, just log and acknowledge
      console.log(`✅ User registration processed for ${email} on instance ${instanceId}`);
      
      res.json({
        success: true,
        message: "User registration received and processed",
        userId,
        instanceId,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('User registration webhook error:', error);
      res.status(500).json({ error: "Failed to process user registration" });
    }
  });

  // Simulate Fi.V Connect panel API - /api/v1/instances/:instanceId/usage (for receiving usage reports)
  app.post('/api/v1/instances/:instanceId/usage', async (req, res) => {
    try {
      const instanceKey = req.headers['x-instance-key'] as string;
      const { instanceId } = req.params;
      const usageData = req.body;
      
      if (!instanceKey) {
        return res.status(401).json({ error: "Missing instance key" });
      }
      
      console.log(`📊 Usage data received for instance ${instanceId}:`, usageData);
      
      // In a real implementation, this would store the usage data in the central database
      // For simulation, we just acknowledge receipt
      res.json({
        success: true,
        message: "Usage data received and processed",
        instanceId,
        dataReceived: usageData,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Fi.V Connect Usage API error:', error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

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
  // Debug environment endpoint (temporary)
  app.get('/api/debug/environment', (req, res) => {
    res.json({
      NODE_ENV: process.env.NODE_ENV,
      currentEnvironment: storage.getCurrentEnvironment(),
      filterEnvironment: process.env.NODE_ENV === 'development' ? 'development' : 'production'
    });
  });

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

  // Environment management routes (admin only)
  app.get('/api/environment/info', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const currentEnv = storage.getCurrentEnvironment();
      const userData = await storage.getAllUsers();
      const clientData = await storage.getAllClients();
      const conversationData = await storage.getAllConversations();
      const queueData = await storage.getAllQueues();
      
      res.json({
        currentEnvironment: currentEnv,
        dataCount: {
          users: userData.length,
          clients: clientData.length,
          conversations: conversationData.length,
          queues: queueData.length
        }
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch environment info" });
    }
  });

  app.post('/api/environment/clean-test-data', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const currentEnv = storage.getCurrentEnvironment();
      
      if (currentEnv === 'development') {
        return res.status(400).json({ 
          message: "Cannot clean test data while in development environment" 
        });
      }
      
      const success = await storage.cleanTestData();
      
      if (success) {
        res.json({ 
          message: "Test data cleaned successfully",
          environment: currentEnv
        });
      } else {
        res.status(500).json({ message: "Failed to clean test data" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to clean test data" });
    }
  });

  // Route to set up production data (creates clean production environment)
  app.post('/api/environment/setup-production', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { companyName, adminEmail, adminPassword } = req.body;
      
      if (!companyName || !adminEmail || !adminPassword) {
        return res.status(400).json({ 
          message: "Company name, admin email, and admin password are required" 
        });
      }
      
      // Create production admin user
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      
      try {
        await storage.createUser({
          name: "System Administrator",
          email: adminEmail,
          password: hashedPassword,
          role: "admin",
          isOnline: true
        });
      } catch (error) {
        // User might already exist, update instead
        const existingUser = await storage.getUserByEmail(adminEmail);
        if (existingUser) {
          await storage.updateUser(existingUser.id, {
            password: hashedPassword
          });
        }
      }
      
      // Create production queues if they don't exist
      const existingQueues = await storage.getAllQueues();
      if (existingQueues.length === 0) {
        await storage.createQueue({
          name: "Technical Support",
          description: "Help with technical issues",
          workingHours: { days: "Mon-Fri", hours: "9:00-18:00" },
          messageInsideHours: "Welcome to Technical Support. An agent will be with you shortly.",
          messageOutsideHours: "We are currently closed. Please leave a message and we will get back to you.",
          isActive: true
        });
        
        await storage.createQueue({
          name: "Sales", 
          description: "Sales inquiries and quotes",
          workingHours: { days: "Mon-Sat", hours: "8:00-20:00" },
          messageInsideHours: "Welcome to Sales! How can we help you today?",
          messageOutsideHours: "Our sales team is currently unavailable. Please leave a message.",
          isActive: true
        });
      }
      
      // Update company name setting
      await storage.updateSetting("companyName", companyName);
      
      res.json({ 
        message: "Production environment setup completed",
        environment: storage.getCurrentEnvironment(),
        companyName,
        adminEmail
      });
      
    } catch (error) {
      console.error('Setup production error:', error);
      res.status(500).json({ message: "Failed to setup production environment" });
    }
  });

  // WhatsApp Connection routes (protected)
  app.get('/api/whatsapp/connections', requireAuth, requireRole(['admin', 'supervisor']), async (req, res) => {
    try {
      const connections = await storage.getAllWhatsAppConnections();
      res.json(connections);
    } catch (error) {
      console.error('Failed to get WhatsApp connections:', error);
      res.status(500).json({ message: "Failed to get WhatsApp connections" });
    }
  });

  app.post('/api/whatsapp/connections', requireAuth, requireRole(['admin', 'supervisor']), async (req, res) => {
    try {
      const { name, isDefault } = req.body;
      
      if (!name) {
        return res.status(400).json({ message: "Connection name is required" });
      }

      // Create connection in database
      const connection = await storage.createWhatsAppConnection({
        name,
        isDefault: isDefault || false,
        status: 'connecting'
      });

      // Initialize WhatsApp session
      const { whatsappService } = await import('./whatsapp-service');
      await whatsappService.createConnection(name, isDefault || false);

      res.status(201).json(connection);
    } catch (error) {
      console.error('Failed to create WhatsApp connection:', error);
      res.status(500).json({ message: "Failed to create WhatsApp connection" });
    }
  });

  app.get('/api/whatsapp/connections/:id/qr', requireAuth, requireRole(['admin', 'supervisor']), async (req, res) => {
    try {
      const { id } = req.params;
      
      const { whatsappService } = await import('./whatsapp-service');
      const connectionInfo = whatsappService.getConnectionInfo(id);
      
      if (!connectionInfo) {
        return res.status(404).json({ message: "WhatsApp connection not found" });
      }

      res.json({
        status: connectionInfo.status,
        qrCode: connectionInfo.qrCode
      });
    } catch (error) {
      console.error('Failed to get QR code:', error);
      res.status(500).json({ message: "Failed to get QR code" });
    }
  });

  app.post('/api/whatsapp/connections/:id/disconnect', requireAuth, requireRole(['admin', 'supervisor']), async (req, res) => {
    try {
      const { id } = req.params;
      
      const { whatsappService } = await import('./whatsapp-service');
      await whatsappService.disconnectConnection(id);

      res.json({ message: "WhatsApp connection disconnected successfully" });
    } catch (error) {
      console.error('Failed to disconnect WhatsApp connection:', error);
      res.status(500).json({ message: "Failed to disconnect WhatsApp connection" });
    }
  });

  app.delete('/api/whatsapp/connections/:id', requireAuth, requireRole(['admin', 'supervisor']), async (req, res) => {
    try {
      const { id } = req.params;
      
      // Disconnect first
      try {
        const { whatsappService } = await import('./whatsapp-service');
        await whatsappService.disconnectConnection(id);
      } catch (error) {
        console.warn('Failed to disconnect WhatsApp connection:', error);
      }

      // Delete from database
      const success = await storage.deleteWhatsAppConnection(id);
      
      if (success) {
        res.json({ message: "WhatsApp connection deleted successfully" });
      } else {
        res.status(404).json({ message: "WhatsApp connection not found" });
      }
    } catch (error) {
      console.error('Failed to delete WhatsApp connection:', error);
      res.status(500).json({ message: "Failed to delete WhatsApp connection" });
    }
  });

  app.post('/api/whatsapp/send-message', requireAuth, async (req, res) => {
    try {
      const { connectionId, to, message } = req.body;
      
      if (!connectionId || !to || !message) {
        return res.status(400).json({ message: "Connection ID, phone number, and message are required" });
      }

      const { whatsappService } = await import('./whatsapp-service');
      const success = await whatsappService.sendMessage(connectionId, to, message);
      
      if (success) {
        res.json({ message: "Message sent successfully" });
      } else {
        res.status(400).json({ message: "Failed to send message" });
      }
    } catch (error) {
      console.error('Failed to send WhatsApp message:', error);
      res.status(500).json({ message: "Failed to send WhatsApp message" });
    }
  });

  // Quick Replies routes (protected)
  app.get('/api/quick-replies', requireAuth, async (req, res) => {
    try {
      const { userId } = req.query;
      
      let replies;
      if (userId && req.user.role === 'admin') {
        // Admin can get replies by specific user
        replies = await storage.getQuickRepliesByUser(userId as string);
      } else {
        // Get user's personal replies + global replies
        const personalReplies = await storage.getQuickRepliesByUser(req.user.id);
        const globalReplies = await storage.getGlobalQuickReplies();
        replies = [...personalReplies, ...globalReplies];
      }
      
      res.json(replies);
    } catch (error) {
      console.error('Failed to get quick replies:', error);
      res.status(500).json({ message: "Failed to get quick replies" });
    }
  });

  app.post('/api/quick-replies', requireAuth, async (req, res) => {
    try {
      const { shortcut, message, isGlobal } = req.body;
      
      if (!shortcut || !message) {
        return res.status(400).json({ message: "Shortcut and message are required" });
      }

      // Only admins can create global replies
      if (isGlobal && req.user.role !== 'admin') {
        return res.status(403).json({ message: "Only administrators can create global quick replies" });
      }

      const reply = await storage.createQuickReply({
        shortcut,
        message,
        userId: req.user.id,
        isGlobal: isGlobal && req.user.role === 'admin'
      });

      res.status(201).json(reply);
    } catch (error) {
      console.error('Failed to create quick reply:', error);
      res.status(500).json({ message: "Failed to create quick reply" });
    }
  });

  app.put('/api/quick-replies/:id', requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { shortcut, message, isGlobal } = req.body;
      
      // Check if reply exists and user has permission
      const existingReply = await storage.getQuickReply(id);
      if (!existingReply) {
        return res.status(404).json({ message: "Quick reply not found" });
      }

      // Users can only edit their own replies, admins can edit any
      if (req.user.role !== 'admin' && existingReply.userId !== req.user.id) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Only admins can create/modify global replies
      if (isGlobal && req.user.role !== 'admin') {
        return res.status(403).json({ message: "Only administrators can create global quick replies" });
      }

      const reply = await storage.updateQuickReply(id, {
        shortcut,
        message,
        isGlobal: isGlobal && req.user.role === 'admin'
      });

      res.json(reply);
    } catch (error) {
      console.error('Failed to update quick reply:', error);
      res.status(500).json({ message: "Failed to update quick reply" });
    }
  });

  app.delete('/api/quick-replies/:id', requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      
      // Check if reply exists and user has permission
      const existingReply = await storage.getQuickReply(id);
      if (!existingReply) {
        return res.status(404).json({ message: "Quick reply not found" });
      }

      // Users can only delete their own replies, admins can delete any
      if (req.user.role !== 'admin' && existingReply.userId !== req.user.id) {
        return res.status(403).json({ message: "Access denied" });
      }

      const success = await storage.deleteQuickReply(id);
      
      if (success) {
        res.json({ message: "Quick reply deleted successfully" });
      } else {
        res.status(404).json({ message: "Quick reply not found" });
      }
    } catch (error) {
      console.error('Failed to delete quick reply:', error);
      res.status(500).json({ message: "Failed to delete quick reply" });
    }
  });

  // ===== ADMIN PANEL ROUTES =====
  // Company management routes (admin only)
  app.get('/api/admin/companies', requireRole(['superadmin']), async (req, res) => {
    try {
      const companies = await storage.getAllCompanies();
      res.json(companies);
    } catch (error) {
      console.error('Failed to fetch companies:', error);
      res.status(500).json({ message: "Failed to fetch companies" });
    }
  });

  app.post('/api/admin/companies', requireRole(['superadmin']), async (req, res) => {
    try {
      const companyData = insertCompanySchema.parse(req.body);
      
      // Ensure email is unique
      const existingCompany = await storage.getAllCompanies();
      if (existingCompany.find(c => c.email === companyData.email)) {
        return res.status(400).json({ message: "A company with this email already exists" });
      }

      const company = await storage.createCompany(companyData);
      res.json(company);
    } catch (error) {
      console.error('Failed to create company:', error);
      res.status(500).json({ message: "Failed to create company" });
    }
  });

  app.put('/api/admin/companies/:id', requireRole(['superadmin']), async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body; // Partial update

      const company = await storage.updateCompany(id, updates);
      res.json(company);
    } catch (error) {
      console.error('Failed to update company:', error);
      res.status(500).json({ message: "Failed to update company" });
    }
  });

  app.delete('/api/admin/companies/:id', requireRole(['superadmin']), async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteCompany(id);
      
      if (success) {
        res.json({ message: "Company deleted successfully" });
      } else {
        res.status(404).json({ message: "Company not found" });
      }
    } catch (error) {
      console.error('Failed to delete company:', error);
      res.status(500).json({ message: "Failed to delete company" });
    }
  });

  // Company user management
  app.get('/api/admin/companies/:id/users', requireRole(['superadmin']), async (req, res) => {
    try {
      const { id } = req.params;
      const users = await storage.getUsersByCompany(id);
      res.json(users);
    } catch (error) {
      console.error('Failed to fetch company users:', error);
      res.status(500).json({ message: "Failed to fetch company users" });
    }
  });

  app.post('/api/admin/companies/:id/users', requireRole(['superadmin']), async (req, res) => {
    try {
      const { id: companyId } = req.params;
      const userData = insertUserSchema.parse(req.body);
      
      // Check if user email already exists
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        // User exists - create user-company relationship only
        const userCompany = await storage.createUserCompany({
          userId: existingUser.id,
          companyId,
          role: req.body.role || 'agent',
          isOwner: req.body.role === 'owner' ? true : false
        });
        
        const result = await storage.getUsersByCompany(companyId);
        const newUserCompany = result.find(uc => uc.id === userCompany.id);
        
        return res.json(newUserCompany);
      }
      
      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      const userWithHashedPassword = {
        ...userData,
        password: hashedPassword
      };

      // Create new user
      const user = await storage.createUser(userWithHashedPassword);
      
      // Create user-company relationship
      const userCompany = await storage.createUserCompany({
        userId: user.id,
        companyId,
        role: req.body.role || 'agent',
        isOwner: req.body.role === 'owner' ? true : false
      });

      // Return the created user with company info
      const result = await storage.getUsersByCompany(companyId);
      const newUserCompany = result.find(uc => uc.id === userCompany.id);
      
      res.json(newUserCompany);
    } catch (error) {
      console.error('Failed to create company user:', error);
      res.status(500).json({ message: "Failed to create company user" });
    }
  });

  // ===== PLANS MANAGEMENT ROUTES (SUPERADMIN ONLY) =====
  app.get('/api/admin/plans', requireRole(['superadmin']), async (req, res) => {
    try {
      const plans = await storage.getAllPlans();
      res.json(plans);
    } catch (error) {
      console.error('Failed to fetch plans:', error);
      res.status(500).json({ message: "Failed to fetch plans" });
    }
  });

  app.post('/api/admin/plans', requireRole(['superadmin']), async (req, res) => {
    try {
      const planData = insertPlanSchema.parse(req.body);
      const plan = await storage.createPlan(planData);
      res.json(plan);
    } catch (error) {
      console.error('Failed to create plan:', error);
      res.status(500).json({ message: "Failed to create plan" });
    }
  });

  app.put('/api/admin/plans/:id', requireRole(['superadmin']), async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const plan = await storage.updatePlan(id, updates);
      res.json(plan);
    } catch (error) {
      console.error('Failed to update plan:', error);
      res.status(500).json({ message: "Failed to update plan" });
    }
  });

  app.delete('/api/admin/plans/:id', requireRole(['superadmin']), async (req, res) => {
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

  const httpServer = createServer(app);
  return httpServer;
}
