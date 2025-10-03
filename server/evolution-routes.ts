import { Express } from "express";
import axios from "axios";
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { EvolutionService } from "./evolution-service";
import { requireAuth, requireRole } from "./auth";
import { storage } from "./storage";
import { Logger } from "./logger";
import { and, eq, desc, isNull } from 'drizzle-orm';
import { conversations, clients, messages, users, whatsappConnections } from '../shared/schema';
import { db } from './db';
import { Pool } from 'pg';

// Pool de conexão direto para SQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Configuração do multer para upload de arquivos
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, path.join(__dirname, '..', 'public', 'uploads'));
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
  }),
  limits: {
    fileSize: 200 * 1024 * 1024, // 200MB
    fieldSize: 200 * 1024 * 1024, // 200MB
    files: 1, // Apenas 1 arquivo por vez
  },
});
import { randomUUID } from 'crypto';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function setupEvolutionRoutes(app: Express, io?: any): void {
  console.log('🔧 Evolution Routes Configuration:');
  console.log('Evolution API integration enabled');
  
  const evolutionService = new EvolutionService(Logger);

  // Listar conexões por empresa
  app.get('/api/whatsapp/connections/:companyId', requireAuth, requireRole(['superadmin', 'admin', 'supervisor', 'agent']), async (req, res) => {
    try {
      const { companyId } = req.params;
      
      // Verificar se o usuário tem acesso à empresa
      const userCompanyId = req.user?.company?.id;
      if (req.user?.role !== 'superadmin' && userCompanyId !== companyId) {
        return res.status(403).json({ message: 'Access denied to this company' });
      }

      const connections = await storage.getWhatsAppConnectionsByCompany(companyId);
      res.json(connections);
    } catch (error) {
      console.error('Failed to get WhatsApp connections:', error);
      res.status(500).json({ message: 'Failed to get WhatsApp connections' });
    }
  });

  // Criar nova conexão
  app.post('/api/whatsapp/connections/:companyId', requireAuth, requireRole(['superadmin', 'admin', 'supervisor', 'agent']), async (req, res) => {
    try {
      const { companyId } = req.params;
      const { connectionName } = req.body;
      
      // console.log('🔍 [BACKEND] createConnection - Dados recebidos:', { companyId, connectionName });
      // console.log('🔍 [BACKEND] createConnection - Usuário autenticado:', {
      //   userId: req.user.id,
      //   role: req.user.role,
      //   userCompanyId: req.user.company?.id
      // });
      
      if (!connectionName) {
        return res.status(400).json({ message: 'Connection name is required' });
      }

      // Verificar se o usuário tem acesso à empresa
      const userCompanyId = req.user?.company?.id;
      if (req.user?.role !== 'superadmin' && userCompanyId !== companyId) {
        return res.status(403).json({ message: 'Access denied to this company' });
      }
      console.log('🔍 [BACKEND] Dados para criação:', { companyId, connectionName });

      // Criar instância na Evolution API
      const evolutionResponse = await evolutionService.createInstance(connectionName, companyId);
      const instanceName = evolutionResponse.instanceName || `${companyId}_${connectionName}`;
      
      // Obter QR Code imediatamente após criação
      const qrCodeBase64 = await evolutionService.getQRCode(instanceName);
      
      // Salvar no banco de dados
      const connection = await storage.createWhatsAppConnection({
        companyId,
        connectionName,
        instanceName,
        status: qrCodeBase64 ? 'qr_ready' : 'pending',
        qrcode: qrCodeBase64 || null,
        number: null,
        profilePictureUrl: null
      });

      res.status(201).json(connection);
    } catch (error) {
      console.error('Failed to create WhatsApp connection:', error);
      res.status(500).json({ message: 'Failed to create WhatsApp connection' });
    }
  });

  // Conectar instância
  app.post('/api/whatsapp/connections/:companyId/:connectionId/connect', requireAuth, requireRole(['superadmin', 'admin', 'supervisor']), async (req, res) => {
    try {
      const { companyId, connectionId } = req.params;
      
      // Verificar se o usuário tem acesso à empresa
      const userCompanyId = req.user?.company?.id;
      
      if (req.user?.role !== 'superadmin' && userCompanyId !== companyId) {
        return res.status(403).json({ message: 'Access denied to this company' });
      }

      const connection = await storage.getWhatsAppConnection(connectionId);
      if (!connection || connection.companyId !== companyId) {
        return res.status(404).json({ message: 'Connection not found' });
      }

      // Conectar na Evolution API
      const evolutionResponse = await evolutionService.connectInstance(connection.instanceName);
      
      // Atualizar status no banco
      const updatedConnection = await storage.updateWhatsAppConnection(connectionId, {
        status: 'connecting',
        qrcode: evolutionResponse.instance?.qrcode || null,
        updatedAt: new Date()
      });

      res.json(updatedConnection);
    } catch (error) {
      console.error('Failed to connect WhatsApp:', error);
      res.status(500).json({ message: 'Failed to connect WhatsApp' });
    }
  });

  // Desconectar instância
  app.delete('/api/whatsapp/connections/:companyId/:connectionId', requireAuth, requireRole(['superadmin', 'admin', 'supervisor']), async (req, res) => {
    try {
      const { companyId, connectionId } = req.params;
      
      // Verificar se o usuário tem acesso à empresa
      const userCompanyId = req.user?.company?.id;
      if (req.user?.role !== 'superadmin' && userCompanyId !== companyId) {
        return res.status(403).json({ message: 'Access denied to this company' });
      }

      const connection = await storage.getWhatsAppConnection(connectionId);
      if (!connection || connection.companyId !== companyId) {
        return res.status(404).json({ message: 'Connection not found' });
      }

      // Desconectar na Evolution API
      await evolutionService.deleteInstance(connection.instanceName);
      
      // Deletar do banco
      const success = await storage.deleteWhatsAppConnection(connectionId);
      
      if (success) {
        res.json({ message: 'WhatsApp connection deleted successfully' });
      } else {
        res.status(404).json({ message: 'Connection not found' });
      }
    } catch (error) {
      console.error('Failed to delete WhatsApp connection:', error);
      res.status(500).json({ message: 'Failed to delete WhatsApp connection' });
    }
  });

  // Obter QR Code
  app.get('/api/whatsapp/connections/:companyId/:connectionId/qrcode', requireAuth, requireRole(['superadmin', 'admin', 'supervisor']), async (req, res) => {
    try {
      const { companyId, connectionId } = req.params;
      
      // Verificar se o usuário tem acesso à empresa
      const userCompanyId = req.user?.company?.id;
      if (req.user?.role !== 'superadmin' && userCompanyId !== companyId) {
        return res.status(403).json({ message: 'Access denied to this company' });
      }

      const connection = await storage.getWhatsAppConnection(connectionId);
      if (!connection || connection.companyId !== companyId) {
        return res.status(404).json({ message: 'Connection not found' });
      }

      // Obter QR Code da Evolution API usando o instanceName correto
      const qrCodeBase64 = await evolutionService.getQRCode(connection.instanceName);
      
      // Atualizar status no banco se necessário
      if (qrCodeBase64) {
        await storage.updateWhatsAppConnection(connectionId, {
          qrcode: qrCodeBase64,
          status: 'qr_ready',
          updatedAt: new Date()
        });
      }
      
          // console.log('🔍 [BACKEND] QR Code response:', {
          //   instanceName: connection.instanceName,
          //   qrCodeBase64: qrCodeBase64 ? `${qrCodeBase64.substring(0, 50)}...` : null,
          //   connectionQrcode: connection.qrcode ? `${connection.qrcode.substring(0, 50)}...` : null,
          //   status: connection.status
          // });
      
      res.json({
        qrcode: qrCodeBase64 || connection.qrcode,
        status: connection.status,
        number: connection.number
      });
    } catch (error) {
      console.error('Failed to get QR code:', error);
      res.status(500).json({ message: 'Failed to get QR code' });
    }
  });

  // Enviar mensagem
  app.post('/api/whatsapp/send-message', requireAuth, async (req, res) => {
    try {
      const { connectionId, to, message } = req.body;
      
      if (!connectionId || !to || !message) {
        return res.status(400).json({ message: 'Connection ID, phone number, and message are required' });
      }

      const connection = await storage.getWhatsAppConnection(connectionId);
      if (!connection) {
        return res.status(404).json({ message: 'Connection not found' });
      }

      // Verificar se o usuário tem acesso à conexão
      if (req.user.role !== 'superadmin' && req.user.companyId !== connection.companyId) {
        return res.status(403).json({ message: 'Access denied to this connection' });
      }

      // Enviar mensagem via Evolution API
      const result = await evolutionService.sendMessage(connection.instanceName, to, message);
      
      res.json({ 
        message: 'Message sent successfully',
        result 
      });
    } catch (error) {
      console.error('Failed to send WhatsApp message:', error);
      res.status(500).json({ message: 'Failed to send WhatsApp message' });
    }
  });

  // --- NOVAS ROTAS DE CONVERSA ---

  // Listar conversas por status (ex: 'waiting', 'in_progress')
  app.get('/api/whatsapp/conversations', requireAuth, async (req, res) => {
    const { companyId, id: agentId } = req.user;
    const { status } = req.query; 

    if (!status || typeof status !== 'string') {
      return res.status(400).json({ error: 'O status é obrigatório e deve ser uma string.' });
    }

    // Validar status permitidos
    const validStatuses = ['waiting', 'in_progress', 'completed', 'closed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Status inválido. Use: waiting, in_progress, completed ou closed.' });
    }

    try {
      // Query SQL com JOIN para buscar a última mensagem
      let query = `
        SELECT 
          c.*,
          m.content as last_message,
          m.message_type as last_message_type,
          m.sent_at as last_message_time
        FROM conversations c
        LEFT JOIN (
          SELECT DISTINCT ON (conversation_id) 
            conversation_id, content, message_type, sent_at
          FROM messages 
          ORDER BY conversation_id, sent_at DESC
        ) m ON c.id = m.conversation_id
        WHERE c.company_id = $1
      `;
      let params = [companyId];
      
      if (status === 'waiting') {
        query += ` AND c.status = $2`;
        params.push('waiting');
      } else if (status === 'in_progress') {
        query += ` AND c.status = $2 AND c.assigned_agent_id = $3`;
        params.push('in_progress', agentId);
      } else if (status === 'completed') {
        query += ` AND c.status = $2`;
        params.push('completed');
      } else if (status === 'closed') {
        query += ` AND c.status = $2`;
        params.push('closed');
      }
      
      query += ` ORDER BY c.updated_at DESC`;

      const result = await pool.query(query, params);
      res.json(result.rows);
    } catch (error) {
      console.error('❌ Erro ao buscar conversas:', error);
      res.status(500).json({ error: 'Falha ao buscar conversas.' });
    }
  });

  // Obter mensagens de uma conversa específica (TEMPORÁRIO: sem autenticação)
  app.get('/api/whatsapp/conversations/:conversationId/messages', async (req, res) => {
    const { conversationId } = req.params;
    try {
      const messageList = await db.query.messages.findMany({
        where: eq(messages.conversationId, conversationId),
        orderBy: [messages.sentAt]
      });
      res.json(messageList);
    } catch (error) {
      console.error(`❌ Erro ao buscar mensagens para a conversa ${conversationId}:`, error);
      res.status(500).json({ error: 'Falha ao buscar mensagens.' });
    }
  });

  // Rota temporária para testar mensagens (SEM AUTENTICAÇÃO)
  app.get('/api/test/messages/:conversationId', async (req, res) => {
    const { conversationId } = req.params;
    try {
      console.log(`[TEST] Buscando mensagens para conversa: ${conversationId}`);
      const messageList = await db.query.messages.findMany({
        where: eq(messages.conversationId, conversationId),
        orderBy: [messages.sentAt]
      });
      console.log(`[TEST] Encontradas ${messageList.length} mensagens`);
      res.json(messageList);
    } catch (error) {
      console.error(`❌ [TEST] Erro ao buscar mensagens para a conversa ${conversationId}:`, error);
      res.status(500).json({ error: 'Falha ao buscar mensagens.' });
    }
  });

  // Rota de teste para conversas (sem autenticação)
  app.get('/api/test/conversations/:status', async (req, res) => {
    const { status } = req.params;
    try {
      console.log(`[TEST] Buscando conversas com status: ${status}`);
      let query = `
        SELECT 
          c.*,
          m.content as last_message,
          m.message_type as last_message_type,
          m.sent_at as last_message_time
        FROM conversations c
        LEFT JOIN (
          SELECT DISTINCT ON (conversation_id) 
            conversation_id, content, message_type, sent_at
          FROM messages 
          ORDER BY conversation_id, sent_at DESC
        ) m ON c.id = m.conversation_id
        WHERE c.company_id = $1
      `;
      let params = ['59b4b086-9171-4dbf-8177-b7c6d6fd1e33'];
      
      if (status === 'waiting') {
        query += ` AND c.status = $2`;
        params.push('waiting');
      } else if (status === 'in_progress') {
        query += ` AND c.status = $2`;
        params.push('in_progress');
      } else if (status === 'completed') {
        query += ` AND c.status = $2`;
        params.push('completed');
      } else if (status === 'closed') {
        query += ` AND c.status = $2`;
        params.push('closed');
      }
      
      query += ` ORDER BY c.updated_at DESC`;

      const result = await pool.query(query, params);
      console.log(`[TEST] Encontradas ${result.rows.length} conversas`);
      res.json(result.rows);
    } catch (error) {
      console.error(`[TEST] Erro ao buscar conversas:`, error);
      res.status(500).json({ error: 'Falha ao buscar conversas.' });
    }
  });

  // Agente assume uma conversa (TEMPORÁRIO: sem autenticação)
  app.post('/api/whatsapp/conversations/:conversationId/take', async (req, res) => {
    const { conversationId } = req.params;
    // Usar ID real do usuário admin
    const agentId = 'eb00c0da-b2cf-4a14-b4ef-9a5910147149';
    const companyId = '59b4b086-9171-4dbf-8177-b7c6d6fd1e33';

    try {
      const updatedConversation = await db.update(conversations)
        .set({ assignedAgentId: agentId, status: 'in_progress', updatedAt: new Date() })
        .where(and(eq(conversations.id, conversationId), isNull(conversations.assignedAgentId)))
        .returning();

      if (updatedConversation.length === 0) {
        return res.status(409).json({ error: 'Esta conversa já foi assumida.' });
      }

      // Notifica todos os clientes da empresa sobre a atualização
      if (io) io.emit('conversationUpdate', { ...updatedConversation[0], companyId });
      res.json(updatedConversation[0]);
    } catch (error) {
      console.error(`❌ Erro ao assumir a conversa ${conversationId}:`, error);
      res.status(500).json({ error: 'Falha ao assumir a conversa.' });
    }
  });

  // Enviar mensagem
  app.post('/api/whatsapp/conversations/:conversationId/send', requireAuth, async (req, res) => {
    const { conversationId } = req.params;
    const { id: agentId } = req.user;
    const { text } = req.body;

    try {
      const conversation = await db.query.conversations.findFirst({ where: eq(conversations.id, conversationId) });
      if (!conversation || conversation.assignedAgentId !== agentId) {
        return res.status(403).json({ error: "Você não tem permissão para enviar mensagens nesta conversa." });
      }

      // Buscar o instanceName da conexão WhatsApp
      const connection = await db.query.whatsappConnections.findFirst({
        where: eq(whatsappConnections.id, conversation.whatsappConnectionId)
      });
      
      if (!connection) {
        return res.status(404).json({ error: "Conexão WhatsApp não encontrada." });
      }

                // Envia a mensagem pela Evolution API usando o nome da instância
                await evolutionService.sendTextMessage(connection.instanceName, conversation.contactPhone, text);

      // Salva a mensagem no banco de dados local
      const newMessage = (await db.insert(messages).values({
        id: randomUUID(),
        conversationId,
        senderId: agentId,
        content: text,
        messageType: 'text',
        direction: 'outgoing',
        environment: 'production',
        status: 'sent',
      }).returning())[0];

      // Emitir evento WebSocket para atualização em tempo real
      if (io) io.to(`company_${companyId}`).emit('newMessage', newMessage);
      
      // Simular atualização de status (em produção, viria da Evolution API)
      setTimeout(() => {
        if (io) io.emit('messageStatus', {
          messageId: newMessage.id,
          conversationId: newMessage.conversationId,
          status: 'delivered'
        });
      }, 2000);

      res.status(201).json(newMessage);
    } catch (error) {
      console.error(`❌ Erro ao enviar mensagem para a conversa ${conversationId}:`, error);
      res.status(500).json({ error: 'Falha ao enviar mensagem.' });
    }
  });

  // Enviar mídia
  app.post('/api/whatsapp/conversations/:conversationId/send-media', requireAuth, upload.single('file'), async (req, res) => {
    console.log('📤 [SEND-MEDIA] Iniciando upload de mídia...');
    console.log('📤 [SEND-MEDIA] req.file:', req.file ? 'Presente' : 'Ausente');
    console.log('📤 [SEND-MEDIA] req.body:', req.body);
    console.log('📤 [SEND-MEDIA] Content-Type:', req.headers['content-type']);
    console.log('📤 [SEND-MEDIA] Content-Length:', req.headers['content-length']);
    
    if (req.file) {
      console.log('📤 [SEND-MEDIA] File details:');
      console.log('📤 [SEND-MEDIA] - Name:', req.file.originalname);
      console.log('📤 [SEND-MEDIA] - Size:', req.file.size, 'bytes');
      console.log('📤 [SEND-MEDIA] - MimeType:', req.file.mimetype);
    }
    
    const { conversationId } = req.params;
    const { id: agentId } = req.user;
    
    try {
      // Verificar se é FormData (upload de arquivo) ou JSON (URL de mídia)
      let mediaType, mediaUrl, caption;
      
      let base64Media = null;
      
      if (req.file) {
        // Upload de arquivo via FormData
        const file = req.file;
        const fileType = file.mimetype;
        
        // Determinar tipo de mídia baseado no MIME type
        if (fileType.startsWith('image/')) {
          mediaType = 'image';
        } else if (fileType.startsWith('video/')) {
          mediaType = 'video';
        } else if (fileType.startsWith('audio/')) {
          mediaType = 'audio';
        } else {
          mediaType = 'document';
        }
        
        // Salvar arquivo e gerar URL para armazenamento
        const fileName = file.filename;
        const filePath = file.path;
        mediaUrl = `${process.env.MAIN_APP_URL}/uploads/${fileName}`;
        caption = req.body.caption || '';
        
        // Converter para base64 para Evolution API (sem data URL prefix)
        console.log('🔍 [DEBUG] Lendo arquivo:', filePath);
        console.log('🔍 [DEBUG] Arquivo existe?', fs.existsSync(filePath));
        
        if (!fs.existsSync(filePath)) {
          console.log('❌ [DEBUG] Arquivo não existe:', filePath);
          return res.status(400).json({ error: "Arquivo não encontrado." });
        }
        
        const fileBuffer = fs.readFileSync(filePath);
        console.log('🔍 [DEBUG] Buffer size:', fileBuffer.length);
        
        base64Media = fileBuffer.toString('base64');
        console.log('🔍 [DEBUG] base64Media length:', base64Media.length);
        console.log('🔍 [DEBUG] base64Media type:', typeof base64Media);
        console.log('🔍 [DEBUG] base64Media first 100 chars:', base64Media.substring(0, 100));
        
        // CORREÇÃO: Verificar se base64Media é válido
        if (!base64Media || base64Media === '') {
          console.log('❌ [DEBUG] base64Media é inválido:', base64Media);
          return res.status(400).json({ error: "Erro ao converter arquivo para base64." });
        }
      } else {
        // Dados JSON (URL de mídia)
        ({ mediaType, mediaUrl, caption } = req.body);
      }

      const conversation = await db.query.conversations.findFirst({ where: eq(conversations.id, conversationId) });
      if (!conversation || conversation.assignedAgentId !== agentId) {
        return res.status(403).json({ error: "Você não tem permissão para enviar mensagens nesta conversa." });
      }

      // Buscar o instanceName da conexão WhatsApp
      const connection = await db.query.whatsappConnections.findFirst({
        where: eq(whatsappConnections.id, conversation.whatsappConnectionId)
      });
      
      if (!connection) {
        return res.status(404).json({ error: "Conexão WhatsApp não encontrada." });
      }

                let evolutionResponse;
                
                // Enviar mídia baseada no tipo usando o nome da instância
                // Usar base64Media para Evolution API e mediaUrl para armazenamento
                let mediaForEvolution;
                if (req.file) {
                  mediaForEvolution = base64Media;
                } else {
                  mediaForEvolution = mediaUrl;
                }
                
                // CORREÇÃO: Validar se mediaForEvolution é válido
                console.log('🔍 [DEBUG] mediaForEvolution:', mediaForEvolution);
                console.log('🔍 [DEBUG] typeof mediaForEvolution:', typeof mediaForEvolution);
                console.log('🔍 [DEBUG] req.file:', req.file);
                console.log('🔍 [DEBUG] base64Media:', base64Media);
                console.log('🔍 [DEBUG] mediaUrl:', mediaUrl);
                console.log('🔍 [DEBUG] connection.instanceName:', connection.instanceName);
                console.log('🔍 [DEBUG] conversation.contactPhone:', conversation.contactPhone);
                console.log('🔍 [DEBUG] mediaType:', mediaType);
                console.log('🔍 [DEBUG] Verificando se algum campo é false:', {
                  mediaForEvolution: mediaForEvolution === false,
                  connectionInstanceName: connection.instanceName === false,
                  conversationContactPhone: conversation.contactPhone === false,
                  mediaType: mediaType === false
                });
                
                // CORREÇÃO: Verificar se connection.instanceName é válido
                if (!connection.instanceName || connection.instanceName === false) {
                  console.log('❌ [DEBUG] connection.instanceName é inválido:', connection.instanceName);
                  return res.status(400).json({ error: "Nome da instância inválido." });
                }
                
                // CORREÇÃO: Verificar se conversation.contactPhone é válido
                if (!conversation.contactPhone || conversation.contactPhone === false) {
                  console.log('❌ [DEBUG] conversation.contactPhone é inválido:', conversation.contactPhone);
                  return res.status(400).json({ error: "Telefone do contato inválido." });
                }
                
                if (!mediaForEvolution || mediaForEvolution === false || mediaForEvolution === null) {
                  console.log('❌ [DEBUG] mediaForEvolution é inválido:', mediaForEvolution);
                  return res.status(400).json({ error: "Mídia não encontrada ou inválida." });
                }
                
                // CORREÇÃO: Validar se connection.instanceName é válido
                if (!connection.instanceName || connection.instanceName === false) {
                  console.log('❌ [DEBUG] connection.instanceName é inválido:', connection.instanceName);
                  return res.status(400).json({ error: "Nome da instância inválido." });
                }
                
                // CORREÇÃO: Validar se conversation.contactPhone é válido
                if (!conversation.contactPhone || conversation.contactPhone === false) {
                  console.log('❌ [DEBUG] conversation.contactPhone é inválido:', conversation.contactPhone);
                  return res.status(400).json({ error: "Telefone do contato inválido." });
                }
                
                if (!mediaForEvolution || mediaForEvolution === false || mediaForEvolution === null) {
                  console.log('❌ [DEBUG] mediaForEvolution é inválido:', mediaForEvolution);
                  return res.status(400).json({ error: "Mídia não encontrada ou inválida." });
                }
                
                switch (mediaType) {
                  case 'image':
                    evolutionResponse = await evolutionService.sendImageMessage(
                      connection.instanceName, 
                      conversation.contactPhone, 
                      mediaForEvolution, 
                      caption
                    );
                    break;
                  case 'video':
                    evolutionResponse = await evolutionService.sendVideoMessage(
                      connection.instanceName, 
                      conversation.contactPhone, 
                      mediaForEvolution, 
                      caption
                    );
                    break;
                  case 'audio':
                    evolutionResponse = await evolutionService.sendAudioMessage(
                      connection.instanceName, 
                      conversation.contactPhone, 
                      mediaForEvolution
                    );
                    break;
                  case 'document':
                    evolutionResponse = await evolutionService.sendDocumentMessage(
                      connection.instanceName, 
                      conversation.contactPhone, 
                      mediaForEvolution, 
                      req.file?.originalname || 'documento'
                    );
                    break;
                  default:
                    return res.status(400).json({ error: "Tipo de mídia não suportado." });
                }

      // Salva a mensagem no banco de dados local
      const newMessage = (await db.insert(messages).values({
        id: randomUUID(),
        conversationId,
        senderId: agentId,
        content: caption || `[${mediaType} enviado]`,
        messageType: mediaType,
        direction: 'outgoing',
        environment: 'production',
        mediaUrl: mediaUrl,
        status: 'sent',
      }).returning())[0];

      if (io) io.to(`company_${companyId}`).emit('newMessage', newMessage);
      res.status(201).json(newMessage);
    } catch (error) {
      console.error(`❌ Erro ao enviar mídia para a conversa ${conversationId}:`, error);
      console.error(`❌ Stack trace:`, error.stack);
      res.status(500).json({ error: 'Falha ao enviar mídia.' });
    }
  });

  // Finalizar conversa
  app.post('/api/whatsapp/conversations/:conversationId/finish', requireAuth, async (req, res) => {
    const { conversationId } = req.params;
    const { id: agentId } = req.user;

    try {
      const conversation = await db.query.conversations.findFirst({ where: eq(conversations.id, conversationId) });
      if (!conversation || conversation.assignedAgentId !== agentId) {
        return res.status(403).json({ error: "Você não tem permissão para finalizar esta conversa." });
      }

      const updatedConversation = await db.update(conversations)
        .set({ 
          status: 'completed', 
          updatedAt: new Date() 
        })
        .where(eq(conversations.id, conversationId))
        .returning();

      if (io) io.emit('conversationUpdate', { ...updatedConversation[0], companyId: conversation.companyId });
      res.json(updatedConversation[0]);
    } catch (error) {
      console.error(`❌ Erro ao finalizar a conversa ${conversationId}:`, error);
      res.status(500).json({ error: 'Falha ao finalizar conversa.' });
    }
  });

  // ENDPOINT DO WEBHOOK - ROTA PÚBLICA PARA A EVOLUTION API
  app.post('/api/whatsapp/webhook', async (req, res) => {
    const event = req.body;
    const { instance: instanceName, data, event: eventName } = event;

    if (!instanceName || !eventName) {
      return res.sendStatus(200);
    }

    console.log(`[WEBHOOK] Evento '${eventName}' recebido para a instância '${instanceName}'`);

    const io = req.app.get('io');
      const [companyId] = instanceName.split('_');

      try {
      if (eventName === 'CONNECTION_UPDATE') {
        const newState = data.state.toUpperCase(); // CONNECTED, CLOSE, etc.

        await storage.updateWhatsAppConnectionByInstanceName(instanceName, {
          status: newState,
          updatedAt: new Date()
        });

        console.log(`[WEBHOOK] Status da instância ${instanceName} atualizado para ${newState}`);
        io.emit('connectionUpdate', { instanceName, status: newState, companyId });
      }

      if (eventName === 'QRCODE_UPDATED') {
        const qrCodeBase64 = data.qrcode.base64;
        io.emit('qrcodeUpdate', { instanceName, qrCode: `data:image/png;base64,${qrCodeBase64}`, companyId });
        console.log(`[WEBHOOK] Novo QR Code enviado via WebSocket para a instância ${instanceName}`);
      }

      // --- LÓGICA APRIMORADA PARA CONVERSAS ---
      if (eventName === 'messages.upsert' && data.key.fromMe === false) {
        const contactJid = data.key.remoteJid;
        
        // FILTRO: Bloquear mensagens de grupos - apenas contatos individuais
        if (contactJid.includes('@g.us') || contactJid.includes('@newsletter') || contactJid.includes('@broadcast')) {
          console.log(`[WEBHOOK] Mensagem de grupo/canal ignorada: ${contactJid}`);
          return res.sendStatus(200);
        }
        
        // Verificar se é um contato individual válido (deve terminar com @s.whatsapp.net)
        if (!contactJid.includes('@s.whatsapp.net')) {
          console.log(`[WEBHOOK] Mensagem de origem inválida ignorada: ${contactJid}`);
          return res.sendStatus(200);
        }
        
        console.log(`[WEBHOOK] ✅ Mensagem de contato individual aceita: ${contactJid}`);
        console.log(`[WEBHOOK] Conteúdo: ${JSON.stringify(data.message)}`);
        console.log(`[WEBHOOK] PushName: ${data.pushName || 'N/A'}`);
        console.log(`[WEBHOOK] Data completa: ${JSON.stringify(data)}`);
        
        const messageData = data.message;
        
        // Processar diferentes tipos de mensagens
        let messageType = 'text';
        let content = '';
        let mediaUrl = null;
        let caption = null;
        let fileName = null;
        
        // Determinar tipo de mensagem e extrair conteúdo
        if (messageData.conversation) {
          messageType = 'text';
          content = messageData.conversation;
        } else if (messageData.extendedTextMessage) {
          messageType = 'text';
          content = messageData.extendedTextMessage.text || '';
        } else if (messageData.imageMessage) {
          messageType = 'image';
          content = messageData.imageMessage.caption || '[Imagem]';
          mediaUrl = messageData.imageMessage.url;
          caption = messageData.imageMessage.caption;
        } else if (messageData.videoMessage) {
          messageType = 'video';
          content = messageData.videoMessage.caption || '[Vídeo]';
          mediaUrl = messageData.videoMessage.url;
          caption = messageData.videoMessage.caption;
        } else if (messageData.audioMessage) {
          messageType = 'audio';
          content = '[Áudio]';
          mediaUrl = messageData.audioMessage.url;
        } else if (messageData.documentMessage) {
          messageType = 'document';
          content = messageData.documentMessage.caption || '[Documento]';
          mediaUrl = messageData.documentMessage.url;
          caption = messageData.documentMessage.caption;
          fileName = messageData.documentMessage.fileName;
        } else if (messageData.stickerMessage) {
          messageType = 'sticker';
          content = '[Sticker]';
          mediaUrl = messageData.stickerMessage.url;
        } else if (messageData.contactMessage) {
          messageType = 'contact';
          content = '[Contato]';
        } else if (messageData.locationMessage) {
          messageType = 'location';
          content = '[Localização]';
        } else if (messageData.pollCreationMessage) {
          messageType = 'poll';
          content = '[Enquete]';
        } else {
          messageType = 'text';
          content = '[Mensagem não suportada]';
        }
        
        console.log(`[WEBHOOK] Tipo de mensagem detectado: ${messageType}`);
        console.log(`[WEBHOOK] Conteúdo: ${content}`);
        if (mediaUrl) console.log(`[WEBHOOK] URL da mídia: ${mediaUrl}`);

        try {
          // Buscar cliente existente usando pool direto
          const clientResult = await pool.query(
            `SELECT * FROM clients WHERE phone = $1 AND company_id = $2 LIMIT 1`,
            [contactJid, companyId]
          );
          
          let client = clientResult.rows[0];
          
          if (!client) {
            // Tentar capturar o nome do contato de diferentes formas
            const contactName = data.pushName || 
                               data.message?.conversation?.pushName || 
                               data.message?.extendedTextMessage?.contextInfo?.quotedMessage?.pushName ||
                               'Cliente';
            
            console.log(`[WEBHOOK] Criando novo cliente: ${contactJid} com nome: ${contactName}`);
            const newClientResult = await pool.query(
              `INSERT INTO clients (id, name, phone, company_id, environment) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
              [randomUUID(), contactName, contactJid, companyId, 'production']
            );
            client = newClientResult.rows[0];
          }

          // Buscar conversa existente usando pool direto
          const conversationResult = await pool.query(
            `SELECT * FROM conversations WHERE contact_phone = $1 AND company_id = $2 LIMIT 1`,
            [contactJid, companyId]
          );
          
          let conversation = conversationResult.rows[0];

          if (!conversation) {
            console.log(`[WEBHOOK] Criando nova conversa para: ${contactJid}`);
            // Buscar o ID da conexão WhatsApp
            const connectionResult = await pool.query(
              `SELECT id FROM whatsapp_connections WHERE instance_name = $1 LIMIT 1`,
              [instanceName]
            );
            const connectionId = connectionResult.rows[0]?.id;
            
            if (!connectionId) {
              console.error(`[WEBHOOK] Conexão WhatsApp não encontrada: ${instanceName}`);
              return;
            }
            
            const newConversationResult = await pool.query(
              `INSERT INTO conversations (id, contact_name, contact_phone, client_id, company_id, status, whatsapp_connection_id, environment) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
              [randomUUID(), client.name, client.phone, client.id, companyId, 'waiting', connectionId, 'production']
            );
            conversation = newConversationResult.rows[0];
            if (io) io.emit('newConversation', { ...conversation });
          } else {
            // Se a conversa já existe e está 'completed' ou 'closed', reabre como 'waiting'
            if (['completed', 'closed'].includes(conversation.status)) {
              const updatedConversationResult = await pool.query(
                `UPDATE conversations SET status = $1, assigned_agent_id = $2, updated_at = $3 WHERE id = $4 RETURNING *`,
                ['waiting', null, new Date(), conversation.id]
              );
              conversation = updatedConversationResult.rows[0];
              if (io) io.emit('conversationUpdate', conversation);
            }
          }

        // Processar mídia se existir
        let finalMediaUrl = mediaUrl;
        let finalCaption = caption;
        let finalFileName = fileName;

        if (mediaUrl && ['image', 'video', 'audio', 'document', 'sticker'].includes(messageType)) {
          try {
            console.log(`[WEBHOOK] Baixando mídia: ${mediaUrl}`);
            
            // Baixar mídia da Evolution API
            const mediaResponse = await axios.get(mediaUrl, {
              responseType: 'arraybuffer',
              timeout: 30000
            });
            
            if (mediaResponse.data && mediaResponse.data.length > 0) {
              // Gerar nome do arquivo
              const fileExtension = messageType === 'image' ? 'jpg' : 
                                  messageType === 'video' ? 'mp4' :
                                  messageType === 'audio' ? 'ogg' :
                                  messageType === 'document' ? 'pdf' : 'bin';
              
              const fileName = `${data.key.id}.${fileExtension}`;
              const filePath = path.join(__dirname, '..', 'public', 'uploads', fileName);
              
              // Garantir que o diretório existe
              await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
              
              // Salvar arquivo localmente
              await fs.promises.writeFile(filePath, mediaResponse.data);
              
              // Atualizar URL para o arquivo local
              finalMediaUrl = `${process.env.MAIN_APP_URL}/uploads/${fileName}`;
              
              console.log(`[WEBHOOK] Mídia salva localmente: ${finalMediaUrl}`);
            } else {
              console.log(`[WEBHOOK] ⚠️ Mídia vazia recebida`);
            }
          } catch (mediaError) {
            console.error(`[WEBHOOK] ❌ Erro ao baixar mídia:`, mediaError);
            // Continuar sem mídia se falhar o download
          }
        }

        // Usar os dados já processados acima
        const finalContent = content;

        console.log(`[WEBHOOK] Salvando mensagem: ${finalContent}`);

        const newMessageResult = await pool.query(
          `INSERT INTO messages (id, conversation_id, content, message_type, direction, environment, status, sent_at, media_url) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
          [data.key.id, conversation.id, finalContent, messageType, 'incoming', 'production', 'delivered', new Date(data.messageTimestamp * 1000), finalMediaUrl]
        );

          console.log(`[WEBHOOK] Mensagem salva com sucesso: ${newMessageResult.rows[0].id}`);
          
          // Emitir evento WebSocket com dados completos
          const messageData = {
            ...newMessageResult.rows[0],
            companyId,
            conversationId: conversation.id,
            direction: 'incoming'
          };
          
          console.log(`[WEBHOOK] Emitindo newMessage:`, messageData);
          if (io) {
            io.to(`company_${companyId}`).emit('newMessage', messageData);
            console.log(`[WEBHOOK] Evento newMessage emitido para company_${companyId}`);
          } else {
            console.log(`[WEBHOOK] ❌ io não disponível para emitir evento`);
          }
      } catch (error) {
          console.error(`[WEBHOOK] Erro ao processar mensagem:`, error);
        }
      }

      // Processar atualizações de status de mensagens
      if (eventName === 'messages.update') {
        const { key, update } = data;
        
        // Validar se os dados necessários existem
        if (!key || !key.id || !update || !update.status) {
          console.log(`[WEBHOOK] Dados incompletos para messages.update:`, { key, update });
          return;
        }
        
        const messageId = key.id;
        const status = update.status;
        
        console.log(`[WEBHOOK] Atualizando status da mensagem ${messageId} para ${status}`);
        
        try {
          // Atualizar status da mensagem no banco
          await pool.query(
            `UPDATE messages SET status = $1, updated_at = $2 WHERE id = $3`,
            [status, new Date(), messageId]
          );
          
          // Emitir evento WebSocket para atualizar o frontend
          if (io) {
            io.emit('messageStatusUpdate', {
              messageId,
              status,
              companyId
            });
            console.log(`[WEBHOOK] Evento messageStatusUpdate emitido para mensagem ${messageId}`);
          }
        } catch (error) {
          console.error(`[WEBHOOK] Erro ao atualizar status da mensagem:`, error);
        }
      }

    } catch (error) {
      console.error(`[WEBHOOK] Erro ao processar evento '${eventName}':`, error);
    }

    res.sendStatus(200);
  });

  // Sincronizar status de uma instância específica
  app.post('/api/whatsapp/sync-status/:instanceName', requireAuth, requireRole(['superadmin', 'admin', 'supervisor']), async (req, res) => {
    try {
      const { instanceName } = req.params;
      const { companyId } = req.user;
      
      // Verificar se a instância pertence à empresa
      if (!instanceName.startsWith(companyId)) {
        return res.status(403).json({ message: 'Instance does not belong to this company' });
      }

      // Obter status da Evolution API
      const response = await axios.get(`${process.env.EVOLUTION_API_URL}/instance/connectionState/${instanceName}`, {
        headers: {
          'apikey': process.env.EVOLUTION_API_KEY,
          'Content-Type': 'application/json',
        }
      });

      const state = response.data?.instance?.state;
      if (!state) {
        return res.status(404).json({ message: 'Instance not found in Evolution API' });
      }

      // Mapear status da Evolution API para nosso banco
      let newStatus = 'pending';
      if (state === 'open') {
        newStatus = 'connected';
      } else if (state === 'close') {
        newStatus = 'disconnected';
      } else if (state === 'connecting') {
        newStatus = 'connecting';
      }

      // Atualizar no banco de dados
      await storage.updateWhatsAppConnectionByInstanceName(instanceName, {
        status: newStatus
      });

      // Emitir evento via WebSocket
      const io = req.app.get('io');
      const [companyIdFromInstance] = instanceName.split('_');
      io.emit('connectionUpdate', { 
        instanceName, 
        status: newStatus, 
        companyId: companyIdFromInstance 
      });

      res.json({ 
        message: 'Status synchronized successfully',
        instanceName,
        status: newStatus,
        evolutionState: state
      });
    } catch (error) {
      console.error('Failed to sync status:', error);
      res.status(500).json({ message: 'Failed to sync status' });
    }
  });

  // Limpar todas as conexões WhatsApp
  app.delete('/api/whatsapp/connections/clear-all', requireAuth, requireRole(['superadmin', 'admin']), async (req, res) => {
    try {
      const { companyId } = req.user;
      
      // Deletar todas as conexões da empresa
      const deletedConnections = await storage.deleteAllWhatsAppConnections(companyId);
      
      res.json({
        message: 'Todas as conexões WhatsApp foram removidas com sucesso',
        deletedCount: deletedConnections.length,
        deletedConnections: deletedConnections.map(conn => ({
          id: conn.id,
          connectionName: conn.connectionName,
          instanceName: conn.instanceName
        }))
      });
    } catch (error) {
      console.error('Error clearing WhatsApp connections:', error);
      res.status(500).json({ message: 'Erro ao limpar conexões WhatsApp' });
    }
  });

  // Buscar mensagens de uma instância
  app.get('/api/whatsapp/connections/:companyId/:connectionId/messages', requireAuth, async (req, res) => {
    try {
      const { connectionId } = req.params;
      const { companyId } = req.user;
      
      // Buscar a conexão no banco
      const connection = await storage.getWhatsAppConnectionById(connectionId);
      if (!connection) {
        return res.status(404).json({ message: 'Conexão não encontrada' });
      }
      
      // Verificar se a conexão pertence à empresa
      if (connection.companyId !== companyId) {
        return res.status(403).json({ message: 'Acesso negado' });
      }
      
      // Buscar mensagens da Evolution API
      const messages = await evolutionService.getMessages(connection.instanceName);
      
      res.json({
        connectionId,
        instanceName: connection.instanceName,
        messages: messages.data || [],
        total: messages.data?.length || 0
      });
    } catch (error) {
      console.error('Error fetching messages:', error);
      res.status(500).json({ message: 'Erro ao buscar mensagens' });
    }
  });

  // Enviar mensagem de texto com suporte a resposta
  app.post('/api/whatsapp/conversations/:conversationId/send', requireAuth, async (req, res) => {
    try {
      const { conversationId } = req.params;
      const { text, quotedMessageId } = req.body;
      const { companyId } = req.user;

      if (!text || !text.trim()) {
        return res.status(400).json({ message: 'Texto da mensagem é obrigatório' });
      }

      // Buscar conversa
      const conversation = await storage.getConversationById(conversationId);
      if (!conversation || conversation.companyId !== companyId) {
        return res.status(404).json({ message: 'Conversa não encontrada' });
      }

      // Buscar conexão WhatsApp
      const connection = await storage.getWhatsAppConnectionById(conversation.whatsappConnectionId);
      if (!connection) {
        return res.status(404).json({ message: 'Conexão WhatsApp não encontrada' });
      }

      // Preparar payload para Evolution API
      const payload = {
        number: conversation.contactPhone,
        textMessage: {
          text: text
        },
        options: {
          delay: 1200
        }
      };

      // Adicionar resposta se especificada
      if (quotedMessageId) {
        payload.options.quoted = {
          key: {
            id: quotedMessageId
          }
        };
      }

      // Enviar via Evolution API
      const response = await axios.post(
        `${process.env.EVOLUTION_API_URL}/message/sendText/${connection.instanceName}`,
        payload,
        {
          headers: {
            'apikey': process.env.EVOLUTION_API_KEY,
            'Content-Type': 'application/json'
          }
        }
      );

      // Salvar mensagem no banco
      const messageData = {
        id: response.data.key?.id || randomUUID(),
        conversationId: conversationId,
        content: text,
        messageType: 'text',
        direction: 'outgoing',
        status: 'sent',
        sentAt: new Date(),
        mediaUrl: null,
        caption: null,
        fileName: null
      };

      const newMessageResult = await pool.query(
        `INSERT INTO messages (id, conversation_id, content, message_type, direction, environment, status, sent_at, media_url, caption, file_name) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
        [messageData.id, messageData.conversationId, messageData.content, messageData.messageType, messageData.direction, 'production', messageData.status, messageData.sentAt, messageData.mediaUrl, messageData.caption, messageData.fileName]
      );

      // Emitir evento WebSocket
      const io = req.app.get('io');
      if (io) {
        io.to(`company_${companyId}`).emit('newMessage', {
          ...newMessageResult.rows[0],
          companyId,
          conversationId,
          direction: 'outgoing'
        });
      }

      res.json({
        message: 'Mensagem enviada com sucesso',
        messageId: newMessageResult.rows[0].id,
        evolutionResponse: response.data
      });

    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      res.status(500).json({ message: 'Erro ao enviar mensagem', error: error.message });
    }
  });

  // Enviar mídia (imagem, vídeo, áudio, documento)
  app.post('/api/whatsapp/conversations/:conversationId/send-media', requireAuth, upload.single('file'), async (req, res) => {
    try {
      const { conversationId } = req.params;
      const { quotedMessageId } = req.body;
      const { companyId } = req.user;
      const file = req.file;

      if (!file) {
        return res.status(400).json({ message: 'Arquivo é obrigatório' });
      }

      // Buscar conversa
      const conversation = await storage.getConversationById(conversationId);
      if (!conversation || conversation.companyId !== companyId) {
        return res.status(404).json({ message: 'Conversa não encontrada' });
      }

      // Buscar conexão WhatsApp
      const connection = await storage.getWhatsAppConnectionById(conversation.whatsappConnectionId);
      if (!connection) {
        return res.status(404).json({ message: 'Conexão WhatsApp não encontrada' });
      }

      // Determinar tipo de mídia
      const getMediaType = (file: Express.Multer.File) => {
        if (file.mimetype.startsWith('image/')) return 'image';
        if (file.mimetype.startsWith('video/')) return 'video';
        if (file.mimetype.startsWith('audio/')) return 'audio';
        return 'document';
      };

      const mediaType = getMediaType(file);
      const mediaUrl = `${process.env.MAIN_APP_URL}/uploads/${file.filename}`;

      // Preparar payload para Evolution API
      const payload = {
        number: conversation.contactPhone,
        options: {
          delay: 1200
        }
      };

      // Adicionar resposta se especificada
      if (quotedMessageId) {
        payload.options.quoted = {
          key: {
            id: quotedMessageId
          }
        };
      }

      // Configurar payload baseado no tipo de mídia
      if (mediaType === 'image') {
        payload.imageMessage = {
          image: {
            url: mediaUrl
          },
          caption: req.body.caption || ''
        };
      } else if (mediaType === 'video') {
        payload.videoMessage = {
          video: {
            url: mediaUrl
          },
          caption: req.body.caption || ''
        };
      } else if (mediaType === 'audio') {
        payload.audioMessage = {
          audio: {
            url: mediaUrl
          }
        };
      } else {
        payload.documentMessage = {
          document: {
            url: mediaUrl
          },
          fileName: req.file?.originalname || 'documento',
          caption: req.body.caption || ''
        };
      }

      // Enviar via Evolution API
      const endpoint = mediaType === 'image' ? 'sendMedia' : 
                     mediaType === 'video' ? 'sendMedia' : 
                     mediaType === 'audio' ? 'sendWhatsAppAudio' : 'sendMedia';

      const response = await axios.post(
        `${process.env.EVOLUTION_API_URL}/message/${endpoint}/${connection.instanceName}`,
        payload,
        {
          headers: {
            'apikey': process.env.EVOLUTION_API_KEY,
            'Content-Type': 'application/json'
          }
        }
      );

      // Salvar mensagem no banco
      const messageData = {
        id: response.data.key?.id || randomUUID(),
        conversationId: conversationId,
        content: req.body.caption || `[${mediaType}]`,
        messageType: mediaType,
        direction: 'outgoing',
        status: 'sent',
        sentAt: new Date(),
        mediaUrl: mediaUrl,
        caption: req.body.caption || null,
        fileName: req.file?.originalname || 'documento'
      };

      const newMessageResult = await pool.query(
        `INSERT INTO messages (id, conversation_id, content, message_type, direction, environment, status, sent_at, media_url, caption, file_name) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
        [messageData.id, messageData.conversationId, messageData.content, messageData.messageType, messageData.direction, 'production', messageData.status, messageData.sentAt, messageData.mediaUrl, messageData.caption, messageData.fileName]
      );

      // Emitir evento WebSocket
      const io = req.app.get('io');
      if (io) {
        io.to(`company_${companyId}`).emit('newMessage', {
          ...newMessageResult.rows[0],
          companyId,
          conversationId,
          direction: 'outgoing'
        });
      }

      res.json({
        message: 'Mídia enviada com sucesso',
        messageId: newMessageResult.rows[0].id,
        mediaUrl: mediaUrl,
        evolutionResponse: response.data
      });

    } catch (error) {
      console.error('Erro ao enviar mídia:', error);
      res.status(500).json({ message: 'Erro ao enviar mídia', error: error.message });
    }
  });

  // Health check da Evolution API
  app.get('/api/whatsapp/health', requireAuth, async (req, res) => {
    try {
      const health = await evolutionService.healthCheck();
      res.json(health);
    } catch (error) {
      console.error('Evolution API health check failed:', error);
      res.status(500).json({ message: 'Evolution API unavailable' });
    }
  });

  // Reconectar uma instância
  app.post('/api/whatsapp/connections/:companyId/:connectionId/reconnect', requireAuth, requireRole(['superadmin', 'admin', 'supervisor']), async (req, res) => {
    try {
      const { connectionId } = req.params;
      const { companyId } = req.user;
      
      // Buscar a conexão no banco
      const connection = await storage.getWhatsAppConnectionById(connectionId);
      if (!connection) {
        return res.status(404).json({ message: 'Conexão não encontrada' });
      }
      
      // Verificar se a conexão pertence à empresa
      if (connection.companyId !== companyId) {
        return res.status(403).json({ message: 'Acesso negado' });
      }
      
      // Reconectar na Evolution API
      const result = await evolutionService.connectInstance(connection.instanceName);
      
      // Atualizar status no banco
      await storage.updateWhatsAppConnectionByInstanceName(connection.instanceName, {
        status: 'connecting',
        updatedAt: new Date()
      });
      
      // Emitir evento WebSocket
      const io = req.app.get('io');
      io.emit('connectionUpdate', {
        connectionId,
        status: 'connecting',
        message: 'Reconectando...'
      });
      
      res.json({
        message: 'Reconexão iniciada',
        connectionId,
        status: 'connecting',
        result
      });
    } catch (error) {
      console.error(`❌ Erro ao reconectar: ${error.message}`);
      res.status(500).json({ message: 'Erro ao reconectar', error: error.message });
    }
  });

  // Desconectar uma instância
  app.post('/api/whatsapp/connections/:companyId/:connectionId/disconnect', requireAuth, requireRole(['superadmin', 'admin', 'supervisor']), async (req, res) => {
    try {
      const { connectionId } = req.params;
      const { companyId } = req.user;
      
      // Buscar a conexão no banco
      const connection = await storage.getWhatsAppConnectionById(connectionId);
      if (!connection) {
        return res.status(404).json({ message: 'Conexão não encontrada' });
      }
      
      // Verificar se a conexão pertence à empresa
      if (connection.companyId !== companyId) {
        return res.status(403).json({ message: 'Acesso negado' });
      }
      
      // Desconectar na Evolution API
      const result = await evolutionService.disconnectInstance(connection.instanceName);
      
      // Atualizar status no banco
      await storage.updateWhatsAppConnectionByInstanceName(connection.instanceName, {
        status: 'disconnected',
        updatedAt: new Date()
      });
      
      // Emitir evento WebSocket
      const io = req.app.get('io');
      io.emit('connectionUpdate', {
        connectionId,
        status: 'disconnected',
        message: 'Desconectado'
      });
      
      res.json({
        message: 'Desconexão realizada',
        connectionId,
        status: 'disconnected',
        result
      });
    } catch (error) {
      console.error(`❌ Erro ao desconectar: ${error.message}`);
      res.status(500).json({ message: 'Erro ao desconectar', error: error.message });
    }
  });

  // Sincronizar automaticamente todas as instâncias
  app.post('/api/whatsapp/sync-all', requireAuth, requireRole(['superadmin', 'admin', 'supervisor']), async (req, res) => {
    try {
      const { companyId } = req.user;
      
      // Buscar todas as instâncias da Evolution API
      const instances = await evolutionService.fetchInstances();
      
      // Buscar conexões do banco
      const connections = await storage.getWhatsAppConnectionsByCompany(companyId);
      
      const syncResults = [];
      const io = req.app.get('io');
      
      for (const instance of instances) {
        // Verificar se a instância pertence à empresa
        if (instance.name.startsWith(companyId)) {
          const connection = connections.find(conn => conn.instanceName === instance.name);
          
          if (connection) {
            // Atualizar status da conexão
            const newStatus = instance.connectionStatus === 'open' ? 'connected' : 'disconnected';
            const updateData: any = {
              status: newStatus,
              updatedAt: new Date()
            };
            
            // Adicionar informações do WhatsApp se conectado
            if (instance.connectionStatus === 'open') {
              updateData.phone = instance.ownerJid;
              updateData.profilePictureUrl = instance.profilePicUrl;
            }
            
            await storage.updateWhatsAppConnectionByInstanceName(instance.name, updateData);
            
            // Emitir evento WebSocket
            io.emit('connectionUpdate', {
              connectionId: connection.id,
              status: newStatus,
              phone: instance.ownerJid,
              profilePictureUrl: instance.profilePicUrl,
              message: newStatus === 'connected' ? 'Conectado automaticamente' : 'Desconectado'
            });
            
            syncResults.push({
              connectionId: connection.id,
              instanceName: instance.name,
              status: newStatus,
              phone: instance.ownerJid
            });
          }
        }
      }
      
      res.json({
        message: 'Sincronização automática concluída',
        syncedCount: syncResults.length,
        results: syncResults
      });
    } catch (error) {
      console.error(`❌ Erro na sincronização automática: ${error.message}`);
      res.status(500).json({ message: 'Erro na sincronização automática', error: error.message });
    }
  });

}
