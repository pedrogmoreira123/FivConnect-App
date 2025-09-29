import { Express } from "express";
import { evolutionService } from "./evolution-service";
import { requireAuth, requireRole } from "./auth";
import { storage } from "./storage";

export function setupEvolutionRoutes(app: Express): void {
  console.log('🔧 Evolution Routes Configuration:');
  console.log('Evolution API integration enabled');

  // Listar conexões por empresa
  app.get('/api/whatsapp/connections/:companyId', requireAuth, requireRole(['admin', 'supervisor']), async (req, res) => {
    try {
      const { companyId } = req.params;
      
      // Verificar se o usuário tem acesso à empresa
      if (req.user.role !== 'superadmin' && req.user.companyId !== companyId) {
        return res.status(403).json({ message: 'Access denied to this company' });
      }

      const connections = await storage.getWhatsAppConnectionsByCompany(companyId);
      res.json(connections);
    } catch (error) {
      console.error('Failed to get WhatsApp connections:', error);
      res.status(500).json({ message: 'Failed to get WhatsApp connections' });
    }
  });

  // Criar nova conexão
  app.post('/api/whatsapp/connections/:companyId', requireAuth, requireRole(['admin', 'supervisor']), async (req, res) => {
    try {
      const { companyId } = req.params;
      const { connectionName } = req.body;
      
      if (!connectionName) {
        return res.status(400).json({ message: 'Connection name is required' });
      }

      // Verificar se o usuário tem acesso à empresa
      if (req.user.role !== 'superadmin' && req.user.companyId !== companyId) {
        return res.status(403).json({ message: 'Access denied to this company' });
      }

      // Criar identificador único: companyId + connectionName
      const instanceName = `${companyId}_${connectionName}`;
      
      // Criar instância na Evolution API
      const evolutionResponse = await evolutionService.createInstance(instanceName, companyId);
      
      // Salvar no banco de dados
      const connection = await storage.createWhatsAppConnection({
        companyId,
        connectionName,
        instanceName,
        status: 'connecting',
        qrcode: evolutionResponse.instance?.qrcode || null,
        number: evolutionResponse.instance?.number || null,
        profilePictureUrl: evolutionResponse.instance?.profilePictureUrl || null
      });

      res.status(201).json(connection);
    } catch (error) {
      console.error('Failed to create WhatsApp connection:', error);
      res.status(500).json({ message: 'Failed to create WhatsApp connection' });
    }
  });

  // Conectar instância
  app.post('/api/whatsapp/connections/:companyId/:connectionId/connect', requireAuth, requireRole(['admin', 'supervisor']), async (req, res) => {
    try {
      const { companyId, connectionId } = req.params;
      
      // Verificar se o usuário tem acesso à empresa
      if (req.user.role !== 'superadmin' && req.user.companyId !== companyId) {
        return res.status(403).json({ message: 'Access denied to this company' });
      }

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
  app.delete('/api/whatsapp/connections/:companyId/:connectionId', requireAuth, requireRole(['admin', 'supervisor']), async (req, res) => {
    try {
      const { companyId, connectionId } = req.params;
      
      // Verificar se o usuário tem acesso à empresa
      if (req.user.role !== 'superadmin' && req.user.companyId !== companyId) {
        return res.status(403).json({ message: 'Access denied to this company' });
      }

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
  app.get('/api/whatsapp/connections/:companyId/:connectionId/qrcode', requireAuth, requireRole(['admin', 'supervisor']), async (req, res) => {
    try {
      const { companyId, connectionId } = req.params;
      
      // Verificar se o usuário tem acesso à empresa
      if (req.user.role !== 'superadmin' && req.user.companyId !== companyId) {
        return res.status(403).json({ message: 'Access denied to this company' });
      }

      const connection = await storage.getWhatsAppConnection(connectionId);
      if (!connection || connection.companyId !== companyId) {
        return res.status(404).json({ message: 'Connection not found' });
      }

      // Obter estado da conexão da Evolution API
      const evolutionResponse = await evolutionService.getConnectionState(connection.instanceName);
      
      res.json({
        qrcode: evolutionResponse.instance?.qrcode || connection.qrcode,
        status: evolutionResponse.instance?.status || connection.status,
        number: evolutionResponse.instance?.number || connection.number
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
