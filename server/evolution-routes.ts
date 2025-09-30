import { Express } from "express";
import { evolutionService } from "./evolution-service";
import { requireAuth, requireRole } from "./auth";
import { storage } from "./storage";

export function setupEvolutionRoutes(app: Express): void {
  console.log('🔧 Evolution Routes Configuration:');
  console.log('Evolution API integration enabled');

  // Listar conexões por empresa
  app.get('/api/whatsapp/connections/:companyId', requireAuth, requireRole(['superadmin', 'admin', 'supervisor', 'agent']), async (req, res) => {
    try {
      const { companyId } = req.params;
      
      // Verificar se o usuário tem acesso à empresa
      const userCompanyId = req.user.company?.id || req.user.companyId;
      console.log('🔍 [BACKEND] Verificação de companyId:', {
        userRole: req.user.role,
        userCompanyId,
        requestedCompanyId: companyId,
        isSuperadmin: req.user.role === 'superadmin'
      });
      
      if (req.user.role !== 'superadmin' && userCompanyId !== companyId) {
        console.log('❌ [BACKEND] Acesso negado - companyId não confere');
        return res.status(403).json({ message: 'Access denied to this company' });
      }
      
      console.log('✅ [BACKEND] Acesso permitido para companyId:', companyId);

      const connections = await storage.getWhatsAppConnectionsByCompany(companyId);
      res.json(connections);
    } catch (error) {
      console.error('Failed to get WhatsApp connections:', error);
      res.status(500).json({ message: 'Failed to get WhatsApp connections' });
    }
  });

  // Criar nova conexão
  app.post('/api/whatsapp/connections/:companyId', requireAuth, requireRole(['superadmin', 'admin', 'supervisor', 'agent']), async (req, res) => {
    try {
      const { companyId } = req.params;
      const { connectionName } = req.body;
      
      console.log('🔍 [BACKEND] createConnection - Dados recebidos:', { companyId, connectionName });
      console.log('🔍 [BACKEND] createConnection - Usuário autenticado:', {
        userId: req.user.id,
        role: req.user.role,
        userCompanyId: req.user.company?.id
      });
      
      if (!connectionName) {
        console.log('❌ [BACKEND] createConnection - Nome da conexão não fornecido');
        return res.status(400).json({ message: 'Connection name is required' });
      }

      // Verificar se o usuário tem acesso à empresa
      const userCompanyId = req.user.company?.id || req.user.companyId;
      console.log('🔍 [BACKEND] Verificação de companyId:', {
        userRole: req.user.role,
        userCompanyId,
        requestedCompanyId: companyId,
        isSuperadmin: req.user.role === 'superadmin'
      });
      
      if (req.user.role !== 'superadmin' && userCompanyId !== companyId) {
        console.log('❌ [BACKEND] Acesso negado - companyId não confere');
        return res.status(403).json({ message: 'Access denied to this company' });
      }
      
      console.log('✅ [BACKEND] Acesso permitido para companyId:', companyId);
      console.log('🔍 [BACKEND] Dados para criação:', { companyId, connectionName });

      // Criar instância na Evolution API (o instanceName é gerado internamente com timestamp)
      const evolutionResponse = await evolutionService.createInstance(connectionName, companyId);
      
      // O instanceName é retornado pela Evolution API - vamos usar o mesmo que foi criado
      const instanceName = evolutionResponse.instanceName || `${companyId}_${connectionName}_${Date.now()}`;
      
      // Obter QR Code imediatamente após criação
      const qrCodeBase64 = await evolutionService.getQRCode(instanceName);
      
      // Salvar no banco de dados
      const connection = await storage.createWhatsAppConnection({
        companyId,
        connectionName,
        instanceName,
        status: 'qr_ready',
        qrcode: qrCodeBase64 || null,
        number: null,
        profilePictureUrl: null
      });

      res.status(201).json(connection);
    } catch (error) {
      console.error('Failed to create WhatsApp connection:', error);
      res.status(500).json({ message: 'Failed to create WhatsApp connection' });
    }
  });

  // Conectar instância
  app.post('/api/whatsapp/connections/:companyId/:connectionId/connect', requireAuth, requireRole(['superadmin', 'admin', 'supervisor']), async (req, res) => {
    try {
      const { companyId, connectionId } = req.params;
      
      // Verificar se o usuário tem acesso à empresa
      const userCompanyId = req.user.company?.id || req.user.companyId;
      console.log('🔍 [BACKEND] Verificação de companyId:', {
        userRole: req.user.role,
        userCompanyId,
        requestedCompanyId: companyId,
        isSuperadmin: req.user.role === 'superadmin'
      });
      
      if (req.user.role !== 'superadmin' && userCompanyId !== companyId) {
        console.log('❌ [BACKEND] Acesso negado - companyId não confere');
        return res.status(403).json({ message: 'Access denied to this company' });
      }
      
      console.log('✅ [BACKEND] Acesso permitido para companyId:', companyId);

      const connection = await storage.getWhatsAppConnection(connectionId);
      if (!connection || connection.companyId !== companyId) {
        return res.status(404).json({ message: 'Connection not found' });
      }

      // Conectar na Evolution API
      const evolutionResponse = await evolutionService.connectInstance(connection.instanceName);
      
      // Atualizar status no banco
      const updatedConnection = await storage.updateWhatsAppConnection(connectionId, {
        status: 'connecting',
        qrcode: evolutionResponse.instance?.qrcode || null,
        updatedAt: new Date().toISOString()
      });

      res.json(updatedConnection);
    } catch (error) {
      console.error('Failed to connect WhatsApp:', error);
      res.status(500).json({ message: 'Failed to connect WhatsApp' });
    }
  });

  // Desconectar instância
  app.delete('/api/whatsapp/connections/:companyId/:connectionId', requireAuth, requireRole(['superadmin', 'admin', 'supervisor']), async (req, res) => {
    try {
      const { companyId, connectionId } = req.params;
      
      // Verificar se o usuário tem acesso à empresa
      const userCompanyId = req.user.company?.id || req.user.companyId;
      console.log('🔍 [BACKEND] Verificação de companyId:', {
        userRole: req.user.role,
        userCompanyId,
        requestedCompanyId: companyId,
        isSuperadmin: req.user.role === 'superadmin'
      });
      
      if (req.user.role !== 'superadmin' && userCompanyId !== companyId) {
        console.log('❌ [BACKEND] Acesso negado - companyId não confere');
        return res.status(403).json({ message: 'Access denied to this company' });
      }
      
      console.log('✅ [BACKEND] Acesso permitido para companyId:', companyId);

      const connection = await storage.getWhatsAppConnection(connectionId);
      if (!connection || connection.companyId !== companyId) {
        return res.status(404).json({ message: 'Connection not found' });
      }

      // Desconectar na Evolution API
      await evolutionService.deleteInstance(connection.instanceName);
      
      // Deletar do banco
      const success = await storage.deleteWhatsAppConnection(connectionId);
      
      if (success) {
        res.json({ message: 'WhatsApp connection deleted successfully' });
      } else {
        res.status(404).json({ message: 'Connection not found' });
      }
    } catch (error) {
      console.error('Failed to delete WhatsApp connection:', error);
      res.status(500).json({ message: 'Failed to delete WhatsApp connection' });
    }
  });

  // Obter QR Code
  app.get('/api/whatsapp/connections/:companyId/:connectionId/qrcode', requireAuth, requireRole(['superadmin', 'admin', 'supervisor']), async (req, res) => {
    try {
      const { companyId, connectionId } = req.params;
      
      // Verificar se o usuário tem acesso à empresa
      const userCompanyId = req.user.company?.id || req.user.companyId;
      console.log('🔍 [BACKEND] Verificação de companyId:', {
        userRole: req.user.role,
        userCompanyId,
        requestedCompanyId: companyId,
        isSuperadmin: req.user.role === 'superadmin'
      });
      
      if (req.user.role !== 'superadmin' && userCompanyId !== companyId) {
        console.log('❌ [BACKEND] Acesso negado - companyId não confere');
        return res.status(403).json({ message: 'Access denied to this company' });
      }
      
      console.log('✅ [BACKEND] Acesso permitido para companyId:', companyId);

      const connection = await storage.getWhatsAppConnection(connectionId);
      if (!connection || connection.companyId !== companyId) {
        return res.status(404).json({ message: 'Connection not found' });
      }

      // Obter QR Code da Evolution API
      const qrCodeBase64 = await evolutionService.getQRCode(connection.instanceName);
      
      // Atualizar status no banco se necessário
      if (qrCodeBase64) {
        await storage.updateWhatsAppConnection(connectionId, {
          qrcode: qrCodeBase64,
          updatedAt: new Date().toISOString()
        });
      }
      
      console.log('🔍 [BACKEND] QR Code response:', {
        qrCodeBase64: qrCodeBase64 ? `${qrCodeBase64.substring(0, 50)}...` : null,
        connectionQrcode: connection.qrcode ? `${connection.qrcode.substring(0, 50)}...` : null,
        status: connection.status
      });
      
      res.json({
        qrcode: qrCodeBase64 || connection.qrcode,
        status: connection.status,
        number: connection.number
      });
    } catch (error) {
      console.error('Failed to get QR code:', error);
      res.status(500).json({ message: 'Failed to get QR code' });
    }
  });

  // Enviar mensagem
  app.post('/api/whatsapp/send-message', requireAuth, async (req, res) => {
    try {
      const { connectionId, to, message } = req.body;
      
      if (!connectionId || !to || !message) {
        return res.status(400).json({ message: 'Connection ID, phone number, and message are required' });
      }

      const connection = await storage.getWhatsAppConnection(connectionId);
      if (!connection) {
        return res.status(404).json({ message: 'Connection not found' });
      }

      // Verificar se o usuário tem acesso à conexão
      if (req.user.role !== 'superadmin' && req.user.companyId !== connection.companyId) {
        return res.status(403).json({ message: 'Access denied to this connection' });
      }

      // Enviar mensagem via Evolution API
      const result = await evolutionService.sendMessage(connection.instanceName, to, message);
      
      res.json({ 
        message: 'Message sent successfully',
        result 
      });
    } catch (error) {
      console.error('Failed to send WhatsApp message:', error);
      res.status(500).json({ message: 'Failed to send WhatsApp message' });
    }
  });

  // Webhook para receber mensagens da Evolution API
  app.post('/api/whatsapp/webhook', async (req, res) => {
    try {
      const webhookData = req.body;
      console.log('📨 Webhook received:', JSON.stringify(webhookData, null, 2));

      // Extrair dados da mensagem
      const { instance, data } = webhookData;
      
      if (!instance || !data) {
        return res.status(400).json({ message: 'Invalid webhook data' });
      }

      // Identificar a empresa pelo nome da instância
      const instanceName = instance;
      const companyId = instanceName.split('_')[0];
      
      if (!companyId) {
        console.error('❌ Could not extract companyId from instance name:', instanceName);
        return res.status(400).json({ message: 'Invalid instance name format' });
      }

      // Processar diferentes tipos de eventos
      if (data.event === 'MESSAGES_UPSERT') {
        const message = data.data;
        
        if (message.message) {
          // Extrair dados da mensagem
          const messageData = {
            companyId,
            instanceName,
            from: message.key?.remoteJid,
            messageId: message.key?.id,
            messageType: message.messageType,
            content: message.message.conversation || 
                    message.message.imageMessage?.caption ||
                    message.message.audioMessage ? '[Áudio]' : '[Mídia]',
            timestamp: message.messageTimestamp,
            isFromMe: message.key?.fromMe || false
          };

          console.log('💬 New message received:', messageData);

          // Salvar mensagem no banco de dados
          // TODO: Implementar salvamento no banco
          
          // Emitir evento WebSocket para o frontend
          // TODO: Implementar WebSocket
        }
      } else if (data.event === 'qrcode.updated') {
        console.log('🔄 QR Code updated for instance:', instanceName);
        
        // Atualizar QR code no banco de dados
        const connection = await storage.getWhatsAppConnectionByInstanceName(instanceName);
        if (connection && data.qrcode?.base64) {
          await storage.updateWhatsAppConnection(connection.id, {
            qrcode: data.qrcode.base64,
            status: 'qr_ready',
            updatedAt: new Date().toISOString()
          });
          console.log('✅ QR Code atualizado no banco de dados para instância:', instanceName);
        } else {
          console.log('❌ Conexão não encontrada ou QR Code inválido para instância:', instanceName);
        }
      }

      res.status(200).json({ message: 'Webhook processed successfully' });
    } catch (error) {
      console.error('❌ Webhook processing error:', error);
      res.status(500).json({ message: 'Webhook processing failed' });
    }
  });

  // ENDPOINT DO WEBHOOK - ROTA PÚBLICA PARA A EVOLUTION API
  app.post('/api/whatsapp/webhook', async (req, res) => {
    const event = req.body;
    console.log(`[WEBHOOK] Evento recebido: ${event.event} para a instância ${event.instance}`);

    const io = req.app.get('io');
    const instanceName = event.instance;

    if (event.event === 'connection.update' && instanceName) {
      const newState = event.data.state.toUpperCase(); // Ex: 'CONNECTED', 'CLOSE'
      const [companyId] = instanceName.split('_');

      try {
        await storage.updateWhatsAppConnectionByInstanceName(instanceName, {
          status: newState,
          updatedAt: new Date().toISOString()
        });

        console.log(`[WEBHOOK] Status da instância ${instanceName} atualizado para ${newState}`);

        // Notifica o frontend via WebSocket
        io.emit('connectionUpdate', { instanceName, status: newState, companyId });

      } catch (error) {
        console.error(`[WEBHOOK] Erro ao atualizar status para ${instanceName}:`, error);
      }
    }

    res.sendStatus(200);
  });

  // Health check da Evolution API
  app.get('/api/whatsapp/health', requireAuth, async (req, res) => {
    try {
      const health = await evolutionService.healthCheck();
      res.json(health);
    } catch (error) {
      console.error('Evolution API health check failed:', error);
      res.status(500).json({ message: 'Evolution API unavailable' });
    }
  });

}
