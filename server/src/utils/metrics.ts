/**
 * Métricas com Prometheus
 */

import { register, collectDefaultMetrics, Counter, Histogram, Gauge } from 'prom-client';

// Coletar métricas padrão do sistema
collectDefaultMetrics({ register });

// Contadores
export const messagesSentTotal = new Counter({
  name: 'messages_sent_total',
  help: 'Total de mensagens enviadas',
  labelNames: ['provider', 'status', 'type'],
  registers: [register],
});

export const messagesFailedTotal = new Counter({
  name: 'messages_failed_total',
  help: 'Total de mensagens que falharam',
  labelNames: ['provider', 'error_type'],
  registers: [register],
});

export const messagesReceivedTotal = new Counter({
  name: 'messages_received_total',
  help: 'Total de mensagens recebidas',
  labelNames: ['provider', 'type'],
  registers: [register],
});

export const webhookRequestsTotal = new Counter({
  name: 'webhook_requests_total',
  help: 'Total de requisições de webhook',
  labelNames: ['provider', 'status'],
  registers: [register],
});

export const apiRequestsTotal = new Counter({
  name: 'api_requests_total',
  help: 'Total de requisições da API',
  labelNames: ['method', 'endpoint', 'status'],
  registers: [register],
});

// Histogramas
export const messageProcessingDuration = new Histogram({
  name: 'message_processing_duration_seconds',
  help: 'Duração do processamento de mensagens',
  labelNames: ['provider', 'type'],
  buckets: [0.1, 0.5, 1, 2, 5, 10],
  registers: [register],
});

export const apiRequestDuration = new Histogram({
  name: 'api_request_duration_seconds',
  help: 'Duração das requisições da API',
  labelNames: ['method', 'endpoint'],
  buckets: [0.1, 0.5, 1, 2, 5, 10],
  registers: [register],
});

export const webhookProcessingDuration = new Histogram({
  name: 'webhook_processing_duration_seconds',
  help: 'Duração do processamento de webhooks',
  labelNames: ['provider'],
  buckets: [0.1, 0.5, 1, 2, 5, 10],
  registers: [register],
});

// Gauges
export const activeChannels = new Gauge({
  name: 'active_channels_total',
  help: 'Número de channels ativos',
  labelNames: ['provider'],
  registers: [register],
});

export const queueLength = new Gauge({
  name: 'queue_length',
  help: 'Tamanho das filas',
  labelNames: ['queue_name'],
  registers: [register],
});

export const connectedUsers = new Gauge({
  name: 'connected_users_total',
  help: 'Número de usuários conectados via WebSocket',
  registers: [register],
});

// Funções auxiliares para métricas
export function incrementMessagesSent(provider: string, status: string, type: string) {
  messagesSentTotal.inc({ provider, status, type });
}

export function incrementMessagesFailed(provider: string, errorType: string) {
  messagesFailedTotal.inc({ provider, error_type: errorType });
}

export function incrementMessagesReceived(provider: string, type: string) {
  messagesReceivedTotal.inc({ provider, type });
}

export function incrementWebhookRequests(provider: string, status: string) {
  webhookRequestsTotal.inc({ provider, status });
}

export function incrementApiRequests(method: string, endpoint: string, status: string) {
  apiRequestsTotal.inc({ method, endpoint, status });
}

export function observeMessageProcessing(provider: string, type: string, duration: number) {
  messageProcessingDuration.observe({ provider, type }, duration);
}

export function observeApiRequest(method: string, endpoint: string, duration: number) {
  apiRequestDuration.observe({ method, endpoint }, duration);
}

export function observeWebhookProcessing(provider: string, duration: number) {
  webhookProcessingDuration.observe({ provider }, duration);
}

export function setActiveChannels(provider: string, count: number) {
  activeChannels.set({ provider }, count);
}

export function setQueueLength(queueName: string, length: number) {
  queueLength.set({ queue_name: queueName }, length);
}

export function setConnectedUsers(count: number) {
  connectedUsers.set(count);
}

// Middleware para métricas de API
export function metricsMiddleware(req: any, res: any, next: any) {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const method = req.method;
    const endpoint = req.route?.path || req.path;
    const status = res.statusCode.toString();
    
    incrementApiRequests(method, endpoint, status);
    observeApiRequest(method, endpoint, duration);
  });
  
  next();
}

// Função para obter métricas em formato Prometheus
export async function getMetrics(): Promise<string> {
  return register.metrics();
}

export default register;
