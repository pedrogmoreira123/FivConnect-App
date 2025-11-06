import type { Express } from "express";
import { createServer, type Server } from "http";
import { Server as SocketIOServer } from "socket.io";
import "./types"; // Import type extensions
import { storage } from "./storage";
// import { setupEvolutionRoutes } from "./evolution-routes"; // Removido - migrado para Whapi.Cloud
import { setupWhatsAppRoutes } from "./whatsapp-routes";
import { setupDashboardRoutes } from "./dashboard-routes";
import { setupAdminRoutes } from "./admin-routes";
import ticketsRoutes from "./tickets-routes";
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
  authenticateUserByUsername,
  logoutUser,
  requireAuth,
  requireRole,
  encryptData,
  decryptData,
  validateWebhookSignature
} from "./auth";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { Logger } from "./logger";
import { EmailService } from "./services/email-service";
import crypto from "crypto";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  companyId: z.string().optional() // Optional company selection for multi-tenant login
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication routes
  app.post('/api/auth/login', async (req, res) => {
    const requestContext = {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      endpoint: req.originalUrl,
      method: req.method
    };

    try {
      const { email, password, companyId } = loginSchema.parse(req.body);

      Logger.auth(`Login attempt for email: ${email}${companyId ? ` (company: ${companyId})` : ''}`, {
        ...requestContext,
        email,
        companyId: companyId || 'auto-select',
        environment: storage.getCurrentEnvironment()
      });

      // If companyId not provided, check if user has multiple companies
      if (!companyId) {
        // Validate credentials first
        const user = await storage.getUserByEmail(email);
        if (!user) {
          Logger.warn(`Login failed - user not found: ${email}`, requestContext);
          return res.status(401).json({ message: "Invalid email or password" });
        }

        const bcrypt = await import('bcryptjs');
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
          Logger.warn(`Login failed - invalid password: ${email}`, requestContext);
          return res.status(401).json({ message: "Invalid email or password" });
        }

        // Get user's companies
        const userCompanies = await storage.getUserCompaniesByUser(user.id);
        const activeCompanies = userCompanies.filter(uc =>
          uc.company.status === 'active' && uc.isActive
        );

        if (activeCompanies.length === 0) {
          Logger.warn(`Login failed - no active companies: ${email}`, requestContext);
          return res.status(403).json({ message: "No active companies associated with this account" });
        }

        // If user has multiple companies, require company selection
        if (activeCompanies.length > 1) {
          Logger.info(`Multiple companies detected for user: ${email}`, {
            ...requestContext,
            email,
            companiesCount: activeCompanies.length
          });
          return res.status(400).json({
            message: "Multiple companies found. Please select one.",
            requiresCompanySelection: true,
            companiesCount: activeCompanies.length
          });
        }

        // Single company - proceed with auto-selection (backward compatibility)
      }

      const result = await authenticateUser(
        email,
        password,
        companyId, // Pass companyId if provided
        req.ip,
        req.get('User-Agent')
      );

      if (!result) {
        Logger.warn(`Login failed for email: ${email} - Invalid credentials or no company association`, {
          ...requestContext,
          email,
          companyId: companyId || 'auto-select',
          reason: 'invalid_credentials_or_no_company'
        });
        return res.status(401).json({ message: "Invalid email or password" });
      }

      Logger.success(`Login successful for email: ${email}`, {
        ...requestContext,
        email,
        userId: result.user.id,
        companyId: (result.user as any)?.company?.id,
        companyName: (result.user as any)?.company?.name
      });

      res.json({
        message: "Login successful",
        user: result.user,
        token: result.token,
        expiresAt: result.expiresAt
      });
    } catch (error) {
      Logger.error('Login error occurred', error, {
        ...requestContext,
        errorType: error instanceof Error ? error.name : 'unknown'
      });
      res.status(500).json({ message: "Login failed" });
    }
  });

  /**
   * POST /api/auth/companies
   * Get list of companies for a user (without creating session)
   * Used for company selection in multi-tenant login
   */
  app.post('/api/auth/companies', async (req, res) => {
    const requestContext = {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      endpoint: req.originalUrl,
      method: req.method
    };

    try {
      const { email, password } = loginSchema.parse(req.body);

      Logger.auth(`Fetching companies for email: ${email}`, {
        ...requestContext,
        email
      });

      // Validate credentials
      const user = await storage.getUserByEmail(email);
      if (!user) {
        Logger.warn(`Companies fetch failed - user not found: ${email}`, requestContext);
        return res.status(401).json({ message: "Invalid email or password" });
      }

      const bcrypt = await import('bcryptjs');
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        Logger.warn(`Companies fetch failed - invalid password: ${email}`, requestContext);
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Get user's companies
      const userCompanies = await storage.getUserCompaniesByUser(user.id);

      if (userCompanies.length === 0) {
        Logger.warn(`Companies fetch failed - no companies found: ${email}`, requestContext);
        return res.status(403).json({ message: "No companies associated with this account" });
      }

      // Filter active companies only
      const activeCompanies = userCompanies.filter(uc =>
        uc.company.status === 'active' && uc.isActive
      );

      if (activeCompanies.length === 0) {
        Logger.warn(`Companies fetch failed - no active companies: ${email}`, requestContext);
        return res.status(403).json({ message: "No active companies found" });
      }

      // Return company list (without sensitive data)
      const companies = activeCompanies.map(uc => ({
        id: uc.company.id,
        name: uc.company.name,
        role: uc.role,
        isOwner: uc.isOwner || false
      }));

      Logger.success(`Companies fetched successfully for: ${email}`, {
        ...requestContext,
        email,
        companiesCount: companies.length
      });

      res.json({ companies });
    } catch (error) {
      Logger.error('Companies fetch error', error, {
        ...requestContext,
        errorType: error instanceof Error ? error.name : 'unknown'
      });
      res.status(500).json({ message: "Failed to fetch companies" });
    }
  });

  app.post('/api/auth/logout', requireAuth, async (req, res) => {
    const requestContext = Logger.createRequestContext(req);
    
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader?.substring(7); // Remove 'Bearer ' prefix
      
      if (token && req.user) {
        await logoutUser(token);
        // Update user offline status
        await storage.updateUser(req.user.id, { isOnline: false });
        
        Logger.info('User logged out successfully', requestContext);
      }
      
      res.json({ message: "Logged out successfully" });
    } catch (error) {
      Logger.error('Logout failed', error, requestContext);
      res.status(500).json({ message: "Logout failed" });
    }
  });
  
  // Get current user profile
  app.get('/api/auth/me', requireAuth, async (req, res) => {
    res.json({ user: req.user });
  });
  
  // Change password
  app.post('/api/auth/change-password', requireAuth, async (req, res) => {
    const requestContext = Logger.createRequestContext(req);
    
    try {
      const { currentPassword, newPassword } = req.body;
      
      if (!currentPassword || !newPassword) {
        Logger.warn('Password change failed - missing passwords', requestContext);
        return res.status(400).json({ message: "Current and new passwords are required" });
      }
      
      if (!req.user) {
        Logger.error('Password change failed - no authenticated user', undefined, requestContext);
        return res.status(401).json({ message: "Authentication required" });
      }
      
      // Verify current password
      const user = await storage.authenticateUser(req.user.email, currentPassword);
      if (!user) {
        Logger.warn('Password change failed - incorrect current password', requestContext);
        return res.status(401).json({ message: "Current password is incorrect" });
      }
      
      // Change password
      const success = await storage.changePassword(req.user.id, newPassword);
      if (success) {
        Logger.success('Password changed successfully', requestContext);
        res.json({ message: "Password changed successfully" });
      } else {
        Logger.error('Password change failed - storage operation failed', undefined, requestContext);
        res.status(500).json({ message: "Failed to change password" });
      }
    } catch (error) {
      Logger.error('Password change failed with exception', error, requestContext);
      res.status(500).json({ message: "Password change failed" });
    }
  });

  // User management routes (protected)
  app.get('/api/users', requireAuth, requireRole(['admin', 'supervisor', 'superadmin']), async (req, res) => {
    try {
      let usersData;

      // Superadmins podem ver todos os usuários (administração global)
      if (req.user!.role === 'superadmin') {
        const users = await storage.getAllUsers();
        usersData = users.map(({ password, ...user }) => user);
      } else {
        // Admins e Supervisors veem apenas usuários da própria empresa (multi-tenant isolation)
        const companyId = req.user!.companyId;

        if (!companyId) {
          return res.status(400).json({ message: "Company ID not found for user" });
        }

        const userCompanies = await storage.getUsersByCompany(companyId);

        // Transformar para formato compatível com o frontend
        usersData = userCompanies.map(uc => {
          const { password, ...safeUser } = uc.user;
          return {
            ...safeUser,
            role: uc.role,  // Usar role específico da empresa
            isActive: uc.isActive
          };
        });
      }

      res.json(usersData);
    } catch (error) {
      console.error('[Routes] Erro ao buscar usuários:', error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.post('/api/users', requireAuth, requireRole(['admin', 'superadmin']), async (req, res) => {
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
      const { companyId } = req.user;
      const clients = await storage.getAllClients(companyId);
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
    const requestContext = Logger.createRequestContext(req);
    
    try {
      if (!req.user) {
        Logger.error('Announcement creation failed - no authenticated user', undefined, requestContext);
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const announcementData = insertAnnouncementSchema.parse({
        ...req.body,
        authorId: req.user.id
      });
      const announcement = await storage.createAnnouncement(announcementData);
      
      Logger.success('Announcement created successfully', {
        ...requestContext,
        announcementId: announcement.id,
        title: announcement.title
      });
      
      res.status(201).json(announcement);
    } catch (error) {
      Logger.error('Announcement creation failed', error, requestContext);
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
      const { companyId } = req.user;

      let conversations;
      if (status) {
        // SECURITY FIX: Added companyId filter
        conversations = await storage.getConversationsByStatus(status as string, companyId);
      } else if (agentId) {
        // SECURITY FIX: Added companyId filter
        conversations = await storage.getConversationsByAgent(agentId as string, companyId);
      } else {
        // Agents can only see their own conversations unless they're admin/supervisor
        if (req.user.role === 'agent') {
          conversations = await storage.getConversationsByAgent(req.user.id, companyId);
        } else {
          // SECURITY FIX: Now filters by company instead of returning all
          conversations = await storage.getAllConversations(companyId);
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
      const { companyId } = req.user;

      // SECURITY FIX: Verify conversation belongs to user's company
      const conversation = await storage.getConversation(conversationId);
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      if (conversation.companyId !== companyId) {
        return res.status(403).json({ message: "Unauthorized access to conversation" });
      }

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
        direction: 'outgoing',
        sentAt: new Date() // Data atual para mensagens de envio
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
      // Webhook signature validation
      const webhookSecret = process.env.WHATSAPP_WEBHOOK_SECRET;
      const signature = req.headers['x-hub-signature-256'] as string;
      
      if (webhookSecret && signature) {
        const payload = JSON.stringify(req.body);
        const isValidSignature = validateWebhookSignature(payload, signature, webhookSecret);
        
        if (!isValidSignature) {
          console.warn('Invalid webhook signature received');
          return res.status(401).json({ message: "Invalid signature" });
        }
      } else if (webhookSecret) {
        // Webhook secret is configured but signature is missing
        console.warn('Webhook signature missing but secret is configured');
        return res.status(401).json({ message: "Signature required" });
      }
      // If no webhook secret is configured, allow the request (for development)
      
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

  app.post('/api/queues', requireAuth, requireRole(['admin', 'supervisor', 'superadmin']), async (req, res) => {
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
    const requestContext = Logger.createRequestContext(req);
    
    try {
      const { userId } = req.params;
      
      if (!req.user) {
        Logger.error('Theme access failed - no authenticated user', undefined, requestContext);
        return res.status(401).json({ message: "Authentication required" });
      }
      
      // Users can only access their own theme or admins can access any
      if (req.user.id !== userId && req.user.role !== 'admin') {
        Logger.warn('Theme access denied - insufficient permissions', {
          ...requestContext,
          targetUserId: userId,
          userRole: req.user.role
        });
        return res.status(403).json({ message: "Access denied" });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        Logger.warn('Theme access failed - user not found', {
          ...requestContext,
          targetUserId: userId
        });
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

  // ===== CHATBOT CONFIGURATION ROUTES (MULTI-TENANT) =====

  /**
   * GET /api/chatbot/configs
   * Listar todos os chatbots da empresa
   */
  app.get('/api/chatbot/configs', requireAuth, requireRole(['admin', 'supervisor', 'superadmin']), async (req, res) => {
    try {
      const { companyId } = req.user;
      const configs = await storage.getAllChatbotConfigs(companyId);

      // Não expor API keys nas respostas
      const safeConfigs = configs.map(config => {
        if (config.aiAgentConfig?.apiKey) {
          return {
            ...config,
            aiAgentConfig: {
              ...config.aiAgentConfig,
              hasApiKey: true,
              apiKey: undefined
            }
          };
        }
        return config;
      });

      res.json(safeConfigs);
    } catch (error) {
      console.error('Error fetching chatbot configs:', error);
      res.status(500).json({ message: "Failed to fetch chatbot configs" });
    }
  });

  /**
   * GET /api/chatbot/configs/:id
   * Buscar chatbot específico por ID
   */
  app.get('/api/chatbot/configs/:id', requireAuth, requireRole(['admin', 'supervisor', 'superadmin']), async (req, res) => {
    try {
      const { id } = req.params;
      const { companyId } = req.user;

      const config = await storage.getChatbotConfigById(id);

      if (!config) {
        return res.status(404).json({ message: "Chatbot not found" });
      }

      // Verificar se pertence à empresa do usuário
      if (config.companyId !== companyId) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Não expor API key
      if (config.aiAgentConfig?.apiKey) {
        config.aiAgentConfig.hasApiKey = true;
        delete config.aiAgentConfig.apiKey;
      }

      res.json(config);
    } catch (error) {
      console.error('Error fetching chatbot config:', error);
      res.status(500).json({ message: "Failed to fetch chatbot config" });
    }
  });

  /**
   * POST /api/chatbot/configs
   * Criar novo chatbot para a empresa
   */
  app.post('/api/chatbot/configs', requireAuth, requireRole(['admin', 'supervisor', 'superadmin']), async (req, res) => {
    try {
      const { companyId } = req.user;
      const { name, whatsappConnectionId, mode, isEnabled, simpleBotConfig, aiAgentConfig, triggerRules } = req.body;

      if (!name) {
        return res.status(400).json({ message: "Nome do chatbot é obrigatório" });
      }

      // Preparar dados do chatbot
      const chatbotData: any = {
        companyId,
        name,
        whatsappConnectionId: whatsappConnectionId || null,
        mode: mode || 'disabled',
        isEnabled: isEnabled || false,
        simpleBotConfig: simpleBotConfig || {
          welcomeMessage: 'Olá! Como posso ajudar?',
          queueSelectionMessage: 'Escolha uma opção:\n1 - Suporte\n2 - Vendas\n3 - Financeiro',
          outsideHoursMessage: 'No momento estamos fora do horário de atendimento.',
          closingMessage: 'Obrigado pelo contato!',
          responseDelay: 3
        },
        aiAgentConfig: aiAgentConfig || {
          provider: 'gemini',
          systemPrompt: 'Você é um assistente virtual prestativo e educado.',
          temperature: 0.7,
          maxTokens: 150,
          contextMemory: true
        },
        triggerRules: triggerRules || {
          autoReplyEnabled: true,
          businessHoursOnly: false,
          maxMessagesBeforeTransfer: 5,
          transferToHumanKeywords: ['atendente', 'humano', 'pessoa'],
          enableSmartRouting: false,
          enableSentimentAnalysis: false
        }
      };

      // Criptografar API key se fornecida
      if (chatbotData.aiAgentConfig?.apiKey) {
        chatbotData.aiAgentConfig.apiKey = encryptData(chatbotData.aiAgentConfig.apiKey);
      }

      const config = await storage.createChatbotConfig(chatbotData);

      // Não expor API key na resposta
      if (config.aiAgentConfig?.apiKey) {
        config.aiAgentConfig.hasApiKey = true;
        delete config.aiAgentConfig.apiKey;
      }

      res.status(201).json(config);
    } catch (error) {
      console.error('Error creating chatbot config:', error);
      res.status(500).json({ message: "Failed to create chatbot config" });
    }
  });

  /**
   * PUT /api/chatbot/configs/:id
   * Atualizar chatbot específico
   */
  app.put('/api/chatbot/configs/:id', requireAuth, requireRole(['admin', 'supervisor', 'superadmin']), async (req, res) => {
    try {
      const { id } = req.params;
      const { companyId } = req.user;
      const updates = req.body;

      // Verificar se chatbot existe e pertence à empresa
      const existing = await storage.getChatbotConfigById(id);
      if (!existing) {
        return res.status(404).json({ message: "Chatbot not found" });
      }
      if (existing.companyId !== companyId) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Criptografar API key se fornecida
      if (updates.aiAgentConfig?.apiKey && updates.aiAgentConfig.apiKey !== '***CONFIGURED***') {
        updates.aiAgentConfig.apiKey = encryptData(updates.aiAgentConfig.apiKey);
      } else if (updates.aiAgentConfig?.apiKey === '***CONFIGURED***') {
        delete updates.aiAgentConfig.apiKey;
      }

      const config = await storage.updateChatbotConfigById(id, updates);

      // Não expor API key na resposta
      if (config.aiAgentConfig?.apiKey) {
        config.aiAgentConfig.hasApiKey = true;
        delete config.aiAgentConfig.apiKey;
      }

      res.json(config);
    } catch (error) {
      console.error('Error updating chatbot config:', error);
      res.status(500).json({ message: "Failed to update chatbot config" });
    }
  });

  /**
   * DELETE /api/chatbot/configs/:id
   * Deletar chatbot específico
   */
  app.delete('/api/chatbot/configs/:id', requireAuth, requireRole(['admin', 'supervisor', 'superadmin']), async (req, res) => {
    try {
      const { id } = req.params;
      const { companyId } = req.user;

      // Verificar se chatbot existe e pertence à empresa
      const existing = await storage.getChatbotConfigById(id);
      if (!existing) {
        return res.status(404).json({ message: "Chatbot not found" });
      }
      if (existing.companyId !== companyId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const success = await storage.deleteChatbotConfigById(id);

      if (success) {
        res.json({ message: "Chatbot deleted successfully" });
      } else {
        res.status(404).json({ message: "Chatbot not found" });
      }
    } catch (error) {
      console.error('Error deleting chatbot config:', error);
      res.status(500).json({ message: "Failed to delete chatbot config" });
    }
  });

  // ===== BACKWARD COMPATIBILITY ROUTES =====

  /**
   * GET /api/chatbot/config
   * Buscar primeiro chatbot da empresa (compatibilidade)
   */
  app.get('/api/chatbot/config', requireAuth, requireRole(['admin', 'supervisor', 'superadmin']), async (req, res) => {
    try {
      const { companyId } = req.user;

      let config = await storage.getChatbotConfig(companyId);

      // Se não existe, retornar configuração padrão
      if (!config) {
        config = {
          mode: 'disabled',
          isEnabled: false,
          simpleBotConfig: {
            welcomeMessage: 'Olá! Como posso ajudar?',
            queueSelectionMessage: 'Escolha uma opção:\n1 - Suporte\n2 - Vendas\n3 - Financeiro',
            outsideHoursMessage: 'No momento estamos fora do horário de atendimento.',
            closingMessage: 'Obrigado pelo contato!',
            responseDelay: 3
          },
          aiAgentConfig: {
            provider: 'gemini',
            systemPrompt: 'Você é um assistente virtual prestativo e educado.',
            temperature: 0.7,
            maxTokens: 150,
            contextMemory: true
          },
          triggerRules: {
            autoReplyEnabled: true,
            businessHoursOnly: false,
            maxMessagesBeforeTransfer: 5,
            transferToHumanKeywords: ['atendente', 'humano', 'pessoa'],
            enableSmartRouting: false,
            enableSentimentAnalysis: false
          }
        };
      }

      // Não expor API key na resposta
      if (config.aiAgentConfig?.apiKey) {
        config.aiAgentConfig.hasApiKey = true;
        delete config.aiAgentConfig.apiKey;
      }

      res.json(config);
    } catch (error) {
      console.error('Error fetching chatbot config:', error);
      res.status(500).json({ message: "Failed to fetch chatbot config" });
    }
  });

  /**
   * PUT /api/chatbot/config
   * Atualizar primeiro chatbot da empresa (compatibilidade)
   */
  app.put('/api/chatbot/config', requireAuth, requireRole(['admin', 'supervisor', 'superadmin']), async (req, res) => {
    try {
      const { companyId } = req.user;
      const updates = req.body;

      // Criptografar API key se fornecida
      if (updates.aiAgentConfig?.apiKey && updates.aiAgentConfig.apiKey !== '***CONFIGURED***') {
        updates.aiAgentConfig.apiKey = encryptData(updates.aiAgentConfig.apiKey);
      } else if (updates.aiAgentConfig?.apiKey === '***CONFIGURED***') {
        // Remover se for o placeholder
        delete updates.aiAgentConfig.apiKey;
      }

      const config = await storage.updateChatbotConfig(companyId, updates);

      // Não expor API key na resposta
      if (config.aiAgentConfig?.apiKey) {
        config.aiAgentConfig.hasApiKey = true;
        delete config.aiAgentConfig.apiKey;
      }

      res.json(config);
    } catch (error) {
      console.error('Error updating chatbot config:', error);
      res.status(400).json({ message: "Failed to update chatbot config" });
    }
  });

  /**
   * DELETE /api/chatbot/config
   * Deletar primeiro chatbot da empresa (compatibilidade)
   */
  app.delete('/api/chatbot/config', requireAuth, requireRole(['admin', 'supervisor', 'superadmin']), async (req, res) => {
    try {
      const { companyId } = req.user;

      const success = await storage.deleteChatbotConfig(companyId);

      if (success) {
        res.json({ message: "Chatbot configuration deleted successfully" });
      } else {
        res.status(404).json({ message: "Chatbot configuration not found" });
      }
    } catch (error) {
      console.error('Error deleting chatbot config:', error);
      res.status(500).json({ message: "Failed to delete chatbot config" });
    }
  });

  // LEGACY: Old AI Agent routes (backward compatibility)
  app.get('/api/ai-agent/config', requireAuth, requireRole(['admin', 'supervisor']), async (req, res) => {
    try {
      const { companyId } = req.user;
      const config = await storage.getChatbotConfig(companyId);

      if (!config) {
        return res.json({ mode: 'chatbot', isEnabled: false, welcomeMessage: "", responseDelay: 3, hasApiKey: false });
      }

      // Transformar para formato antigo
      const legacyConfig = {
        mode: config.mode === 'simple_bot' ? 'chatbot' : 'ai_agent',
        isEnabled: config.isEnabled,
        welcomeMessage: config.simpleBotConfig?.welcomeMessage || '',
        responseDelay: config.simpleBotConfig?.responseDelay || 3,
        agentPrompt: config.aiAgentConfig?.systemPrompt || '',
        hasApiKey: !!config.aiAgentConfig?.apiKey
      };

      res.json(legacyConfig);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch AI agent config" });
    }
  });

  app.put('/api/ai-agent/config', requireAuth, requireRole(['admin', 'supervisor']), async (req, res) => {
    try {
      const { companyId } = req.user;
      const legacyData = req.body;

      // Transformar formato antigo para novo
      const updates: any = {
        mode: legacyData.mode === 'chatbot' ? 'simple_bot' : 'ai_agent',
        isEnabled: legacyData.isEnabled
      };

      if (legacyData.mode === 'chatbot') {
        updates.simpleBotConfig = {
          welcomeMessage: legacyData.welcomeMessage,
          responseDelay: legacyData.responseDelay
        };
      } else if (legacyData.mode === 'ai_agent') {
        updates.aiAgentConfig = {
          provider: 'gemini',
          systemPrompt: legacyData.agentPrompt,
          temperature: 0.7,
          maxTokens: 150
        };

        if (legacyData.geminiApiKey) {
          updates.aiAgentConfig.apiKey = encryptData(legacyData.geminiApiKey);
        }
      }

      const config = await storage.updateChatbotConfig(companyId, updates);

      res.json({
        mode: config.mode === 'simple_bot' ? 'chatbot' : 'ai_agent',
        isEnabled: config.isEnabled,
        hasApiKey: !!config.aiAgentConfig?.apiKey
      });
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
    const requestContext = Logger.createRequestContext(req);
    
    try {
      const { status, type, priority, assignedTo } = req.query;
      
      if (!req.user) {
        Logger.error('Feedbacks access failed - no authenticated user', undefined, requestContext);
        return res.status(401).json({ message: "Authentication required" });
      }
      
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
      if (!req.user) {
        Logger.error('Feedback access failed - no authenticated user', undefined, { endpoint: req.originalUrl });
        return res.status(401).json({ message: "Authentication required" });
      }
      
      if (req.user.role === 'agent' && feedback.submittedById !== req.user.id) {
        Logger.warn('Feedback access denied - insufficient permissions', {
          userId: req.user.id,
          feedbackId: id,
          submittedById: feedback.submittedById
        });
        return res.status(403).json({ message: "Access denied" });
      }
      
      res.json(feedback);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch feedback" });
    }
  });

  app.post('/api/feedbacks', requireAuth, async (req, res) => {
    const requestContext = Logger.createRequestContext(req);
    
    try {
      if (!req.user) {
        Logger.error('Feedback creation failed - no authenticated user', undefined, requestContext);
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const feedbackData = insertFeedbackSchema.parse({
        ...req.body,
        submittedById: req.user.id
      });
      const feedback = await storage.createFeedback(feedbackData);
      
      Logger.success('Feedback created successfully', {
        ...requestContext,
        feedbackId: feedback.id,
        type: feedback.type
      });
      
      res.status(201).json(feedback);
    } catch (error) {
      Logger.error('Feedback creation failed', error, requestContext);
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
      if (!req.user) {
        Logger.error('Feedback update failed - no authenticated user', undefined, { endpoint: req.originalUrl });
        return res.status(401).json({ message: "Authentication required" });
      }
      
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
            (obj as any)[key] = (feedbackData as any)[key];
            return obj;
          }, {} as Record<string, any>);
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
      res.json({
        status: 'active',
        billingStatus: 'paid',
        enabledFeatures: { chat: true, chatbot: true, ai_agent: false },
        isLocked: false,
        needsPaymentNotification: false
      });
    } catch (error) {
      console.error('Failed to get instance status:', error);
      res.status(500).json({ message: "Failed to get instance status" });
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

  // Evolution API routes will be implemented here in the future

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
  // Company management routes (admin and superadmin)
  app.get('/api/admin/companies', requireAuth, requireRole(['admin', 'superadmin']), async (req, res) => {
    try {
      const companies = await storage.getAllCompanies();
      res.json(companies);
    } catch (error) {
      console.error('Failed to fetch companies:', error);
      res.status(500).json({ message: "Failed to fetch companies" });
    }
  });

  // POST /api/admin/companies moved to invite routes section below (with invite functionality)

  app.put('/api/admin/companies/:id', requireAuth, requireRole(['superadmin']), async (req, res) => {
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

  app.delete('/api/admin/companies/:id', requireAuth, requireRole(['superadmin']), async (req, res) => {
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

  // ===== COMPANY INVITE ROUTES =====

  /**
   * POST /api/admin/companies
   * Criar empresa e enviar convite por email
   */
  app.post('/api/admin/companies', requireAuth, requireRole(['superadmin']), async (req, res) => {
    const requestContext = Logger.createRequestContext(req);

    try {
      const {
        name,
        contactName,
        contactEmail,
        document,
        phone,
        subscriptionPlan,
        email
      } = req.body;

      // Validar campos obrigatórios
      if (!name || !contactName || !contactEmail || !document || !phone || !subscriptionPlan) {
        Logger.warn('Company creation failed - missing required fields', requestContext);
        return res.status(400).json({
          message: "Todos os campos são obrigatórios: name, contactName, contactEmail, document, phone, subscriptionPlan"
        });
      }

      // Verificar se email já existe
      const companies = await storage.getAllCompanies();
      if (companies.find(c => c.contactEmail === contactEmail)) {
        Logger.warn('Company creation failed - email already exists', {
          ...requestContext,
          email: contactEmail
        });
        return res.status(400).json({
          message: "Já existe uma empresa cadastrada com este email de contato"
        });
      }

      // Criar empresa com status "pending"
      const companyData = {
        name,
        contactName,
        contactEmail,
        document,
        phone,
        subscriptionPlan,
        email: email || contactEmail,
        status: 'pending' as const,
        isActive: false
      };

      const company = await storage.createCompany(companyData);
      Logger.success('Company created successfully', {
        ...requestContext,
        companyId: company.id,
        companyName: company.name
      });

      // Gerar token de convite (UUID v4)
      const inviteToken = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 dias

      // Criar convite no banco
      await storage.createCompanyInvite({
        companyId: company.id,
        email: contactEmail,
        token: inviteToken,
        expiresAt
      });

      Logger.info('Company invite created', {
        ...requestContext,
        companyId: company.id,
        inviteEmail: contactEmail,
        expiresAt: expiresAt.toISOString()
      });

      // Enviar email de convite
      const emailService = new EmailService(Logger);

      try {
        await emailService.sendCompanyInvite({
          to: contactEmail,
          clientName: contactName,
          companyName: name,
          inviteToken,
          expiresInDays: 7
        });

        Logger.success('Invite email sent successfully', {
          ...requestContext,
          companyId: company.id,
          inviteEmail: contactEmail
        });
      } catch (emailError) {
        Logger.error('Failed to send invite email', emailError, {
          ...requestContext,
          companyId: company.id
        });
        // Não falhar a requisição se o email não for enviado
        // A empresa foi criada e o convite está no banco
      }

      res.status(201).json({
        message: "Empresa criada e convite enviado com sucesso",
        company,
        inviteToken: inviteToken // Retornar token para debug/desenvolvimento
      });

    } catch (error) {
      Logger.error('Company creation failed', error, requestContext);
      res.status(500).json({ message: "Falha ao criar empresa" });
    }
  });

  /**
   * GET /api/invite/validate/:token
   * Validar token de convite e retornar dados da empresa
   */
  app.get('/api/invite/validate/:token', async (req, res) => {
    try {
      const { token } = req.params;

      if (!token) {
        return res.status(400).json({ message: "Token é obrigatório" });
      }

      // Buscar convite pelo token
      const invite = await storage.getCompanyInviteByToken(token);

      if (!invite) {
        Logger.warn('Invite validation failed - token not found', { token });
        return res.status(404).json({
          message: "Token de convite inválido ou expirado"
        });
      }

      // Verificar se já foi usado
      if (invite.usedAt) {
        Logger.warn('Invite validation failed - already used', {
          token,
          usedAt: invite.usedAt
        });
        return res.status(400).json({
          message: "Este convite já foi utilizado"
        });
      }

      // Verificar se expirou
      if (new Date(invite.expiresAt) < new Date()) {
        Logger.warn('Invite validation failed - expired', {
          token,
          expiresAt: invite.expiresAt
        });
        return res.status(400).json({
          message: "Este convite expirou. Solicite um novo convite ao administrador."
        });
      }

      // Buscar dados da empresa
      const company = await storage.getCompanyById(invite.companyId);

      if (!company) {
        Logger.error('Invite validation failed - company not found', undefined, {
          token,
          companyId: invite.companyId
        });
        return res.status(404).json({
          message: "Empresa não encontrada"
        });
      }

      Logger.info('Invite validated successfully', {
        token,
        companyId: company.id,
        email: invite.email
      });

      // Retornar dados para preenchimento do formulário
      res.json({
        valid: true,
        company: {
          id: company.id,
          name: company.name,
          contactName: company.contactName,
          contactEmail: company.contactEmail
        },
        email: invite.email
      });

    } catch (error) {
      Logger.error('Invite validation error', error);
      res.status(500).json({ message: "Erro ao validar convite" });
    }
  });

  /**
   * POST /api/invite/complete
   * Completar cadastro: criar primeiro usuário e ativar empresa
   */
  app.post('/api/invite/complete', async (req, res) => {
    try {
      const { token, password, name } = req.body;

      if (!token || !password || !name) {
        return res.status(400).json({
          message: "Token, senha e nome são obrigatórios"
        });
      }

      // Validar senha (mínimo 6 caracteres)
      if (password.length < 6) {
        return res.status(400).json({
          message: "A senha deve ter no mínimo 6 caracteres"
        });
      }

      // Buscar e validar convite
      const invite = await storage.getCompanyInviteByToken(token);

      if (!invite) {
        return res.status(404).json({
          message: "Token de convite inválido"
        });
      }

      if (invite.usedAt) {
        return res.status(400).json({
          message: "Este convite já foi utilizado"
        });
      }

      if (new Date(invite.expiresAt) < new Date()) {
        return res.status(400).json({
          message: "Este convite expirou"
        });
      }

      // Buscar empresa
      const company = await storage.getCompanyById(invite.companyId);

      if (!company) {
        return res.status(404).json({
          message: "Empresa não encontrada"
        });
      }

      // Verificar se já existe usuário com este email
      const existingUser = await storage.getUserByEmail(invite.email);

      if (existingUser) {
        // Se usuário já existe, apenas criar relacionamento com a empresa
        const userCompany = await storage.createUserCompany({
          userId: existingUser.id,
          companyId: company.id,
          role: 'admin',
          isOwner: true
        });

        Logger.info('Existing user linked to company', {
          userId: existingUser.id,
          companyId: company.id,
          email: invite.email
        });
      } else {
        // Criar novo usuário
        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await storage.createUser({
          name,
          username: invite.email.split('@')[0], // Gerar username a partir do email
          email: invite.email,
          password: hashedPassword,
          role: 'admin',
          isOnline: false
        });

        Logger.success('First user created successfully', {
          userId: user.id,
          companyId: company.id,
          email: invite.email
        });

        // Criar relacionamento usuário-empresa
        await storage.createUserCompany({
          userId: user.id,
          companyId: company.id,
          role: 'admin',
          isOwner: true
        });

        Logger.info('User-company relationship created', {
          userId: user.id,
          companyId: company.id
        });
      }

      // Ativar empresa (mudar status de "pending" para "active")
      await storage.updateCompany(company.id, {
        status: 'active',
        isActive: true
      });

      Logger.success('Company activated', {
        companyId: company.id,
        companyName: company.name
      });

      // Marcar convite como usado
      await storage.markInviteAsUsed(token);

      Logger.success('Invite completed successfully', {
        companyId: company.id,
        email: invite.email,
        token
      });

      res.json({
        message: "Cadastro finalizado com sucesso! Você já pode fazer login.",
        company: {
          id: company.id,
          name: company.name
        },
        email: invite.email
      });

    } catch (error) {
      Logger.error('Invite completion failed', error);
      res.status(500).json({ message: "Erro ao finalizar cadastro" });
    }
  });

  /**
   * POST /api/admin/companies/:id/resend-invite
   * Reenviar convite (gera novo token e envia novo email)
   */
  app.post('/api/admin/companies/:id/resend-invite', requireAuth, requireRole(['superadmin']), async (req, res) => {
    const requestContext = Logger.createRequestContext(req);

    try {
      const { id: companyId } = req.params;

      // Buscar empresa
      const company = await storage.getCompanyById(companyId);

      if (!company) {
        Logger.warn('Resend invite failed - company not found', {
          ...requestContext,
          companyId
        });
        return res.status(404).json({
          message: "Empresa não encontrada"
        });
      }

      // Verificar se empresa já está ativa
      if (company.status === 'active') {
        Logger.warn('Resend invite failed - company already active', {
          ...requestContext,
          companyId,
          status: company.status
        });
        return res.status(400).json({
          message: "Esta empresa já está ativa. Não é possível reenviar convite."
        });
      }

      if (!company.contactEmail) {
        Logger.warn('Resend invite failed - no contact email', {
          ...requestContext,
          companyId
        });
        return res.status(400).json({
          message: "Empresa não possui email de contato cadastrado"
        });
      }

      // Deletar convites antigos não utilizados desta empresa
      const oldInvites = await storage.getPendingInvitesByCompany(companyId);
      for (const oldInvite of oldInvites) {
        if (!oldInvite.usedAt) {
          await storage.deleteExpiredInvites(); // Cleanup geral
        }
      }

      // Gerar novo token
      const inviteToken = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 dias

      // Criar novo convite
      await storage.createCompanyInvite({
        companyId: company.id,
        email: company.contactEmail,
        token: inviteToken,
        expiresAt
      });

      Logger.info('New invite created', {
        ...requestContext,
        companyId: company.id,
        inviteEmail: company.contactEmail
      });

      // Enviar email
      const emailService = new EmailService(Logger);

      try {
        await emailService.sendInviteReminder({
          to: company.contactEmail,
          clientName: company.contactName || 'Cliente',
          companyName: company.name,
          inviteToken,
          expiresInDays: 7
        });

        Logger.success('Reminder email sent successfully', {
          ...requestContext,
          companyId: company.id,
          inviteEmail: company.contactEmail
        });
      } catch (emailError) {
        Logger.error('Failed to send reminder email', emailError, {
          ...requestContext,
          companyId: company.id
        });
      }

      res.json({
        message: "Convite reenviado com sucesso",
        inviteToken // Para debug/desenvolvimento
      });

    } catch (error) {
      Logger.error('Resend invite failed', error, requestContext);
      res.status(500).json({ message: "Erro ao reenviar convite" });
    }
  });

  // Company user management
  app.get('/api/admin/companies/:id/users', requireAuth, requireRole(['superadmin']), async (req, res) => {
    try {
      const { id } = req.params;
      const users = await storage.getUsersByCompany(id);
      res.json(users);
    } catch (error) {
      console.error('Failed to fetch company users:', error);
      res.status(500).json({ message: "Failed to fetch company users" });
    }
  });

  app.post('/api/admin/companies/:id/users', requireAuth, requireRole(['superadmin']), async (req, res) => {
    try {
      const { id: companyId } = req.params;

      // Gerar username a partir do email se não fornecido
      if (!req.body.username && req.body.email) {
        req.body.username = req.body.email.split('@')[0];
      }

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

  // Company Logo Upload
  app.post('/api/company/logo', requireAuth, async (req: any, res) => {
    try {
      // Expect base64 or URL in body for simplicity in this environment
      // Prefer: { logoUrl: string } or { base64: string }
      const { logoUrl, base64 } = req.body || {};
      if (!req.user?.company?.id) {
        return res.status(400).json({ message: 'Company context not found' });
      }

      let finalUrl = logoUrl as string | undefined;
      if (!finalUrl && base64) {
        // Persist base64 to a file in public storage (fallback simple approach)
        const fs = await import('fs');
        const path = await import('path');
        const { nanoid } = await import('nanoid');
        const buffer = Buffer.from(base64.replace(/^data:image\/[a-zA-Z]+;base64,/, ''), 'base64');
        const filename = `company-logo-${nanoid()}.png`;
        const publicDir = path.resolve(import.meta.dirname, 'public', 'uploads');
        if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });
        const filepath = path.join(publicDir, filename);
        fs.writeFileSync(filepath, buffer);
        finalUrl = `/uploads/${filename}`;
      }

      if (!finalUrl) {
        return res.status(400).json({ message: 'No logo provided' });
      }

      const updated = await storage.setCompanyLogoUrl(req.user.company.id, finalUrl);
      res.json({ logoUrl: updated.logoUrl });
    } catch (error) {
      res.status(500).json({ message: 'Failed to upload logo' });
    }
  });

  // ===== PLANS MANAGEMENT ROUTES (SUPERADMIN ONLY) =====
  app.get('/api/admin/plans', requireAuth, requireRole(['superadmin']), async (req, res) => {
    try {
      const plans = await storage.getAllPlans();
      res.json(plans);
    } catch (error) {
      console.error('Failed to fetch plans:', error);
      res.status(500).json({ message: "Failed to fetch plans" });
    }
  });

  app.post('/api/admin/plans', requireAuth, requireRole(['superadmin']), async (req, res) => {
    try {
      const planData = insertPlanSchema.parse(req.body);
      const plan = await storage.createPlan(planData);
      res.json(plan);
    } catch (error) {
      console.error('Failed to create plan:', error);
      res.status(500).json({ message: "Failed to create plan" });
    }
  });

  app.put('/api/admin/plans/:id', requireAuth, requireRole(['superadmin']), async (req, res) => {
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

  app.delete('/api/admin/plans/:id', requireAuth, requireRole(['superadmin']), async (req, res) => {
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

  // Announcements endpoints
  app.get('/api/admin/announcements', requireAuth, requireRole(['superadmin']), async (req, res) => {
    try {
      const announcements = await storage.getAnnouncements();
      res.json(announcements);
    } catch (error) {
      console.error('Failed to fetch announcements:', error);
      res.status(500).json({ message: "Failed to fetch announcements" });
    }
  });

  app.post('/api/admin/announcements', requireAuth, requireRole(['superadmin']), async (req, res) => {
    try {
      const announcementData = {
        ...req.body,
        authorId: req.user.id
      };
      
      const announcement = await storage.createAnnouncement(announcementData);
      res.json(announcement);
    } catch (error) {
      console.error('Failed to create announcement:', error);
      res.status(500).json({ message: "Failed to create announcement" });
    }
  });

  app.put('/api/admin/announcements/:id', requireAuth, requireRole(['superadmin']), async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const announcement = await storage.updateAnnouncement(id, updates);
      res.json(announcement);
    } catch (error) {
      console.error('Failed to update announcement:', error);
      res.status(500).json({ message: "Failed to update announcement" });
    }
  });

  app.delete('/api/admin/announcements/:id', requireAuth, requireRole(['superadmin']), async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteAnnouncement(id);
      
      if (success) {
        res.json({ message: "Announcement deleted successfully" });
      } else {
        res.status(404).json({ message: "Announcement not found" });
      }
    } catch (error) {
      console.error('Failed to delete announcement:', error);
      res.status(500).json({ message: "Failed to delete announcement" });
    }
  });

  // Public endpoint for active announcements
  app.get('/api/announcements', async (req, res) => {
    try {
      const announcements = await storage.getActiveAnnouncements();
      res.json(announcements);
    } catch (error) {
      console.error('Failed to fetch active announcements:', error);
      res.status(500).json({ message: "Failed to fetch announcements" });
    }
  });

  // Setup Evolution API routes (io já está configurado no index.ts)
  // setupEvolutionRoutes(app); // Removido - migrado para Whapi.Cloud

  // Setup WhatsApp routes (Whapi.Cloud)
  const io = app.get('io');
  setupWhatsAppRoutes(app, io);

  // Setup Dashboard routes
  setupDashboardRoutes(app);

  // Setup Admin routes
  setupAdminRoutes(app);

  // Setup Tickets routes
  app.use('/api/tickets', ticketsRoutes);

  return app;
}