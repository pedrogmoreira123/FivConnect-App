/**
 * Message Processor - Processa mensagens recebidas e decide routing
 */

import { Logger } from 'pino';
import { AIService, ConversationContext } from './ai-service.js';
import { WhapiService } from '../whapi-service.js';
import type { Storage } from '../storage.js';

export interface IncomingMessage {
  provider: string;
  channelId: string;
  from: string;
  type: 'text' | 'image' | 'video' | 'audio' | 'document' | 'location' | 'contact';
  message: string;
  mediaUrl?: string;
  caption?: string;
  filename?: string;
  timestamp: Date;
  messageId: string;
  quotedMessageId?: string;
}

export interface ChatbotConfig {
  id: string;
  companyId: string;
  mode: 'simple_bot' | 'ai_agent' | 'disabled';
  isEnabled: boolean;
  simpleBotConfig?: any;
  aiAgentConfig?: any;
  triggerRules?: any;
}

export class MessageProcessor {
  private aiService: AIService;

  constructor(
    private logger: Logger,
    private whapiService: WhapiService,
    private storage: Storage
  ) {
    this.aiService = new AIService(logger);
  }

  /**
   * Processar mensagem recebida
   */
  async processIncomingMessage(message: IncomingMessage): Promise<void> {
    try {
      this.logger.info(`[MessageProcessor] Processing message from ${message.from}`);

      // 1. Identificar company pelo whatsappConnectionId/channelId
      const connection = await this.getConnectionByChannelId(message.channelId);

      if (!connection) {
        this.logger.warn(`[MessageProcessor] No connection found for channelId: ${message.channelId}`);
        return;
      }

      this.logger.info(`[MessageProcessor] Found connection for company: ${connection.companyId}`);

      // 1.5. CRITICAL FIX: Save incoming message to database first
      await this.saveIncomingMessage(message, connection);

      // 2. Buscar configuração do chatbot
      const config = await this.getChatbotConfig(connection.companyId);

      if (!config || !config.isEnabled || config.mode === 'disabled') {
        this.logger.info(`[MessageProcessor] Chatbot disabled, routing to human agent`);
        return await this.routeToHuman(message, connection);
      }

      // 3. Verificar horário comercial
      if (config.triggerRules?.businessHoursOnly) {
        if (!this.isWithinBusinessHours(config.simpleBotConfig?.workingHours)) {
          this.logger.info(`[MessageProcessor] Outside business hours, sending automated message`);
          return await this.sendOutsideHoursMessage(message, config, connection);
        }
      }

      // 4. Verificar palavras-chave para transferência
      if (this.containsTransferKeyword(message.message, config.triggerRules)) {
        this.logger.info(`[MessageProcessor] Transfer keyword detected, routing to human`);
        return await this.transferToHuman(message, connection);
      }

      // 5. Processar baseado no modo
      switch (config.mode) {
        case 'simple_bot':
          return await this.processSimpleBot(message, config, connection);
        case 'ai_agent':
          return await this.processAIAgent(message, config, connection);
        default:
          return await this.routeToHuman(message, connection);
      }
    } catch (error: any) {
      this.logger.error(`[MessageProcessor] Error processing message:`, error);
      throw error;
    }
  }

  /**
   * Processar com bot simples (respostas baseadas em regras)
   */
  private async processSimpleBot(
    message: IncomingMessage,
    config: ChatbotConfig,
    connection: any
  ): Promise<void> {
    try {
      this.logger.info('[MessageProcessor] Processing with simple bot');

      // Buscar ou criar conversa
      const conversation = await this.getOrCreateConversation(message, connection);

      // Gerar resposta baseada em regras
      const response = this.generateSimpleBotResponse(message, config, conversation);

      // Atraso antes de enviar (simular digitação)
      const delay = config.simpleBotConfig?.responseDelay || 3;
      await this.delay(delay * 1000);

      // Enviar resposta
      await this.whapiService.sendTextMessageWithToken(
        message.from,
        response,
        connection.whapiToken
      );

      // Salvar mensagem no banco
      await this.storage.createMessage({
        conversationId: conversation.id,
        content: response,
        messageType: 'text',
        direction: 'outgoing',
        externalId: `bot-${Date.now()}`,
        metadata: {
          generatedByBot: true,
          botMode: 'simple_bot'
        }
      });

      this.logger.info('[MessageProcessor] Simple bot response sent successfully');
    } catch (error: any) {
      this.logger.error('[MessageProcessor] Error in simple bot processing:', error);
      throw error;
    }
  }

