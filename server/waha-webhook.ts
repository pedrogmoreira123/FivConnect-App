import type { Express } from "express";
import { storage } from "./storage";

export function setupWahaWebhook(app: Express): void {
  console.log('🔧 WAHA Webhook Configuration:');
  console.log('Webhook URL: /api/webhooks/whatsapp');

  // POST /api/webhooks/whatsapp - Webhook para receber mensagens do WAHA
  app.post('/api/webhooks/whatsapp', async (req, res) => {
    try {
      const payload = req.body;
      console.log('📨 WAHA Webhook received:', JSON.stringify(payload, null, 2));

      // Verificar se é uma mensagem válida do WAHA
      if (!payload || !payload.event) {
        console.log('⚠️ Invalid WAHA webhook payload');
        return res.status(400).json({ 
          success: false,
          message: "Invalid webhook payload" 
        });
      }

      // Processar diferentes tipos de eventos do WAHA
      switch (payload.event) {
        case 'message':
          await handleWahaMessage(payload);
          break;
        
        case 'status':
          await handleWahaStatus(payload);
          break;
        
        case 'session.status':
          await handleWahaSessionStatus(payload);
          break;
        
        default:
          console.log(`📋 Unhandled WAHA event: ${payload.event}`);
      }

      res.json({ 
        success: true,
        message: "Webhook processed successfully" 
      });

    } catch (error: any) {
      console.error('❌ Error processing WAHA webhook:', error);
      res.status(500).json({ 
        success: false,
        message: "Failed to process webhook", 
        error: error.message 
      });
    }
  });

  /**
   * Processar mensagem recebida do WAHA
   */
  async function handleWahaMessage(payload: any): Promise<void> {
    try {
      const { session, message } = payload;
      
      if (!message || !message.from || !message.text) {
        console.log('⚠️ Invalid message payload from WAHA');
        return;
      }

      const phoneNumber = message.from.replace('@c.us', '');
      const sessionId = session;
      
      console.log(`📱 Processing message from ${phoneNumber} via session ${sessionId}`);

      // Buscar ou criar conversa
      let conversation = await storage.getConversationByPhone(phoneNumber, sessionId);
      
      if (!conversation) {
        // Criar nova conversa
        conversation = await storage.createConversation({
          phoneNumber,
          tenantId: sessionId,
          status: 'active',
          lastMessageAt: new Date(),
          metadata: {
            wahaSessionId: sessionId,
            source: 'whatsapp'
          }
        });
      }

      // Criar mensagem
      const messageData = {
        conversationId: conversation.id,
        content: message.text,
        type: 'text',
        direction: 'inbound',
        status: 'received',
        metadata: {
          wahaMessageId: message.id,
          wahaSessionId: sessionId,
          from: message.from,
          timestamp: message.timestamp
        }
      };

      await storage.createMessage(messageData);

      // Atualizar última atividade da conversa
      await storage.updateConversation(conversation.id, {
        lastMessageAt: new Date(),
        status: 'active'
      });

      console.log(`✅ Message processed successfully for conversation ${conversation.id}`);

    } catch (error: any) {
      console.error('❌ Error handling WAHA message:', error);
    }
  }

  /**
   * Processar atualização de status do WAHA
   */
  async function handleWahaStatus(payload: any): Promise<void> {
    try {
      const { session, status } = payload;
      
      console.log(`📊 WAHA status update for session ${session}: ${status}`);

      // Atualizar status da sessão no Redis
      await storage.updateWahaSessionStatus(session, status);

      // Se a sessão foi conectada, limpar QR Code
      if (status === 'CONNECTED') {
        await storage.updateWahaSessionStatus(session, 'CONNECTED', null);
        console.log(`✅ Session ${session} connected successfully`);
      }

    } catch (error: any) {
      console.error('❌ Error handling WAHA status:', error);
    }
  }

  /**
   * Processar atualização de status da sessão
   */
  async function handleWahaSessionStatus(payload: any): Promise<void> {
    try {
      const { session, status, qrCode } = payload;
      
      console.log(`🔄 WAHA session status update for ${session}: ${status}`);

      // Atualizar informações da sessão
      await storage.updateWahaSessionStatus(session, status, qrCode);

      if (status === 'SCAN_QR' && qrCode) {
        console.log(`📱 QR Code generated for session ${session}`);
      }

    } catch (error: any) {
      console.error('❌ Error handling WAHA session status:', error);
    }
  }
}
