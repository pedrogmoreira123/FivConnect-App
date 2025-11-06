import { Express } from 'express';
import { requireAuth } from './auth';
import { storage } from './storage';
import { db } from './db';
import { and, eq, or, gte, desc, lt, count, avg, sql, inArray } from 'drizzle-orm';
import { conversations, users, queues, messages, userCompanies } from '@shared/schema';

/**
 * Rotas do Dashboard para métricas em tempo real
 */
export function setupDashboardRoutes(app: Express) {
  
  /**
   * GET /api/dashboard/metrics
   * Retorna métricas do dashboard para a empresa do usuário logado
   */
  app.get('/api/dashboard/metrics', requireAuth, async (req, res) => {
    try {
      const { companyId } = req.user;
      
      console.log(`[Dashboard Routes] Buscando métricas para empresa: ${companyId}`);
      
      // 1. Conversas Abertas (waiting + in_progress)
      const conversasAbertasResult = await db.select({ count: count() })
        .from(conversations)
        .where(and(
          eq(conversations.companyId, companyId),
          or(
            eq(conversations.status, 'waiting'),
            eq(conversations.status, 'in_progress')
          )
        ));
      const conversasAbertas = conversasAbertasResult[0]?.count || 0;

      // 2. Usuários Online
      // Primeiro, buscar IDs dos usuários da empresa
      const companyUserIds = await db
        .select({ userId: userCompanies.userId })
        .from(userCompanies)
        .where(eq(userCompanies.companyId, companyId));

      const userIds = companyUserIds.map(u => u.userId);

      // Agora contar usuários online
      const usuariosOnlineResult = userIds.length > 0
        ? await db.select({ count: count() })
            .from(users)
            .where(and(
              inArray(users.id, userIds),
              eq(users.isOnline, true)
            ))
        : [{ count: 0 }];
      const usuariosOnline = usuariosOnlineResult[0]?.count || 0;

      // 3. Tempo Médio de Espera
      const tempoMedioEspera = await calcularTempoMedioEspera(companyId);

      // 4. Finalizadas Hoje
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      const finalizadasHojeResult = await db.select({ count: count() })
        .from(conversations)
        .where(and(
          eq(conversations.companyId, companyId),
          eq(conversations.status, 'completed'),
          gte(conversations.updatedAt, hoje)
        ));
      const finalizadasHoje = finalizadasHojeResult[0]?.count || 0;
      
      const metrics = {
        conversasAbertas,
        usuariosOnline,
        tempoMedioEspera,
        finalizadasHoje
      };
      
      console.log(`[Dashboard Routes] Métricas calculadas:`, metrics);
      
      res.json({
        success: true,
        data: metrics
      });
      
    } catch (error) {
      console.error('[Dashboard Routes] Erro ao buscar métricas:', error);
      res.status(500).json({ 
        success: false,
        message: 'Erro interno ao buscar métricas do dashboard',
        error: error.message 
      });
    }
  });
  
  /**
   * GET /api/dashboard/activity
   * Retorna atividade recente para o dashboard
   */
  app.get('/api/dashboard/activity', requireAuth, async (req, res) => {
    try {
      const { companyId } = req.user;
      
      console.log(`[Dashboard Routes] Buscando atividade recente para empresa: ${companyId}`);

      // Buscar conversas recentes com informações do agente
      const recentActivity = await db.query.conversations.findMany({
        where: eq(conversations.companyId, companyId),
        with: {
          assignedAgent: {
            columns: {
              id: true,
              name: true
            }
          }
        },
        orderBy: [desc(conversations.updatedAt)],
        limit: 10
      });
      
      // Formatar atividade para o frontend
      const formattedActivity = recentActivity.map(conv => ({
        id: conv.id,
        contactName: conv.contactName,
        contactPhone: conv.contactPhone,
        status: conv.status,
        assignedAgent: conv.assignedAgent?.name || 'Não atribuído',
        lastMessageAt: conv.lastMessageAt,
        updatedAt: conv.updatedAt
      }));
      
      res.json({
        success: true,
        data: formattedActivity
      });
      
    } catch (error) {
      console.error('[Dashboard Routes] Erro ao buscar atividade recente:', error);
      res.status(500).json({ 
        success: false,
        message: 'Erro interno ao buscar atividade recente',
        error: error.message 
      });
    }
  });
  
  /**
   * GET /api/dashboard/users-online
   * Retorna relatório de usuários online para a empresa do usuário logado
   */
  app.get('/api/dashboard/users-online', requireAuth, async (req, res) => {
    try {
      const { companyId } = req.user;
      
      console.log(`[Dashboard Routes] Buscando usuários online para empresa: ${companyId}`);
      
      // Buscar usuários da empresa com informações de tickets
      const users = await storage.db.query.users.findMany({
        where: eq(users.companyId, companyId),
        with: {
          assignedTickets: {
            where: or(
              eq(conversations.status, 'waiting'),
              eq(conversations.status, 'in_progress')
            )
          }
        }
      });
      
      const usersWithMetrics = users.map(user => {
        const tempoNoStatus = calcularTempoNoStatus(user);
        
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          isOnline: user.isOnline,
          lastSeen: user.lastSeen,
          tempoNoStatus,
          chamadosAbertos: user.assignedTickets.length
        };
      });
      
      res.json({
        success: true,
        data: usersWithMetrics
      });
      
    } catch (error) {
      console.error('[Dashboard Routes] Erro ao buscar usuários online:', error);
      res.status(500).json({ 
        success: false,
        message: 'Erro interno ao buscar usuários online',
        error: error.message 
      });
    }
  });
  
  /**
   * GET /api/dashboard/queue-volume
   * Retorna dados de volume por fila
   */
  app.get('/api/dashboard/queue-volume', requireAuth, async (req, res) => {
    try {
      const { companyId } = req.user;
      
      console.log(`[Dashboard Routes] Buscando volume por fila para empresa: ${companyId}`);
      
      // Buscar filas e conversas da empresa
      const queues = await storage.db.query.queues.findMany({
        where: eq(queues.companyId, companyId)
      });
      
      const queueVolume = await Promise.all(queues.map(async (queue) => {
        const totalTicketsResult = await db.select({ count: count() })
          .from(conversations)
          .where(and(
            eq(conversations.companyId, companyId),
            eq(conversations.queueId, queue.id)
          ));
        const totalTickets = totalTicketsResult[0]?.count || 0;

        const resolvedTicketsResult = await db.select({ count: count() })
          .from(conversations)
          .where(and(
            eq(conversations.companyId, companyId),
            eq(conversations.queueId, queue.id),
            eq(conversations.status, 'completed')
          ));
        const resolvedTickets = resolvedTicketsResult[0]?.count || 0;

        const pendingTicketsResult = await db.select({ count: count() })
          .from(conversations)
          .where(and(
            eq(conversations.companyId, companyId),
            eq(conversations.queueId, queue.id),
            or(
              eq(conversations.status, 'waiting'),
              eq(conversations.status, 'in_progress')
            )
          ));
        const pendingTickets = pendingTicketsResult[0]?.count || 0;
        
        return {
          queueName: queue.name,
          totalTickets,
          resolvedTickets,
          pendingTickets
        };
      }));
      
      res.json({
        success: true,
        data: queueVolume
      });
      
    } catch (error) {
      console.error('[Dashboard Routes] Erro ao buscar volume por fila:', error);
      res.status(500).json({ 
        success: false,
        message: 'Erro interno ao buscar volume por fila',
        error: error.message 
      });
    }
  });
  
  /**
   * GET /api/dashboard/agent-performance
   * Retorna performance dos agentes
   */
  app.get('/api/dashboard/agent-performance', requireAuth, async (req, res) => {
    try {
      const { companyId } = req.user;
      
      console.log(`[Dashboard Routes] Buscando performance dos agentes para empresa: ${companyId}`);
      
      // Buscar usuários agentes da empresa
      const agents = await storage.db.query.users.findMany({
        where: and(
          eq(users.companyId, companyId),
          or(
            eq(users.role, 'agent'),
            eq(users.role, 'supervisor'),
            eq(users.role, 'admin')
          )
        )
      });
      
      const agentPerformance = await Promise.all(agents.map(async (agent) => {
        const totalTicketsResult = await db.select({ count: count() })
          .from(conversations)
          .where(and(
            eq(conversations.companyId, companyId),
            eq(conversations.assignedAgentId, agent.id)
          ));
        const totalTickets = totalTicketsResult[0]?.count || 0;

        const resolvedTicketsResult = await db.select({ count: count() })
          .from(conversations)
          .where(and(
            eq(conversations.companyId, companyId),
            eq(conversations.assignedAgentId, agent.id),
            eq(conversations.status, 'completed')
          ));
        const resolvedTickets = resolvedTicketsResult[0]?.count || 0;
        
        // Calcular tempo médio de resposta (simplificado)
        const avgResponseTime = await calcularTempoMedioResposta(agent.id, companyId);
        
        return {
          agentName: agent.name,
          totalTickets,
          resolvedTickets,
          avgResponseTime: `${avgResponseTime}min`
        };
      }));
      
      res.json({
        success: true,
        data: agentPerformance
      });
      
    } catch (error) {
      console.error('[Dashboard Routes] Erro ao buscar performance dos agentes:', error);
      res.status(500).json({ 
        success: false,
        message: 'Erro interno ao buscar performance dos agentes',
        error: error.message 
      });
    }
  });
  
  /**
   * GET /api/dashboard/weekly-performance
   * Retorna performance semanal
   */
  app.get('/api/dashboard/weekly-performance', requireAuth, async (req, res) => {
    try {
      const { companyId } = req.user;

      console.log(`[Dashboard Routes] Buscando performance semanal para empresa: ${companyId}`);

      // Calcular performance dos últimos 7 dias
      const weeklyData = [];
      const today = new Date();

      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);

        const nextDay = new Date(date);
        nextDay.setDate(nextDay.getDate() + 1);

        const completedTicketsResult = await db.select({ count: count() })
          .from(conversations)
          .where(and(
            eq(conversations.companyId, companyId),
            eq(conversations.status, 'completed'),
            gte(conversations.updatedAt, date),
            lt(conversations.updatedAt, nextDay)
          ));
        const completedTickets = completedTicketsResult[0]?.count || 0;

        weeklyData.push({
          date: date.toISOString().split('T')[0],
          completed: completedTickets
        });
      }

      res.json({
        success: true,
        data: {
          labels: weeklyData.map(d => formatDate(d.date)),
          data: weeklyData.map(d => d.completed)
        }
      });

    } catch (error) {
      console.error('[Dashboard Routes] Erro ao buscar performance semanal:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno ao buscar performance semanal',
        error: error.message
      });
    }
  });

  /**
   * GET /api/dashboard/charts
   * Agregar dados de todos os gráficos em uma única chamada
   */
  app.get('/api/dashboard/charts', requireAuth, async (req, res) => {
    try {
      const { companyId } = req.user;

      console.log(`[Dashboard Routes] Buscando dados agregados de gráficos para empresa: ${companyId}`);

      // 1. Queue Volume Data
      const filas = await storage.db.query.queues.findMany({
        where: eq(queues.companyId, companyId),
        columns: {
          id: true,
          name: true
        }
      });

      const queueVolumeData = await Promise.all(
        filas.map(async (fila) => {
          const count = await storage.db.query.conversations.count({
            where: and(
              eq(conversations.companyId, companyId),
              eq(conversations.queueId, fila.id)
            )
          });

          return {
            name: fila.name,
            count
          };
        })
      );

      // 2. Weekly Performance Data
      const weeklyData = [];
      const today = new Date();

      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);

        const nextDay = new Date(date);
        nextDay.setDate(nextDay.getDate() + 1);

        const completedTicketsResult = await db.select({ count: count() })
          .from(conversations)
          .where(and(
            eq(conversations.companyId, companyId),
            eq(conversations.status, 'completed'),
            gte(conversations.updatedAt, date),
            lt(conversations.updatedAt, nextDay)
          ));
        const completedTickets = completedTicketsResult[0]?.count || 0;

        weeklyData.push({
          date: date.toISOString().split('T')[0],
          completed: completedTickets
        });
      }

      res.json({
        queueVolume: queueVolumeData.map(q => q.count),
        queueLabels: queueVolumeData.map(q => q.name),
        weeklyPerformance: weeklyData.map(d => d.completed),
        weeklyLabels: weeklyData.map(d => formatDate(d.date))
      });

    } catch (error) {
      console.error('[Dashboard Routes] Erro ao buscar dados agregados:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao buscar dados de gráficos',
        error: error.message
      });
    }
  });
}