  /**
   * Processar com AI Agent
   */
  private async processAIAgent(
    message: IncomingMessage,
    config: ChatbotConfig,
    connection: any
  ): Promise<void> {
    try {
      this.logger.info('[MessageProcessor] Processing with AI agent');

      // Buscar ou criar conversa
      const conversation = await this.getOrCreateConversation(message, connection);

      // Buscar contexto da conversa (últimas 10 mensagens)
      const context = await this.getConversationContext(conversation.id);

      // Gerar resposta com IA
      const aiResponse = await this.aiService.generateResponse({
        provider: config.aiAgentConfig?.provider || 'gemini',
        apiKey: config.aiAgentConfig?.apiKey || '',
        systemPrompt: config.aiAgentConfig?.systemPrompt || 'Você é um assistente virtual prestativo.',
        userMessage: message.message,
        context: config.aiAgentConfig?.contextMemory ? context : [],
        temperature: config.aiAgentConfig?.temperature || 0.7,
        maxTokens: config.aiAgentConfig?.maxTokens || 150
      });

      // Enviar resposta
      await this.whapiService.sendTextMessageWithToken(
        message.from,
        aiResponse,
        connection.whapiToken
      );

      // Salvar mensagem no banco
      await this.storage.createMessage({
        conversationId: conversation.id,
        content: aiResponse,
        messageType: 'text',
        direction: 'outgoing',
        externalId: `ai-${Date.now()}`,
        metadata: {
          generatedByAI: true,
          aiProvider: config.aiAgentConfig?.provider,
          botMode: 'ai_agent'
        }
      });

      this.logger.info('[MessageProcessor] AI agent response sent successfully');
    } catch (error: any) {
      this.logger.error('[MessageProcessor] Error in AI agent processing:', error);

      // Fallback: enviar mensagem de erro
      await this.whapiService.sendTextMessageWithToken(
        message.from,
        'Desculpe, estou com dificuldades para processar sua mensagem. Um atendente humano entrará em contato em breve.',
        connection.whapiToken
      );

      // Rotear para humano
      await this.routeToHuman(message, connection);
    }
  }

  /**
   * Gerar resposta do bot simples
   */
  private generateSimpleBotResponse(
    message: IncomingMessage,
    config: ChatbotConfig,
    conversation: any
  ): string {
    const { simpleBotConfig } = config;

    // Se for primeira mensagem, enviar boas-vindas
    if (!conversation.lastMessage) {
      return this.replacePlaceholders(
        simpleBotConfig?.welcomeMessage || 'Olá! Como posso ajudar?',
        { conversation }
      );
    }

    // Lógica simples de resposta
    const messageText = message.message.toLowerCase();

    // Menu de opções
    if (messageText.includes('menu') || messageText.includes('opções')) {
      return this.replacePlaceholders(
        simpleBotConfig?.queueSelectionMessage || 'Escolha uma opção:\n1 - Suporte\n2 - Vendas\n3 - Financeiro',
        { conversation }
      );
    }

    // Resposta padrão
    return 'Entendi. Um atendente irá lhe responder em breve. Caso queira ver o menu de opções, digite "menu".';
  }

