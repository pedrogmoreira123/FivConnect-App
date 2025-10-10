/**
 * Rotas de health check e métricas
 */

import { Express } from 'express';
import { getMetrics } from '../utils/metrics.js';
import { getQueueStats } from '../queue/queues.js';
import { channelService } from '../services/channelService.js';
import { redis } from '../queue/redis.js';
import { db } from '../db.js';
import { logger } from '../utils/logger.js';

export function setupHealthRoutes(app: Express): void {
  console.log('🔧 Configurando rotas de health check...');

  /**
   * Health check básico
   */
  app.get('/api/health', async (req, res) => {
    try {
      const health = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
      };

      res.json(health);
    } catch (error) {
      logger.error('Erro no health check:', error);
      res.status(500).json({ status: 'error', message: 'Health check failed' });
    }
  });

  /**
   * Health check detalhado
   */
  app.get('/api/health/detailed', async (req, res) => {
    try {
      const checks = {
        database: await checkDatabase(),
        redis: await checkRedis(),
        queues: await checkQueues(),
        channels: await checkChannels(),
      };

      const allHealthy = Object.values(checks).every(check => check.status === 'ok');
      const status = allHealthy ? 'ok' : 'degraded';

      res.status(allHealthy ? 200 : 503).json({
        status,
        timestamp: new Date().toISOString(),
        checks,
      });
    } catch (error) {
      logger.error('Erro no health check detalhado:', error);
      res.status(500).json({ status: 'error', message: 'Detailed health check failed' });
    }
  });

  /**
   * Métricas Prometheus
   */
  app.get('/api/metrics', async (req, res) => {
    try {
      const metrics = await getMetrics();
      res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
      res.send(metrics);
    } catch (error) {
      logger.error('Erro ao obter métricas:', error);
      res.status(500).json({ error: 'Failed to get metrics' });
    }
  });

  /**
   * Status das filas
   */
  app.get('/api/queues/status', async (req, res) => {
    try {
      const stats = await getQueueStats();
      res.json(stats);
    } catch (error) {
      logger.error('Erro ao obter status das filas:', error);
      res.status(500).json({ error: 'Failed to get queue status' });
    }
  });

  /**
   * Status dos channels
   */
  app.get('/api/channels/status', async (req, res) => {
    try {
      // Aqui você implementaria a lógica para obter status de todos os channels
      const channels = await channelService.getChannelsByOwner('system'); // Exemplo
      
      res.json({
        total: channels.length,
        active: channels.filter(c => c.status === 'active').length,
        inactive: channels.filter(c => c.status === 'inactive').length,
        error: channels.filter(c => c.status === 'error').length,
      });
    } catch (error) {
      logger.error('Erro ao obter status dos channels:', error);
      res.status(500).json({ error: 'Failed to get channels status' });
    }
  });
}

/**
 * Verificar conexão com banco de dados
 */
async function checkDatabase(): Promise<{ status: string; message?: string }> {
  try {
    await db.execute('SELECT 1');
    return { status: 'ok' };
  } catch (error) {
    return { status: 'error', message: 'Database connection failed' };
  }
}

/**
 * Verificar conexão com Redis
 */
async function checkRedis(): Promise<{ status: string; message?: string }> {
  try {
    await redis.ping();
    return { status: 'ok' };
  } catch (error) {
    return { status: 'error', message: 'Redis connection failed' };
  }
}

/**
 * Verificar status das filas
 */
async function checkQueues(): Promise<{ status: string; message?: string; details?: any }> {
  try {
    const stats = await getQueueStats();
    const hasErrors = Object.values(stats).some(queue => queue.failed > 0);
    
    return {
      status: hasErrors ? 'warning' : 'ok',
      details: stats,
    };
  } catch (error) {
    return { status: 'error', message: 'Queue check failed' };
  }
}

/**
 * Verificar status dos channels
 */
async function checkChannels(): Promise<{ status: string; message?: string; details?: any }> {
  try {
    // Aqui você implementaria a verificação real dos channels
    return { status: 'ok', details: { total: 0, active: 0 } };
  } catch (error) {
    return { status: 'error', message: 'Channels check failed' };
  }
}

