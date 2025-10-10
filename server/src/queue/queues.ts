/**
 * Configuração das filas BullMQ
 */

import { Queue, Worker } from 'bullmq';
import { redis } from './redis.js';
import { IncomingMessage } from '../providers/IWhatsappProvider.js';

// Tipos de jobs
export interface OutgoingMessageJob {
  channelId: string;
  to: string;
  type: 'text' | 'media';
  content: string;
  media?: {
    type: 'image' | 'video' | 'audio' | 'document';
    url: string;
    caption?: string;
    filename?: string;
  };
}

export interface IncomingMessageJob {
  message: IncomingMessage;
}

// Configuração das filas
const queueOptions = {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: 100, // Manter apenas 100 jobs completos
    removeOnFail: 50, // Manter apenas 50 jobs falhados
    attempts: 3, // Tentar 3 vezes
    backoff: {
      type: 'exponential' as const,
      delay: 2000, // Delay inicial de 2 segundos
    },
  },
};

// Fila para mensagens de saída
export const outgoingMessagesQueue = new Queue<OutgoingMessageJob>(
  'outgoing-messages',
  queueOptions
);

// Fila para mensagens de entrada
export const incomingMessagesQueue = new Queue<IncomingMessageJob>(
  'incoming-messages',
  queueOptions
);

// Fila para processamento de mídia
export const mediaProcessingQueue = new Queue(
  'media-processing',
  queueOptions
);

// Rate limiting por número de telefone
const rateLimitMap = new Map<string, number>();

export function checkRateLimit(phoneNumber: string, limitPerMinute: number = 10): boolean {
  const now = Date.now();
  const minute = Math.floor(now / 60000); // Minuto atual
  const key = `${phoneNumber}:${minute}`;
  
  const currentCount = rateLimitMap.get(key) || 0;
  
  if (currentCount >= limitPerMinute) {
    return false; // Rate limit excedido
  }
  
  rateLimitMap.set(key, currentCount + 1);
  
  // Limpar entradas antigas (mais de 2 minutos)
  for (const [mapKey] of Array.from(rateLimitMap.keys())) {
    const keyMinute = parseInt(mapKey.split(':')[1]);
    if (minute - keyMinute > 2) {
      rateLimitMap.delete(mapKey);
    }
  }
  
  return true;
}

// Função para adicionar job de mensagem de saída
export async function addOutgoingMessage(job: OutgoingMessageJob): Promise<void> {
  // Verificar rate limit
  if (!checkRateLimit(job.to)) {
    throw new Error(`Rate limit excedido para ${job.to}`);
  }

  await outgoingMessagesQueue.add('send-message', job, {
    priority: job.type === 'text' ? 1 : 2, // Texto tem prioridade maior
  });
}

// Função para adicionar job de mensagem de entrada
export async function addIncomingMessage(message: IncomingMessage): Promise<void> {
  await incomingMessagesQueue.add('process-message', { message });
}

// Função para adicionar job de processamento de mídia
export async function addMediaProcessing(job: any): Promise<void> {
  await mediaProcessingQueue.add('process-media', job);
}

// Estatísticas das filas
export async function getQueueStats() {
  const [outgoing, incoming, media] = await Promise.all([
    outgoingMessagesQueue.getJobCounts(),
    incomingMessagesQueue.getJobCounts(),
    mediaProcessingQueue.getJobCounts(),
  ]);

  return {
    outgoing: {
      waiting: outgoing.waiting,
      active: outgoing.active,
      completed: outgoing.completed,
      failed: outgoing.failed,
    },
    incoming: {
      waiting: incoming.waiting,
      active: incoming.active,
      completed: incoming.completed,
      failed: incoming.failed,
    },
    media: {
      waiting: media.waiting,
      active: media.active,
      completed: media.completed,
      failed: media.failed,
    },
  };
}