  /**
   * Substituir placeholders nas mensagens
   */
  private replacePlaceholders(message: string, data: any): string {
    return message
      .replace(/\{\{nome_cliente\}\}/g, data.conversation?.contactName || 'Cliente')
      .replace(/\{\{protocolo\}\}/g, data.conversation?.protocolNumber || 'N/A')
      .replace(/\{\{data_abertura\}\}/g, new Date().toLocaleDateString('pt-BR'))
      .replace(/\{\{nome_empresa\}\}/g, 'FivConnect');
  }

  /**
   * Rotear para agente humano
   */
  private async routeToHuman(message: IncomingMessage, connection: any): Promise<void> {
    try {
      this.logger.info('[MessageProcessor] Routing to human agent');

      const conversation = await this.getOrCreateConversation(message, connection);

      // Atualizar status da conversa para 'waiting'
      await this.storage.updateConversation(conversation.id, {
        status: 'waiting'
      });

      this.logger.info('[MessageProcessor] Message routed to human agent queue');
    } catch (error: any) {
      this.logger.error('[MessageProcessor] Error routing to human:', error);
    }
  }

  /**
   * Transferir para humano (com mensagem)
   */
  private async transferToHuman(message: IncomingMessage, connection: any): Promise<void> {
    try {
      this.logger.info('[MessageProcessor] Transferring to human agent');

      const conversation = await this.getOrCreateConversation(message, connection);
      const config = await this.getChatbotConfig(connection.companyId);

      // Enviar mensagem de transferência
      const transferMessage = config?.simpleBotConfig?.transferMessage ||
        'Vou transferir você para um de nossos atendentes. Aguarde um momento.';

      await this.whapiService.sendTextMessageWithToken(
        message.from,
        transferMessage,
        connection.whapiToken
      );

      // Atualizar status
      await this.storage.updateConversation(conversation.id, {
        status: 'waiting'
      });

      this.logger.info('[MessageProcessor] Successfully transferred to human');
    } catch (error: any) {
      this.logger.error('[MessageProcessor] Error transferring to human:', error);
    }
  }

  /**
   * Enviar mensagem de fora de horário
   */
  private async sendOutsideHoursMessage(
    message: IncomingMessage,
    config: ChatbotConfig,
    connection: any
  ): Promise<void> {
    try {
      const outsideHoursMsg = config.simpleBotConfig?.outsideHoursMessage ||
        'No momento estamos fora do horário de atendimento. Retornaremos seu contato em breve.';

      await this.whapiService.sendTextMessageWithToken(
        message.from,
        outsideHoursMsg,
        connection.whapiToken
      );

      this.logger.info('[MessageProcessor] Outside hours message sent');
    } catch (error: any) {
      this.logger.error('[MessageProcessor] Error sending outside hours message:', error);
    }
  }

  /**
   * Buscar conexão pelo channelId
   */
  private async getConnectionByChannelId(channelId: string): Promise<any> {
    // Buscar conexão globalmente pelo whapiChannelId
    // Não sabemos a empresa ainda, então buscar todas as conexões
    const connections = await this.storage.getAllWhatsAppConnectionsGlobal();

    // Tentar encontrar por whapiChannelId primeiro
    let connection = connections.find((c: any) => c.whapiChannelId === channelId);

    // Se não encontrou, tentar buscar pela primeira conexão ativa
    if (!connection) {
      connection = connections.find((c: any) => c.status === 'connected' && c.whapiToken);
      this.logger.info(`[MessageProcessor] No connection found for channelId ${channelId}, using first active connection`);
    }

    return connection || null;
  }

  /**
   * Buscar configuração do chatbot
   */
  private async getChatbotConfig(companyId: string): Promise<ChatbotConfig | null> {
    return await this.storage.getChatbotConfig(companyId);
  }