/**
 * Calcular tempo no status atual do usuário
 */
function calcularTempoNoStatus(user: any): string {
  if (user.isOnline) {
    // Se está online, calcular desde o último login ou lastSeen
    const lastActivity = user.lastSeen || user.createdAt;
    const tempoOnline = Math.floor((new Date().getTime() - new Date(lastActivity).getTime()) / (1000 * 60));
    
    if (tempoOnline < 60) {
      return `Online há ${tempoOnline} minutos`;
    } else {
      const horas = Math.floor(tempoOnline / 60);
      return `Online há ${horas}h ${tempoOnline % 60}min`;
    }
  } else {
    // Se está offline, calcular desde o lastSeen
    if (user.lastSeen) {
      const tempoOffline = Math.floor((new Date().getTime() - new Date(user.lastSeen).getTime()) / (1000 * 60));
      
      if (tempoOffline < 60) {
        return `Offline há ${tempoOffline} minutos`;
      } else if (tempoOffline < 1440) { // menos de 24h
        const horas = Math.floor(tempoOffline / 60);
        return `Offline há ${horas}h ${tempoOffline % 60}min`;
      } else {
        const dias = Math.floor(tempoOffline / 1440);
        return `Offline há ${dias} dias`;
      }
    } else {
      return 'Nunca esteve online';
    }
  }
}

