import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

export function setupWhatsAppRoutes(app: Express): Server {
  const CONNECTION_SERVICE_URL = process.env.CONNECTION_SERVICE_URL || 'http://localhost:3001';
  const CONNECTION_SERVICE_API_KEY = process.env.CONNECTION_SERVICE_API_KEY || '';

  // Helper function to make requests to the connection service
  const makeConnectionServiceRequest = async (endpoint: string, method: string = 'GET', data?: any) => {
    const url = `${CONNECTION_SERVICE_URL}${endpoint}`;
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': CONNECTION_SERVICE_API_KEY,
      },
    };

    if (data && method !== 'GET') {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(url, options);
    
    if (!response.ok) {
      throw new Error(`Connection service error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  };

  // POST /api/whatsapp/connect - Start WhatsApp session
  app.post('/api/whatsapp/connect', async (req, res) => {
    try {
      const { tenantId, name } = req.body;
      
      if (!tenantId) {
        return res.status(400).json({ message: "tenantId is required" });
      }

      const result = await makeConnectionServiceRequest('/sessions/start', 'POST', {
        tenantId,
        name: name || `WhatsApp Connection ${tenantId}`
      });

      res.json(result);
    } catch (error: any) {
      console.error('Failed to connect WhatsApp:', error);
      res.status(500).json({ message: "Failed to connect WhatsApp", error: error.message });
    }
  });

  // GET /api/whatsapp/status/:tenantId - Get WhatsApp connection status
  app.get('/api/whatsapp/status/:tenantId', async (req, res) => {
    try {
      const { tenantId } = req.params;
      
      const result = await makeConnectionServiceRequest(`/sessions/${tenantId}/status`);
      
      res.json(result);
    } catch (error: any) {
      console.error('Failed to get WhatsApp status:', error);
      res.status(500).json({ message: "Failed to get WhatsApp status", error: error.message });
    }
  });

  // DELETE /api/whatsapp/disconnect/:tenantId - Disconnect WhatsApp session
  app.delete('/api/whatsapp/disconnect/:tenantId', async (req, res) => {
    try {
      const { tenantId } = req.params;
      
      const result = await makeConnectionServiceRequest(`/sessions/${tenantId}`, 'DELETE');
      
      res.json(result);
    } catch (error: any) {
      console.error('Failed to disconnect WhatsApp:', error);
      res.status(500).json({ message: "Failed to disconnect WhatsApp", error: error.message });
    }
  });

  // POST /api/conversations/:conversationId/send-message - Send message via WhatsApp
  app.post('/api/conversations/:conversationId/send-message', async (req, res) => {
    try {
      const { conversationId } = req.params;
      const { text, to } = req.body;

      if (!text || !to) {
        return res.status(400).json({ message: "text and to are required" });
      }

      // Get conversation details
      const conversation = await storage.getConversation(conversationId);
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }

      // Get tenant ID from conversation's WhatsApp connection
      const tenantId = conversation.whatsappConnectionId;
      if (!tenantId) {
        return res.status(400).json({ message: "No WhatsApp connection found for this conversation" });
      }

      // Send message via connection service
      const result = await makeConnectionServiceRequest('/message/send', 'POST', {
        tenantId,
        to,
        text
      });

      // Save sent message to database
      const message = await storage.createMessage({
        conversationId,
        content: text,
        direction: 'outgoing',
        status: 'sent',
        timestamp: new Date()
      });

      res.json({
        success: true,
        message: message,
        serviceResponse: result
      });
    } catch (error: any) {
      console.error('Failed to send message:', error);
      res.status(500).json({ message: "Failed to send message", error: error.message });
    }
  });

  // POST /api/webhooks/whatsapp - Webhook to receive messages from WhatsApp
  app.post('/api/webhooks/whatsapp', async (req, res) => {
    try {
      const { tenantId, from, message, timestamp, messageId } = req.body;

      console.log('Received WhatsApp webhook:', { tenantId, from, message, timestamp, messageId });

      // Find or create conversation
      let conversation = await storage.getConversationByPhone(from);
      
      if (!conversation) {
        // Create new conversation
        conversation = await storage.createConversation({
          contactName: from, // You might want to extract name from message
          contactPhone: from,
          whatsappConnectionId: tenantId,
          status: 'waiting',
          priority: 'medium'
        });
      }

      // Save incoming message
      const savedMessage = await storage.createMessage({
        conversationId: conversation.id,
        content: message,
        direction: 'incoming',
        status: 'received',
        timestamp: new Date(timestamp),
        externalId: messageId
      });

      // Update conversation last message
      await storage.updateConversation(conversation.id, {
        lastMessage: message,
        lastMessageAt: new Date(timestamp)
      });

      // TODO: Emit WebSocket event for real-time updates
      // This would be implemented with Socket.IO or similar
      // emitToClients('new_message', { conversationId: conversation.id, message: savedMessage });

      res.json({ success: true, message: 'Message processed successfully' });
    } catch (error: any) {
      console.error('Failed to process WhatsApp webhook:', error);
      res.status(500).json({ message: "Failed to process webhook", error: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
