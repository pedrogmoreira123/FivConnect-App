import { Express, Router } from "express";
import axios from "axios";
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { WhapiService } from "./whapi-service";
import { requireAuth, requireRole } from "./auth";
import { storage } from "./storage";
import { Logger } from "./logger";
import { and, eq, desc, isNull, sql } from 'drizzle-orm';
import { conversations, clients, messages, users, whatsappConnections, chatSessions } from '../shared/schema';
import { db } from './db';
import { Pool } from 'pg';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Pool de conexão direto para SQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Configuração do multer para upload de arquivos
const storage_multer = multer.diskStorage({
    destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../public/uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage_multer });

export function setupWhatsAppRoutes(app: Express, io?: any): void {
  console.log('🔧 WhatsApp Routes Configuration:');
  console.log('Whapi.Cloud API integration enabled');
  
  const router = Router();
  const whapiService = new WhapiService(Logger as any);

  // Função para notificar atualizações de status
  const notifyStatusUpdate = (companyId: string, connectionId: string, status: string, connectionData?: any) => {
    if (io) {
      console.log(`📢 Notificando atualização de status WhatsApp: Company ${companyId}, Connection ${connectionId}, Status: ${status}`);
      io.to(`company_${companyId}`).emit('whatsappStatusUpdate', {
        connectionId,
        status,
        connectionData,
        timestamp: new Date().toISOString()
      });
    }
  };

  // Função para configurar webhook na Whapi.Cloud
  const configureWebhook = async (instanceName: string) => {
    try {
      const webhookUrl = `${process.env.MAIN_APP_URL}/api/whatsapp/webhook`;
      console.log(`[WhatsApp Routes] Configurando webhook: ${webhookUrl}`);
      await whapiService.configureChannelWebhook(instanceName, webhookUrl);
    } catch (error) {
      console.error('[WhatsApp Routes] Erro ao configurar webhook:', error);
    }
  };

  // ==================== FUNÇÕES AUXILIARES ====================


  // ==================== ROTAS PRINCIPAIS ====================

  // Rota para obter conexões WhatsApp da empresa
  router.get('/connections', requireAuth, async (req, res) => {
    const { companyId } = req.user!;
    
    try {
      console.log(`[WhatsApp Routes] Buscando conexões para empresa: ${companyId}`);
      const connections = await storage.getWhatsAppConnectionsByCompany(companyId);
      
      // Enriquecer com status atual da Whapi.Cloud (com timeout individual)
      const enrichedConnections = await Promise.allSettled(
        connections.map(async (connection) => {
          if (connection.whapiToken) {
            try {
              // Timeout individual de 3 segundos por conexão
              const currentStatus = await Promise.race([
                whapiService.getConnectionStatus(connection.whapiToken),
                new Promise((_, reject) => 
                  setTimeout(() => reject(new Error('Timeout individual')), 3000)
                )
              ]) as any;
              
              // Se o status mudou, atualizar no banco e notificar
              if (currentStatus.status !== connection.status) {
                await storage.updateWhatsAppConnection(connection.id, {
                  status: currentStatus.status,
                  phone: currentStatus.phone,
                  name: currentStatus.name,
                  profilePictureUrl: currentStatus.profilePictureUrl,
                  lastSeen: currentStatus.lastSeen ? new Date(currentStatus.lastSeen) : undefined
                });

                // Notificar mudança de status via WebSocket
                notifyStatusUpdate(connection.companyId, connection.id, currentStatus.status, {
                  phone: currentStatus.phone,
                  name: currentStatus.name,
                  profilePictureUrl: currentStatus.profilePictureUrl,
                  lastSeen: currentStatus.lastSeen
                });
              }
              
              return {
                ...connection,
                currentStatus
              };
    } catch (error) {
              console.error(`[WhatsApp Routes] Erro ao obter status da conexão ${connection.id}:`, error);
              return {
                ...connection,
                currentStatus: { connected: false, status: 'disconnected' }
              };
            }
          }
          return {
            ...connection,
            currentStatus: { connected: false, status: 'disconnected' }
          };
        })
      );

      // Processar resultados do Promise.allSettled
      const processedConnections = enrichedConnections.map((result, index) => {
        if (result.status === 'fulfilled') {
          return result.value;
      } else {
          console.error(`[WhatsApp Routes] Falha ao processar conexão ${index}:`, result.reason);
          return {
            ...connections[index],
            currentStatus: { connected: false, status: 'disconnected' }
          };
        }
      });
      
      res.json(processedConnections);
    } catch (error: any) {
      console.error('[WhatsApp Routes] Erro ao buscar conexões:', error);
      res.status(500).json({ message: 'Erro interno ao buscar conexões WhatsApp' });
    }
  });

  // Rota para criar nova conexão WhatsApp
  router.post('/connections', requireAuth, async (req, res) => {
    const { companyId } = req.user!;
      const { connectionName } = req.body;
      
    try {
      console.log(`[WhatsApp Routes] Criando nova conexão para empresa ${companyId}`);

      // 1. Verificar limite de canais da empresa
      const company = await storage.getCompany(companyId);
      if (!company) {
        return res.status(404).json({ message: 'Empresa não encontrada' });
      }

      const existingConnections = await storage.getWhatsAppConnectionsByCompany(companyId);
      console.log(`[WhatsApp Routes] Empresa ${companyId} possui ${existingConnections.length}/${company.whatsappChannelLimit} canais`);

      if (existingConnections.length >= company.whatsappChannelLimit) {
        return res.status(403).json({ 
          message: 'Você atingiu o limite de canais permitidos.',
          currentUsage: existingConnections.length,
          limit: company.whatsappChannelLimit
        });
      }

      // 2. PROVISIONAMENTO COMPLETO: Criar → Ativar → Configurar
      console.log(`[WhatsApp Routes] 🚀 INICIANDO PROVISIONAMENTO COMPLETO via Partner API...`);
      const channelResult = await whapiService.provisionAndActivateChannel(companyId, connectionName, company.name);
      
      if (!channelResult.channelId || !channelResult.clientToken) {
        throw new Error('Falha ao criar canal na Whapi.Cloud');
      }

      console.log(`[WhatsApp Routes] Canal criado: ${channelResult.channelId}`);

      // 3. Configurar webhook
      const webhookUrl = `${process.env.MAIN_APP_URL}/api/whatsapp/webhook`;
      console.log(`[WhatsApp Routes] Configurando webhook: ${webhookUrl}`);
      await whapiService.configureChannelWebhook(channelResult.clientToken, webhookUrl);

      // 4. Salvar no banco de dados
      console.log(`[WhatsApp Routes] Salvando conexão no banco de dados...`);
      const savedConnection = await storage.createWhatsAppConnection({
        companyId,
        connectionName,
        instanceName: channelResult.channelId, // Usar channelId como instanceName
        name: connectionName,
        whapiChannelId: channelResult.channelId,
        whapiToken: channelResult.clientToken, // Salvar o token do cliente
        providerType: 'whapi',
        webhookUrl: webhookUrl,
        status: 'disconnected', // Inicialmente desconectado
      });

      // 5. Não tentar obter QR Code na criação - será obtido quando solicitado
      console.log(`[WhatsApp Routes] Conexão criada, QR Code será obtido quando solicitado...`);

      console.log(`[WhatsApp Routes] Conexão criada com sucesso: ${savedConnection.id}`);

      res.status(201).json({
        success: true,
        message: '🎉 Canal WhatsApp criado em modo sandbox com sucesso!',
        connection: {
          id: savedConnection.id,
          name: savedConnection.name,
          status: 'disconnected',
          qrCode: null,
          channelId: channelResult.channelId,
          createdAt: savedConnection.createdAt
        }
      });

    } catch (error: any) {
      console.error('[WhatsApp Routes] Erro ao criar conexão:', error);
      res.status(500).json({ 
        message: 'Erro interno ao criar conexão WhatsApp.', 
        error: error.message 
      });
    }
  });

  // Rota para obter QR Code de uma conexão
  router.get('/connections/:connectionId/qrcode', requireAuth, async (req, res) => {
    const { connectionId } = req.params;
    const { companyId } = req.user!;

    try {
      console.log(`[WhatsApp Routes] Buscando QR Code para conexão: ${connectionId}`);

      const connection = await storage.getWhatsAppConnection(connectionId);
      if (!connection || connection.companyId !== companyId) {
        return res.status(404).json({ message: 'Conexão não encontrada' });
      }

      if (!connection.whapiToken) {
        return res.status(400).json({ message: 'Token do canal não encontrado' });
      }

      try {
        const qrCode = await whapiService.getQRCode(connection.whapiToken);
      
        if (qrCode) {
      res.json({ 
            success: true,
            qrCode: qrCode,
            status: 'qr_ready'
          });
        } else {
          res.json({
            success: false,
            message: 'QR Code não disponível no momento',
            status: 'disconnected'
          });
        }
      } catch (qrError: any) {
        // Se o canal já está autenticado, verificar status da conexão
        if (qrError.message && qrError.message.includes('channel already authenticated')) {
          console.log(`[WhatsApp Routes] Canal já autenticado, verificando status...`);
          
          // Verificar status da conexão
          const status = await whapiService.getConnectionStatus(connection.whapiToken);
          
          if (status.connected) {
            // Atualizar status para conectado
            await storage.updateWhatsAppConnection(connectionId, {
              status: 'connected',
              phone: status.phone,
              name: status.name,
              profilePictureUrl: status.profilePictureUrl,
              lastSeen: status.lastSeen ? new Date(status.lastSeen) : undefined
            });

            // Notificar conexão via WebSocket
            notifyStatusUpdate(connection.companyId, connectionId, 'connected', {
              phone: status.phone,
              name: status.name,
              profilePictureUrl: status.profilePictureUrl,
              lastSeen: status.lastSeen
            });
      
      res.json({ 
              success: true,
              message: 'WhatsApp já está conectado',
              status: 'connected',
              phone: status.phone,
              name: status.name
            });
      } else {
            res.json({
              success: false,
              message: 'Canal já autenticado mas não conectado',
              status: 'disconnected'
            });
          }
      } else {
          throw qrError;
        }
      }

    } catch (error: any) {
      console.error('[WhatsApp Routes] Erro ao obter QR Code:', error);
      res.status(500).json({ 
        message: 'Erro interno ao obter QR Code',
        error: error.message 
      });
    }
  });

  // Rota para deletar uma conexão WhatsApp
  router.delete('/connections/:connectionId', requireAuth, async (req, res) => {
    const { connectionId } = req.params;
    const { companyId } = req.user!;

    try {
      console.log(`[WhatsApp Routes] Deletando conexão: ${connectionId}`);

      const connection = await storage.getWhatsAppConnection(connectionId);
      if (!connection || connection.companyId !== companyId) {
        return res.status(404).json({ message: 'Conexão não encontrada' });
      }

      // Se tem whapiChannelId, tentar deletar o canal na Whapi.Cloud
      if (connection.whapiChannelId) {
        try {
          console.log(`[WhatsApp Routes] Deletando canal na Whapi.Cloud: ${connection.whapiChannelId}`);
          // TODO: Implementar deleção de canal via Partner API
          // await whapiService.deleteChannel(connection.whapiChannelId);
        } catch (error: any) {
          console.error('[WhatsApp Routes] Erro ao deletar canal na Whapi.Cloud:', error);
          // Continuar com a deleção local mesmo se falhar na Whapi.Cloud
        }
      }

      // Deletar do banco de dados
      await storage.deleteWhatsAppConnection(connectionId);
      
      res.json({
        success: true,
        message: 'Conexão WhatsApp deletada com sucesso'
      });
      
    } catch (error: any) {
      console.error('[WhatsApp Routes] Erro ao deletar conexão:', error);
      res.status(500).json({ 
        message: 'Erro interno ao deletar conexão WhatsApp',
        error: error.message 
      });
    }
  });

  // Rota para verificar limites de canais
  router.get('/connections/limits', requireAuth, async (req, res) => {
    const { companyId } = req.user!;

    try {
      const company = await storage.getCompany(companyId);
      if (!company) {
        return res.status(404).json({ message: 'Empresa não encontrada' });
      }

      const existingConnections = await storage.getWhatsAppConnectionsByCompany(companyId);
      
      res.json({
        success: true,
        limits: {
          limit: company.whatsappChannelLimit,
          currentUsage: existingConnections.length,
          remaining: company.whatsappChannelLimit - existingConnections.length,
          canCreateMore: existingConnections.length < company.whatsappChannelLimit
        }
      });

    } catch (error: any) {
      console.error('[WhatsApp Routes] Erro ao verificar limites:', error);
      res.status(500).json({ 
        message: 'Erro interno ao verificar limites',
        error: error.message 
      });
    }
  });


  // ==================== ROTAS LEGADAS (EVOLUTION API) ====================

  // Rota para obter status da conexão (Evolution API)
  router.get('/connection/status', requireAuth, async (req, res) => {
    const { companyId } = req.user!;
    
    try {
      console.log(`[WhatsApp Routes] Verificando status da conexão para empresa: ${companyId}`);
      
      const connections = await storage.getWhatsAppConnectionsByCompany(companyId);
      if (connections.length === 0) {
        return res.json({
          connected: false,
          status: 'no_connection',
          message: 'Nenhuma conexão WhatsApp encontrada'
        });
      }

      // Usar a primeira conexão (pode ser expandido para múltiplas conexões)
      const connection = connections[0];
      
      if (connection.whapiToken) {
        try {
          const status = await whapiService.getConnectionStatus(connection.whapiToken);
          res.json(status);
        } catch (error: any) {
          console.error('[WhatsApp Routes] Erro ao obter status via Whapi.Cloud:', error);
      res.json({ 
            connected: false,
            status: 'error',
            message: 'Erro ao verificar status da conexão'
        });
        }
      } else {
      res.json({
          connected: false,
          status: 'no_token',
          message: 'Token do canal não encontrado'
        });
      }
    } catch (error: any) {
      console.error('[WhatsApp Routes] Erro ao verificar status:', error);
      res.status(500).json({ 
        message: 'Erro interno ao verificar status da conexão',
        error: error.message 
      });
    }
  });

  // ===== ROTAS DE GERENCIAMENTO DE CANAIS E SALDO =====





  // Endpoint de teste para configurar webhook (sem autenticação)
  router.post('/test/webhook/configure', async (req, res) => {
    try {
      console.log('[WhatsApp Routes] Configurando webhook automaticamente (teste)...');
      
      // Buscar conexão ativa
      const activeConnection = await storage.getActiveWhapiConnection('59b4b086-9171-4dbf-8177-b7c6d6fd1e33');
      
      if (!activeConnection || !activeConnection.whapiToken) {
        return res.status(400).json({
          success: false,
          message: 'Nenhuma conexão WhatsApp ativa encontrada'
        });
      }

      const webhookUrl = 'https://app.fivconnect.net/api/whatsapp/webhook';
      
      console.log('[WhatsApp Routes] Tentando configurar webhook com token:', activeConnection.whapiToken.substring(0, 20) + '...');
      
      // Tentar diferentes formatos de webhook
      const webhookFormats = [
        // Formato 1: Simples
        {
          webhook: webhookUrl
        },
        // Formato 2: Com eventos
        {
          webhooks: [{
            url: webhookUrl,
            events: ['messages']
          }]
        },
        // Formato 3: Com eventos como objeto
        {
          webhooks: [{
            url: webhookUrl,
            events: [{ type: 'messages' }]
          }]
        }
      ];
      
      let lastError = null;
      
      for (let i = 0; i < webhookFormats.length; i++) {
        try {
          console.log(`[WhatsApp Routes] Tentando formato ${i + 1}:`, webhookFormats[i]);
          
          const response = await axios.patch(`https://gate.whapi.cloud/settings`, webhookFormats[i], {
            headers: {
              'Authorization': `Bearer ${activeConnection.whapiToken}`,
              'Content-Type': 'application/json',
            },
            timeout: 10000
          });
          
          console.log('[WhatsApp Routes] Webhook configurado com sucesso:', response.data);
          
          return res.json({
            success: true,
            message: 'Webhook configurado com sucesso',
            webhookUrl: webhookUrl,
            format: i + 1,
            response: response.data
          });
          
        } catch (error: any) {
          console.log(`[WhatsApp Routes] Formato ${i + 1} falhou:`, error.response?.data || error.message);
          lastError = error;
        }
      }
      
      // Se todos os formatos falharam
      throw lastError;
      
    } catch (error: any) {
      console.error('[WhatsApp Routes] Erro ao configurar webhook:', error.response?.data || error.message);
      res.status(500).json({
        success: false,
        message: 'Erro ao configurar webhook',
        error: error.response?.data || error.message
      });
    }
  });

  // Endpoint para verificar configuração atual do webhook
  router.get('/debug/webhook-config', requireAuth, requireRole(['superadmin']), async (req, res) => {
    try {
      console.log('[WhatsApp Routes] Verificando configuração atual do webhook...');
      
      // Buscar conexão ativa
      const activeConnection = await storage.getActiveWhapiConnection('59b4b086-9171-4dbf-8177-b7c6d6fd1e33');
      
      if (!activeConnection || !activeConnection.whapiToken) {
        return res.status(400).json({
          success: false,
          message: 'Nenhuma conexão WhatsApp ativa encontrada'
        });
      }

      console.log('[WhatsApp Routes] Token encontrado:', activeConnection.whapiToken.substring(0, 20) + '...');
      
      // Verificar configuração atual
      const response = await axios.get(`https://gate.whapi.cloud/settings`, {
        headers: {
          'Authorization': `Bearer ${activeConnection.whapiToken}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000
      });
      
      console.log('[WhatsApp Routes] Configuração atual:', response.data);
      
      res.json({ 
        success: true,
        message: 'Configuração atual obtida',
        currentConfig: response.data,
        tokenUsed: activeConnection.whapiToken.substring(0, 20) + '...'
      });
      
    } catch (error: any) {
      console.error('[WhatsApp Routes] Erro ao verificar configuração:', error.response?.data || error.message);
      res.status(500).json({
        success: false,
        message: 'Erro ao verificar configuração',
        error: error.response?.data || error.message
      });
    }
  });

  // Endpoint para configurar webhook automaticamente
  router.post('/webhook/configure', requireAuth, requireRole(['superadmin']), async (req, res) => {
    try {
      console.log('[WhatsApp Routes] Configurando webhook automaticamente...');
      
      // Buscar conexão ativa
      const activeConnection = await storage.getActiveWhapiConnection('59b4b086-9171-4dbf-8177-b7c6d6fd1e33');
      
      if (!activeConnection || !activeConnection.whapiToken) {
        return res.status(400).json({
          success: false,
          message: 'Nenhuma conexão WhatsApp ativa encontrada'
        });
      }

      const webhookUrl = 'https://app.fivconnect.net/api/whatsapp/webhook';
      
      // Testar diferentes formatos de webhook baseado na documentação oficial
      const webhookFormats = [
        // Formato 1: Simples - apenas webhook URL (funcionou via curl)
        {
          webhook: webhookUrl
        },
        // Formato 2: Com webhooks array simples
        {
          webhooks: [{
            url: webhookUrl
          }]
        },
        // Formato 3: Com webhooks array e eventos
        {
          webhooks: [{
            url: webhookUrl,
            events: ["messages", "statuses"]
          }]
        },
        // Formato 4: Com callback_persist e webhooks
        {
          callback_persist: true,
          webhooks: [{
            url: webhookUrl,
            events: ["messages"]
          }]
        }
      ];
      
      let lastError = null;
      let successfulFormat = null;
      
      for (let i = 0; i < webhookFormats.length; i++) {
        try {
          console.log(`[WhatsApp Routes] Tentando formato ${i + 1}:`, webhookFormats[i]);
          
          const response = await axios.patch(`https://gate.whapi.cloud/settings`, webhookFormats[i], {
            headers: {
              'Authorization': `Bearer ${activeConnection.whapiToken}`,
              'Content-Type': 'application/json',
            },
            timeout: 10000
          });
          
          console.log(`[WhatsApp Routes] Formato ${i + 1} funcionou:`, response.data);
          successfulFormat = i + 1;
          break;
          
        } catch (error: any) {
          console.log(`[WhatsApp Routes] Formato ${i + 1} falhou:`, error.response?.data || error.message);
          lastError = error;
        }
      }
      
      if (successfulFormat) {
        res.json({
          success: true,
          message: `Webhook configurado com sucesso usando formato ${successfulFormat}`,
          webhookUrl: webhookUrl,
          formatUsed: successfulFormat,
          tokenUsed: activeConnection.whapiToken.substring(0, 20) + '...'
        });
      } else {
        throw lastError;
      }
      
    } catch (error: any) {
      console.error('[WhatsApp Routes] Erro ao configurar webhook:', error.response?.data || error.message);
      res.status(500).json({
        success: false,
        message: 'Erro ao configurar webhook',
        error: error.response?.data || error.message
      });
    }
  });

  // Rota para processar mensagens perdidas
  router.post('/messages/process-missed', requireAuth, requireRole(['superadmin']), async (req, res) => {
    try {
      console.log('[WhatsApp Routes] Processando mensagens perdidas...');
      
      const { messageId } = req.body;
      
      if (!messageId) {
        return res.status(400).json({ 
          success: false,
          message: 'ID da mensagem é obrigatório'
        });
      }
      
      // Buscar conexão ativa para obter o token
      const activeConnection = await storage.getActiveWhapiConnection('59b4b086-9171-4dbf-8177-b7c6d6fd1e33');
      
      if (!activeConnection || !activeConnection.whapiToken) {
        return res.status(400).json({
          success: false,
          message: 'Nenhuma conexão WhatsApp ativa encontrada'
        });
      }

      // Buscar mensagem no Whapi.Cloud
      const response = await axios.get(`https://gate.whapi.cloud/messages/list`, {
        headers: {
          'Authorization': `Bearer ${activeConnection.whapiToken}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000
      });
      
      if (response.data?.messages) {
        const message = response.data.messages.find((m: any) => m.id === messageId);
        
        if (message) {
          // Processar mensagem perdida
          await whapiService.processMissedMessage(message, storage);
          
          res.json({
            success: true,
            message: 'Mensagem processada com sucesso',
            messageId: messageId
          });
        } else {
          res.status(404).json({
            success: false,
            message: 'Mensagem não encontrada'
          });
        }
      } else {
        res.status(500).json({
          success: false,
          message: 'Erro ao buscar mensagens'
        });
      }
    } catch (error: any) {
      console.error('[WhatsApp Routes] Erro ao processar mensagem perdida:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao processar mensagem perdida',
        error: error.message
      });
    }
  });

// Endpoint para processar mensagens por chat ID
router.post('/messages/process-chat/:chatId', requireAuth, requireRole(['superadmin']), async (req, res) => {
  try {
    const { chatId } = req.params;
    console.log(`[WhatsApp Routes] Processando mensagens do chat: ${chatId}`);
    
    // Buscar conexão ativa para obter o token
    const activeConnection = await storage.getActiveWhapiConnection('59b4b086-9171-4dbf-8177-b7c6d6fd1e33');
    
    if (!activeConnection || !activeConnection.whapiToken) {
      return res.status(400).json({
        success: false,
        message: 'Nenhuma conexão WhatsApp ativa encontrada'
      });
    }

    // Processar mensagens do chat
    await whapiService.processMessagesByChatId(chatId, activeConnection.whapiToken, storage);
    
    res.json({
      success: true,
      message: `Mensagens do chat ${chatId} processadas com sucesso`,
      chatId: chatId
    });
  } catch (error: any) {
    console.error('[WhatsApp Routes] Erro ao processar mensagens do chat:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao processar mensagens do chat',
      error: error.message
    });
  }
});

// Endpoint de teste para processar mensagens por chat ID (sem autenticação)
router.post('/test/process-chat/:chatId', async (req, res) => {
  try {
    const { chatId } = req.params;
    console.log(`[WhatsApp Routes] TESTE - Processando mensagens do chat: ${chatId}`);
    
    // Buscar conexão ativa para obter o token
    const activeConnection = await storage.getActiveWhapiConnection('59b4b086-9171-4dbf-8177-b7c6d6fd1e33');
    
    if (!activeConnection || !activeConnection.whapiToken) {
      return res.status(400).json({
        success: false,
        message: 'Nenhuma conexão WhatsApp ativa encontrada'
      });
    }

    // Processar mensagens do chat
    await whapiService.processMessagesByChatId(chatId, activeConnection.whapiToken, storage);
    
    res.json({
      success: true,
      message: `Mensagens do chat ${chatId} processadas com sucesso`,
      chatId: chatId
    });
  } catch (error: any) {
    console.error('[WhatsApp Routes] Erro ao processar mensagens do chat:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao processar mensagens do chat',
      error: error.message
    });
  }
});

  // Rota para processar todas as mensagens não processadas
  router.post('/messages/process-all-missed', requireAuth, requireRole(['superadmin']), async (req, res) => {
    try {
      console.log('[WhatsApp Routes] Processando todas as mensagens não processadas...');
      
      // Buscar conexão ativa
      const activeConnection = await storage.getActiveWhapiConnection('59b4b086-9171-4dbf-8177-b7c6d6fd1e33');
      
      if (!activeConnection || !activeConnection.whapiToken) {
        return res.status(400).json({ 
          success: false,
          message: 'Nenhuma conexão WhatsApp ativa encontrada'
        });
      }

      // Buscar todas as mensagens do Whapi.Cloud
      const response = await axios.get(`https://gate.whapi.cloud/messages/list`, {
        headers: {
          'Authorization': `Bearer ${activeConnection.whapiToken}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000
      });
      
      if (!response.data?.messages) {
        return res.status(500).json({
          success: false,
          message: 'Erro ao buscar mensagens do Whapi.Cloud'
        });
      }

      const allMessages = response.data.messages;
      console.log(`[WhatsApp Routes] Encontradas ${allMessages.length} mensagens no Whapi.Cloud`);
      
      let processedCount = 0;
      let skippedCount = 0;
      
      // Processar apenas mensagens recebidas (from_me: false)
      const incomingMessages = allMessages.filter((msg: any) => !msg.from_me);
      console.log(`[WhatsApp Routes] Processando ${incomingMessages.length} mensagens recebidas...`);
      
      for (const message of incomingMessages) {
        try {
          // Verificar se a mensagem já foi processada
          const existingMessage = await storage.getMessageByExternalId(message.id);
          
          if (existingMessage) {
            skippedCount++;
          continue;
          }
          
          // Processar mensagem
          await whapiService.processMissedMessage(message, storage);
          processedCount++;
          
          console.log(`[WhatsApp Routes] Processada mensagem: ${message.id} de ${message.from_name || message.from}`);
          
        } catch (error: any) {
          console.error(`[WhatsApp Routes] Erro ao processar mensagem ${message.id}:`, error.message);
        }
      }
      
      res.json({
        success: true,
        message: 'Processamento de mensagens concluído',
        totalMessages: allMessages.length,
        incomingMessages: incomingMessages.length,
        processed: processedCount,
        skipped: skippedCount
      });
      
    } catch (error: any) {
      console.error('[WhatsApp Routes] Erro ao processar mensagens perdidas:', error);
      res.status(500).json({ 
        success: false,
        message: 'Erro ao processar mensagens perdidas',
        error: error.message 
      });
    }
  });

  // Rota temporária para limpar mensagens (apenas para testes)
  router.delete('/messages/clear', requireAuth, requireRole(['superadmin']), async (req, res) => {
    try {
      console.log('[WhatsApp Routes] Limpando todas as mensagens...');
      
      const result = await db.delete(messages);
      
      res.json({
        success: true,
        message: `Mensagens apagadas com sucesso`,
        deletedCount: result.rowCount || 0
      });
    } catch (error: any) {
      console.error('[WhatsApp Routes] Erro ao limpar mensagens:', error);
      res.status(500).json({ 
        success: false,
        message: 'Erro ao limpar mensagens',
        error: error.message 
      });
    }
  });

  // Endpoint para verificar conversas (sem auth para debug)
  router.get('/debug/conversations', async (req, res) => {
    try {
      console.log('[DEBUG] Verificando conversas...');
      
      // Buscar conversas da empresa
      const conversations = await storage.getAllConversations();
      
      // Filtrar conversas com telefone específico se fornecido
      const phone = req.query.phone as string;
      let filteredConversations = conversations;
      
      if (phone) {
        filteredConversations = conversations.filter(conv => 
          conv.contactPhone?.includes(phone.replace(/\D/g, ''))
        );
      }
      
      res.json({
        success: true,
        totalConversations: conversations.length,
        filteredConversations: filteredConversations.length,
        conversations: filteredConversations.map(conv => ({
          id: conv.id,
          contactName: conv.contactName,
          contactPhone: conv.contactPhone,
          status: conv.status,
          lastMessage: conv.lastMessage,
          createdAt: conv.createdAt,
          updatedAt: conv.updatedAt
        }))
      });
      
    } catch (error: any) {
      console.error('[DEBUG] Erro ao verificar conversas:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao verificar conversas',
        error: error.message
      });
    }
  });

  // Endpoint para processar mensagens perdidas (sem auth para debug)
  router.post('/debug/process-messages', async (req, res) => {
    try {
      console.log('[DEBUG] Processando mensagens perdidas...');
      
      // Buscar conexão ativa
      const activeConnection = await storage.getActiveWhapiConnection('59b4b086-9171-4dbf-8177-b7c6d6fd1e33');
      
      if (!activeConnection || !activeConnection.whapiToken) {
        return res.status(400).json({ 
          success: false,
          message: 'Nenhuma conexão WhatsApp ativa encontrada'
        });
      }

      // Buscar todas as mensagens do Whapi.Cloud
      const response = await axios.get(`https://gate.whapi.cloud/messages/list`, {
        headers: {
          'Authorization': `Bearer ${activeConnection.whapiToken}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000
      });
      
      if (!response.data?.messages) {
        return res.status(500).json({
          success: false,
          message: 'Erro ao buscar mensagens do Whapi.Cloud'
        });
      }

      const allMessages = response.data.messages;
      console.log(`[DEBUG] Encontradas ${allMessages.length} mensagens no Whapi.Cloud`);
      
      let processedCount = 0;
      let skippedCount = 0;
      
      // Processar apenas mensagens recebidas (from_me: false)
      const incomingMessages = allMessages.filter((msg: any) => !msg.from_me);
      console.log(`[DEBUG] Processando ${incomingMessages.length} mensagens recebidas...`);
      
      for (const message of incomingMessages) {
        try {
          // Verificar se a mensagem já foi processada
          const existingMessage = await storage.getMessageByExternalId(message.id);
          
          if (existingMessage) {
            skippedCount++;
          continue;
          }
          
          // Processar mensagem
          await whapiService.processMissedMessage(message, storage);
          processedCount++;
          
          console.log(`[DEBUG] Processada mensagem: ${message.id} de ${message.from_name || message.from}`);
          
        } catch (error: any) {
          console.error(`[DEBUG] Erro ao processar mensagem ${message.id}:`, error.message);
        }
      }
      
      res.json({
        success: true,
        message: 'Processamento de mensagens concluído',
        totalMessages: allMessages.length,
        incomingMessages: incomingMessages.length,
        processed: processedCount,
        skipped: skippedCount
      });
      
    } catch (error: any) {
      console.error('[DEBUG] Erro ao processar mensagens perdidas:', error);
      res.status(500).json({ 
        success: false,
        message: 'Erro ao processar mensagens perdidas',
        error: error.message 
      });
    }
  });

  // Endpoint para testar webhook
  router.post('/webhook/test', requireAuth, requireRole(['superadmin']), async (req, res) => {
    try {
      console.log('[WhatsApp Routes] Testando webhook...');
      
      // Buscar conexão ativa
      const activeConnection = await storage.getActiveWhapiConnection('59b4b086-9171-4dbf-8177-b7c6d6fd1e33');
      
      if (!activeConnection || !activeConnection.whapiToken) {
        return res.status(400).json({
          success: false,
          message: 'Nenhuma conexão WhatsApp ativa encontrada'
        });
      }

      const webhookUrl = 'https://app.fivconnect.net/api/whatsapp/webhook';
      
      // Testar webhook conforme documentação oficial
      const response = await axios.post(`https://gate.whapi.cloud/settings/test`, {
        webhook_url: webhookUrl
      }, {
        headers: {
          'Authorization': `Bearer ${activeConnection.whapiToken}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000
      });
      
      console.log('[WhatsApp Routes] Teste de webhook:', response.data);
      
      res.json({
        success: true,
        message: 'Teste de webhook executado',
        webhookUrl: webhookUrl,
        testResult: response.data,
        tokenUsed: activeConnection.whapiToken.substring(0, 20) + '...'
      });
      
    } catch (error: any) {
      console.error('[WhatsApp Routes] Erro ao testar webhook:', error.response?.data || error.message);
      res.status(500).json({
        success: false,
        message: 'Erro ao testar webhook',
        error: error.response?.data || error.message
      });
    }
  });

  // Rota para webhook (receber mensagens)
  router.post('/webhook', async (req, res) => {
    try {
      // Responder IMEDIATAMENTE para evitar timeout da Whapi.cloud
      res.status(200).json({ success: true, message: 'Webhook processado com sucesso' });
      
      // Processar de forma assíncrona (não bloqueia resposta)
      setImmediate(async () => {
    try {
      console.log('='.repeat(80));
      console.log('[WEBHOOK RECEIVED] Timestamp:', new Date().toISOString());
          console.log('[WEBHOOK] IP Origem:', req.ip);
          console.log('[WEBHOOK] X-Real-IP:', req.headers['x-real-ip']);
          console.log('[WEBHOOK] X-Forwarded-For:', req.headers['x-forwarded-for']);
          console.log('[WEBHOOK] User-Agent:', req.headers['user-agent']);
          console.log('[WEBHOOK] Content-Type:', req.headers['content-type']);
      console.log('[WEBHOOK RECEIVED] Body:', JSON.stringify(req.body, null, 2));
      console.log('[WEBHOOK HEADERS]', JSON.stringify(req.headers, null, 2));
      console.log('[WEBHOOK] io disponível:', io ? 'SIM' : 'NÃO');
          console.log('[WEBHOOK] Raw Body Size:', JSON.stringify(req.body).length, 'bytes');
          console.log('[WEBHOOK] Event Type:', req.body?.event || 'unknown');
          console.log('[WEBHOOK] Data Keys:', req.body?.data ? Object.keys(req.body.data) : 'no data');
          console.log('[WEBHOOK] Payload completo:', JSON.stringify(req.body, null, 2));
      console.log('='.repeat(80));
      
      // Validar assinatura HMAC se disponível
      const signature = req.headers['x-whapi-signature'] || req.headers['x-signature'];
      if (signature) {
        console.log('[WEBHOOK] Assinatura recebida:', signature);
        // TODO: Implementar validação HMAC se necessário
      }
      
      // Processar diferentes tipos de webhook da Whapi.Cloud
      const webhookData = req.body;
      
      // Processar eventos conforme documentação oficial Whapi.Cloud
      await processWebhookEvent(webhookData, io);
    } catch (error: any) {
          console.error('[WEBHOOK] Erro no processamento assíncrono:', error);
        }
      });
    } catch (error: any) {
      console.error('[WEBHOOK] Erro crítico no webhook:', error);
      // Já enviou resposta, não pode enviar outra
    }
  });

  // Função para processar diferentes tipos de eventos webhook
  const processWebhookEvent = async (webhookData: any, ioParam?: any) => {
    const ioToUse = ioParam || io;
    
    console.log('[WEBHOOK] Iniciando processamento de evento:', {
      event: webhookData.event,
      type: webhookData.type,
      hasData: !!webhookData.data,
      hasMessage: !!webhookData.data?.message,
      hasMessages: !!webhookData.data?.messages,
      ioAvailable: !!ioToUse,
      fullPayloadKeys: Object.keys(webhookData)
    });
    
    // Tentar extrair mensagem de diferentes estruturas de payload
    const messageData = 
      webhookData?.data?.message ||  // Formato 1: {event, data: {message}}
      webhookData?.message ||         // Formato 2: {message}
      webhookData?.messages?.[0] ||   // Formato 3: {messages: [...]}
      null;
    
    console.log('[WEBHOOK] Mensagem extraída:', messageData ? 'SIM' : 'NÃO');
    if (messageData) {
      console.log('[WEBHOOK] Estrutura da mensagem:', JSON.stringify(messageData, null, 2));
    }
    
    // Eventos de Mensagens
    if (webhookData.event === 'messages.new' && webhookData.data?.message) {
      console.log('[WEBHOOK] Processando evento: messages.new');
      console.log('[WEBHOOK] Dados da mensagem:', JSON.stringify(webhookData.data.message, null, 2));
      await processIncomingMessageDirect(webhookData.data.message, ioToUse);
    }
    else if (webhookData.event === 'messages.upsert' && webhookData.data?.messages) {
      console.log('[WEBHOOK] Processando evento: messages.upsert');
      for (const message of webhookData.data.messages) {
        await processIncomingMessageDirect(message, ioToUse);
      }
    }
    else if (webhookData.event === 'messages.edit' && webhookData.data?.message) {
      console.log('[WEBHOOK] Processando evento: messages.edit');
      await processMessageEdit(webhookData.data.message, ioToUse);
    }
    else if (webhookData.event === 'messages.delete' && webhookData.data?.message) {
      console.log('[WEBHOOK] Processando evento: messages.delete');
      await processMessageDelete(webhookData.data.message, ioToUse);
    }
    
    // Eventos de Status
    else if (webhookData.event === 'messages.status' && webhookData.data?.status) {
      console.log('[WEBHOOK] Processando evento: messages.status');
      await processMessageStatus(webhookData.data.status, ioToUse);
    }
    
    // Eventos de Chat
    else if (webhookData.event === 'chats.new' && webhookData.data?.chat) {
      console.log('[WEBHOOK] Processando evento: chats.new');
      await processChatNew(webhookData.data.chat, ioToUse);
    }
    else if (webhookData.event === 'chats.update' && webhookData.data?.chat) {
      console.log('[WEBHOOK] Processando evento: chats.update');
      await processChatUpdate(webhookData.data.chat, ioToUse);
    }
    else if (webhookData.event === 'chats.remove' && webhookData.data?.chat) {
      console.log('[WEBHOOK] Processando evento: chats.remove');
      await processChatRemove(webhookData.data.chat, ioToUse);
    }
    
    // Eventos de Contatos
    else if (webhookData.event === 'contacts.update' && webhookData.data?.contact) {
      console.log('[WEBHOOK] Processando evento: contacts.update');
      await processContactUpdate(webhookData.data.contact, ioToUse);
    }
    
    // Eventos de Grupos
    else if (webhookData.event === 'groups.new' && webhookData.data?.group) {
      console.log('[WEBHOOK] Processando evento: groups.new');
      await processGroupNew(webhookData.data.group, ioToUse);
    }
    else if (webhookData.event === 'groups.update' && webhookData.data?.group) {
      console.log('[WEBHOOK] Processando evento: groups.update');
      await processGroupUpdate(webhookData.data.group, ioToUse);
    }
    
    // Eventos de Canal
    else if (webhookData.event === 'channel.status' && webhookData.data?.status) {
      console.log('[WEBHOOK] Processando evento: channel.status');
      await processChannelStatus(webhookData.data.status, ioToUse);
    }
    else if (webhookData.event === 'channel.qr' && webhookData.data?.qr) {
      console.log('[WEBHOOK] Processando evento: channel.qr');
      await processChannelQR(webhookData.data.qr, ioToUse);
    }
    
    // Eventos de Usuários
    else if (webhookData.event === 'users.connect' && webhookData.data?.user) {
      console.log('[WEBHOOK] Processando evento: users.connect');
      await processUserConnect(webhookData.data.user, ioToUse);
    }
    else if (webhookData.event === 'users.disconnect' && webhookData.data?.user) {
      console.log('[WEBHOOK] Processando evento: users.disconnect');
      await processUserDisconnect(webhookData.data.user, ioToUse);
    }
    
    // Eventos de Presença
    else if (webhookData.event === 'presences.update' && webhookData.data?.presence) {
      console.log('[WEBHOOK] Processando evento: presences.update');
      await processPresenceUpdate(webhookData.data.presence, ioToUse);
    }
    
    // Eventos de Chamadas
    else if (webhookData.event === 'calls.new' && webhookData.data?.call) {
      console.log('[WEBHOOK] Processando evento: calls.new');
      await processCallNew(webhookData.data.call, ioToUse);
    }
    
    // Eventos de Etiquetas
    else if (webhookData.event === 'labels.new' && webhookData.data?.label) {
      console.log('[WEBHOOK] Processando evento: labels.new');
      await processLabelNew(webhookData.data.label, ioToUse);
    }
    else if (webhookData.event === 'labels.remove' && webhookData.data?.label) {
      console.log('[WEBHOOK] Processando evento: labels.remove');
      await processLabelRemove(webhookData.data.label, ioToUse);
    }
    
    // Eventos de Serviço
    else if (webhookData.event === 'service.notification' && webhookData.data?.notification) {
      console.log('[WEBHOOK] Processando evento: service.notification');
      await processServiceNotification(webhookData.data.notification, ioToUse);
    }
    
    // Novo formato Whapi.cloud: {event: {type, event}, messages: [...]}
    else if (webhookData.event?.type === 'messages' && webhookData.messages && Array.isArray(webhookData.messages)) {
      console.log('[WEBHOOK] Processando formato novo Whapi.cloud (messages array)...');
      for (const message of webhookData.messages) {
        await processIncomingMessageDirect(message, ioToUse);
      }
    }
    // Novo formato Whapi.cloud: {event: {type, event}, statuses: [...]}
    else if (webhookData.event?.type === 'statuses' && webhookData.statuses && Array.isArray(webhookData.statuses)) {
      console.log('[WEBHOOK] Processando formato novo Whapi.cloud (statuses array)...');
      for (const status of webhookData.statuses) {
        await processMessageStatus(status, ioToUse);
      }
    }
    // Formatos legados para compatibilidade
    else if (webhookData.type === 'message' && webhookData.data) {
      console.log('[WEBHOOK] Processando formato legado (message)...');
      await processIncomingMessage(webhookData.data, ioToUse);
    }
    else if (webhookData.from && webhookData.text) {
      console.log('[WEBHOOK] Processando formato legado (direto)...');
      await processIncomingMessageDirect(webhookData, ioToUse);
    }
    else if (webhookData.messages && Array.isArray(webhookData.messages)) {
      console.log('[WEBHOOK] Processando formato legado (array)...');
      for (const message of webhookData.messages) {
        await processIncomingMessageDirect(message, ioToUse);
      }
    }
    
    // Evento não reconhecido
    else {
      console.log('[WEBHOOK] ⚠️ Evento não reconhecido:', {
        event: webhookData.event,
        type: webhookData.type,
        hasData: !!webhookData.data,
        hasMessages: !!webhookData.messages,
        hasFrom: !!webhookData.from,
        keys: Object.keys(webhookData)
      });
    }
  };

  // Função para processar mensagens recebidas diretamente (webhook)
  const processIncomingMessageDirect = async (messageData: any, ioParam?: any) => {
    const webhookStartTime = Date.now();
    console.log(`[WEBHOOK] Iniciado em: ${new Date().toISOString()}`);
    console.log('[WEBHOOK] TESTE LOG SIMPLES');
    
    try {
      console.log('[WEBHOOK] Processando mensagem direta:', messageData);
      console.log('[WEBHOOK] io disponível:', ioParam ? 'SIM' : 'NÃO');
      console.log('[WEBHOOK] io do escopo:', io ? 'SIM' : 'NÃO');
      
      // Usar o io do escopo da função setupWhatsAppRoutes se o parâmetro não estiver disponível
      const ioToUse = ioParam || io;
      
      // Normalizar dados da mensagem
      const fromMe = messageData.from_me || false;
      const chatId = messageData.chat_id || '';
      
      // No novo formato Whapi.cloud:
      // - from: quem enviou a mensagem
      // - chat_id: o chat (pode ser individual ou grupo)
      // - Para mensagens recebidas (from_me = false): from é o remetente, precisamos inferir o destinatário
      // - Para mensagens enviadas (from_me = true): from é nosso número, chat_id é o destinatário
      
      let from: string;
      let to: string;
      
      if (fromMe) {
        // Mensagem enviada por nós
        from = messageData.from || '';
        to = chatId;
      } else {
        // Mensagem recebida
        from = messageData.from || chatId;
        // O 'to' precisa ser inferido - vamos buscar pela conexão ativa ou usar channel_id
        to = messageData.to || ''; // Será preenchido depois ao buscar a conexão
      }
      
      const content = messageData.text?.body || messageData.body || messageData.text || '';
      const messageId = messageData.id || messageData.message_id;
      const timestamp = messageData.timestamp || Math.floor(Date.now() / 1000);
      const messageType = messageData.type || 'text';
      
      // Log completo do payload para debug de mídias
      if (messageType !== 'text') {
        console.log('[WEBHOOK] Payload completo da mensagem de mídia:', JSON.stringify(messageData, null, 2));
      }
      
      // Pular mensagens enviadas por nós
      if (fromMe) {
        console.log('[WEBHOOK] Ignorando mensagem enviada por nós');
        return;
      }
      
      // IGNORAR MENSAGENS DE GRUPOS (@g.us)
      if (chatId.includes('@g.us')) {
        console.log('[WEBHOOK] Ignorando mensagem de grupo:', chatId);
        return;
      }
      
      console.log('[WEBHOOK] Dados normalizados:', {
        from,
        to,
        content,
        messageId,
        timestamp,
        messageType
      });
      
      // Normalizar número de telefone usando utilitário
      const { normalizePhoneForSearch, formatPhoneForDisplay } = await import('./utils/phone-normalizer');
      const contactPhone = normalizePhoneForSearch(from);
      const formattedPhone = formatPhoneForDisplay(contactPhone);
      
      console.log('[WEBHOOK] Telefone normalizado:', { from, contactPhone, formattedPhone });
      
      // Detectar conexão:
      // 1. Tentar pelo número "to" se estiver disponível
      // 2. Se não, buscar pela companhia ativa (único canal conectado)
      let activeConnection;
      
      if (to) {
        const normalizedToPhone = normalizePhoneForSearch(to);
        activeConnection = await storage.getWhatsAppConnectionByPhone(normalizedToPhone);
        console.log('[WEBHOOK] Buscando conexão por número TO:', normalizedToPhone, activeConnection ? 'ENCONTRADA' : 'NÃO ENCONTRADA');
      }
      
      // Se não encontrou pelo "to", buscar pela primeira conexão ativa da empresa
      if (!activeConnection) {
        // Buscar todas as conexões ativas e pegar a primeira (assumindo uma empresa com um canal)
        const allConnections = await storage.getAllWhatsAppConnections();
        activeConnection = allConnections.find(c => c.status === 'connected' && c.whapiToken);
        console.log('[WEBHOOK] Buscando conexão ativa global:', activeConnection ? 'ENCONTRADA' : 'NÃO ENCONTRADA');
      }
      
      if (!activeConnection) {
        console.log('[WEBHOOK] ⚠️ Nenhuma conexão ativa encontrada');
        console.log('[WEBHOOK] From:', from, 'To:', to);
        return;
      }
      
      console.log('[WEBHOOK] ✅ Conexão identificada:', {
        id: activeConnection.id,
        phone: activeConnection.phone,
        companyId: activeConnection.companyId,
        company: activeConnection.connectionName
      });
      
      // Buscar ou criar cliente com informações completas
      let client = await storage.getClientByPhone(contactPhone);
      if (!client) {
        // Extrair informações do contato do WhatsApp
        const contactName = messageData.from_name || messageData.chat_name || `Cliente ${contactPhone}`;
        const contactEmail = messageData.contact?.email || null; // Se houver email no contato
        
        client = await storage.createClient({
          name: contactName,
          phone: contactPhone, // Número já padronizado
          email: contactEmail,
          companyId: activeConnection.companyId,
          environment: 'production'
        });
        console.log('[WEBHOOK] Cliente criado automaticamente:', {
          id: client.id,
          name: contactName,
          phone: contactPhone,
          email: contactEmail
        });
          } else {
        // Atualizar informações se o cliente já existe mas tem dados incompletos
        const updates: any = {};
        if (!client.email && messageData.contact?.email) {
          updates.email = messageData.contact.email;
        }
        if (client.name === `Cliente ${contactPhone}` && messageData.from_name) {
          updates.name = messageData.from_name;
        }
        
        if (Object.keys(updates).length > 0) {
          await storage.updateClient(client.id, updates);
          console.log('[WEBHOOK] Cliente atualizado:', { id: client.id, updates });
        }
      }
      
      // Buscar conversa (incluindo finalizadas)
      let conversation = await storage.getConversationByClient(client.id, activeConnection.companyId);
      
      // Se não encontrou OU se está finalizada, criar NOVA conversa
      if (!conversation || conversation.status === 'finished' || conversation.isFinished) {
        // SEMPRE criar nova conversa com novo protocolo quando finalizada
        console.log('[WEBHOOK] Criando NOVA conversa (conversa anterior estava finalizada ou não existe)');
        
        const { ProtocolGenerator } = await import('./utils/protocol-generator');
        const protocolNumber = await ProtocolGenerator.generateSequentialProtocolNumber(activeConnection.companyId, storage);
        
        conversation = await storage.createConversation({
          contactName: client.name,
          contactPhone: formattedPhone, // Usar formato brasileiro +55 11 99999-9999
          clientId: client.id,
          companyId: activeConnection.companyId,
          status: 'waiting',
          priority: 'medium',
          protocolNumber: protocolNumber,
          environment: 'production'
        });
        console.log('[WEBHOOK] ✅ Nova conversa criada:', conversation.id, 'com protocolo:', protocolNumber);
        
        // Criar nova sessão de chat para a nova conversa
        const chatId = conversation.contactPhone + '@s.whatsapp.net';
        const newSession = await db.insert(chatSessions).values({
          chatId: chatId,
          clientId: client.id,
          companyId: activeConnection.companyId,
          status: 'waiting',
          priority: 'medium',
          startedAt: new Date()
        }).returning();
        console.log('[WEBHOOK] ✅ Nova sessão criada para nova conversa:', newSession[0]?.id, 'com startedAt:', newSession[0]?.startedAt);
        
        // Notificar via WebSocket que uma nova conversa foi criada
      if (io) {
          io.to(`company_${activeConnection.companyId}`).emit('newConversation', {
            id: conversation.id,
            contactName: conversation.contactName,
            contactPhone: conversation.contactPhone,
            status: 'waiting',
            protocolNumber: protocolNumber,
            clientId: client.id,
            companyId: activeConnection.companyId
          });
          console.log('[WEBHOOK] ✅ Evento newConversation emitido para nova conversa:', conversation.id);
        }
      }
      
      // Processar mídia se disponível
      let mediaUrl = '';
      let fileName = '';
      
      if (messageData.image?.link) {
        mediaUrl = messageData.image.link;
        fileName = messageData.image.id || 'image.jpg';
      } else if (messageData.video?.link) {
        mediaUrl = messageData.video.link;
        fileName = messageData.video.id || 'video.mp4';
      } else if (messageData.audio?.link) {
        mediaUrl = messageData.audio.link;
        fileName = messageData.audio.id || 'audio.mp3';
      } else if (messageData.voice?.link) {
        mediaUrl = messageData.voice.link;
        fileName = messageData.voice.id || 'voice.ogg';
      } else if (messageData.document?.link) {
        mediaUrl = messageData.document.link;
        fileName = messageData.document.filename || messageData.document.id || 'document.pdf';
      } else if (messageData.sticker?.link) {
        mediaUrl = messageData.sticker.link;
        fileName = messageData.sticker.id || 'sticker.webp';
      }
      
      console.log('[WEBHOOK] Mídia detectada:', { mediaUrl, fileName, messageType });
      
      // Extrair caption se disponível
      let caption = '';
      if (messageData.image?.caption) {
        caption = messageData.image.caption;
      } else if (messageData.video?.caption) {
        caption = messageData.video.caption;
      } else if (messageData.document?.caption) {
        caption = messageData.document.caption;
      }

      console.log('[WEBHOOK] Caption detectado:', caption);
      
      // Extrair duração de mídias
      let mediaDuration = 0;
      if (messageData.audio?.duration) {
        mediaDuration = messageData.audio.duration;
      } else if (messageData.voice?.duration) {
        mediaDuration = messageData.voice.duration;
      } else if (messageData.video?.duration) {
        mediaDuration = messageData.video.duration;
      }
      
      // Salvar mensagem com timestamp correto
      const message = await storage.createMessage({
            conversationId: conversation.id,
        content: caption || content,  // Priorizar caption se existir
        messageType: messageType,
        direction: 'incoming',
        status: 'delivered',
        mediaUrl: mediaUrl || undefined,
        fileName: fileName || undefined,
        externalId: messageId,
        sentAt: new Date(timestamp * 1000), // Converter timestamp Unix para Date
        metadata: {
          whapiMessageId: messageId,
          timestamp: timestamp,
          from: from,
          to: to,
          mediaType: messageType,
          duration: mediaDuration,
          fileName: fileName
        },
        environment: 'production'
      });
      
      console.log('[WEBHOOK] Mensagem salva:', message.id);
      
      // Formatar preview da última mensagem
      let lastMessagePreview = caption || content || '';

      if (mediaUrl) {
        if (messageType === 'audio' || messageType === 'voice') {
          lastMessagePreview = `[voice:${mediaDuration}]`;
        } else if (messageType === 'video') {
          lastMessagePreview = `[video:${mediaDuration}]`;
        } else if (messageType === 'image') {
          lastMessagePreview = caption || '[image:0]';
        } else if (messageType === 'document') {
          lastMessagePreview = caption || '[document:0]';
        } else if (messageType === 'sticker') {
          lastMessagePreview = '[sticker:0]';
        }
      }

      // Atualizar updatedAt da conversa com lastMessage formatado
      await storage.updateConversation(conversation.id, {
        lastMessage: lastMessagePreview
      });
      
      console.log('[WEBHOOK] Conversa atualizada com novo updatedAt e last_message:', lastMessagePreview);
      
      // Emitir evento Socket.IO para o frontend
      if (ioToUse) {
        console.log('[WEBHOOK] Emitindo evento Socket.IO:', {
          event: 'newMessage',
          room: `company_${activeConnection.companyId}`,
          messageId: message.id,
          conversationId: conversation.id,
          direction: 'incoming'
        });
        
        // Emitir para sala específica da empresa e da conversa
        const conversationRoom = `conversation:${conversation.id}`;
        ioToUse.to(`company_${activeConnection.companyId}`).emit('newMessage', {
          id: message.id,
          conversationId: message.conversationId,
          content: message.content,
          messageType: message.messageType,
          direction: message.direction,
          status: message.status,
          mediaUrl: message.mediaUrl,
          sentAt: message.sentAt,
          createdAt: message.createdAt,
          updatedAt: message.updatedAt
        });
        ioToUse.to(conversationRoom).emit('newMessage', {
          id: message.id,
          conversationId: message.conversationId,
          content: message.content,
          messageType: message.messageType,
          direction: message.direction,
          status: message.status,
          mediaUrl: message.mediaUrl,
          sentAt: message.sentAt,
          createdAt: message.createdAt,
          updatedAt: message.updatedAt
        });
        
        // Emitir atualização de conversa também
        ioToUse.to(`company_${activeConnection.companyId}`).emit('conversationUpdate', {
          id: conversation.id,
          status: conversation.status,
          lastMessage: content,
          lastMessageAt: new Date(),
          updatedAt: new Date()
        });
        
        console.log('[WEBHOOK] ✅ Eventos Socket.IO emitidos com sucesso');
      } else {
        console.log('[WEBHOOK] ⚠️ Socket.IO não disponível - eventos não emitidos');
      }
      
      // Criar preview de mídia para lastMessage
      let lastMessagePreview2 = content;
      if (messageType === 'voice' || messageType === 'audio') {
        lastMessagePreview2 = mediaDuration > 0 
          ? `[voice:${mediaDuration}]` 
          : '[voice]';
      } else if (messageType === 'video') {
        lastMessagePreview2 = mediaDuration > 0 
          ? `[video:${mediaDuration}]` 
          : '[video]';
      } else if (messageType === 'image') {
        lastMessagePreview2 = '[image]';
      } else if (messageType === 'document') {
        lastMessagePreview2 = '[document]';
      }
      
      // Atualizar última mensagem da conversa - NÃO alterar status se já tem usuário atribuído
      const updateData: any = {
        lastMessageAt: new Date(timestamp * 1000),
        lastMessage: lastMessagePreview2,
        lastMessageType: messageType
      };
      
      // Só alterar status para 'waiting' se a conversa não tem usuário atribuído
      console.log('[WEBHOOK] Verificando status da conversa:', {
        conversationId: conversation.id,
        assignedAgentId: conversation.assignedAgentId,
        currentStatus: conversation.status
      });
      
      if (!conversation.assignedAgentId) {
        updateData.status = 'waiting';
        console.log('[WEBHOOK] Conversa sem usuário atribuído, definindo status como waiting');
          } else {
        console.log('[WEBHOOK] Conversa já tem usuário atribuído, mantendo status atual:', conversation.status);
      }
      
      console.log('[WEBHOOK] Dados para atualização da conversa:', updateData);
      
      try {
        const updatedConversation = await storage.updateConversation(conversation.id, updateData);
        console.log('[WEBHOOK] ✅ Conversa atualizada com sucesso:', {
          id: updatedConversation.id,
          lastMessage: updatedConversation.lastMessage,
          lastMessageAt: updatedConversation.lastMessageAt
        });
      } catch (error: any) {
        console.error('[WEBHOOK] ❌ Erro ao atualizar conversa:', error);
      }
      
      // Emitir evento WebSocket
      if (ioToUse) {
        const roomName = `company_${activeConnection.companyId}`;
        console.log(`📡 Emitindo eventos WebSocket para sala: ${roomName}`);
        
        const newMessageEvent = {
          ...message,
          conversationId: conversation.id,
          companyId: activeConnection.companyId
        };
        
        const conversationUpdateEvent = {
          id: conversation.id,
          lastMessageAt: new Date(timestamp * 1000).toISOString(),
          companyId: activeConnection.companyId
        };
        
        // Emitir para sala da empresa e sala específica da conversa
        ioToUse.to(roomName).emit('newMessage', newMessageEvent);
        ioToUse.to(`conversation:${conversation.id}`).emit('newMessage', newMessageEvent);
        console.log('📨 Evento newMessage emitido:', newMessageEvent.id);
        
        ioToUse.to(roomName).emit('conversationUpdate', conversationUpdateEvent);
        console.log('🔄 Evento conversationUpdate emitido para conversa:', conversation.id);
        
        // Verificar quantos clientes estão na sala
        const room = ioToUse.sockets.adapter.rooms.get(roomName);
        console.log(`👥 Clientes na sala ${roomName}: ${room ? room.size : 0}`);
      } else {
        console.log('❌ io não está disponível para emitir eventos WebSocket');
      }
      
      const webhookEndTime = Date.now();
      console.log(`[WEBHOOK] Finalizado em ${webhookEndTime - webhookStartTime}ms`);
      console.log('[WEBHOOK] ✅ Mensagem processada com sucesso:', content);
      
    } catch (error: any) {
      const webhookEndTime = Date.now();
      console.log(`[WEBHOOK] Erro após ${webhookEndTime - webhookStartTime}ms`);
      console.error('[WEBHOOK] Erro ao processar mensagem direta:', error);
    }
  };

  // Funções de processamento de eventos específicos do Whapi.Cloud
  
  // Processar edição de mensagem
  const processMessageEdit = async (messageData: any, io?: any) => {
    try {
      console.log('[WEBHOOK] Processando edição de mensagem:', messageData);
      // TODO: Implementar lógica de edição de mensagem
    } catch (error: any) {
      console.error('[WEBHOOK] Erro ao processar edição de mensagem:', error);
    }
  };

  // Processar exclusão de mensagem
  const processMessageDelete = async (messageData: any, io?: any) => {
    try {
      console.log('[WEBHOOK] Processando exclusão de mensagem:', messageData);
      // TODO: Implementar lógica de exclusão de mensagem
    } catch (error: any) {
      console.error('[WEBHOOK] Erro ao processar exclusão de mensagem:', error);
    }
  };

  // Processar status de mensagem
  const processMessageStatus = async (statusData: any, io?: any) => {
    try {
      console.log('[WEBHOOK] Processando status de mensagem:', statusData);
      
      // Buscar mensagem por externalId
      const message = await storage.getMessageByExternalId(statusData.messageId);
      if (message) {
        // Atualizar status da mensagem
        await storage.updateMessage(message.id, { status: statusData.status });
        
        // Emitir evento WebSocket
        if (io) {
          io.to(`company_${message.conversationId}`).emit('messageStatusUpdate', {
            messageId: message.id,
            status: statusData.status,
            timestamp: new Date().toISOString()
          });
        }
        
        console.log(`[WEBHOOK] Status da mensagem ${message.id} atualizado para: ${statusData.status}`);
      }
    } catch (error: any) {
      console.error('[WEBHOOK] Erro ao processar status de mensagem:', error);
    }
  };

  // Processar novo chat
  const processChatNew = async (chatData: any, io?: any) => {
    try {
      console.log('[WEBHOOK] Processando novo chat:', chatData);
      // TODO: Implementar lógica de novo chat
    } catch (error: any) {
      console.error('[WEBHOOK] Erro ao processar novo chat:', error);
    }
  };

  // Processar atualização de chat
  const processChatUpdate = async (chatData: any, io?: any) => {
    try {
      console.log('[WEBHOOK] Processando atualização de chat:', chatData);
      // TODO: Implementar lógica de atualização de chat
    } catch (error: any) {
      console.error('[WEBHOOK] Erro ao processar atualização de chat:', error);
    }
  };

  // Processar remoção de chat
  const processChatRemove = async (chatData: any, io?: any) => {
    try {
      console.log('[WEBHOOK] Processando remoção de chat:', chatData);
      // TODO: Implementar lógica de remoção de chat
    } catch (error: any) {
      console.error('[WEBHOOK] Erro ao processar remoção de chat:', error);
    }
  };

  // Processar atualização de contato
  const processContactUpdate = async (contactData: any, io?: any) => {
    try {
      console.log('[WEBHOOK] Processando atualização de contato:', contactData);
      // TODO: Implementar lógica de atualização de contato
    } catch (error: any) {
      console.error('[WEBHOOK] Erro ao processar atualização de contato:', error);
    }
  };

  // Processar novo grupo
  const processGroupNew = async (groupData: any, io?: any) => {
    try {
      console.log('[WEBHOOK] Processando novo grupo:', groupData);
      // TODO: Implementar lógica de novo grupo
    } catch (error: any) {
      console.error('[WEBHOOK] Erro ao processar novo grupo:', error);
    }
  };

  // Processar atualização de grupo
  const processGroupUpdate = async (groupData: any, io?: any) => {
    try {
      console.log('[WEBHOOK] Processando atualização de grupo:', groupData);
      // TODO: Implementar lógica de atualização de grupo
    } catch (error: any) {
      console.error('[WEBHOOK] Erro ao processar atualização de grupo:', error);
    }
  };

  // Processar status do canal
  const processChannelStatus = async (statusData: any, io?: any) => {
    try {
      console.log('[WEBHOOK] Processando status do canal:', statusData);
      // TODO: Implementar lógica de status do canal
    } catch (error: any) {
      console.error('[WEBHOOK] Erro ao processar status do canal:', error);
    }
  };

  // Processar QR code do canal
  const processChannelQR = async (qrData: any, io?: any) => {
    try {
      console.log('[WEBHOOK] Processando QR code do canal:', qrData);
      // TODO: Implementar lógica de QR code
    } catch (error: any) {
      console.error('[WEBHOOK] Erro ao processar QR code do canal:', error);
    }
  };

  // Processar conexão de usuário
  const processUserConnect = async (userData: any, io?: any) => {
    try {
      console.log('[WEBHOOK] Processando conexão de usuário:', userData);
      // TODO: Implementar lógica de conexão de usuário
    } catch (error: any) {
      console.error('[WEBHOOK] Erro ao processar conexão de usuário:', error);
    }
  };

  // Processar desconexão de usuário
  const processUserDisconnect = async (userData: any, io?: any) => {
    try {
      console.log('[WEBHOOK] Processando desconexão de usuário:', userData);
      // TODO: Implementar lógica de desconexão de usuário
    } catch (error: any) {
      console.error('[WEBHOOK] Erro ao processar desconexão de usuário:', error);
    }
  };

  // Processar atualização de presença
  const processPresenceUpdate = async (presenceData: any, io?: any) => {
    try {
      console.log('[WEBHOOK] Processando atualização de presença:', presenceData);
      // TODO: Implementar lógica de presença
    } catch (error: any) {
      console.error('[WEBHOOK] Erro ao processar atualização de presença:', error);
    }
  };

  // Processar nova chamada
  const processCallNew = async (callData: any, io?: any) => {
    try {
      console.log('[WEBHOOK] Processando nova chamada:', callData);
      // TODO: Implementar lógica de chamada
    } catch (error: any) {
      console.error('[WEBHOOK] Erro ao processar nova chamada:', error);
    }
  };

  // Processar nova etiqueta
  const processLabelNew = async (labelData: any, io?: any) => {
    try {
      console.log('[WEBHOOK] Processando nova etiqueta:', labelData);
      // TODO: Implementar lógica de nova etiqueta
    } catch (error: any) {
      console.error('[WEBHOOK] Erro ao processar nova etiqueta:', error);
    }
  };

  // Processar remoção de etiqueta
  const processLabelRemove = async (labelData: any, io?: any) => {
    try {
      console.log('[WEBHOOK] Processando remoção de etiqueta:', labelData);
      // TODO: Implementar lógica de remoção de etiqueta
    } catch (error: any) {
      console.error('[WEBHOOK] Erro ao processar remoção de etiqueta:', error);
    }
  };

  // Processar notificação de serviço
  const processServiceNotification = async (notificationData: any, io?: any) => {
    try {
      console.log('[WEBHOOK] Processando notificação de serviço:', notificationData);
      // TODO: Implementar lógica de notificação de serviço
    } catch (error: any) {
      console.error('[WEBHOOK] Erro ao processar notificação de serviço:', error);
    }
  };

  // Função para processar mensagens recebidas
  const processIncomingMessage = async (messageData: any, io?: any) => {
    try {
      console.log('[WhatsApp Routes] 📨 Processando mensagem recebida:', messageData);
      console.log('[WhatsApp Routes] 🔍 Dados da mensagem:', {
        from: messageData.from,
        body: messageData.body,
        text: messageData.text,
        timestamp: messageData.timestamp
      });
      
      // Extrair dados da mensagem
      const {
        from: phone,
        body: content,
        text: textData,
        timestamp,
        id: messageId,
        type: messageType,
        caption,
        mediaUrl,
        fileName
      } = messageData;
      
      // Usar text.body se body não estiver disponível
      const messageContent = content || (textData && textData.body);
      
      if (!phone || !messageContent) {
        console.log('[WhatsApp Routes] ⚠️ Mensagem sem phone ou content, ignorando');
        console.log('[WhatsApp Routes] 🔍 Debug:', { phone, messageContent, content, textData });
        return;
      }
      
      // Normalizar número de telefone
      const { normalizePhoneForSearch, formatPhoneForDisplay } = await import('./utils/phone-normalizer');
      const normalizedPhone = normalizePhoneForSearch(phone);
      const formattedPhone = formatPhoneForDisplay(normalizedPhone);
      console.log(`[WhatsApp Routes] 📱 Processando mensagem de: ${normalizedPhone} (formatado: ${formattedPhone})`);
      
      // Buscar ou criar cliente
      let client = await storage.getClientByPhone(normalizedPhone);
          if (!client) {
        console.log(`[WhatsApp Routes] 👤 Criando novo cliente para: ${normalizedPhone}`);
        client = await storage.createClient({
          name: `Cliente ${normalizedPhone}`,
          phone: normalizedPhone,
          companyId: '59b4b086-9171-4dbf-8177-b7c6d6fd1e33' // ID da empresa padrão
        });
      }
      
      // Buscar conversa existente por cliente
      const allConversations = await storage.getAllConversations();
      let conversation = allConversations.find(c => 
        c.clientId === client.id && 
        c.contactPhone === normalizedPhone
      );

      // Verificar se está finalizada ou não existe - SEMPRE criar nova conversa
      if (!conversation || conversation.status === 'finished' || conversation.isFinished) {
        // SEMPRE criar nova conversa com novo protocolo quando finalizada
        console.log(`[WhatsApp Routes] 💬 Criando NOVA conversa (conversa anterior estava finalizada ou não existe) para cliente: ${client.id}`);
        
        const { ProtocolGenerator } = await import('./utils/protocol-generator');
        const protocolNumber = await ProtocolGenerator.generateSequentialProtocolNumber('59b4b086-9171-4dbf-8177-b7c6d6fd1e33', storage);
        
        conversation = await storage.createConversation({
          contactName: client.name || `Cliente ${normalizedPhone}`,
          contactPhone: formattedPhone, // Usar formato brasileiro +55 11 99999-9999
          clientId: client.id,
          companyId: '59b4b086-9171-4dbf-8177-b7c6d6fd1e33',
          status: 'waiting',
          protocolNumber: protocolNumber
        });
        console.log(`[WhatsApp Routes] ✅ Nova conversa criada: ${conversation.id} com protocolo: ${protocolNumber}`);
      }

      // Salvar mensagem no banco
      const message = await storage.createMessage({
            conversationId: conversation.id,
        content: messageContent,
        messageType: messageType || 'text',
        direction: 'incoming',
        status: 'delivered',
        mediaUrl: mediaUrl,
        caption: caption,
        fileName: fileName,
        externalId: messageId,
        sentAt: new Date(timestamp * 1000), // Converter timestamp Unix para Date
        metadata: {
          from: phone,
          timestamp: timestamp,
          whapiMessageId: messageId
        }
      });
      
      console.log(`[WhatsApp Routes] ✅ Mensagem salva: ${message.id}`);
      
      // Atualizar última mensagem da conversa
      try {
        const updateData = {
          lastMessage: messageContent,
          lastMessageType: messageType || 'text',
          lastMessageAt: new Date()
        };
        
        console.log('[WhatsApp Routes] 🔄 Atualizando conversa:', updateData);
        
        const updatedConversation = await storage.updateConversation(conversation.id, updateData);
        console.log('[WhatsApp Routes] ✅ Conversa atualizada:', {
          id: updatedConversation.id,
          lastMessage: updatedConversation.lastMessage,
          lastMessageAt: updatedConversation.lastMessageAt
        });
      } catch (error: any) {
        console.error('[WhatsApp Routes] ❌ Erro ao atualizar conversa:', error);
      }
      
      // Notificar via WebSocket
      if (io) {
        io.to(`company_59b4b086-9171-4dbf-8177-b7c6d6fd1e33`).emit('newMessage', {
          ...message,
          conversationId: conversation.id,
          companyId: '59b4b086-9171-4dbf-8177-b7c6d6fd1e33'
        });
        
        // Também notificar atualização da conversa
        io.to(`company_59b4b086-9171-4dbf-8177-b7c6d6fd1e33`).emit('conversationUpdate', {
            conversationId: conversation.id,
          lastMessage: messageContent,
          lastMessageAt: new Date().toISOString(),
          unreadCount: 1
        });
        
        console.log(`[WhatsApp Routes] 📡 Notificação WebSocket enviada`);
      }
      
    } catch (error: any) {
      console.error('[WhatsApp Routes] ❌ Erro ao processar mensagem:', error);
    }
  };

  // ==================== ROTAS DE CONVERSAS ====================

  // Rota para buscar conversas
  router.get('/conversations', requireAuth, async (req, res) => {
    try {
      const { companyId } = req.user!;
      const { status } = req.query;
      
      console.log(`[WhatsApp Routes] Buscando conversas para empresa: ${companyId}, status: ${status}`);
      
      // Buscar conversas não finalizadas da empresa com última mensagem e contagem de não lidas
      const companyConversations = await db.select({
        id: conversations.id,
        companyId: conversations.companyId,
        contactName: conversations.contactName,
        contactPhone: conversations.contactPhone,
        status: conversations.status,
        environment: conversations.environment,
        createdAt: conversations.createdAt,
        updatedAt: conversations.updatedAt,
        lastMessage: sql`(
          SELECT content 
          FROM messages 
          WHERE messages.conversation_id = conversations.id 
          ORDER BY sent_at DESC 
          LIMIT 1
        )`,
        unreadCount: sql`(
          SELECT COUNT(*) 
          FROM messages 
          WHERE messages.conversation_id = conversations.id 
          AND messages.direction = 'incoming'
          AND messages.is_read = false
        )`
      })
        .from(conversations)
        .where(and(
          eq(conversations.companyId, companyId),
          eq(conversations.isFinished, false), // Restaurado: mostrar apenas conversas não finalizadas
          status ? eq(conversations.status, status as any) : undefined
        ))
        .orderBy(desc(conversations.updatedAt));
      
      // Garantir ordenação adicional (fallback)
      const sortedConversations = companyConversations.sort((a, b) => 
        new Date(b.updatedAt || new Date()).getTime() - new Date(a.updatedAt || new Date()).getTime()
      );
      
      // Garantir que sempre retorna um array válido
      res.json(Array.isArray(sortedConversations) ? sortedConversations : []);
    } catch (error: any) {
      console.error('[WhatsApp Routes] Erro ao buscar conversas:', error);
      res.status(500).json({ message: 'Erro interno ao buscar conversas' });
    }
  });

  // Rota para envio de mídia
  router.post('/conversations/:conversationId/send-media', requireAuth, upload.single('file'), async (req, res) => {
    try {
      const { conversationId } = req.params;
      const { companyId } = req.user!;
      const file = req.file;
      
      if (!file) {
        return res.status(400).json({ message: 'Nenhum arquivo enviado' });
      }
      
      console.log(`[WhatsApp Routes] Enviando mídia para conversa: ${conversationId}, arquivo: ${file.originalname}`);
      
      // Verificar se a conversa pertence à empresa
      const conversation = await storage.getConversation(conversationId);
      if (!conversation || conversation.companyId !== companyId) {
        return res.status(404).json({ message: 'Conversa não encontrada' });
      }

      // Buscar conexão WhatsApp ativa
      const connections = await storage.getWhatsAppConnectionsByCompany(companyId);
      const activeConnection = connections.find(c => c.status === 'connected' && c.whapiToken);
      
      if (!activeConnection) {
        return res.status(400).json({ message: 'Nenhuma conexão WhatsApp ativa encontrada' });
      }
      
      // Determinar tipo de mídia
      let mediaType = 'document';
      if (file.mimetype.startsWith('image/')) {
        mediaType = 'image';
      } else if (file.mimetype.startsWith('video/')) {
        mediaType = 'video';
      } else if (file.mimetype.startsWith('audio/')) {
        mediaType = 'audio';
      }
      
      // Criar URL do arquivo
      const mediaUrl = `${req.protocol}://${req.get('host')}/uploads/${file.filename}`;
      
      // Normalizar número para Whapi
      const { normalizePhoneForWhapi } = await import('./utils/phone-normalizer');
      const normalizedPhone = normalizePhoneForWhapi(conversation.contactPhone || '');
      
      // Enviar via método unificado
      const result = await whapiService.sendMediaMessageWithToken(
        normalizedPhone,
        mediaType,
        mediaUrl,
        {
          caption: req.body.caption,
          fileName: file.originalname,
          token: activeConnection.whapiToken!
        }
      );
      
      // Salvar mensagem no banco
      const message = await storage.createMessage({
            conversationId: conversation.id,
        content: `[${mediaType}]`,
        messageType: mediaType as any,
        direction: 'outgoing',
        status: 'sent',
        sentAt: new Date(), // Data atual para mensagens de envio
        mediaUrl: mediaUrl,
        fileName: file.originalname,
        externalId: result.id || `temp_${Date.now()}`,
        metadata: {
          whapiMessageId: result.id,
          originalName: file.originalname,
          mimeType: file.mimetype,
          size: file.size
        },
        environment: 'production'
      });
      
      // Emitir evento Socket.IO
      const io = app.get('io');
          if (io) {
        const conversationRoom = `conversation:${message.conversationId}`;
        io.to(`company_${companyId}`).emit('newMessage', {
          id: message.id,
          conversationId: message.conversationId,
          content: message.content,
          messageType: message.messageType,
          direction: message.direction,
          status: message.status,
          mediaUrl: message.mediaUrl,
          sentAt: message.sentAt,
          createdAt: message.createdAt,
          updatedAt: message.updatedAt
        });
        io.to(conversationRoom).emit('newMessage', {
          id: message.id,
          conversationId: message.conversationId,
          content: message.content,
          messageType: message.messageType,
          direction: message.direction,
          status: message.status,
          mediaUrl: message.mediaUrl,
          sentAt: message.sentAt,
          createdAt: message.createdAt,
          updatedAt: message.updatedAt
        });
      }
      
      res.json(message);
    } catch (error: any) {
      console.error('[WhatsApp Routes] Erro ao enviar mídia:', error);
      res.status(500).json({ message: 'Erro interno ao enviar mídia' });
    }
  });

  // Rota para buscar mensagens de uma conversa
  router.get('/conversations/:conversationId/messages', requireAuth, async (req, res) => {
    try {
      const { conversationId } = req.params;
      const { companyId } = req.user!;
      
      console.log(`[WhatsApp Routes] Buscando mensagens para conversa: ${conversationId}`);
      
      // Verificar se a conversa pertence à empresa
      const conversation = await storage.getConversation(conversationId);
      if (!conversation || conversation.companyId !== companyId) {
        return res.status(404).json({ message: 'Conversa não encontrada' });
      }
      
      // Buscar última sessão ativa (não finalizada)
      const chatId = conversation.contactPhone + '@s.whatsapp.net';
      const activeSession = await db.select()
        .from(chatSessions)
        .where(and(
          eq(chatSessions.chatId, chatId),
          eq(chatSessions.status, 'in_progress')
        ))
        .orderBy(desc(chatSessions.createdAt))
        .limit(1);

      let conversationMessages;
      if (activeSession.length > 0) {
        // Retornar apenas mensagens da sessão ativa (após startedAt)
        conversationMessages = await storage.getMessagesByConversation(conversationId, activeSession[0].startedAt || undefined);
        console.log(`[WhatsApp Routes] Carregando mensagens da sessão ativa desde: ${activeSession[0].startedAt}`);
          } else {
        // Se não há sessão ativa, retornar todas as mensagens (comportamento padrão)
        conversationMessages = await storage.getMessagesByConversation(conversationId);
        console.log(`[WhatsApp Routes] Nenhuma sessão ativa encontrada, carregando todas as mensagens`);
      }

      // Marcar mensagens incoming como lidas automaticamente
      try {
        await db.update(messages)
          .set({ 
            status: 'read', 
            isRead: true, 
            readAt: new Date() 
          })
          .where(and(
            eq(messages.conversationId, conversationId),
            eq(messages.direction, 'incoming'),
            eq(messages.isRead, false)
          ));
        console.log(`[WhatsApp Routes] ✅ Mensagens incoming marcadas como lidas para conversa ${conversationId}`);
      } catch (markError) {
        console.error(`[WhatsApp Routes] Erro ao marcar mensagens como lidas:`, markError);
        // Não falhar a requisição se houver erro na marcação
      }

      // Buscar e atualizar foto de perfil do WhatsApp
      try {
        const profilePicUrl = await whapiService.getProfilePicture(conversation.contactPhone);
        if (profilePicUrl) {
          await storage.updateConversation(conversationId, { profilePictureUrl: profilePicUrl });
          if (conversation.clientId) {
            await storage.updateClient(conversation.clientId, { profilePictureUrl: profilePicUrl });
          }
          console.log(`[WhatsApp Routes] Foto de perfil atualizada para conversa ${conversationId}`);
          }
      } catch (error) {
        console.warn(`[WhatsApp Routes] Erro ao atualizar foto de perfil:`, error);
      }

      // Garantir que sempre retorna um array válido
      res.json(Array.isArray(conversationMessages) ? conversationMessages : []);
    } catch (error: any) {
      console.error('[WhatsApp Routes] Erro ao buscar mensagens:', error);
      res.status(500).json({ message: 'Erro interno ao buscar mensagens' });
    }
  });

              // Rota para criar ou encontrar conversa
              router.post('/conversations/create-or-find', requireAuth, async (req, res) => {
                try {
                  const { clientId } = req.body;
                  const { companyId } = req.user!;
                  
                  console.log(`[WhatsApp Routes] Criando/buscando conversa para cliente: ${clientId}`);
                  
                  // Buscar cliente
                  const client = await storage.getClient(clientId);
                  if (!client || client.companyId !== companyId) {
                    return res.status(404).json({ message: 'Cliente não encontrado' });
                  }
                  
                  // Formatar telefone do cliente
                  const { formatPhoneForDisplay } = await import('./utils/phone-normalizer');
                  const formattedPhone = formatPhoneForDisplay(client.phone);
                  
                  // Buscar conversa existente
                  const allConversations = await storage.getAllConversations();
                  let conversation = allConversations.find(c => 
                    c.clientId === clientId && 
                    c.companyId === companyId &&
                    (c.status === 'waiting' || c.status === 'in_progress')
                  );
                  
                  if (!conversation) {
                    // Criar nova conversa
                    conversation = await storage.createConversation({
                      contactName: client.name || `Cliente ${client.phone}`,
                      contactPhone: formattedPhone, // Usar formato brasileiro +55 11 99999-9999
                      clientId: clientId,
                      companyId: companyId,
                      status: 'waiting'
                    });
                  }
                  
                  res.json({ conversationId: conversation.id });
                } catch (error: any) {
                  console.error('[WhatsApp Routes] Erro ao criar/buscar conversa:', error);
                  res.status(500).json({ message: 'Erro interno ao criar/buscar conversa' });
                }
              });

              // Rota para assumir conversa
              router.post('/conversations/:conversationId/take', requireAuth, async (req, res) => {
                try {
                  const { conversationId } = req.params;
                  const { companyId, id: userId } = req.user!;
                  
                  console.log(`[WhatsApp Routes] Assumindo conversa: ${conversationId} pelo usuário: ${userId}`);
                  
                  const conversation = await storage.getConversation(conversationId);
                  if (!conversation || conversation.companyId !== companyId) {
                    return res.status(404).json({ message: 'Conversa não encontrada' });
                  }
                  
                  // Atualizar conversa para in_progress E atribuir ao usuário
                  const updatedConversation = await storage.updateConversation(conversationId, {
                    status: 'in_progress',
                    assignedAgentId: userId
                  });
      
      // Criar nova sessão de chat para esta conversa
      const chatId = conversation.contactPhone + '@s.whatsapp.net';
      
      // Verificar se já existe uma sessão ativa OU finalizada recentemente
      const existingSessions = await db.select()
        .from(chatSessions)
        .where(eq(chatSessions.chatId, chatId))
        .orderBy(desc(chatSessions.startedAt))
        .limit(1);

      if (existingSessions.length === 0) {
        // Nenhuma sessão existe - criar nova
        await db.insert(chatSessions).values({
          chatId: chatId,
          clientId: conversation.clientId || '',
          companyId: companyId,
          status: 'in_progress',
          priority: 'medium',
          startedAt: new Date()
        });
        console.log(`[WhatsApp Routes] Nova sessão de chat criada para: ${chatId}`);
      } else {
        const lastSession = existingSessions[0];
        
        if (lastSession.status === 'finished') {
          // Sessão finalizada - criar NOVA sessão
          await db.insert(chatSessions).values({
            chatId: chatId,
            clientId: conversation.clientId || '',
            companyId: companyId,
            status: 'in_progress',
            priority: 'medium',
            startedAt: new Date()
          });
          console.log(`[WhatsApp Routes] Nova sessão criada (anterior estava finalizada) para: ${chatId}`);
        } else {
          // Sessão já em progresso - apenas atualizar timestamp
          await db.update(chatSessions)
            .set({
              status: 'in_progress',
              updatedAt: new Date()
            })
            .where(eq(chatSessions.id, lastSession.id));
          console.log(`[WhatsApp Routes] Sessão existente atualizada para: ${chatId}`);
        }
      }
                  
                  console.log(`[WhatsApp Routes] ✅ Conversa ${conversationId} assumida pelo usuário ${userId} e status atualizado para in_progress`);
                  
                  // Notificar via WebSocket
          if (io) {
                    io.to(`company_${companyId}`).emit('conversationUpdate', {
                      conversationId: conversationId,
                      status: 'in_progress',
                      assignedAgentId: userId,
                      companyId: companyId
                    });
                  }
                  
                  res.json(updatedConversation);
                } catch (error: any) {
                  console.error('[WhatsApp Routes] Erro ao assumir conversa:', error);
                  res.status(500).json({ message: 'Erro interno ao assumir conversa' });
                }
              });

              // Rota para enviar mensagem (suporte a todos os tipos)
              router.post('/conversations/:conversationId/send', requireAuth, async (req, res) => {
    try {
      const { conversationId } = req.params;
      const { 
        text, 
        type = 'text', 
        mediaUrl, 
        caption, 
        quotedMessageId, 
        emoji,
        latitude,
        longitude,
        address,
        name,
        contactName,
        contactPhone,
        filename
      } = req.body;
      const { companyId } = req.user!;
      
      console.log(`[WhatsApp Routes] Enviando mensagem para conversa: ${conversationId}, tipo: ${type}`);
      
      // Verificar se a conversa pertence à empresa
      const conversation = await storage.getConversation(conversationId);
      if (!conversation || conversation.companyId !== companyId) {
        return res.status(404).json({ message: 'Conversa não encontrada' });
      }

      // Buscar conexão WhatsApp ativa
      const connections = await storage.getWhatsAppConnectionsByCompany(companyId);
      const activeConnection = connections.find(c => c.status === 'connected' && c.whapiToken);
      
      if (!activeConnection) {
        return res.status(400).json({ message: 'Nenhuma conexão WhatsApp ativa encontrada' });
      }
      
      let result;
      let messageContent = text;
      let messageType = type;
      
      // Normalizar número de telefone para envio
      const { normalizePhoneForWhapi } = await import('./utils/phone-normalizer');
      const normalizedPhone = normalizePhoneForWhapi(conversation.contactPhone || '');
      
      console.log(`[WhatsApp Routes] 📞 Telefone original: ${conversation.contactPhone}`);
      console.log(`[WhatsApp Routes] 📞 Telefone normalizado para Whapi: ${normalizedPhone}`);
      
      // Se tem quotedMessageId, buscar mensagem original
      let quotedMessage = null;
      if (quotedMessageId) {
        quotedMessage = await storage.getMessage(quotedMessageId);
      }
      
      // Enviar mensagem baseada no tipo
      switch (type) {
        case 'text':
          if (quotedMessageId) {
            result = await whapiService.sendReplyMessageWithToken(normalizedPhone, text, quotedMessageId, activeConnection.whapiToken!);
          } else {
            result = await whapiService.sendTextMessageWithToken(normalizedPhone, text, activeConnection.whapiToken!);
          }
          break;
          
        case 'image':
          result = await whapiService.sendMediaMessageWithToken(
            normalizedPhone, 
            'image', 
            mediaUrl, 
            { 
              caption, 
              token: activeConnection.whapiToken! 
            }
          );
          messageContent = caption || 'Imagem';
          break;
          
        case 'video':
          result = await whapiService.sendMediaMessageWithToken(
            normalizedPhone, 
            'video', 
            mediaUrl, 
            { 
              caption, 
              token: activeConnection.whapiToken! 
            }
          );
          messageContent = caption || 'Vídeo';
          break;
          
        case 'audio':
          result = await whapiService.sendMediaMessageWithToken(
            normalizedPhone, 
            'audio', 
            mediaUrl, 
            { 
              token: activeConnection.whapiToken! 
            }
          );
          messageContent = 'Áudio';
          break;
          
        case 'voice':
          result = await whapiService.sendMediaMessageWithToken(
            normalizedPhone, 
            'voice', 
            mediaUrl, 
            { 
              token: activeConnection.whapiToken! 
            }
          );
          messageContent = 'Mensagem de voz';
          break;
          
        case 'document':
          result = await whapiService.sendMediaMessageWithToken(
            normalizedPhone, 
            'document', 
            mediaUrl, 
            { 
              caption,
              fileName: filename,
              token: activeConnection.whapiToken! 
            }
          );
          messageContent = caption || filename || 'Documento';
          break;
          
        case 'sticker':
          result = await whapiService.sendMediaMessageWithToken(
            normalizedPhone, 
            'sticker', 
            mediaUrl, 
            { 
              token: activeConnection.whapiToken! 
            }
          );
          messageContent = 'Sticker';
          break;
          
        case 'location':
          result = await whapiService.sendLocationMessage(
            activeConnection.whapiToken!, 
            normalizedPhone, 
            latitude, 
            longitude, 
            address, 
            name
          );
          messageContent = `Localização: ${name || address || 'Localização'}`;
          break;
          
        case 'contact':
          result = await whapiService.sendContactMessageWithToken(normalizedPhone, {
            name: contactName,
            phone: contactPhone
          }, activeConnection.whapiToken!);
          messageContent = `Contato: ${contactName}`;
          break;
          
        case 'reaction':
          result = await whapiService.reactToMessage(activeConnection.whapiToken!, quotedMessageId, emoji);
          messageContent = `Reação: ${emoji}`;
          messageType = 'reaction';
          break;
          
        default:
          return res.status(400).json({ message: 'Tipo de mensagem não suportado' });
      }
      
      if (result) {
      // Salvar mensagem no banco
        const message = await storage.createMessage({
        conversationId: conversationId,
          senderId: req.user!.id,
          content: messageContent,
          messageType: messageType,
        direction: 'outgoing',
        status: 'sent',
        sentAt: new Date(), // Data atual para mensagens de envio
          mediaUrl: mediaUrl,
          metadata: {
            whapiMessageId: result.message?.id,
            quotedMessageId: quotedMessageId,
            emoji: emoji
          }
        });
        
        // Notificar via WebSocket
          if (io) {
          io.to(`company_${companyId}`).emit('newMessage', {
            ...message,
            conversationId: conversationId,
            companyId: companyId,
            quotedMessage: quotedMessage ? {
              id: quotedMessage.id,
              content: quotedMessage.content,
              messageType: quotedMessage.messageType,
              direction: quotedMessage.direction
            } : null
          });
        }
        
        res.json({ success: true, message: 'Mensagem enviada com sucesso', data: message });
      } else {
        res.status(500).json({ message: 'Erro ao enviar mensagem via WhatsApp' });
      }
      
    } catch (error: any) {
      console.error('[WhatsApp Routes] Erro ao enviar mensagem:', error);
      res.status(500).json({ message: 'Erro interno ao enviar mensagem' });
    }
  });

  // Rota para reagir a uma mensagem
  router.post('/conversations/:conversationId/messages/:messageId/react', requireAuth, async (req, res) => {
    try {
      const { conversationId, messageId } = req.params;
      const { emoji } = req.body;
      const { companyId } = req.user!;
      
      console.log(`[WhatsApp Routes] Reagindo à mensagem ${messageId} com ${emoji}`);
      
      // Verificar se a conversa pertence à empresa
      const conversation = await storage.getConversation(conversationId);
      if (!conversation || conversation.companyId !== companyId) {
        return res.status(404).json({ message: 'Conversa não encontrada' });
      }

      // Buscar a mensagem original para obter o externalId
      const originalMessage = await storage.getMessage(messageId);
      if (!originalMessage || !originalMessage.externalId) {
        return res.status(400).json({ message: 'Mensagem não encontrada ou sem ID da Whapi.Cloud' });
      }

      // Buscar conexão WhatsApp ativa
      const connections = await storage.getWhatsAppConnectionsByCompany(companyId);
      const activeConnection = connections.find(c => c.status === 'connected' && c.whapiToken);
      
      if (!activeConnection) {
        return res.status(400).json({ message: 'Nenhuma conexão WhatsApp ativa encontrada' });
      }
      
      // Reagir à mensagem via Whapi.Cloud usando o externalId correto
      const result = await whapiService.reactToMessage(activeConnection.whapiToken!, originalMessage.externalId || '', emoji);
      
      if (result) {
        // Salvar reação no banco
        const reaction = await storage.createMessage({
          conversationId: conversationId,
          senderId: req.user!.id,
          content: `Reação: ${emoji}`,
          messageType: 'reaction',
          direction: 'outgoing',
          status: 'sent',
          sentAt: new Date(), // Data atual para mensagens de envio
          metadata: {
            originalMessageId: messageId,
            emoji: emoji
          }
        });
        
        // Notificar via WebSocket
          if (io) {
          io.to(`company_${companyId}`).emit('newMessage', {
            ...reaction,
            conversationId: conversationId,
            companyId: companyId
          });
        }
        
        res.json({ success: true, message: 'Reação enviada com sucesso', data: reaction });
      } else {
        res.status(500).json({ message: 'Erro ao enviar reação' });
      }
      
    } catch (error: any) {
      console.error('[WhatsApp Routes] Erro ao reagir à mensagem:', error);
      res.status(500).json({ message: 'Erro interno ao reagir à mensagem' });
    }
  });

  // Rota para marcar mensagem como lida
  router.put('/conversations/:conversationId/messages/:messageId/read', requireAuth, async (req, res) => {
    try {
      const { conversationId, messageId } = req.params;
      const { companyId } = req.user!;
      
      console.log(`[WhatsApp Routes] Marcando mensagem ${messageId} como lida`);
      
      // Verificar se a conversa pertence à empresa
      const conversation = await storage.getConversation(conversationId);
      if (!conversation || conversation.companyId !== companyId) {
        return res.status(404).json({ message: 'Conversa não encontrada' });
      }

      // Buscar conexão WhatsApp ativa
      const connections = await storage.getWhatsAppConnectionsByCompany(companyId);
      const activeConnection = connections.find(c => c.status === 'connected' && c.whapiToken);
      
      if (!activeConnection) {
        return res.status(400).json({ message: 'Nenhuma conexão WhatsApp ativa encontrada' });
      }
      
      // Marcar como lida via Whapi.Cloud
      const result = await whapiService.markMessageAsRead(activeConnection.whapiToken!, messageId);
      
      if (result) {
        // Atualizar status no banco com novos campos
        await storage.updateMessage(messageId, { 
          status: 'read',
          isRead: true,
          readAt: new Date()
        });
        
        // Notificar via WebSocket
        if (io) {
          io.to(`company_${companyId}`).emit('messageStatusUpdate', {
            messageId: messageId,
            status: 'read',
            conversationId: conversationId,
            companyId: companyId,
            timestamp: new Date().toISOString()
          });
        }
        
        res.json({ success: true, message: 'Mensagem marcada como lida' });
      } else {
        res.status(500).json({ message: 'Erro ao marcar mensagem como lida' });
      }
      
    } catch (error: any) {
      console.error('[WhatsApp Routes] Erro ao marcar mensagem como lida:', error);
      res.status(500).json({ message: 'Erro interno ao marcar mensagem como lida' });
    }
  });

  // Rota para marcar todas as mensagens de uma conversa como lidas
  router.post('/conversations/:conversationId/mark-all-read', requireAuth, async (req, res) => {
    try {
      const { conversationId } = req.params;
      const { companyId } = req.user!;
      
      console.log(`[WhatsApp Routes] Marcando todas as mensagens da conversa ${conversationId} como lidas`);
      
      // Verificar se a conversa pertence à empresa
      const conversation = await storage.getConversation(conversationId);
      if (!conversation || conversation.companyId !== companyId) {
        return res.status(404).json({ message: 'Conversa não encontrada' });
      }

      // Marcar todas as mensagens incoming como lidas
      await db.update(messages)
        .set({ 
          status: 'read', 
          isRead: true, 
          readAt: new Date() 
        })
        .where(and(
          eq(messages.conversationId, conversationId),
          eq(messages.direction, 'incoming'),
          eq(messages.isRead, false)
        ));

      console.log(`[WhatsApp Routes] ✅ Mensagens da conversa ${conversationId} marcadas como lidas`);
      
      res.json({ success: true, message: 'Mensagens marcadas como lidas' });
      
    } catch (error: any) {
      console.error('[WhatsApp Routes] Erro ao marcar mensagens como lidas:', error);
      res.status(500).json({ message: 'Erro interno ao marcar mensagens como lidas' });
    }
  });

  // Rota para buscar mensagens de um chat específico
  router.get('/conversations/:conversationId/messages', requireAuth, async (req, res) => {
    try {
      const { conversationId } = req.params;
      const { limit = 50 } = req.query;
      const { companyId } = req.user!;
      
      console.log(`[WhatsApp Routes] Buscando mensagens da conversa ${conversationId}`);
      
      // Verificar se a conversa pertence à empresa
      const conversation = await storage.getConversation(conversationId);
      if (!conversation || conversation.companyId !== companyId) {
        return res.status(404).json({ message: 'Conversa não encontrada' });
      }

      // Buscar conexão WhatsApp ativa
      const connections = await storage.getWhatsAppConnectionsByCompany(companyId);
      const activeConnection = connections.find(c => c.status === 'connected' && c.whapiToken);
      
      if (!activeConnection) {
        return res.status(400).json({ message: 'Nenhuma conexão WhatsApp ativa encontrada' });
      }
      
      // Buscar mensagens via Whapi.Cloud
      const chatId = `${conversation.contactPhone}@s.whatsapp.net`;
      const result = await whapiService.getMessagesByChat(activeConnection.whapiToken!, chatId, Number(limit));
      
      res.json({ success: true, data: result });
      
    } catch (error: any) {
      console.error('[WhatsApp Routes] Erro ao buscar mensagens:', error);
      res.status(500).json({ message: 'Erro interno ao buscar mensagens' });
    }
  });

  // Rota para processar mensagens não processadas
  router.post('/process-messages', requireAuth, async (req, res) => {
    try {
      const { companyId } = req.user!;
      
      console.log(`[WhatsApp Routes] Processando mensagens não processadas para empresa ${companyId}`);
      
      // Buscar conexão WhatsApp ativa
      const connections = await storage.getWhatsAppConnectionsByCompany(companyId);
      const activeConnection = connections.find(c => c.status === 'connected' && c.whapiToken);
      
      if (!activeConnection) {
        return res.status(400).json({ message: 'Nenhuma conexão WhatsApp ativa encontrada' });
      }
      
      // Processar mensagens não processadas
      await whapiService.fetchAndProcessMessages(activeConnection.whapiToken!, companyId, storage);
      
      res.json({ success: true, message: 'Mensagens processadas com sucesso' });
      
    } catch (error: any) {
      console.error('[WhatsApp Routes] Erro ao processar mensagens:', error);
      res.status(500).json({ message: 'Erro interno ao processar mensagens' });
    }
  });

  // Rota temporária para configurar webhook
  router.post('/connections/:connectionId/configure-webhook', requireAuth, async (req, res) => {
    try {
      const { connectionId } = req.params;
      const { companyId } = req.user!;
      
      console.log(`[WhatsApp Routes] Configurando webhook para conexão: ${connectionId}`);
      
      // Buscar conexão
      const connection = await storage.getWhatsAppConnection(connectionId);
      if (!connection || connection.companyId !== companyId) {
        return res.status(404).json({ message: 'Conexão não encontrada' });
      }
      
      if (!connection.whapiToken) {
        return res.status(400).json({ message: 'Token Whapi.Cloud não encontrado' });
      }
      
      // Configurar webhook
      const webhookUrl = `${process.env.MAIN_APP_URL}/api/whatsapp/webhook`;
      await whapiService.configureChannelWebhook(connection.whapiToken, webhookUrl);
      
      res.json({ success: true, message: 'Webhook configurado com sucesso' });
    } catch (error: any) {
      console.error('[WhatsApp Routes] Erro ao configurar webhook:', error);
      res.status(500).json({ message: 'Erro interno ao configurar webhook' });
    }
  });

  // Rota temporária para listar todas as conexões (para debug)
  router.get('/connections/debug', async (req, res) => {
    try {
      const connections = await storage.getAllWhatsAppConnections();
      res.json({
        connections: connections.map(c => ({
          id: c.id,
          phone: c.phone,
          status: c.status,
          companyId: c.companyId,
          connectionName: c.connectionName,
          hasToken: !!c.whapiToken
        }))
      });
    } catch (error: any) {
      console.error('[WhatsApp] Erro ao listar conexões:', error);
      res.status(500).json({ message: 'Erro interno' });
    }
  });

  // Rota para configurar webhook automaticamente ao conectar canal
  router.post('/connections/:connectionId/setup-webhook', requireAuth, async (req, res) => {
    try {
      const { connectionId } = req.params;
      const { companyId } = req.user!;
      
      console.log(`[WhatsApp] Configurando webhook automático para: ${connectionId}`);
      
      // Buscar conexão
      const connection = await storage.getWhatsAppConnection(connectionId);
      if (!connection || connection.companyId !== companyId) {
        return res.status(404).json({ message: 'Conexão não encontrada' });
      }
      
      if (!connection.whapiToken) {
        return res.status(400).json({ message: 'Token não encontrado' });
      }
      
      // URL do webhook (usar variável de ambiente ou domínio atual)
      const webhookUrl = process.env.WEBHOOK_URL || `https://app.fivconnect.net/api/whatsapp/webhook`;
      
      // Configurar webhook usando token do canal
      await whapiService.configureWebhook(connection.whapiToken, webhookUrl);
      
      // Atualizar conexão no banco
      await storage.updateWhatsAppConnection(connectionId, {
        webhookUrl: webhookUrl,
        updatedAt: new Date()
      });
      
      res.json({
        success: true, 
        message: 'Webhook configurado automaticamente',
        webhookUrl 
      });
    } catch (error: any) {
      console.error('[WhatsApp] Erro ao configurar webhook:', error);
      res.status(500).json({ 
        message: 'Erro ao configurar webhook',
        error: error.message 
      });
    }
  });

  // ==================== ROTAS DE PROTOCOLO DE ATENDIMENTO ====================

  // Rota para finalizar conversa
  router.post('/conversations/:conversationId/finish', requireAuth, async (req, res) => {
    try {
      const { conversationId } = req.params;
      const { companyId, id: userId } = req.user!;
      
      console.log(`[WhatsApp Routes] Finalizando conversa: ${conversationId} pelo usuário: ${userId}`);
      
      const conversation = await storage.getConversation(conversationId);
      if (!conversation || conversation.companyId !== companyId) {
        return res.status(404).json({ message: 'Conversa não encontrada' });
      }

      if (conversation.isFinished) {
        return res.status(400).json({ message: 'Conversa já foi finalizada' });
      }

      // Gerar número de protocolo se não existir
      let protocolNumber = conversation.protocolNumber;
      if (!protocolNumber) {
        const { ProtocolGenerator } = await import('./utils/protocol-generator');
        protocolNumber = await ProtocolGenerator.generateSequentialProtocolNumber(companyId, storage);
      }

      // Finalizar conversa
      const updatedConversation = await storage.updateConversation(conversationId, {
        status: 'completed',
        isFinished: true,
        finishedAt: new Date(),
        finishedBy: userId,
        protocolNumber: protocolNumber
      });

      // Atualizar chat_sessions correspondente
      const chatId = conversation.contactPhone + '@s.whatsapp.net';
      await db.update(chatSessions)
        .set({
          status: 'finished',
          finishedAt: new Date()
        })
        .where(eq(chatSessions.chatId, chatId));

      console.log(`[WhatsApp Routes] ✅ Conversa ${conversationId} finalizada com protocolo: ${protocolNumber}`);
      console.log(`[WhatsApp Routes] ✅ Chat session ${chatId} marcada como finalizada`);

      // Notificar via WebSocket
      if (io) {
        io.to(`company_${companyId}`).emit('conversationUpdate', {
        conversationId: conversationId,
          status: 'completed',
          isFinished: true,
          protocolNumber: protocolNumber,
          finishedAt: new Date().toISOString(),
          companyId: companyId
        });
      }

        res.json({
        success: true,
        message: 'Conversa finalizada com sucesso',
        conversation: updatedConversation,
        protocolNumber: protocolNumber
      });

    } catch (error: any) {
      console.error('[WhatsApp Routes] Erro ao finalizar conversa:', error);
      res.status(500).json({ message: 'Erro interno ao finalizar conversa' });
    }
  });

  // Rota para iniciar conversa (waiting -> in_progress)
  router.post('/conversations/:conversationId/start', requireAuth, async (req, res) => {
    try {
      const { conversationId } = req.params;
      const { companyId, id: userId } = req.user!;
      const io = app.get('io');

      const conversation = await storage.getConversation(conversationId);
      if (!conversation || conversation.companyId !== companyId) {
        return res.status(404).json({ message: 'Conversa não encontrada' });
      }

      if (conversation.status !== 'waiting') {
        return res.status(400).json({ message: 'Conversa já foi iniciada' });
      }

      const updatedConversation = await storage.updateConversation(conversationId, {
        status: 'in_progress',
        assignedAgentId: userId,
        startedAt: new Date()
      });

      if (io) {
        io.to(`company_${companyId}`).emit('conversationUpdate', {
          conversationId,
          status: 'in_progress',
          assignedAgentId: userId,
          startedAt: new Date().toISOString(),
          companyId
        });
        io.to(`conversation:${conversationId}`).emit('conversationUpdate', {
          conversationId,
          status: 'in_progress',
          assignedAgentId: userId,
          startedAt: new Date().toISOString(),
          companyId
        });
      }

      res.json({ success: true, conversation: updatedConversation });
    } catch (error: any) {
      console.error('[WhatsApp Routes] Erro ao iniciar conversa:', error);
      res.status(500).json({ message: 'Erro interno ao iniciar conversa' });
    }
  });

  // Rota para criar nova conversa (iniciar novo atendimento)
  router.post('/conversations/:conversationId/restart', requireAuth, async (req, res) => {
    try {
      const { conversationId } = req.params;
      const { companyId, id: userId } = req.user!;
      
      console.log(`[WhatsApp Routes] Iniciando novo atendimento para cliente da conversa: ${conversationId}`);
      
      const oldConversation = await storage.getConversation(conversationId);
      if (!oldConversation || oldConversation.companyId !== companyId) {
        return res.status(404).json({ message: 'Conversa não encontrada' });
      }

      // Verificar se a conversa anterior foi finalizada
      if (!oldConversation.isFinished) {
        return res.status(400).json({ message: 'A conversa anterior deve ser finalizada antes de iniciar um novo atendimento' });
      }

      // Gerar novo número de protocolo
      const { ProtocolGenerator } = await import('./utils/protocol-generator');
      const newProtocolNumber = await ProtocolGenerator.generateSequentialProtocolNumber(companyId, storage);

      // Criar nova conversa para o mesmo cliente
      const newConversation = await storage.createConversation({
        contactName: oldConversation.contactName,
        contactPhone: oldConversation.contactPhone,
        clientId: oldConversation.clientId,
        companyId: companyId,
        status: 'waiting',
        priority: 'medium',
        protocolNumber: newProtocolNumber,
        environment: 'production'
      });

      console.log(`[WhatsApp Routes] ✅ Nova conversa criada: ${newConversation.id} com protocolo: ${newProtocolNumber}`);

      // Notificar via WebSocket
      if (io) {
        io.to(`company_${companyId}`).emit('newConversation', {
          conversation: newConversation,
          companyId: companyId
        });
      }

        res.json({
        success: true,
        message: 'Novo atendimento iniciado com sucesso',
        conversation: newConversation,
        protocolNumber: newProtocolNumber
      });

    } catch (error: any) {
      console.error('[WhatsApp Routes] Erro ao iniciar novo atendimento:', error);
      res.status(500).json({ message: 'Erro interno ao iniciar novo atendimento' });
    }
  });

  // Rota para buscar conversas finalizadas (histórico)
  router.get('/conversations/finished', requireAuth, async (req, res) => {
    try {
      const { companyId } = req.user!;
      const { limit = 50, offset = 0 } = req.query;
      
      console.log(`[WhatsApp Routes] Buscando conversas finalizadas para empresa: ${companyId}`);
      
      // Buscar conversas finalizadas da empresa
      const finishedConversations = await db.select()
        .from(conversations)
        .where(and(
          eq(conversations.companyId, companyId),
          eq(conversations.isFinished, true)
        ))
        .orderBy(desc(conversations.finishedAt))
        .limit(Number(limit))
        .offset(Number(offset));
      
      res.json({
        success: true,
        conversations: finishedConversations,
        total: finishedConversations.length
      });

    } catch (error: any) {
      console.error('[WhatsApp Routes] Erro ao buscar conversas finalizadas:', error);
      res.status(500).json({ message: 'Erro interno ao buscar conversas finalizadas' });
    }
  });

  // Rota para buscar conversa por protocolo
  router.get('/conversations/protocol/:protocolNumber', requireAuth, async (req, res) => {
    try {
      const { protocolNumber } = req.params;
      const { companyId } = req.user!;
      
      console.log(`[WhatsApp Routes] Buscando conversa por protocolo: ${protocolNumber}`);
      
      const conversation = await db.select()
        .from(conversations)
        .where(and(
          eq(conversations.protocolNumber, protocolNumber),
          eq(conversations.companyId, companyId)
        ))
        .limit(1);
      
      if (conversation.length === 0) {
        return res.status(404).json({ message: 'Conversa não encontrada para este protocolo' });
      }

      // Buscar mensagens da conversa
      const messages = await storage.getMessagesByConversation(conversation[0].id);

      res.json({
        success: true,
        conversation: conversation[0],
        messages: messages
      });

    } catch (error: any) {
      console.error('[WhatsApp Routes] Erro ao buscar conversa por protocolo:', error);
      res.status(500).json({ message: 'Erro interno ao buscar conversa por protocolo' });
    }
  });

  // Endpoint para forçar busca de mensagens não processadas
  router.post('/messages/sync', requireAuth, async (req, res) => {
    try {
      const { companyId } = req.user!;
      console.log(`[WhatsApp Routes] Sincronizando mensagens para empresa: ${companyId}`);
      
      // Buscar conexão ativa
      const activeConnection = await storage.getActiveWhapiConnection(companyId);
      
      if (!activeConnection || !activeConnection.whapiToken) {
        return res.status(400).json({
          success: false,
          message: 'Nenhuma conexão WhatsApp ativa encontrada'
        });
      }

      // Buscar conversas ativas da empresa
      const activeConversations = await db.select()
        .from(conversations)
        .where(and(
          eq(conversations.companyId, companyId),
          eq(conversations.isFinished, false)
        ));

      let totalMessagesProcessed = 0;
      
      for (const conversation of activeConversations) {
        try {
          // Construir chat ID baseado no telefone do cliente
          const chatId = `55${conversation.contactPhone}@s.whatsapp.net`;
          
          // Processar mensagens do chat
          await whapiService.processMessagesByChatId(chatId, activeConnection.whapiToken, storage);
          totalMessagesProcessed++;
    } catch (error) {
          console.error(`[WhatsApp Routes] Erro ao processar chat ${conversation.contactPhone}:`, error);
        }
      }

      res.json({
        success: true,
        message: `Sincronização concluída. ${totalMessagesProcessed} conversas processadas.`,
        conversationsProcessed: totalMessagesProcessed
      });
    } catch (error: any) {
      console.error('[WhatsApp Routes] Erro na sincronização de mensagens:', error);
      res.status(500).json({ 
        success: false,
        message: 'Erro interno na sincronização',
        error: error.message 
      });
    }
  });

  // Endpoint temporário para testar chat sessions
  router.get('/chat-sessions', requireAuth, async (req, res) => {
    try {
      const { companyId } = req.user!;
      const { status } = req.query;
      
      console.log(`[WhatsApp Routes] Listando chat sessions para empresa: ${companyId}, status: ${status}`);
      
      let sessions;
      if (status) {
        sessions = await storage.getChatSessionsByStatus(status as string, companyId);
      } else {
        // Buscar todas as sessões ativas (waiting e in_progress)
        const waitingSessions = await storage.getChatSessionsByStatus('waiting', companyId);
        const inProgressSessions = await storage.getChatSessionsByStatus('in_progress', companyId);
        sessions = [...waitingSessions, ...inProgressSessions];
      }
      
      res.json({
        success: true,
        sessions: sessions,
        total: sessions.length
      });
    } catch (error: any) {
      console.error('[WhatsApp Routes] Erro ao listar chat sessions:', error);
      res.status(500).json({ 
        success: false,
        message: 'Erro interno ao listar chat sessions',
        error: error.message 
      });
    }
  });

  // Endpoint para finalizar uma chat session
  router.post('/chat-sessions/:sessionId/finish', requireAuth, async (req, res) => {
    try {
      const { sessionId } = req.params;
      const { companyId } = req.user!;
      
      console.log(`[WhatsApp Routes] Finalizando chat session: ${sessionId}`);
      
      // Verificar se a sessão pertence à empresa
      const session = await storage.getChatSession(sessionId);
      if (!session || session.companyId !== companyId) {
        return res.status(404).json({ 
          success: false,
          message: 'Chat session não encontrada' 
        });
      }
      
      // Finalizar a sessão
      const finishedSession = await storage.finishChatSession(sessionId);
      
      res.json({
        success: true,
        message: 'Chat session finalizada com sucesso',
        session: finishedSession
      });
    } catch (error: any) {
      console.error('[WhatsApp Routes] Erro ao finalizar chat session:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno ao finalizar chat session',
        error: error.message
      });
    }
  });

  // Debug route para verificar mensagens recentes
  router.get('/messages/debug', async (req, res) => {
    try {
      console.log('[DEBUG] Verificando mensagens recentes...');
      
      // Buscar mensagens dos últimos 30 minutos
      const recentMessages = await storage.getRecentMessages(30);
      console.log(`[DEBUG] Encontradas ${recentMessages.length} mensagens recentes`);
      
      // Buscar conversas relacionadas ao número de teste
      const testConversations = await storage.getConversationsByPhone('5511943274695');
      console.log(`[DEBUG] Encontradas ${testConversations.length} conversas para 5511943274695`);
      
      // Buscar todas as conversas recentes
      const allConversations = await storage.getAllConversations();
      console.log(`[DEBUG] Total de conversas no banco: ${allConversations.length}`);
      
      // Buscar chat sessions específicas mencionadas nos logs
      const specificChatSessions = await storage.getChatSessionsByIds([
        'fe9a404b-0154-4b3b-b05e-c7a576402296',
        'b2d82266-29d8-48f9-8a77-0efa7eb11715'
      ]);
      console.log(`[DEBUG] Chat sessions específicas encontradas: ${specificChatSessions.length}`);
      
      res.json({
        recentMessages: recentMessages.slice(0, 10), // Últimas 10 mensagens
        testConversations,
        allConversations: allConversations.slice(0, 5), // Primeiras 5 conversas
        specificChatSessions,
        totalRecent: recentMessages.length,
        totalConversations: allConversations.length
      });
    } catch (error) {
      console.error('[DEBUG] Erro ao verificar mensagens:', error);
      res.status(500).json({ error: 'Erro interno', details: error.message });
    }
  });

  // Debug route para criar conexão de teste
  router.post('/connections/create-test', async (req, res) => {
    try {
      console.log('[DEBUG] Criando conexão de teste...');
      
      const connection = await storage.createWhatsAppConnection({
        companyId: '59b4b086-9171-4dbf-8177-b7c6d6fd1e33',
        connectionName: 'Canal Teste WONDRW-8N63P',
        instanceName: 'WONDRW-8N63P',
        whapiToken: 'P9WVIZXK9et8nODf0XF9yLWKdqCqcx7M',
        number: '5511972244707',
        status: 'connected',
        environment: 'production',
        webhookUrl: 'https://app.fivconnect.net/api/whatsapp/webhook'
      });
      
      // Atualizar o campo phone se estiver null
      if (!connection.phone) {
        await storage.updateWhatsAppConnection(connection.id, { phone: '5511972244707' });
        connection.phone = '5511972244707';
      }
      
      console.log(`[DEBUG] Conexão criada: ${connection.id}`);
      
      res.json({ 
        success: true,
        connection: connection
      });
    } catch (error) {
      console.error('[DEBUG] Erro ao criar conexão:', error);
      res.status(500).json({ error: 'Erro interno', details: error.message });
    }
  });

  // Debug route para atualizar conexão existente
  router.post('/connections/update-phone', async (req, res) => {
    try {
      console.log('[DEBUG] Atualizando número da conexão...');
      
      // Normalizar número para formato correto
      const { normalizePhoneForSearch } = await import('./utils/phone-normalizer');
      const normalizedPhone = normalizePhoneForSearch('5511972244707');
      
      const connection = await storage.updateWhatsAppConnection('7facb766-a139-406d-a5ce-b3fc0483e37e', { 
        phone: normalizedPhone 
      });
      
      console.log(`[DEBUG] Conexão atualizada: ${connection.id} com número: ${normalizedPhone}`);
      
      res.json({ 
        success: true,
        connection: connection,
        normalizedPhone: normalizedPhone
      });
    } catch (error) {
      console.error('[DEBUG] Erro ao atualizar conexão:', error);
      res.status(500).json({ error: 'Erro interno', details: error.message });
    }
  });

  // ===== PARTNER API ROUTES =====

  // GET /api/whatsapp/partner/info
  // Retorna saldo geral do partner
  router.get('/partner/info', requireAuth, requireRole(['superadmin']), async (req, res) => {
    try {
      console.log('[WhatsApp Routes] Buscando informações do partner...');
      const partnerInfo = await whapiService.getPartnerInfo();
      res.json({ success: true, data: partnerInfo });
    } catch (error: any) {
      console.error('[WhatsApp Routes] Erro ao buscar informações do partner:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // GET /api/whatsapp/partner/channels
  // Lista todos os canais do partner
  router.get('/partner/channels', requireAuth, requireRole(['superadmin']), async (req, res) => {
    try {
      console.log('[WhatsApp Routes] Listando canais do partner...');
      const channels = await whapiService.listPartnerChannels();
      res.json({ success: true, data: channels });
    } catch (error: any) {
      console.error('[WhatsApp Routes] Erro ao listar canais do partner:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // POST /api/whatsapp/partner/channels/:channelId/extend
  // Adiciona dias a um canal específico
  router.post('/partner/channels/:channelId/extend', requireAuth, requireRole(['superadmin']), async (req, res) => {
    try {
      const { channelId } = req.params;
      const { days } = req.body;
      
      if (!days || days <= 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'Número de dias deve ser maior que zero' 
        });
      }
      
      console.log(`[WhatsApp Routes] Estendendo canal ${channelId} por ${days} dias...`);
      await whapiService.extendChannelDays(channelId, days);
      res.json({ success: true, message: `${days} dias adicionados com sucesso` });
    } catch (error: any) {
      console.error('[WhatsApp Routes] Erro ao estender canal:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // POST /api/whatsapp/channels/:channelId/extend
  // Adiciona dias a um canal específico (endpoint unificado)
  router.post('/channels/:channelId/extend', requireAuth, requireRole(['superadmin']), async (req, res) => {
    try {
      const { channelId } = req.params;
      const { days } = req.body;
      
      if (!days || days <= 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'Número de dias deve ser maior que zero' 
        });
      }
      
      console.log(`[WhatsApp Routes] Estendendo canal ${channelId} por ${days} dias...`);
      await whapiService.extendChannelDays(channelId, days);
      res.json({ success: true, message: `${days} dias adicionados com sucesso` });
    } catch (error: any) {
      console.error('[WhatsApp Routes] Erro ao estender canal:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // POST /api/whatsapp/partner/credits/add
  // Adiciona créditos à conta partner
  router.post('/partner/credits/add', requireAuth, requireRole(['superadmin']), async (req, res) => {
    try {
      const { amount, currency = 'BRL' } = req.body;
      
      if (!amount || amount <= 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'Valor deve ser maior que zero' 
        });
      }
      
      console.log(`[WhatsApp Routes] Adicionando ${amount} ${currency} de créditos...`);
      await whapiService.addPartnerCredits(amount, currency);
      res.json({ success: true, message: 'Créditos adicionados com sucesso' });
    } catch (error: any) {
      console.error('[WhatsApp Routes] Erro ao adicionar créditos:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // ===== ROTAS DE TAGS =====
  
  // GET /api/tags - Listar tags da empresa
  router.get('/tags', requireAuth, async (req, res) => {
    try {
      const { companyId } = req.user!;
      const tags = await storage.getTagsByCompany(companyId);
      
      res.json({
        success: true,
        tags
      });
    } catch (error: any) {
      console.error('[Tags] Erro ao listar tags:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno ao listar tags',
        error: error.message
      });
    }
  });

  // POST /api/tags - Criar nova tag
  router.post('/tags', requireAuth, async (req, res) => {
    try {
      const { companyId } = req.user!;
      const { name, color, description } = req.body;

      if (!name || !color) {
        return res.status(400).json({
          success: false,
          message: 'Nome e cor são obrigatórios'
        });
      }

      const tag = await storage.createTag({
        name,
        color,
        description,
        companyId,
        environment: 'production'
      });

      res.json({
        success: true,
        message: 'Tag criada com sucesso',
        tag
      });
    } catch (error: any) {
      console.error('[Tags] Erro ao criar tag:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno ao criar tag',
        error: error.message
      });
    }
  });

  // PUT /api/tags/:id - Atualizar tag
  router.put('/tags/:id', requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { name, color, description } = req.body;
      const { companyId } = req.user!;

      // Verificar se a tag pertence à empresa
      const existingTag = await storage.getTag(id);
      if (!existingTag || existingTag.companyId !== companyId) {
        return res.status(404).json({
          success: false,
          message: 'Tag não encontrada'
        });
      }

      const updatedTag = await storage.updateTag(id, {
        name,
        color,
        description
      });

      res.json({
        success: true,
        message: 'Tag atualizada com sucesso',
        tag: updatedTag
      });
    } catch (error: any) {
      console.error('[Tags] Erro ao atualizar tag:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno ao atualizar tag',
        error: error.message
      });
    }
  });

  // DELETE /api/tags/:id - Deletar tag
  router.delete('/tags/:id', requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { companyId } = req.user!;

      // Verificar se a tag pertence à empresa
      const existingTag = await storage.getTag(id);
      if (!existingTag || existingTag.companyId !== companyId) {
        return res.status(404).json({
          success: false,
          message: 'Tag não encontrada'
        });
      }

      const deleted = await storage.deleteTag(id);
      if (!deleted) {
        return res.status(500).json({
          success: false,
          message: 'Erro ao deletar tag'
        });
      }

      res.json({
        success: true,
        message: 'Tag deletada com sucesso'
      });
    } catch (error: any) {
      console.error('[Tags] Erro ao deletar tag:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno ao deletar tag',
        error: error.message
      });
    }
  });

  // GET /api/conversations/:id/tags - Listar tags de uma conversa
  router.get('/conversations/:id/tags', requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { companyId } = req.user!;

      // Verificar se a conversa pertence à empresa
      const conversation = await storage.getConversation(id);
      if (!conversation || conversation.companyId !== companyId) {
        return res.status(404).json({
          success: false,
          message: 'Conversa não encontrada'
        });
      }

      const tags = await storage.getConversationTags(id);

      res.json({
        success: true,
        tags
      });
    } catch (error: any) {
      console.error('[Tags] Erro ao listar tags da conversa:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno ao listar tags da conversa',
        error: error.message
      });
    }
  });

  // POST /api/conversations/:id/tags - Adicionar tag à conversa
  router.post('/conversations/:id/tags', requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { tagId } = req.body;
      const { companyId } = req.user!;

      if (!tagId) {
        return res.status(400).json({
          success: false,
          message: 'ID da tag é obrigatório'
        });
      }

      // Verificar se a conversa pertence à empresa
      const conversation = await storage.getConversation(id);
      if (!conversation || conversation.companyId !== companyId) {
        return res.status(404).json({
          success: false,
          message: 'Conversa não encontrada'
        });
      }

      // Verificar se a tag pertence à empresa
      const tag = await storage.getTag(tagId);
      if (!tag || tag.companyId !== companyId) {
        return res.status(404).json({
          success: false,
          message: 'Tag não encontrada'
        });
      }

      const conversationTag = await storage.addTagToConversation(id, tagId);

      res.json({
        success: true,
        message: 'Tag adicionada à conversa com sucesso',
        conversationTag
      });
    } catch (error: any) {
      console.error('[Tags] Erro ao adicionar tag à conversa:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno ao adicionar tag à conversa',
        error: error.message
      });
    }
  });

  // DELETE /api/conversations/:id/tags/:tagId - Remover tag da conversa
  router.delete('/conversations/:id/tags/:tagId', requireAuth, async (req, res) => {
    try {
      const { id, tagId } = req.params;
      const { companyId } = req.user!;

      // Verificar se a conversa pertence à empresa
      const conversation = await storage.getConversation(id);
      if (!conversation || conversation.companyId !== companyId) {
        return res.status(404).json({
          success: false,
          message: 'Conversa não encontrada'
        });
      }

      const removed = await storage.removeTagFromConversation(id, tagId);
      if (!removed) {
        return res.status(404).json({
          success: false,
          message: 'Tag não encontrada na conversa'
        });
      }

      res.json({
        success: true,
        message: 'Tag removida da conversa com sucesso'
      });
    } catch (error: any) {
      console.error('[Tags] Erro ao remover tag da conversa:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno ao remover tag da conversa',
        error: error.message
      });
    }
  });

  // ===== ROTAS DE TEMPLATES DE MENSAGENS =====
  
  // GET /api/templates - Listar templates da empresa
  router.get('/templates', requireAuth, async (req, res) => {
    try {
      const { companyId } = req.user!;
      const templates = await storage.getMessageTemplatesByCompany(companyId);
      
      res.json({
        success: true,
        templates
      });
    } catch (error: any) {
      console.error('[Templates] Erro ao listar templates:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno ao listar templates',
        error: error.message
      });
    }
  });

  // POST /api/templates - Criar novo template
  router.post('/templates', requireAuth, async (req, res) => {
    try {
      const { companyId } = req.user!;
      const { name, content, category, variables } = req.body;

      if (!name || !content) {
        return res.status(400).json({
          success: false,
          message: 'Nome e conteúdo são obrigatórios'
        });
      }

      const template = await storage.createMessageTemplate({
        name,
        content,
        category: category || 'geral',
        variables: variables || [],
        companyId,
        isActive: true,
        environment: 'production'
      });

      res.json({
        success: true,
        message: 'Template criado com sucesso',
        template
      });
    } catch (error: any) {
      console.error('[Templates] Erro ao criar template:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno ao criar template',
        error: error.message
      });
    }
  });

  // PUT /api/templates/:id - Atualizar template
  router.put('/templates/:id', requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { name, content, category, variables, isActive } = req.body;
      const { companyId } = req.user!;

      // Verificar se o template pertence à empresa
      const existingTemplate = await storage.getMessageTemplate(id);
      if (!existingTemplate || existingTemplate.companyId !== companyId) {
        return res.status(404).json({
          success: false,
          message: 'Template não encontrado'
        });
      }

      const updatedTemplate = await storage.updateMessageTemplate(id, {
        name,
        content,
        category,
        variables,
        isActive
      });

      res.json({
        success: true,
        message: 'Template atualizado com sucesso',
        template: updatedTemplate
      });
    } catch (error: any) {
      console.error('[Templates] Erro ao atualizar template:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno ao atualizar template',
        error: error.message
      });
    }
  });

  // DELETE /api/templates/:id - Deletar template
  router.delete('/templates/:id', requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { companyId } = req.user!;

      // Verificar se o template pertence à empresa
      const existingTemplate = await storage.getMessageTemplate(id);
      if (!existingTemplate || existingTemplate.companyId !== companyId) {
        return res.status(404).json({
          success: false,
          message: 'Template não encontrado'
        });
      }

      const deleted = await storage.deleteMessageTemplate(id);
      if (!deleted) {
        return res.status(500).json({
          success: false,
          message: 'Erro ao deletar template'
        });
      }

      res.json({
        success: true,
        message: 'Template deletado com sucesso'
      });
    } catch (error: any) {
      console.error('[Templates] Erro ao deletar template:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno ao deletar template',
        error: error.message
      });
    }
  });

  // POST /api/templates/:id/process - Processar template com variáveis
  router.post('/templates/:id/process', requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { variables } = req.body;
      const { companyId } = req.user!;

      // Buscar template
      const template = await storage.getMessageTemplate(id);
      if (!template || template.companyId !== companyId) {
        return res.status(404).json({
          success: false,
          message: 'Template não encontrado'
        });
      }

      // Processar variáveis no conteúdo
      let processedContent = template.content;
      if (variables && typeof variables === 'object') {
        Object.entries(variables).forEach(([key, value]) => {
          const regex = new RegExp(`{{${key}}}`, 'g');
          processedContent = processedContent.replace(regex, String(value));
        });
      }

      res.json({
        success: true,
        processedContent
      });
    } catch (error: any) {
      console.error('[Templates] Erro ao processar template:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno ao processar template',
        error: error.message
      });
    }
  });

  // ===== ROTAS DE ANALYTICS & MONITORAMENTO =====
  
  // GET /api/analytics/sla - Dashboard de métricas SLA
  router.get('/analytics/sla', requireAuth, async (req, res) => {
    try {
      const { companyId } = req.user!;
      const { dateFrom, dateTo } = req.query;

      // Calcular métricas SLA
      const conversations = await storage.getConversationsByCompany(companyId);
      
      // Filtrar por período se especificado
      let filteredConversations = conversations;
      if (dateFrom && dateTo) {
        const startDate = new Date(dateFrom as string);
        const endDate = new Date(dateTo as string);
        filteredConversations = conversations.filter(conv => {
          const convDate = new Date(conv.createdAt);
          return convDate >= startDate && convDate <= endDate;
        });
      }

      // Calcular métricas
      const totalConversations = filteredConversations.length;
      const completedConversations = filteredConversations.filter(c => c.status === 'finished').length;
      const completionRate = totalConversations > 0 ? Math.round((completedConversations / totalConversations) * 100) : 0;
      
      // Tempo médio de primeira resposta (simulado)
      const avgFirstResponse = '2m 15s';
      
      // Tempo médio de resolução (simulado)
      const avgResolution = '15m 30s';
      
      // Conversas por status
      const conversationsByStatus = {
        waiting: filteredConversations.filter(c => c.status === 'waiting').length,
        in_progress: filteredConversations.filter(c => c.status === 'in_progress').length,
        finished: filteredConversations.filter(c => c.status === 'finished').length
      };

      res.json({
        success: true,
        metrics: {
          totalConversations,
          completedConversations,
          completionRate,
          avgFirstResponse,
          avgResolution,
          conversationsByStatus
        }
      });
    } catch (error: any) {
      console.error('[Analytics] Erro ao buscar métricas SLA:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno ao buscar métricas SLA',
        error: error.message
      });
    }
  });

  // GET /api/analytics/heatmap - Heatmap de atendimento
  router.get('/analytics/heatmap', requireAuth, async (req, res) => {
    try {
      const { companyId } = req.user!;
      const { dateFrom, dateTo } = req.query;

      // Simular dados de heatmap (hora do dia vs dia da semana)
      const heatmapData = [];
      const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
      const hours = Array.from({ length: 24 }, (_, i) => i);

      for (let day = 0; day < 7; day++) {
        for (let hour = 0; hour < 24; hour++) {
          // Simular padrão de atendimento (mais movimentado em dias úteis, 9h-18h)
          const isWeekday = day >= 1 && day <= 5;
          const isBusinessHours = hour >= 9 && hour <= 18;
          const baseValue = isWeekday && isBusinessHours ? Math.random() * 50 + 20 : Math.random() * 10;
          
          heatmapData.push({
            day: days[day],
            hour: hour,
            value: Math.round(baseValue),
            dayIndex: day,
            hourIndex: hour
          });
        }
      }

      res.json({
        success: true,
        heatmapData
      });
    } catch (error: any) {
      console.error('[Analytics] Erro ao buscar heatmap:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno ao buscar heatmap',
        error: error.message
      });
    }
  });

  // GET /api/analytics/agent-performance - Performance por agente
  router.get('/analytics/agent-performance', requireAuth, async (req, res) => {
    try {
      const { companyId } = req.user!;
      const { dateFrom, dateTo } = req.query;

      // Simular dados de performance por agente
      const agentPerformance = [
        {
          agentId: 'agent-1',
          agentName: 'João Silva',
          totalConversations: 45,
          completedConversations: 42,
          avgResponseTime: '1m 30s',
          satisfaction: 4.8,
          completionRate: 93
        },
        {
          agentId: 'agent-2', 
          agentName: 'Maria Santos',
          totalConversations: 38,
          completedConversations: 36,
          avgResponseTime: '2m 15s',
          satisfaction: 4.6,
          completionRate: 95
        },
        {
          agentId: 'agent-3',
          agentName: 'Pedro Costa',
          totalConversations: 52,
          completedConversations: 48,
          avgResponseTime: '1m 45s',
          satisfaction: 4.9,
          completionRate: 92
        }
      ];

      res.json({
        success: true,
        agentPerformance
      });
    } catch (error: any) {
      console.error('[Analytics] Erro ao buscar performance de agentes:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno ao buscar performance de agentes',
        error: error.message
      });
    }
  });

  // GET /api/analytics/channel-status - Status dos canais
  router.get('/analytics/channel-status', requireAuth, async (req, res) => {
    try {
      const { companyId } = req.user!;
      
      // Buscar conexões WhatsApp da empresa
      const connections = await storage.getWhatsAppConnectionsByCompany(companyId);
      
      const channelStatus = connections.map(conn => ({
        id: conn.id,
        name: conn.name || 'Canal WhatsApp',
        status: conn.status || 'active',
        lastSeen: conn.updatedAt,
        isOnline: conn.status === 'active'
      }));

      res.json({
        success: true,
        channels: channelStatus
      });
    } catch (error: any) {
      console.error('[Analytics] Erro ao buscar status dos canais:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno ao buscar status dos canais',
        error: error.message
      });
    }
  });

  // ===== ROTAS DE AUTO-ASSIGN =====
  
  // GET /api/auto-assign/rules - Listar regras de auto-assign
  router.get('/auto-assign/rules', requireAuth, async (req, res) => {
    try {
      const { companyId } = req.user!;
      const rules = await storage.getAutoAssignRulesByCompany(companyId);
      
      res.json({
        success: true,
        rules
      });
    } catch (error: any) {
      console.error('[Auto-assign] Erro ao listar regras:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno ao listar regras',
        error: error.message
      });
    }
  });

  // POST /api/auto-assign/rules - Criar nova regra
  router.post('/auto-assign/rules', requireAuth, async (req, res) => {
    try {
      const { companyId } = req.user!;
      const { name, priority, conditions, actions } = req.body;

      if (!name || !conditions || !actions) {
        return res.status(400).json({
          success: false,
          message: 'Nome, condições e ações são obrigatórios'
        });
      }

      const rule = await storage.createAutoAssignRule({
        name,
        priority: priority || 1,
        conditions,
        actions,
        companyId,
        isActive: true,
        environment: 'production'
      });

      res.json({
        success: true,
        message: 'Regra criada com sucesso',
        rule
      });
    } catch (error: any) {
      console.error('[Auto-assign] Erro ao criar regra:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno ao criar regra',
        error: error.message
      });
    }
  });

  // PUT /api/auto-assign/rules/:id - Atualizar regra
  router.put('/auto-assign/rules/:id', requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { name, priority, conditions, actions, isActive } = req.body;
      const { companyId } = req.user!;

      // Verificar se a regra pertence à empresa
      const existingRule = await storage.getAutoAssignRule(id);
      if (!existingRule || existingRule.companyId !== companyId) {
        return res.status(404).json({
          success: false,
          message: 'Regra não encontrada'
        });
      }

      const updatedRule = await storage.updateAutoAssignRule(id, {
        name,
        priority,
        conditions,
        actions,
        isActive
      });

      res.json({
        success: true,
        message: 'Regra atualizada com sucesso',
        rule: updatedRule
      });
    } catch (error: any) {
      console.error('[Auto-assign] Erro ao atualizar regra:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno ao atualizar regra',
        error: error.message
      });
    }
  });

  // DELETE /api/auto-assign/rules/:id - Deletar regra
  router.delete('/auto-assign/rules/:id', requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { companyId } = req.user!;

      // Verificar se a regra pertence à empresa
      const existingRule = await storage.getAutoAssignRule(id);
      if (!existingRule || existingRule.companyId !== companyId) {
        return res.status(404).json({
          success: false,
          message: 'Regra não encontrada'
        });
      }

      const deleted = await storage.deleteAutoAssignRule(id);
      if (!deleted) {
        return res.status(500).json({
          success: false,
          message: 'Erro ao deletar regra'
        });
      }

      res.json({
        success: true,
        message: 'Regra deletada com sucesso'
      });
    } catch (error: any) {
      console.error('[Auto-assign] Erro ao deletar regra:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno ao deletar regra',
        error: error.message
      });
    }
  });

  // POST /api/auto-assign/process - Processar auto-assign para uma conversa
  router.post('/auto-assign/process', requireAuth, async (req, res) => {
    try {
      const { companyId } = req.user!;
      const { conversationId } = req.body;

      if (!conversationId) {
        return res.status(400).json({
          success: false,
          message: 'ID da conversa é obrigatório'
        });
      }

      // Buscar conversa
      const conversation = await storage.getConversation(conversationId);
      if (!conversation || conversation.companyId !== companyId) {
        return res.status(404).json({
          success: false,
          message: 'Conversa não encontrada'
        });
      }

      // Buscar regras ativas
      const rules = await storage.getActiveAutoAssignRules(companyId);
      
      // Simular processamento de auto-assign
      let assigned = false;
      let assignedAgent = null;

      for (const rule of rules) {
        // Verificar condições (simulado)
        const conditions = rule.conditions as any;
        if (conditions && conditions.status === 'waiting') {
          // Simular atribuição
          assigned = true;
          assignedAgent = 'agent-auto-assigned';
          break;
        }
      }

      res.json({
        success: true,
        assigned,
        assignedAgent,
        message: assigned ? 'Conversa atribuída automaticamente' : 'Nenhuma regra aplicável'
      });
    } catch (error: any) {
      console.error('[Auto-assign] Erro ao processar auto-assign:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno ao processar auto-assign',
        error: error.message
      });
    }
  });

  // ===== ROTAS DE AUDITORIA =====
  
  // GET /api/audit/logs - Listar logs de auditoria
  router.get('/audit/logs', requireAuth, async (req, res) => {
    try {
      const { companyId } = req.user!;
      const { limit = 100 } = req.query;
      
      const logs = await storage.getAuditLogsByCompany(companyId, Number(limit));
      
      res.json({
        success: true,
        logs
      });
    } catch (error: any) {
      console.error('[Audit] Erro ao listar logs:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno ao listar logs',
        error: error.message
      });
    }
  });

  // GET /api/audit/logs/entity/:entityType/:entityId - Logs de uma entidade específica
  router.get('/audit/logs/entity/:entityType/:entityId', requireAuth, async (req, res) => {
    try {
      const { entityType, entityId } = req.params;
      const { companyId } = req.user!;
      
      const logs = await storage.getAuditLogsByEntity(entityType, entityId, companyId);
      
      res.json({
        success: true,
        logs
      });
    } catch (error: any) {
      console.error('[Audit] Erro ao listar logs da entidade:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno ao listar logs da entidade',
        error: error.message
      });
    }
  });

  // ===== ROTAS DE EXPORT =====
  
  // GET /api/export/conversations - Exportar conversas
  router.get('/export/conversations', requireAuth, async (req, res) => {
    try {
      const { companyId } = req.user!;
      const { format = 'csv', dateFrom, dateTo } = req.query;

      // Buscar conversas do período
      const conversations = await storage.getConversationsByCompany(companyId);
      
      let filteredConversations = conversations;
      if (dateFrom && dateTo) {
        const startDate = new Date(dateFrom as string);
        const endDate = new Date(dateTo as string);
        filteredConversations = conversations.filter(conv => {
          const convDate = new Date(conv.createdAt);
          return convDate >= startDate && convDate <= endDate;
        });
      }

      if (format === 'csv') {
        // Gerar CSV
        const csvHeader = 'ID,Cliente,Telefone,Status,Criado em,Atualizado em\n';
        const csvData = filteredConversations.map(conv => 
          `${conv.id},"${conv.contactName || ''}","${conv.contactPhone || ''}",${conv.status},"${conv.createdAt}","${conv.updatedAt}"`
        ).join('\n');
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=conversations.csv');
        res.send(csvHeader + csvData);
      } else {
        res.json({
          success: true,
          data: filteredConversations,
          total: filteredConversations.length
        });
      }
    } catch (error: any) {
      console.error('[Export] Erro ao exportar conversas:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno ao exportar conversas',
        error: error.message
      });
    }
  });

  // GET /api/export/messages - Exportar mensagens
  router.get('/export/messages', requireAuth, async (req, res) => {
    try {
      const { companyId } = req.user!;
      const { conversationId, format = 'csv' } = req.query;

      if (!conversationId) {
        return res.status(400).json({
          success: false,
          message: 'ID da conversa é obrigatório'
        });
      }

      // Verificar se a conversa pertence à empresa
      const conversation = await storage.getConversation(conversationId as string);
      if (!conversation || conversation.companyId !== companyId) {
        return res.status(404).json({
          success: false,
          message: 'Conversa não encontrada'
        });
      }

      // Buscar mensagens da conversa
      const messages = await storage.getMessagesByConversation(conversationId as string);

      if (format === 'csv') {
        // Gerar CSV
        const csvHeader = 'ID,Conteúdo,Direção,Enviado em\n';
        const csvData = messages.map(msg => 
          `${msg.id},"${msg.content || ''}",${msg.direction},"${msg.sentAt || msg.createdAt}"`
        ).join('\n');
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=messages.csv');
        res.send(csvHeader + csvData);
      } else {
        res.json({
          success: true,
          data: messages,
          total: messages.length
        });
      }
    } catch (error: any) {
      console.error('[Export] Erro ao exportar mensagens:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno ao exportar mensagens',
        error: error.message
      });
    }
  });

  // Usar o router na aplicação
  app.use('/api/whatsapp', router);
}
