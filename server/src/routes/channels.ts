/**
 * Rotas para gerenciamento de channels
 */

import { Express } from 'express';
import { channelService } from '../services/channelService.js';
import { logger } from '../utils/logger.js';
import { incrementApiRequests, observeApiRequest } from '../utils/metrics.js';
import { addOutgoingMessage } from '../queue/queues.js';

export function setupChannelRoutes(app: Express): void {
  console.log('🔧 Configurando rotas de channels...');

  /**
   * Listar channels do usuário
   */
  app.get('/api/channels', async (req, res) => {
    const start = Date.now();
    
    try {
      const ownerId = req.user?.id || 'anonymous';
      const channels = await channelService.getChannelsByOwner(ownerId);
      
      const duration = (Date.now() - start) / 1000;
      incrementApiRequests('GET', '/api/channels', '200');
      observeApiRequest('GET', '/api/channels', duration);
      
      res.json(channels);
    } catch (error) {
      const duration = (Date.now() - start) / 1000;
      incrementApiRequests('GET', '/api/channels', '500');
      observeApiRequest('GET', '/api/channels', duration);
      
      logger.error('Erro ao listar channels:', error);
      res.status(500).json({ error: 'Failed to list channels' });
    }
  });

  /**
   * Criar novo channel
   */
  app.post('/api/channels', async (req, res) => {
    const start = Date.now();
    
    try {
      const { providerName, token, phoneNumber } = req.body;
      const ownerId = req.user?.id || 'anonymous';
      
      if (!providerName || !token) {
        return res.status(400).json({ error: 'providerName and token are required' });
      }
      
      const channel = await channelService.createChannel({
        ownerId,
        providerName,
        token,
        phoneNumber,
        status: 'inactive',
        environment: 'production',
      });
      
      const duration = (Date.now() - start) / 1000;
      incrementApiRequests('POST', '/api/channels', '201');
      observeApiRequest('POST', '/api/channels', duration);
      
      logger.info('Channel criado com sucesso', { channelId: channel.id, providerName });
      res.status(201).json(channel);
    } catch (error) {
      const duration = (Date.now() - start) / 1000;
      incrementApiRequests('POST', '/api/channels', '500');
      observeApiRequest('POST', '/api/channels', duration);
      
      logger.error('Erro ao criar channel:', error);
      res.status(500).json({ error: 'Failed to create channel' });
    }
  });

  /**
   * Obter channel específico
   */
  app.get('/api/channels/:id', async (req, res) => {
    const start = Date.now();
    
    try {
      const { id } = req.params;
      const channel = await channelService.getChannel(id);
      
      if (!channel) {
        const duration = (Date.now() - start) / 1000;
        incrementApiRequests('GET', '/api/channels/:id', '404');
        observeApiRequest('GET', '/api/channels/:id', duration);
        
        return res.status(404).json({ error: 'Channel not found' });
      }
      
      const duration = (Date.now() - start) / 1000;
      incrementApiRequests('GET', '/api/channels/:id', '200');
      observeApiRequest('GET', '/api/channels/:id', duration);
      
      res.json(channel);
    } catch (error) {
      const duration = (Date.now() - start) / 1000;
      incrementApiRequests('GET', '/api/channels/:id', '500');
      observeApiRequest('GET', '/api/channels/:id', duration);
      
      logger.error('Erro ao obter channel:', error);
      res.status(500).json({ error: 'Failed to get channel' });
    }
  });

  /**
   * Atualizar channel
   */
  app.put('/api/channels/:id', async (req, res) => {
    const start = Date.now();
    
    try {
      const { id } = req.params;
      const { phoneNumber, status } = req.body;
      
      const channel = await channelService.updateChannel(id, {
        phoneNumber,
        status,
      });
      
      if (!channel) {
        const duration = (Date.now() - start) / 1000;
        incrementApiRequests('PUT', '/api/channels/:id', '404');
        observeApiRequest('PUT', '/api/channels/:id', duration);
        
        return res.status(404).json({ error: 'Channel not found' });
      }
      
      const duration = (Date.now() - start) / 1000;
      incrementApiRequests('PUT', '/api/channels/:id', '200');
      observeApiRequest('PUT', '/api/channels/:id', duration);
      
      logger.info('Channel atualizado com sucesso', { channelId: id });
      res.json(channel);
    } catch (error) {
      const duration = (Date.now() - start) / 1000;
      incrementApiRequests('PUT', '/api/channels/:id', '500');
      observeApiRequest('PUT', '/api/channels/:id', duration);
      
      logger.error('Erro ao atualizar channel:', error);
      res.status(500).json({ error: 'Failed to update channel' });
    }
  });

  /**
   * Deletar channel
   */
  app.delete('/api/channels/:id', async (req, res) => {
    const start = Date.now();
    
    try {
      const { id } = req.params;
      const success = await channelService.deleteChannel(id);
      
      if (!success) {
        const duration = (Date.now() - start) / 1000;
        incrementApiRequests('DELETE', '/api/channels/:id', '404');
        observeApiRequest('DELETE', '/api/channels/:id', duration);
        
        return res.status(404).json({ error: 'Channel not found' });
      }
      
      const duration = (Date.now() - start) / 1000;
      incrementApiRequests('DELETE', '/api/channels/:id', '200');
      observeApiRequest('DELETE', '/api/channels/:id', duration);
      
      logger.info('Channel deletado com sucesso', { channelId: id });
      res.json({ message: 'Channel deleted successfully' });
    } catch (error) {
      const duration = (Date.now() - start) / 1000;
      incrementApiRequests('DELETE', '/api/channels/:id', '500');
      observeApiRequest('DELETE', '/api/channels/:id', duration);
      
      logger.error('Erro ao deletar channel:', error);
      res.status(500).json({ error: 'Failed to delete channel' });
    }
  });

  /**
   * Obter status do channel
   */
  app.get('/api/channels/:id/status', async (req, res) => {
    const start = Date.now();
    
    try {
      const { id } = req.params;
      const status = await channelService.getStatus(id);
      
      const duration = (Date.now() - start) / 1000;
      incrementApiRequests('GET', '/api/channels/:id/status', '200');
      observeApiRequest('GET', '/api/channels/:id/status', duration);
      
      res.json(status);
    } catch (error) {
      const duration = (Date.now() - start) / 1000;
      incrementApiRequests('GET', '/api/channels/:id/status', '500');
      observeApiRequest('GET', '/api/channels/:id/status', duration);
      
      logger.error('Erro ao obter status do channel:', error);
      res.status(500).json({ error: 'Failed to get channel status' });
    }
  });

  /**
   * Enviar mensagem de teste
   */
  app.post('/api/channels/:id/send-test', async (req, res) => {
    const start = Date.now();
    
    try {
      const { id } = req.params;
      const { to, message } = req.body;
      
      if (!to || !message) {
        return res.status(400).json({ error: 'to and message are required' });
      }
      
      // Enfileirar mensagem para envio
      await addOutgoingMessage({
        channelId: id,
        to,
        type: 'text',
        content: message,
      });
      
      const duration = (Date.now() - start) / 1000;
      incrementApiRequests('POST', '/api/channels/:id/send-test', '200');
      observeApiRequest('POST', '/api/channels/:id/send-test', duration);
      
      logger.info('Mensagem de teste enfileirada', { channelId: id, to });
      res.json({ message: 'Test message queued for sending' });
    } catch (error) {
      const duration = (Date.now() - start) / 1000;
      incrementApiRequests('POST', '/api/channels/:id/send-test', '500');
      observeApiRequest('POST', '/api/channels/:id/send-test', duration);
      
      logger.error('Erro ao enviar mensagem de teste:', error);
      res.status(500).json({ error: 'Failed to send test message' });
    }
  });

  /**
   * Configurar webhook
   */
  app.post('/api/channels/:id/webhook', async (req, res) => {
    const start = Date.now();
    
    try {
      const { id } = req.params;
      const { webhookUrl } = req.body;
      
      if (!webhookUrl) {
        return res.status(400).json({ error: 'webhookUrl is required' });
      }
      
      await channelService.setWebhook(id, webhookUrl);
      
      const duration = (Date.now() - start) / 1000;
      incrementApiRequests('POST', '/api/channels/:id/webhook', '200');
      observeApiRequest('POST', '/api/channels/:id/webhook', duration);
      
      logger.info('Webhook configurado com sucesso', { channelId: id, webhookUrl });
      res.json({ message: 'Webhook configured successfully' });
    } catch (error) {
      const duration = (Date.now() - start) / 1000;
      incrementApiRequests('POST', '/api/channels/:id/webhook', '500');
      observeApiRequest('POST', '/api/channels/:id/webhook', duration);
      
      logger.error('Erro ao configurar webhook:', error);
      res.status(500).json({ error: 'Failed to configure webhook' });
    }
  });
}

