/**
 * Workers para processamento de mensagens
 */

import { Worker, Job } from 'bullmq';
import { redis } from './redis.js';
import { channelService } from '../services/channelService.js';
import { OutgoingMessageJob, IncomingMessageJob } from './queues.js';
import { IncomingMessage } from '../providers/IWhatsappProvider.js';

// Worker para mensagens de saída
export const outgoingMessageWorker = new Worker<OutgoingMessageJob>(
  'outgoing-messages',
  async (job: Job<OutgoingMessageJob>) => {
    const { channelId, to, type, content, media } = job.data;
    
    console.log(`📤 Processando mensagem de saída: ${type} para ${to}`);
    
    try {
      let result;
      
      if (type === 'text') {
        result = await channelService.sendText(channelId, to, content);
      } else if (type === 'media' && media) {
        result = await channelService.sendMedia(channelId, to, media);
      } else {
        throw new Error(`Tipo de mensagem inválido: ${type}`);
      }
      
      if (!result.success) {
        throw new Error(result.error || 'Falha ao enviar mensagem');
      }
      
      console.log(`✅ Mensagem enviada com sucesso: ${result.messageId}`);
      return result;
      
    } catch (error) {
      console.error(`❌ Erro ao enviar mensagem:`, error);
      throw error;
    }
  },
  {
    connection: redis,
    concurrency: 5, // Processar até 5 mensagens simultaneamente
  }
);

// Worker para mensagens de entrada
export const incomingMessageWorker = new Worker<IncomingMessageJob>(
  'incoming-messages',
  async (job: Job<IncomingMessageJob>) => {
    const { message } = job.data;
    
    console.log(`📥 Processando mensagem de entrada: ${message.type} de ${message.from}`);
    
    try {
      await processIncomingMessage(message);
      console.log(`✅ Mensagem processada com sucesso: ${message.messageId}`);
      
    } catch (error) {
      console.error(`❌ Erro ao processar mensagem:`, error);
      throw error;
    }
  },
  {
    connection: redis,
    concurrency: 10, // Processar até 10 mensagens simultaneamente
  }
);

// Worker para processamento de mídia
export const mediaProcessingWorker = new Worker(
  'media-processing',
  async (job: Job) => {
    const { mediaUrl, messageType, messageId } = job.data;
    
    console.log(`🎬 Processando mídia: ${messageType} - ${mediaUrl}`);
    
    try {
      // Aqui você implementaria o download e processamento de mídia
      // Por enquanto, apenas log
      console.log(`✅ Mídia processada: ${messageId}`);
      
    } catch (error) {
      console.error(`❌ Erro ao processar mídia:`, error);
      throw error;
    }
  },
  {
    connection: redis,
    concurrency: 3, // Processar até 3 mídias simultaneamente
  }
);

// Event listeners para monitoramento
outgoingMessageWorker.on('completed', (job) => {
  console.log(`✅ Job de mensagem de saída completado: ${job.id}`);
});

outgoingMessageWorker.on('failed', (job, err) => {
  console.error(`❌ Job de mensagem de saída falhou: ${job?.id}`, err);
});

incomingMessageWorker.on('completed', (job) => {
  console.log(`✅ Job de mensagem de entrada completado: ${job.id}`);
});

incomingMessageWorker.on('failed', (job, err) => {
  console.error(`❌ Job de mensagem de entrada falhou: ${job?.id}`, err);
});

mediaProcessingWorker.on('completed', (job) => {
  console.log(`✅ Job de processamento de mídia completado: ${job.id}`);
});

mediaProcessingWorker.on('failed', (job, err) => {
  console.error(`❌ Job de processamento de mídia falhou: ${job?.id}`, err);
});

/**
 * Processar mensagem de entrada
 */
async function processIncomingMessage(message: IncomingMessage): Promise<void> {
  try {
    // Aqui você implementaria a lógica de processamento:
    // 1. Salvar mensagem no banco de dados
    // 2. Atualizar conversa
    // 3. Enviar para IA se configurado
    // 4. Notificar via WebSocket
    
    console.log('📨 Processando mensagem:', {
      provider: message.provider,
      from: message.from,
      type: message.type,
      message: message.message.substring(0, 100) + '...',
      timestamp: message.timestamp
    });
    
    // TODO: Implementar lógica completa de processamento
    // await saveMessageToDatabase(message);
    // await updateConversation(message);
    // await sendToAI(message);
    // await notifyWebSocket(message);
    
  } catch (error) {
    console.error('❌ Erro ao processar mensagem de entrada:', error);
    throw error;
  }
}

// Função para iniciar todos os workers
export function startWorkers(): void {
  console.log('🚀 Iniciando workers...');
  
  // Workers já são iniciados automaticamente quando criados
  console.log('✅ Workers iniciados com sucesso');
}

// Função para parar todos os workers
export async function stopWorkers(): Promise<void> {
  console.log('🛑 Parando workers...');
  
  await Promise.all([
    outgoingMessageWorker.close(),
    incomingMessageWorker.close(),
    mediaProcessingWorker.close(),
  ]);
  
  console.log('✅ Workers parados com sucesso');
}

