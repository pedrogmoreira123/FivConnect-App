import { Router } from 'express';
import { requireAuth } from './auth';
import { db } from './db';
import { conversations, users, clients, queues, messages as messagesTable } from '../shared/schema';
import { and, eq, gte, lte, or, desc, asc, sql } from 'drizzle-orm';

const router = Router();

// GET /api/tickets - Listar tickets com filtros
router.get('/', requireAuth, async (req, res) => {
  const { companyId, role } = req.user!;
  const { 
    status,           // 'open' | 'in_progress' | 'closed' | 'canceled'
    assignedTo,       // userId
    clientId,         // clientId
    queueId,          // queueId (setor)
    protocolNumber,   // protocolNumber
    dateFrom,         // ISO date
    dateTo,           // ISO date
    page = 1,
    limit = 20
  } = req.query;

  // Base query
  let query = db.select({
    id: conversations.id,
    protocolNumber: conversations.protocolNumber,
    contactName: conversations.contactName,
    contactPhone: conversations.contactPhone,
    status: conversations.status,
    priority: conversations.priority,
    assignedAgentId: conversations.assignedAgentId,
    assignedAgentName: users.name,
    clientId: conversations.clientId,
    clientName: clients.name,
    queueId: conversations.queueId,
    isFinished: conversations.isFinished,
    finishedAt: conversations.finishedAt,
    lastMessage: conversations.lastMessage,
    lastMessageAt: conversations.lastMessageAt,
    createdAt: conversations.createdAt,
    updatedAt: conversations.updatedAt
  })
  .from(conversations)
  .leftJoin(users, eq(conversations.assignedAgentId, users.id))
  .leftJoin(clients, eq(conversations.clientId, clients.id))
  .where(eq(conversations.companyId, companyId));

  // Aplicar filtros
  const conditions = [eq(conversations.companyId, companyId)];

  // RBAC: Agentes veem apenas seus tickets
  if (role === 'agent') {
    conditions.push(eq(conversations.assignedAgentId, req.user!.userId));
  }

  // Filtro de status
  if (status && status !== 'all') {
    const statusMap = {
      'open': 'waiting',
      'in_progress': 'in_progress',
      'closed': 'completed',
      'canceled': 'closed'
    };
    conditions.push(eq(conversations.status, statusMap[status as string]));
  }

  // Filtro de atendente
  if (assignedTo && assignedTo !== 'all') {
    conditions.push(eq(conversations.assignedAgentId, assignedTo as string));
  }

  // Filtro de cliente
  if (clientId && clientId !== 'all') {
    conditions.push(eq(conversations.clientId, clientId as string));
  }

  // Filtro de setor (fila)
  if (queueId && queueId !== 'all') {
    conditions.push(eq(conversations.queueId, queueId as string));
  }

  // Filtro de protocolo
  if (protocolNumber) {
    conditions.push(eq(conversations.protocolNumber, protocolNumber as string));
  }

  // Filtro de data
  if (dateFrom) {
    conditions.push(gte(conversations.createdAt, new Date(dateFrom as string)));
  }
  if (dateTo) {
    const endDate = new Date(dateTo as string);
    endDate.setHours(23, 59, 59, 999);
    conditions.push(lte(conversations.createdAt, endDate));
  }

  // Executar query com paginação
  const tickets = await query
    .where(and(...conditions))
    .orderBy(desc(conversations.updatedAt))
    .limit(Number(limit))
    .offset((Number(page) - 1) * Number(limit));

  // Contar total
  const [{ count }] = await db.select({ count: sql<number>`count(*)` })
    .from(conversations)
    .where(and(...conditions));

  res.json({
    tickets,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total: count,
      totalPages: Math.ceil(count / Number(limit))
    }
  });
});

// GET /api/tickets/stats - Estatísticas de tickets
router.get('/stats', requireAuth, async (req, res) => {
  const { companyId, role, userId } = req.user!;

  const baseCondition = role === 'agent' 
    ? and(eq(conversations.companyId, companyId), eq(conversations.assignedAgentId, userId))
    : eq(conversations.companyId, companyId);

  const stats = await db.select({
    status: conversations.status,
    count: sql<number>`count(*)`
  })
  .from(conversations)
  .where(baseCondition)
  .groupBy(conversations.status);

  res.json({
    all: stats.reduce((acc, s) => acc + s.count, 0),
    open: stats.find(s => s.status === 'waiting')?.count || 0,
    in_progress: stats.find(s => s.status === 'in_progress')?.count || 0,
    closed: stats.find(s => s.status === 'completed')?.count || 0,
    canceled: stats.find(s => s.status === 'closed')?.count || 0
  });
});