  /**
   * Buscar ou criar conversa
   */
  private async getOrCreateConversation(message: IncomingMessage, connection: any): Promise<any> {
    const { normalizePhoneForSearch } = await import('../utils/phone-normalizer.js');
    const contactPhone = normalizePhoneForSearch(message.from);

    // Buscar cliente
    let client = await this.storage.getClientByPhone(contactPhone);

    if (!client) {
      client = await this.storage.createClient({
        name: `Cliente ${contactPhone}`,
        phone: contactPhone,
        email: null,
        companyId: connection.companyId
      });
    }

    // Buscar conversa
    let conversation = await this.storage.getConversationByClient(client.id, connection.companyId);

    if (!conversation) {
      conversation = await this.storage.createConversation({
        contactName: client.name,
        contactPhone: client.phone,
        clientId: client.id,
        companyId: connection.companyId,
        whatsappConnectionId: connection.id,
        status: 'waiting',
        priority: 'medium',
        isGroup: false,
        lastMessageAt: new Date(),
        lastMessage: message.message,
        lastMessageType: message.type
      });
    }

    return conversation;
  }

  /**
   * Buscar contexto da conversa
   */
  private async getConversationContext(conversationId: string): Promise<ConversationContext[]> {
    const messages = await this.storage.getMessagesByConversation(conversationId);

    return messages.slice(-10).map((msg: any) => ({
      direction: msg.direction,
      content: msg.content,
      timestamp: msg.createdAt
    }));
  }

  /**
   * Verificar se está dentro do horário comercial
   */
  private isWithinBusinessHours(workingHours?: any): boolean {
    if (!workingHours?.enabled) {
      return true; // Se não configurado, sempre dentro do horário
    }

    const now = new Date();
    const dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][now.getDay()];
    const schedule = workingHours.schedule?.[dayOfWeek];

    if (!schedule?.enabled) {
      return false;
    }

    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    return currentTime >= schedule.start && currentTime <= schedule.end;
  }

  /**
   * Verificar se contém palavra-chave de transferência
   */
  private containsTransferKeyword(message: string, triggerRules?: any): boolean {
    const keywords = triggerRules?.transferToHumanKeywords || ['atendente', 'humano', 'pessoa', 'falar com'];
    const messageText = message.toLowerCase();

    return keywords.some((keyword: string) => messageText.includes(keyword.toLowerCase()));
  }

  /**
   * Salvar mensagem recebida no banco de dados
   */
  private async saveIncomingMessage(message: IncomingMessage, connection: any): Promise<void> {
    try {
      this.logger.info(`[MessageProcessor] Saving incoming message to database`);

      // Buscar ou criar conversa
      const conversation = await this.getOrCreateConversation(message, connection);

      // Verificar se mensagem já existe (evitar duplicatas)
      const existingMessage = await this.storage.getMessageByExternalId(message.messageId);
      if (existingMessage) {
        this.logger.info(`[MessageProcessor] Message already exists in database: ${message.messageId}`);
        return;
      }

      // Salvar mensagem no banco
      const savedMessage = await this.storage.createMessage({
        conversationId: conversation.id,
        content: message.message,
        messageType: message.type,
        direction: 'incoming',
        externalId: message.messageId,
        mediaUrl: message.mediaUrl,
        caption: message.caption,
        fileName: message.filename,
        metadata: {
          provider: message.provider,
          channelId: message.channelId,
          from: message.from,
          timestamp: message.timestamp,
          quotedMessageId: message.quotedMessageId
        }
      });

      this.logger.info(`[MessageProcessor] ✅ Incoming message saved: ${savedMessage.id}`);

      // Atualizar última mensagem da conversa
      await this.storage.updateConversation(conversation.id, {
        lastMessageAt: new Date(),
        lastMessage: message.message,
        lastMessageType: message.type
      });

      this.logger.info(`[MessageProcessor] ✅ Conversation updated with last message`);
    } catch (error: any) {
      this.logger.error(`[MessageProcessor] Error saving incoming message:`, error);
      // Não propagar o erro para não quebrar o fluxo do chatbot
    }
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