/**
 * Calcular tempo médio de espera em minutos
 */
async function calcularTempoMedioEspera(companyId: string): Promise<number> {
  try {
    // Buscar conversas finalizadas que estiveram em espera
    const conversasFinalizadas = await storage.db.query.conversations.findMany({
      where: and(
        eq(conversations.companyId, companyId),
        eq(conversations.status, 'completed')
      ),
      columns: {
        id: true,
        createdAt: true,
        updatedAt: true
      }
    });
    
    if (conversasFinalizadas.length === 0) {
      return 0;
    }
    
    // Calcular tempo médio de espera
    let totalTempoEspera = 0;
    let conversasComEspera = 0;
    
    for (const conv of conversasFinalizadas) {
      const tempoEspera = conv.updatedAt.getTime() - conv.createdAt.getTime();
      if (tempoEspera > 0) {
        totalTempoEspera += tempoEspera;
        conversasComEspera++;
      }
    }
    
    if (conversasComEspera === 0) {
      return 0;
    }
    
    // Converter para minutos
    const tempoMedioMs = totalTempoEspera / conversasComEspera;
    const tempoMedioMinutos = Math.round(tempoMedioMs / (1000 * 60));
    
    return tempoMedioMinutos;
    
  } catch (error) {
    console.error('[Dashboard Routes] Erro ao calcular tempo médio de espera:', error);
    return 0;
  }
}