// GET /api/tickets/:conversationId/messages - Buscar mensagens de um ticket
router.get('/:conversationId/messages', requireAuth, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { companyId, role, userId } = req.user!;

    // Verificar se conversa existe e pertence à empresa
    const conversation = await db.select()
      .from(conversations)
      .where(eq(conversations.id, conversationId))
      .limit(1);

    if (!conversation.length) {
      return res.status(404).json({ error: 'Conversa não encontrada' });
    }

    if (conversation[0].companyId !== companyId) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    // RBAC: Agentes só veem suas conversas
    if (role === 'agent' && conversation[0].assignedAgentId !== userId) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    // Buscar todas as mensagens da conversa (histórico completo)
    const conversationMessages = await db.select()
      .from(messagesTable)
      .where(eq(messagesTable.conversationId, conversationId))
      .orderBy(asc(messagesTable.sentAt));

    res.json({
      conversation: conversation[0],
      messages: conversationMessages
    });
  } catch (error) {
    console.error('Erro ao buscar mensagens do ticket:', error);
    res.status(500).json({ error: 'Erro ao buscar mensagens' });
  }
});

// PUT /api/tickets/:id/assign - Atribuir atendente
router.put('/:id/assign', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { agentId } = req.body;
    const { companyId } = req.user!;

    await db.update(conversations)
      .set({ 
        assignedAgentId: agentId,
        status: 'in_progress',
        updatedAt: new Date()
      })
      .where(and(
        eq(conversations.id, id),
        eq(conversations.companyId, companyId)
      ));

    res.json({ success: true });
  } catch (error) {
    console.error('Erro ao atribuir:', error);
    res.status(500).json({ error: 'Erro ao atribuir' });
  }
});

// PUT /api/tickets/:id/finish - Fechar atendimento
router.put('/:id/finish', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { companyId } = req.user!;

    await db.update(conversations)
      .set({ 
        status: 'completed',
        isFinished: true,
        finishedAt: new Date(),
        updatedAt: new Date()
      })
      .where(and(
        eq(conversations.id, id),
        eq(conversations.companyId, companyId)
      ));

    res.json({ success: true });
  } catch (error) {
    console.error('Erro ao fechar:', error);
    res.status(500).json({ error: 'Erro ao fechar' });
  }
});

// PUT /api/tickets/:id/cancel - Cancelar atendimento
router.put('/:id/cancel', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { companyId } = req.user!;

    await db.update(conversations)
      .set({ 
        status: 'closed',
        isFinished: true,
        finishedAt: new Date(),
        updatedAt: new Date()
      })
      .where(and(
        eq(conversations.id, id),
        eq(conversations.companyId, companyId)
      ));

    res.json({ success: true });
  } catch (error) {
    console.error('Erro ao cancelar:', error);
    res.status(500).json({ error: 'Erro ao cancelar' });
  }
});

// PATCH /api/tickets/:id/priority - Atualizar prioridade de ticket
router.patch('/:id/priority', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { priority } = req.body;
    const { companyId } = req.user!;
    
    // Validar prioridade
    if (!['low', 'medium', 'high', 'urgent'].includes(priority)) {
      return res.status(400).json({ error: 'Prioridade inválida' });
    }
    
    // Atualizar ticket
    const [updated] = await db.update(conversations)
      .set({ priority, updatedAt: new Date() })
      .where(and(
        eq(conversations.id, id),
        eq(conversations.companyId, companyId)
      ))
      .returning();
    
    if (!updated) {
      return res.status(404).json({ error: 'Ticket não encontrado' });
    }
    
    res.json(updated);
  } catch (error) {
    console.error('Erro ao atualizar prioridade:', error);
    res.status(500).json({ error: 'Erro ao atualizar prioridade' });
  }
});

export default router;
