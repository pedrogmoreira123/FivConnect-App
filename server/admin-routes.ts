import { Express } from 'express';
import { requireAuth } from './auth';
import { storage } from './storage';
import { WhapiService } from './whapi-service';
import { Logger } from 'pino';

const logger = Logger();
const whapiService = new WhapiService(logger);

/**
 * Rotas de administração para gerenciamento de canais WhatsApp
 * Acesso restrito apenas para superadmin
 */
export function setupAdminRoutes(app: Express) {
  
  // Middleware para verificar se é superadmin
  const requireSuperAdmin = (req: any, res: any, next: any) => {
    if (req.user?.role !== 'superadmin') {
      return res.status(403).json({ message: 'Acesso negado. Apenas superadmin pode acessar esta funcionalidade.' });
    }
    next();
  };

  /**
   * GET /api/admin/companies/:companyId/whatsapp-channels
   * Visualizar todos os canais WhatsApp de uma empresa específica
   */
  app.get('/api/admin/companies/:companyId/whatsapp-channels', requireAuth, requireSuperAdmin, async (req, res) => {
    try {
      const { companyId } = req.params;

      console.log(`[Admin Routes] Buscando canais WhatsApp para empresa: ${companyId}`);

      // 1. Buscar empresa
      const company = await storage.getCompany(companyId);
      if (!company) {
        return res.status(404).json({ message: 'Empresa não encontrada' });
      }

      // 2. Buscar canais no banco de dados
      const connections = await storage.getWhatsAppConnectionsByCompany(companyId);
      console.log(`[Admin Routes] Encontrados ${connections.length} canais no banco de dados`);

      // 3. Buscar canais na API de Parceiro da Whapi.Cloud
      let whapiChannels: any[] = [];
      try {
        const partnerResponse = await whapiService.getPartnerChannels();
        whapiChannels = partnerResponse.channels || [];
        console.log(`[Admin Routes] Encontrados ${whapiChannels.length} canais na API de Parceiro`);
      } catch (error) {
        console.warn(`[Admin Routes] Erro ao buscar canais na API de Parceiro:`, error.message);
        // Continuar mesmo se a API de Parceiro falhar
      }

      // 4. Enriquecer dados dos canais
      const enrichedChannels = connections.map(connection => {
        // Encontrar canal correspondente na API de Parceiro
        const whapiChannel = whapiChannels.find(ch => ch.id === connection.whapiChannelId);
        
        return {
          id: connection.id,
          connectionName: connection.connectionName,
          name: connection.name,
          phone: connection.phone,
          status: connection.status,
          qrcode: connection.qrcode,
          profilePictureUrl: connection.profilePictureUrl,
          whapiChannelId: connection.whapiChannelId,
          providerType: connection.providerType,
          webhookUrl: connection.webhookUrl,
          isDefault: connection.isDefault,
          lastSeen: connection.lastSeen,
          createdAt: connection.createdAt,
          updatedAt: connection.updatedAt,
          // Dados da API de Parceiro (se disponível)
          whapiStatus: whapiChannel?.status || 'unknown',
          whapiCreatedAt: whapiChannel?.created_at,
          whapiUpdatedAt: whapiChannel?.updated_at
        };
      });

      // 5. Retornar resposta
      res.json({
        success: true,
        company: {
          id: company.id,
          name: company.name,
          email: company.email,
          whatsappChannelLimit: company.whatsappChannelLimit
        },
        channels: enrichedChannels,
        totalChannels: enrichedChannels.length,
        channelLimit: company.whatsappChannelLimit
      });

    } catch (error) {
      console.error('[Admin Routes] Erro ao buscar canais da empresa:', error);
      res.status(500).json({ 
        message: 'Erro interno ao buscar canais da empresa',
        error: error.message 
      });
    }
  });

  /**
   * POST /api/admin/companies/:companyId/whatsapp-channels/activate-trial
   * Ativar canal de trial para uma empresa
   */
  app.post('/api/admin/companies/:companyId/whatsapp-channels/activate-trial', requireAuth, requireSuperAdmin, async (req, res) => {
    try {
      const { companyId } = req.params;
      const { phoneNumber, name } = req.body;

      console.log(`[Admin Routes] Ativando canal de trial para empresa: ${companyId}`);

      // 1. Buscar empresa
      const company = await storage.getCompany(companyId);
      if (!company) {
        return res.status(404).json({ message: 'Empresa não encontrada' });
      }

      // 2. Verificar limite de canais
      const connections = await storage.getWhatsAppConnectionsByCompany(companyId);
      if (connections.length >= company.whatsappChannelLimit) {
        return res.status(400).json({ 
          message: 'Limite de canais atingido',
          currentChannels: connections.length,
          limit: company.whatsappChannelLimit
        });
      }

      // 3. Provisionar canal na API de Parceiro
      let whapiChannel;
      try {
        whapiChannel = await whapiService.provisionAndActivateChannel(phoneNumber, name || `Canal ${company.name}`);
        console.log(`[Admin Routes] Canal provisionado na API de Parceiro:`, whapiChannel);
      } catch (error) {
        console.error(`[Admin Routes] Erro ao provisionar canal:`, error);
        return res.status(500).json({ 
          message: 'Erro ao provisionar canal na API de Parceiro',
          error: error.message 
        });
      }

      // 4. Criar conexão no banco de dados
      const connection = await storage.createWhatsAppConnection({
        companyId: companyId,
        connectionName: name || `Canal ${company.name}`,
        name: name || `Canal ${company.name}`,
        phone: phoneNumber,
        status: 'trial',
        whapiChannelId: whapiChannel.id,
        providerType: 'whapi_cloud',
        isDefault: connections.length === 0, // Primeiro canal é padrão
        environment: 'production'
      });

      console.log(`[Admin Routes] Canal de trial criado:`, connection.id);

      res.json({
        success: true,
        message: 'Canal de trial ativado com sucesso',
        channel: {
          id: connection.id,
          connectionName: connection.connectionName,
          name: connection.name,
          phone: connection.phone,
          status: connection.status,
          whapiChannelId: connection.whapiChannelId,
          providerType: connection.providerType,
          isDefault: connection.isDefault,
          createdAt: connection.createdAt
        }
      });

    } catch (error) {
      console.error('[Admin Routes] Erro ao ativar canal de trial:', error);
      res.status(500).json({ 
        message: 'Erro interno ao ativar canal de trial',
        error: error.message 
      });
    }
  });

  /**
   * PUT /api/admin/companies/:companyId/whatsapp-limit
   * Definir limite de canais WhatsApp para uma empresa
   */
  app.put('/api/admin/companies/:companyId/whatsapp-limit', requireAuth, requireSuperAdmin, async (req, res) => {
    try {
      const { companyId } = req.params;
      const { limit } = req.body;

      console.log(`[Admin Routes] Atualizando limite de canais para empresa ${companyId}: ${limit}`);

      // Validar entrada
      if (!limit || typeof limit !== 'number' || limit < 0) {
        return res.status(400).json({ message: 'Limite deve ser um número positivo' });
      }

      // 1. Verificar se empresa existe
      const company = await storage.getCompany(companyId);
      if (!company) {
        return res.status(404).json({ message: 'Empresa não encontrada' });
      }

      // 2. Atualizar limite
      const updatedCompany = await storage.updateCompany(companyId, {
        whatsappChannelLimit: limit
      });

      console.log(`[Admin Routes] Limite atualizado com sucesso para empresa ${companyId}`);

      res.json({
        success: true,
        message: 'Limite de canais atualizado com sucesso',
        company: {
          id: updatedCompany.id,
          name: updatedCompany.name,
          whatsappChannelLimit: updatedCompany.whatsappChannelLimit
        }
      });

    } catch (error) {
      console.error('[Admin Routes] Erro ao atualizar limite de canais:', error);
      res.status(500).json({ 
        message: 'Erro interno ao atualizar limite de canais',
        error: error.message 
      });
    }
  });

  /**
   * GET /api/admin/companies/:companyId/whatsapp-stats
   * Obter estatísticas de uso de canais WhatsApp de uma empresa
   */
  app.get('/api/admin/companies/:companyId/whatsapp-stats', requireAuth, requireSuperAdmin, async (req, res) => {
    try {
      const { companyId } = req.params;

      console.log(`[Admin Routes] Buscando estatísticas de canais para empresa: ${companyId}`);

      // 1. Buscar empresa
      const company = await storage.getCompany(companyId);
      if (!company) {
        return res.status(404).json({ message: 'Empresa não encontrada' });
      }

      // 2. Buscar canais
      const connections = await storage.getWhatsAppConnectionsByCompany(companyId);

      // 3. Calcular estatísticas
      const stats = {
        totalChannels: connections.length,
        connectedChannels: connections.filter(c => c.status === 'connected').length,
        disconnectedChannels: connections.filter(c => c.status === 'disconnected').length,
        qrReadyChannels: connections.filter(c => c.status === 'qr_ready').length,
        channelLimit: company.whatsappChannelLimit,
        usagePercentage: company.whatsappChannelLimit > 0 
          ? Math.round((connections.length / company.whatsappChannelLimit) * 100) 
          : 0,
        canCreateMore: connections.length < company.whatsappChannelLimit
      };

      res.json({
        success: true,
        company: {
          id: company.id,
          name: company.name,
          whatsappChannelLimit: company.whatsappChannelLimit
        },
        stats
      });

    } catch (error) {
      console.error('[Admin Routes] Erro ao buscar estatísticas de canais:', error);
      res.status(500).json({ 
        message: 'Erro interno ao buscar estatísticas de canais',
        error: error.message 
      });
    }
  });

  console.log('✅ [Admin Routes] Rotas de administração configuradas com sucesso');

  /**
   * POST /api/admin/whapi/extend-channel
   * Estender canal Whapi.Cloud via Partner API
   */
  app.post('/api/admin/whapi/extend-channel', requireAuth, requireSuperAdmin, async (req: any, res: any) => {
    try {
      const { channelId, days } = req.body || {};
      if (!channelId) {
        return res.status(400).json({ success: false, message: 'channelId é obrigatório' });
      }
      const result = await whapiService.extendChannel(channelId, days || 30);
      res.json({ success: true, result });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  /**
   * POST /api/admin/whapi/configure-auto-download
   * Configurar download automático de mídias para um canal
   */
  app.post('/api/admin/whapi/configure-auto-download', requireAuth, requireSuperAdmin, async (req: any, res: any) => {
    try {
      const { clientToken, enableAll } = req.body || {};
      if (!clientToken) {
        return res.status(400).json({ success: false, message: 'clientToken é obrigatório' });
      }
      const result = await whapiService.configureAutoDownload(clientToken, enableAll !== false);
      res.json({ success: true, result, message: 'Download automático configurado com sucesso' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ========================================
  // NOVAS ROTAS DE GERENCIAMENTO DE CANAIS
  // ========================================

  /**
   * POST /api/admin/companies/:companyId/channels/create
   * Criar novo canal para uma empresa
   */
  app.post('/api/admin/companies/:companyId/channels/create', requireAuth, requireSuperAdmin, async (req, res) => {
    try {
      const { companyId } = req.params;
      const { channelName } = req.body;
      
      console.log(`[Admin] Criando canal para empresa: ${companyId}`);
      
      // Verificar limites
      const company = await storage.getCompany(companyId);
      if (!company) {
        return res.status(404).json({ message: 'Empresa não encontrada' });
      }
      
      const connections = await storage.getWhatsAppConnectionsByCompany(companyId);
      if (connections.length >= company.whatsappChannelLimit) {
        return res.status(400).json({ 
          message: 'Limite de canais atingido',
          current: connections.length,
          limit: company.whatsappChannelLimit
        });
      }
      
      // Criar canal no Whapi.Cloud
      const channelData = await whapiService.createChannel(channelName || `Canal ${company.name}`);
      
      // Salvar no banco de dados
      const connection = await storage.createWhatsAppConnection({
        companyId,
        connectionName: channelData.name,
        instanceName: channelData.id,
        whapiToken: channelData.token,
        phone: channelData.phone || null,
        status: channelData.status,
        environment: 'production',
        webhookUrl: process.env.WEBHOOK_URL
      });
      
      res.json({ 
        success: true, 
        channel: channelData,
        connection: connection
      });
    } catch (error: any) {
      console.error('[Admin] Erro ao criar canal:', error);
      res.status(500).json({ message: 'Erro ao criar canal', error: error.message });
    }
  });

  /**
   * GET /api/admin/companies/:companyId/channels
   * Listar canais de uma empresa com dados enriquecidos do Whapi.Cloud
   */
  app.get('/api/admin/companies/:companyId/channels', requireAuth, requireSuperAdmin, async (req, res) => {
    try {
      const { companyId } = req.params;
      
      console.log(`[Admin] Listando canais da empresa: ${companyId}`);
      
      // Buscar empresa
      const company = await storage.getCompany(companyId);
      if (!company) {
        return res.status(404).json({ message: 'Empresa não encontrada' });
      }
      
      // Buscar canais no banco
      const connections = await storage.getWhatsAppConnectionsByCompany(companyId);
      
      // Buscar status atualizado no Whapi.Cloud
      const whapiChannels = await whapiService.listProjectChannels();
      
      // Enriquecer dados combinando banco + Whapi.Cloud
      const enrichedChannels = connections.map(conn => {
        const whapiChannel = whapiChannels.find(ch => ch.id === conn.instanceName);
        return {
          ...conn,
          whapiStatus: whapiChannel?.status || 'unknown',
          activeTill: whapiChannel?.activeTill || null,
          mode: whapiChannel?.mode || 'unknown',
          daysRemaining: whapiChannel?.activeTill 
            ? Math.ceil((whapiChannel.activeTill - Date.now()) / (1000 * 60 * 60 * 24))
            : 0
        };
      });
      
      res.json({
        channels: enrichedChannels,
        limit: company.whatsappChannelLimit,
        used: connections.length
      });
    } catch (error: any) {
      console.error('[Admin] Erro ao listar canais:', error);
      res.status(500).json({ message: 'Erro ao listar canais', error: error.message });
    }
  });

  /**
   * POST /api/admin/companies/:companyId/channels/:channelId/extend
   * Estender dias de um canal
   */
  app.post('/api/admin/companies/:companyId/channels/:channelId/extend', requireAuth, requireSuperAdmin, async (req, res) => {
    try {
      const { companyId, channelId } = req.params;
      const { days } = req.body;
      
      console.log(`[Admin] Estendendo canal ${channelId} por ${days} dias`);
      
      // Buscar conexão
      const connection = await storage.getWhatsAppConnection(channelId);
      if (!connection || connection.companyId !== companyId) {
        return res.status(404).json({ message: 'Canal não encontrado' });
      }
      
      // Estender no Whapi.Cloud
      const result = await whapiService.extendChannelDays(connection.instanceName, days);
      
      res.json({ 
        success: true, 
        activeTill: result.activeTill,
        message: `Canal estendido por ${days} dias`
      });
    } catch (error: any) {
      console.error('[Admin] Erro ao estender canal:', error);
      res.status(500).json({ message: 'Erro ao estender canal', error: error.message });
    }
  });
}
