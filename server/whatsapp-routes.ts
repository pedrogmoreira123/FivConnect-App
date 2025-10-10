import { Express, Router } from "express";
import axios from "axios";
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { WhapiService } from "./whapi-service";
import { requireAuth, requireRole } from "./auth";
import { storage } from "./storage";
import { Logger } from "./logger";
import { and, eq, desc, isNull } from 'drizzle-orm';
import { conversations, clients, messages, users, whatsappConnections } from '../shared/schema';
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

  /**
   * GET /api/whatsapp/partner/balance
   * Obter saldo de dias disponíveis do parceiro
   */
  router.get('/partner/balance', requireAuth, requireRole(['superadmin']), async (req, res) => {
    try {
      console.log('[WhatsApp Routes] Obtendo saldo do parceiro...');
      
      const partnerInfo = await whapiService.getPartnerInfo();
      
      // Converter dias para BRL (assumindo R$ 89 por 30 dias conforme mencionado)
      const daysAvailable = partnerInfo.balance || 0;
      const pricePerDay = 89 / 30; // R$ 89 por 30 dias
      const balanceBRL = Math.round(daysAvailable * pricePerDay * 100) / 100;
      
      res.json({
        success: true,
        data: {
          daysAvailable,
          balanceBRL,
          currency: 'BRL',
          pricePerDay,
          partnerInfo
        }
      });
    } catch (error: any) {
      console.error('[WhatsApp Routes] Erro ao obter saldo do parceiro:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao obter saldo do parceiro',
        error: error.message
      });
    }
  });

  /**
   * GET /api/whatsapp/channels/:channelId/info
   * Obter informações detalhadas de um canal
   */
  router.get('/channels/:channelId/info', requireAuth, requireRole(['superadmin']), async (req, res) => {
    try {
      const { channelId } = req.params;
      console.log(`[WhatsApp Routes] Obtendo informações do canal: ${channelId}`);
      
      const channelInfo = await whapiService.getChannelInfo(channelId);
      
      res.json({
        success: true,
        data: channelInfo
      });
    } catch (error: any) {
      console.error('[WhatsApp Routes] Erro ao obter informações do canal:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao obter informações do canal',
        error: error.message
      });
    }
  });

  /**
   * POST /api/whatsapp/channels/:channelId/extend
   * Estender dias de um canal
   */
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
      
      console.log(`[WhatsApp Routes] Estendendo canal ${channelId} por ${days} dias`);
      
      const result = await whapiService.extendChannel(channelId, days);
      
      // Calcular custo em BRL
      const pricePerDay = 89 / 30; // R$ 89 por 30 dias
      const costBRL = Math.round(days * pricePerDay * 100) / 100;
      
      res.json({
        success: true,
        message: `Canal estendido com sucesso por ${days} dias`,
        data: {
          channelId,
          daysExtended: days,
          costBRL,
          currency: 'BRL',
          result
        }
      });
    } catch (error: any) {
      console.error('[WhatsApp Routes] Erro ao estender canal:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao estender canal',
        error: error.message
      });
    }
  });

  /**
   * POST /api/whatsapp/channels/activate-trial
   * Ativar canal atual com 5 dias de teste
   */
  router.post('/channels/activate-trial', requireAuth, requireRole(['superadmin']), async (req, res) => {
    try {
      const { companyId } = req.user!;
      console.log(`[WhatsApp Routes] Ativando canal de teste para empresa: ${companyId}`);
      
      // Buscar conexão ativa da empresa
      const connections = await storage.getWhatsAppConnectionsByCompany(companyId);
      if (connections.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Nenhuma conexão WhatsApp encontrada para esta empresa'
        });
      }
      
      const connection = connections[0];
      if (!connection.whapiChannelId) {
        return res.status(400).json({ 
          success: false,
          message: 'Canal ID não encontrado na conexão'
        });
      }
      
      // Estender canal com 5 dias
      const result = await whapiService.extendChannel(connection.whapiChannelId, 5);
      
      res.json({ 
        success: true,
        message: 'Canal ativado com 5 dias de teste',
        data: {
          channelId: connection.whapiChannelId,
          daysExtended: 5,
        result 
        }
      });
    } catch (error: any) {
      console.error('[WhatsApp Routes] Erro ao ativar canal de teste:', error);
      res.status(500).json({ 
        success: false,
        message: 'Erro ao ativar canal de teste',
        error: error.message 
      });
    }
  });

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
        // Formato 1: Array de strings para events
        {
          webhooks: [{
            url: webhookUrl,
            events: ["messages", "statuses", "chats"]
          }]
        },
        // Formato 2: Objeto com booleanos para events
        {
          webhooks: [{
            url: webhookUrl,
            events: {
              messages: true,
              statuses: true,
              chats: true
            }
          }]
        },
        // Formato 3: Com callback_persist
        {
          callback_persist: true,
          webhooks: [{
            url: webhookUrl,
            events: ["messages", "statuses"]
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
      console.log('='.repeat(80));
      console.log('[WEBHOOK RECEIVED] Timestamp:', new Date().toISOString());
      console.log('[WEBHOOK RECEIVED] Body:', JSON.stringify(req.body, null, 2));
      console.log('[WEBHOOK HEADERS]', JSON.stringify(req.headers, null, 2));
      console.log('[WEBHOOK] io disponível:', io ? 'SIM' : 'NÃO');
      console.log('[WEBHOOK] User-Agent:', req.headers['user-agent']);
      console.log('[WEBHOOK] Content-Type:', req.headers['content-type']);
      console.log('[WEBHOOK] X-Forwarded-For:', req.headers['x-forwarded-for']);
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
      
      res.status(200).json({ success: true, message: 'Webhook processado com sucesso' });
    } catch (error: any) {
      console.error('[WEBHOOK] Erro no webhook:', error);
      res.status(500).json({ error: 'Erro interno no webhook', details: error.message });
    }
  });

  // Função para processar diferentes tipos de eventos webhook
  const processWebhookEvent = async (webhookData: any, ioParam?: any) => {
    const ioToUse = ioParam || io;
    
    // Eventos de Mensagens
    if (webhookData.event === 'messages.new' && webhookData.data?.message) {
      console.log('[WEBHOOK] Processando evento: messages.new');
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
    try {
      console.log('[WEBHOOK] Processando mensagem direta:', messageData);
      console.log('[WEBHOOK] io disponível:', ioParam ? 'SIM' : 'NÃO');
      console.log('[WEBHOOK] io do escopo:', io ? 'SIM' : 'NÃO');
      
      // Usar o io do escopo da função setupWhatsAppRoutes se o parâmetro não estiver disponível
      const ioToUse = ioParam || io;
      
      // Normalizar dados da mensagem
      const from = messageData.from || (messageData.from_me ? messageData.to : messageData.chat_id);
      const to = messageData.to || (messageData.from_me ? messageData.from : messageData.chat_id);
      const content = messageData.text?.body || messageData.body || messageData.text || '';
      const messageId = messageData.id || messageData.message_id;
      const timestamp = messageData.timestamp || Math.floor(Date.now() / 1000);
      const fromMe = messageData.from_me || false;
      const messageType = messageData.type || 'text';
      const chatId = messageData.chat_id || '';
      
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
      
      // Normalizar número de telefone (remover @whatsapp.net e outros sufixos)
      const normalizedPhone = from.replace(/@.*$/, '').replace(/\D/g, '');
      const contactPhone = normalizedPhone.startsWith('55') ? normalizedPhone.substring(2) : normalizedPhone;
      
      console.log('[WEBHOOK] Telefone normalizado:', { from, normalizedPhone, contactPhone });
      
      // Buscar conexão WhatsApp ativa
      const connections = await storage.getWhatsAppConnectionsByCompany('59b4b086-9171-4dbf-8177-b7c6d6fd1e33'); // TODO: Detectar companyId automaticamente
      const activeConnection = connections.find(c => c.status === 'connected' && c.whapiToken);
      
      if (!activeConnection) {
        console.log('[WEBHOOK] Nenhuma conexão ativa encontrada');
        return;
      }
      
      console.log('[WEBHOOK] Conexão ativa encontrada:', activeConnection.id);
      
      // Buscar ou criar cliente com informações completas
      let client = await storage.getClientByPhone(contactPhone);
      if (!client) {
        // Extrair informações do contato do WhatsApp
        const contactName = messageData.from_name || messageData.chat_name || `Cliente ${contactPhone}`;
        const contactEmail = messageData.contact?.email || null; // Se houver email no contato
        
        client = await storage.createClient({
          name: contactName,
          phone: contactPhone,
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
      
      // Buscar ou criar conversa
      let conversation = await storage.getConversationByClient(client.id, activeConnection.companyId);
      if (!conversation) {
        // Gerar número de protocolo para nova conversa
        const { ProtocolGenerator } = await import('./utils/protocol-generator');
        const protocolNumber = await ProtocolGenerator.generateSequentialProtocolNumber(activeConnection.companyId, storage);
        
        conversation = await storage.createConversation({
          contactName: client.name,
          contactPhone: client.phone,
          clientId: client.id,
          companyId: activeConnection.companyId,
          status: 'waiting',
          priority: 'medium',
          protocolNumber: protocolNumber,
          environment: 'production'
        });
        console.log('[WEBHOOK] Conversa criada:', conversation.id, 'com protocolo:', protocolNumber);
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
      
      // Salvar mensagem
      const message = await storage.createMessage({
            conversationId: conversation.id,
        content: content,
        messageType: messageType,
        direction: 'incoming',
        status: 'delivered',
        mediaUrl: mediaUrl || undefined,
        fileName: fileName || undefined,
        externalId: messageId,
        metadata: {
          whapiMessageId: messageId,
          timestamp: timestamp,
          from: from,
          to: to,
          mediaType: messageType
        },
        environment: 'production'
      });
      
      console.log('[WEBHOOK] Mensagem salva:', message.id);
      
      // Atualizar última mensagem da conversa - NÃO alterar status se já tem usuário atribuído
      const updateData: any = {
        lastMessageAt: new Date(timestamp * 1000),
        lastMessage: content || `[${messageType}]`,
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
        
        ioToUse.to(roomName).emit('newMessage', newMessageEvent);
        console.log('📨 Evento newMessage emitido:', newMessageEvent.id);
        
        ioToUse.to(roomName).emit('conversationUpdate', conversationUpdateEvent);
        console.log('🔄 Evento conversationUpdate emitido para conversa:', conversation.id);
        
        // Verificar quantos clientes estão na sala
        const room = ioToUse.sockets.adapter.rooms.get(roomName);
        console.log(`👥 Clientes na sala ${roomName}: ${room ? room.size : 0}`);
      } else {
        console.log('❌ io não está disponível para emitir eventos WebSocket');
      }
      
      console.log('[WEBHOOK] ✅ Mensagem processada com sucesso:', content);
      
    } catch (error: any) {
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
      const normalizedPhone = phone.replace(/\D/g, '');
      console.log(`[WhatsApp Routes] 📱 Processando mensagem de: ${normalizedPhone}`);
      
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
        c.contactPhone === normalizedPhone &&
        (c.status === 'waiting' || c.status === 'in_progress')
      );

          if (!conversation) {
        console.log(`[WhatsApp Routes] 💬 Criando nova conversa para cliente: ${client.id}`);
        conversation = await storage.createConversation({
          contactName: client.name || `Cliente ${normalizedPhone}`,
          contactPhone: normalizedPhone,
          clientId: client.id,
          companyId: '59b4b086-9171-4dbf-8177-b7c6d6fd1e33',
          status: 'waiting'
        });
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
      
      // Buscar conversas não finalizadas da empresa
      const companyConversations = await db.select()
        .from(conversations)
        .where(and(
          eq(conversations.companyId, companyId),
          eq(conversations.isFinished, false), // Restaurado: mostrar apenas conversas não finalizadas
          status ? eq(conversations.status, status as any) : undefined
        ))
        .orderBy(desc(conversations.lastMessageAt));
      
      res.json(companyConversations);
    } catch (error: any) {
      console.error('[WhatsApp Routes] Erro ao buscar conversas:', error);
      res.status(500).json({ message: 'Erro interno ao buscar conversas' });
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
      
      const messages = await storage.getMessagesByConversation(conversationId);
      res.json(messages);
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
                      contactPhone: client.phone,
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
      
      // Enviar mensagem baseada no tipo
      switch (type) {
        case 'text':
          if (quotedMessageId) {
            result = await whapiService.sendReplyMessageWithToken(conversation.contactPhone || '', text, quotedMessageId, activeConnection.whapiToken!);
          } else {
            result = await whapiService.sendTextMessageWithToken(conversation.contactPhone || '', text, activeConnection.whapiToken!);
          }
          break;
          
        case 'image':
          result = await whapiService.sendImageMessageWithToken(conversation.contactPhone || '', mediaUrl, caption, activeConnection.whapiToken!);
          messageContent = caption || 'Imagem';
          break;
          
        case 'video':
          result = await whapiService.sendVideoMessageWithToken(conversation.contactPhone || '', mediaUrl, caption, activeConnection.whapiToken!);
          messageContent = caption || 'Vídeo';
          break;
          
        case 'audio':
          result = await whapiService.sendAudioMessageWithToken(conversation.contactPhone || '', mediaUrl, activeConnection.whapiToken!);
          messageContent = 'Áudio';
          break;
          
        case 'voice':
          result = await whapiService.sendVoiceMessage(activeConnection.whapiToken!, conversation.contactPhone || '', mediaUrl);
          messageContent = 'Mensagem de voz';
          break;
          
        case 'document':
          result = await whapiService.sendDocumentMessage(activeConnection.whapiToken!, conversation.contactPhone || '', mediaUrl, filename, caption);
          messageContent = caption || filename || 'Documento';
          break;
          
        case 'sticker':
          result = await whapiService.sendStickerMessageWithToken(conversation.contactPhone || '', mediaUrl, activeConnection.whapiToken!);
          messageContent = 'Sticker';
          break;
          
        case 'location':
          result = await whapiService.sendLocationMessage(
            activeConnection.whapiToken!, 
            conversation.contactPhone || '', 
            latitude, 
            longitude, 
            address, 
            name
          );
          messageContent = `Localização: ${name || address || 'Localização'}`;
          break;
          
        case 'contact':
          result = await whapiService.sendContactMessageWithToken(conversation.contactPhone || '', {
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
            companyId: companyId
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
        // Atualizar status no banco
        await storage.updateMessage(messageId, { status: 'read' });
        
        // Notificar via WebSocket
        if (io) {
          io.to(`company_${companyId}`).emit('messageRead', {
            messageId: messageId,
            conversationId: conversationId,
            companyId: companyId
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

      console.log(`[WhatsApp Routes] ✅ Conversa ${conversationId} finalizada com protocolo: ${protocolNumber}`);

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

  // Usar o router na aplicação
  app.use('/api/whatsapp', router);
}
