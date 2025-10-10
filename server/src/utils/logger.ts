/**
 * Logger estruturado com Pino
 */

import pino from 'pino';

const isDevelopment = process.env.NODE_ENV === 'development';

// Configuração do logger
const logger = pino({
  level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
  transport: isDevelopment ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
    },
  } : undefined,
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  base: {
    service: 'fivconnect-api',
    version: process.env.npm_package_version || '1.0.0',
  },
});

// Logger específico para diferentes contextos
export const apiLogger = logger.child({ context: 'api' });
export const webhookLogger = logger.child({ context: 'webhook' });
export const queueLogger = logger.child({ context: 'queue' });
export const providerLogger = logger.child({ context: 'provider' });
export const dbLogger = logger.child({ context: 'database' });

// Função para log de requisições HTTP
export function logRequest(method: string, path: string, statusCode: number, duration: number, userAgent?: string) {
  apiLogger.info({
    method,
    path,
    statusCode,
    duration,
    userAgent,
  }, `${method} ${path} ${statusCode} in ${duration}ms`);
}

// Função para log de erros
export function logError(error: Error, context?: string, metadata?: Record<string, any>) {
  const errorLogger = context ? logger.child({ context }) : logger;
  
  errorLogger.error({
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
    },
    ...metadata,
  }, `Erro: ${error.message}`);
}

// Função para log de métricas
export function logMetric(metric: string, value: number, labels?: Record<string, string>) {
  logger.info({
    metric,
    value,
    labels,
    type: 'metric',
  }, `Métrica: ${metric} = ${value}`);
}

// Função para log de eventos de negócio
export function logBusinessEvent(event: string, data?: Record<string, any>) {
  logger.info({
    event,
    ...data,
    type: 'business_event',
  }, `Evento: ${event}`);
}

export { logger };
export default logger;
