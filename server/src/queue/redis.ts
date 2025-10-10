/**
 * Configuração do Redis para BullMQ
 */

import { Redis } from 'ioredis';

const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0'),
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  keepAlive: 30000,
  connectTimeout: 10000,
  commandTimeout: 5000,
};

export const redis = new Redis(redisConfig);

// Event listeners para monitoramento
redis.on('connect', () => {
  console.log('✅ Redis conectado');
});

redis.on('error', (error) => {
  console.error('❌ Erro no Redis:', error);
});

redis.on('close', () => {
  console.log('🔌 Redis desconectado');
});

export default redis;