/**
 * Calcular tempo médio de resposta de um agente
 */
async function calcularTempoMedioResposta(agentId: string, companyId: string): Promise<number> {
  try {
    // Buscar conversas finalizadas do agente
    const conversasFinalizadas = await storage.db.query.conversations.findMany({
      where: and(
        eq(conversations.companyId, companyId),
        eq(conversations.assignedAgentId, agentId),
        eq(conversations.status, 'completed')
      ),
      columns: {
        id: true,
        createdAt: true,
        updatedAt: true
      }
    });
    
    if (conversasFinalizadas.length === 0) {
      return 0;
    }
    
    // Calcular tempo médio de resposta
    let totalTempoResposta = 0;
    let conversasComResposta = 0;
    
    for (const conv of conversasFinalizadas) {
      const tempoResposta = conv.updatedAt.getTime() - conv.createdAt.getTime();
      if (tempoResposta > 0) {
        totalTempoResposta += tempoResposta;
        conversasComResposta++;
      }
    }
    
    if (conversasComResposta === 0) {
      return 0;
    }
    
    // Converter para minutos
    const tempoMedioMs = totalTempoResposta / conversasComResposta;
    const tempoMedioMinutos = Math.round(tempoMedioMs / (1000 * 60));
    
    return tempoMedioMinutos;
    
  } catch (error) {
    console.error('[Dashboard Routes] Erro ao calcular tempo médio de resposta:', error);
    return 0;
  }
}

/**
 * Formatar data para exibição
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  return days[date.getDay()];
}