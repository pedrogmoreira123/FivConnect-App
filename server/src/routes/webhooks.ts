/**
 * Rotas de webhook para providers de WhatsApp
 */

import { Express } from 'express';
import { channelService } from '../services/channelService.js';
import { IncomingMessage } from '../providers/IWhatsappProvider.js';
import crypto from 'crypto';

export function setupWebhookRoutes(app: Express): void {
  console.log('🔧 Configurando rotas de webhook...');

  /**
   * Webhook para Whapi.Cloud
   */
  app.post('/api/webhooks/whapi', async (req, res) => {
    try {
      console.log('📨 Webhook Whapi.Cloud recebido:', JSON.stringify(req.body, null, 2));

      // Validar assinatura do webhook (se configurada)
      const signature = req.headers['x-whapi-signature'] as string;
      if (process.env.WHAPI_WEBHOOK_SECRET && signature) {
        const isValid = validateWhapiSignature(req.body, signature, process.env.WHAPI_WEBHOOK_SECRET);
        if (!isValid) {
          console.log('❌ Assinatura do webhook inválida');
          return res.status(401).json({ error: 'Assinatura inválida' });
        }
      }

      const { event, data } = req.body;

      // Processar diferentes tipos de eventos
      switch (event) {
        case 'message':
          await processIncomingMessage(data);
          break;
        case 'status':
          await processStatusUpdate(data);
          break;
        default:
          console.log(`⚠️ Evento não processado: ${event}`);
      }

      res.status(200).json({ success: true });
    } catch (error) {
      console.error('❌ Erro ao processar webhook Whapi.Cloud:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });

  /**
   * Webhook genérico para outros providers
   */
  app.post('/api/webhooks/:provider', async (req, res) => {
    try {
      const { provider } = req.params;
      console.log(`📨 Webhook ${provider} recebido:`, JSON.stringify(req.body, null, 2));

      // Aqui você pode adicionar lógica específica para outros providers
      // Por enquanto, apenas log
      console.log(`Provider ${provider} não implementado ainda`);

      res.status(200).json({ success: true });
    } catch (error) {
      console.error(`❌ Erro ao processar webhook ${req.params.provider}:`, error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });
}

/**
 * Processar mensagem recebida
 */
async function processIncomingMessage(data: any): Promise<void> {
  try {
    console.log('📨 Processando mensagem recebida:', data);

    // Normalizar dados da mensagem
    const normalizedMessage: IncomingMessage = {
      provider: 'whapi',
      channelId: data.channel_id || 'default', // Você pode mapear isso baseado no número
      from: data.from,
      type: mapMessageType(data.type),
      message: data.body || data.text || '',
      mediaUrl: data.media?.url,
      caption: data.media?.caption,
      filename: data.media?.filename,
      timestamp: new Date(data.timestamp * 1000),
      messageId: data.id,
      quotedMessageId: data.quoted?.id
    };

    console.log('📨 Mensagem normalizada:', normalizedMessage);

    // Enfileirar mensagem para processamento
    await enqueueIncomingMessage(normalizedMessage);

  } catch (error) {
    console.error('❌ Erro ao processar mensagem recebida:', error);
  }
}

/**
 * Processar atualização de status
 */
async function processStatusUpdate(data: any): Promise<void> {
  try {
    console.log('📊 Processando atualização de status:', data);

    // Aqui você pode atualizar o status do channel no banco
    // Por enquanto, apenas log
    console.log(`Status atualizado: ${data.status}`);

  } catch (error) {
    console.error('❌ Erro ao processar atualização de status:', error);
  }
}

/**
 * Mapear tipo de mensagem do Whapi para nosso formato
 */
function mapMessageType(whapiType: string): IncomingMessage['type'] {
  const typeMap: Record<string, IncomingMessage['type']> = {
    'text': 'text',
    'image': 'image',
    'video': 'video',
    'audio': 'audio',
    'document': 'document',
    'location': 'location',
    'contact': 'contact'
  };

  return typeMap[whapiType] || 'text';
}

/**
 * Enfileirar mensagem recebida para processamento
 */
async function enqueueIncomingMessage(message: IncomingMessage): Promise<void> {
  try {
    // Por enquanto, apenas log
    // Aqui você implementaria a lógica de fila (BullMQ)
    console.log('📥 Enfileirando mensagem recebida:', message);

    // TODO: Implementar enfileiramento com BullMQ
    // await messageQueue.add('process-incoming-message', message);

  } catch (error) {
    console.error('❌ Erro ao enfileirar mensagem:', error);
  }
}

/**
 * Validar assinatura do webhook Whapi.Cloud
 */
function validateWhapiSignature(payload: any, signature: string, secret: string): boolean {
  try {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(payload))
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  } catch (error) {
    console.error('❌ Erro ao validar assinatura:', error);
    return false;
  }
}

