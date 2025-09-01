import pkg from 'whatsapp-web.js';
const { Client, LocalAuth, MessageMedia } = pkg;
import QRCode from 'qrcode';
import { storage } from './storage';
import type { WhatsappConnection } from '@shared/schema';

interface WhatsAppClientSession {
  client: Client;
  connection: WhatsappConnection;
  qrString?: string;
}

export class WhatsAppService {
  private sessions: Map<string, WhatsAppClientSession> = new Map();
  private isInitialized = false;

  /**
   * Initialize the WhatsApp service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    console.log('🟢 Initializing WhatsApp Service...');
    
    try {
      // Load existing connections from database
      const connections = await storage.getAllWhatsAppConnections();
      
      for (const connection of connections) {
        if (connection.status !== 'destroyed') {
          await this.createSession(connection);
        }
      }
      
      this.isInitialized = true;
      console.log(`✅ WhatsApp Service initialized with ${connections.length} connections`);
    } catch (error) {
      console.error('❌ Failed to initialize WhatsApp Service:', error);
    }
  }

  /**
   * Create a new WhatsApp connection
   */
  async createConnection(name: string, isDefault: boolean = false): Promise<WhatsappConnection> {
    console.log(`🔄 Creating new WhatsApp connection: ${name}`);
    
    // Create connection record in database
    const connection = await storage.createWhatsAppConnection({
      name,
      isDefault,
      status: 'connecting'
    });

    // Create WhatsApp session
    await this.createSession(connection);

    return connection;
  }

  /**
   * Create a WhatsApp client session
   */
  private async createSession(connection: WhatsappConnection): Promise<void> {
    const sessionId = `session_${connection.id}`;
    
    console.log(`🔄 Creating session for connection: ${connection.name} (ID: ${connection.id})`);

    // Create WhatsApp client with LocalAuth for session persistence
    const client = new Client({
      authStrategy: new LocalAuth({
        clientId: sessionId,
        dataPath: './whatsapp_sessions'
      }),
      puppeteer: {
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu'
        ],
        headless: true
      }
    });

    // Store session
    const session: WhatsAppClientSession = {
      client,
      connection
    };
    this.sessions.set(connection.id, session);

    // Set up event handlers
    this.setupEventHandlers(session);

    // Initialize client
    client.initialize();
  }

  /**
   * Set up WhatsApp client event handlers
   */
  private setupEventHandlers(session: WhatsAppClientSession): void {
    const { client, connection } = session;

    // QR Code generation
    client.on('qr', async (qr: string) => {
      console.log(`📱 QR Code generated for ${connection.name}`);
      
      try {
        // Generate QR code as data URL
        const qrDataUrl = await QRCode.toDataURL(qr, {
          width: 300,
          margin: 2,
        });
        
        // Update connection with QR code
        await storage.updateWhatsAppConnection(connection.id, {
          status: 'qr_ready',
          qrCode: qrDataUrl
        });

        // Store QR in session
        session.qrString = qrDataUrl;

        console.log(`✅ QR Code ready for ${connection.name}`);
      } catch (error) {
        console.error(`❌ Failed to generate QR code for ${connection.name}:`, error);
      }
    });

    // Client ready
    client.on('ready', async () => {
      console.log(`🟢 WhatsApp client ready: ${connection.name}`);
      
      try {
        // Get phone number
        const phoneNumber = client.info.wid.user;
        
        // Update connection status
        await storage.updateWhatsAppConnection(connection.id, {
          status: 'connected',
          phone: phoneNumber,
          qrCode: null // Clear QR code when connected
        });

        console.log(`✅ ${connection.name} connected with phone: ${phoneNumber}`);
      } catch (error) {
        console.error(`❌ Failed to update connection status for ${connection.name}:`, error);
      }
    });

    // Authentication success
    client.on('authenticated', async () => {
      console.log(`🔐 WhatsApp authenticated: ${connection.name}`);
      
      await storage.updateWhatsAppConnection(connection.id, {
        status: 'connecting'
      });
    });

    // Authentication failure
    client.on('auth_failure', async (msg: string) => {
      console.error(`🔴 WhatsApp auth failure for ${connection.name}:`, msg);
      
      await storage.updateWhatsAppConnection(connection.id, {
        status: 'disconnected'
      });
    });

    // Client disconnected
    client.on('disconnected', async (reason: string) => {
      console.log(`🔴 WhatsApp disconnected: ${connection.name}, reason: ${reason}`);
      
      await storage.updateWhatsAppConnection(connection.id, {
        status: 'disconnected'
      });

      // Remove session
      this.sessions.delete(connection.id);
    });

    // Incoming messages
    client.on('message', async (message) => {
      console.log(`📨 New message from ${message.from}: ${message.body}`);
      
      try {
        await this.handleIncomingMessage(connection, message);
      } catch (error) {
        console.error('❌ Failed to handle incoming message:', error);
      }
    });
  }

  /**
   * Handle incoming WhatsApp messages
   */
  private async handleIncomingMessage(connection: WhatsappConnection, message: any): Promise<void> {
    const contact = await message.getContact();
    const chat = await message.getChat();
    
    // Extract phone number (remove @c.us suffix)
    const phoneNumber = message.from.replace('@c.us', '');
    const contactName = contact.pushname || contact.name || `Contact ${phoneNumber}`;

    console.log(`📨 Processing message from ${contactName} (${phoneNumber})`);

    // Find or create client
    let client = await storage.getClientByPhone(phoneNumber);
    if (!client) {
      client = await storage.createClient({
        name: contactName,
        phone: phoneNumber,
        notes: `Created from WhatsApp message via ${connection.name}`
      });
    }

    // Find or create conversation
    const conversations = await storage.getAllConversations();
    let conversation = conversations.find(c => 
      c.contactPhone === phoneNumber && 
      c.status !== 'completed' && 
      c.whatsappConnectionId === connection.id
    );

    const isNewConversation = !conversation;
    if (!conversation) {
      conversation = await storage.createConversation({
        contactName,
        contactPhone: phoneNumber,
        clientId: client.id,
        whatsappConnectionId: connection.id,
        status: 'waiting',
        isGroup: chat.isGroup
      });
    }

    // Determine message type
    let messageType = 'text';
    let mediaUrl: string | undefined;

    if (message.hasMedia) {
      messageType = message.type;
      // In a real implementation, you'd save media and store the URL
      mediaUrl = `whatsapp_media_${message.id}`;
    }

    // Create message record
    await storage.createMessage({
      conversationId: conversation.id,
      content: message.body || '[Media Message]',
      messageType: messageType as any,
      direction: 'incoming',
      mediaUrl,
      isRead: false
    });

    // Update conversation timestamp
    await storage.updateConversation(conversation.id, {
      status: conversation.status === 'completed' ? 'waiting' : conversation.status
    });

    console.log(`✅ Message processed and stored for conversation ${conversation.id}`);

    // Process chatbot automatic response
    await this.processChatbotResponse(connection, conversation, message.body || '', isNewConversation, contactName, client);
  }

  /**
   * Process chatbot automatic responses based on configuration
   */
  private async processChatbotResponse(
    connection: WhatsappConnection, 
    conversation: any, 
    messageContent: string, 
    isNewConversation: boolean,
    contactName: string,
    client: any
  ): Promise<void> {
    try {
      // Get chatbot configuration
      const aiConfig = await storage.getAiAgentConfig();
      if (!aiConfig || !aiConfig.isEnabled || aiConfig.mode !== 'chatbot') {
        console.log('💭 Chatbot is disabled, skipping auto response');
        return;
      }

      const responseDelay = (aiConfig.responseDelay || 3) * 1000; // Convert to milliseconds
      let autoResponse = '';

      // Determine response based on context
      if (isNewConversation && aiConfig.welcomeMessage) {
        // Welcome message for new conversations
        autoResponse = this.processMessagePlaceholders(
          aiConfig.welcomeMessage,
          contactName,
          conversation
        );
      } else {
        // Context-based responses for existing conversations
        autoResponse = await this.generateContextualResponse(messageContent, contactName, conversation);
        
        // Check if message is a queue selection number
        await this.handleQueueSelection(messageContent, conversation, connection);
        
        // Check for quick reply triggers
        const quickReply = await this.getQuickReplyResponse(messageContent);
        if (quickReply && !autoResponse) {
          autoResponse = this.processMessagePlaceholders(quickReply.message, contactName, conversation);
        }
      }

      if (autoResponse) {
        console.log(`🤖 Scheduling chatbot response for ${contactName}: "${autoResponse.substring(0, 50)}..."`);
        
        // Delay response to seem more natural
        setTimeout(async () => {
          try {
            const sent = await this.sendMessage(connection.id, conversation.contactPhone, autoResponse);
            if (sent) {
              // Store the automated response in database
              await storage.createMessage({
                conversationId: conversation.id,
                content: autoResponse,
                messageType: 'text',
                direction: 'outgoing',
                isRead: true
              });
              console.log(`✅ Chatbot response sent to ${contactName}`);
            }
          } catch (error) {
            console.error('❌ Failed to send chatbot response:', error);
          }
        }, responseDelay);
      }
    } catch (error) {
      console.error('❌ Error processing chatbot response:', error);
    }
  }

  /**
   * Generate contextual responses based on message content
   */
  private async generateContextualResponse(messageContent: string, contactName: string, conversation: any): Promise<string> {
    const lowerMessage = messageContent.toLowerCase().trim();
    
    // Get available queues for transfer options
    const queues = await storage.getAllQueues();
    const activeQueues = queues.filter(q => q.isActive);

    // Check if it's business hours
    const isBusinessHours = this.isBusinessHours();
    
    // Advanced intent detection
    const intent = this.detectMessageIntent(lowerMessage);
    
    // Generate response based on intent and business hours
    switch (intent) {
      case 'greeting':
        return this.getGreetingResponse(contactName, isBusinessHours);
      
      case 'support_request':
        return `Compreendo que você precisa de suporte, ${contactName}! ${
          isBusinessHours 
            ? 'Um atendente irá ajudá-lo em breve.' 
            : 'Estamos fora do horário de atendimento, mas sua mensagem foi registrada e responderemos em breve.'
        }\n\nDigite *menu* para ver as opções disponíveis.`;
      
      case 'pricing_inquiry':
        return `Para informações sobre preços e planos, ${contactName}, ${
          isBusinessHours 
            ? 'nosso time comercial irá atendê-lo em breve!'
            : 'nossa equipe comercial retornará seu contato no próximo dia útil.'
        }`;
      
      case 'urgent_request':
        await this.markConversationAsUrgent(conversation.id);
        return `⚡ Entendi que é urgente, ${contactName}! Sua mensagem foi marcada como prioritária ${
          isBusinessHours 
            ? 'e você será atendido o mais breve possível.'
            : 'e será a primeira a ser atendida quando voltarmos.'
        }`;
      
      case 'queue_selection':
        return this.generateQueueOptions(activeQueues);
      
      case 'menu_request':
        return this.generateMainMenu(contactName);
      
      case 'thanks':
        return `De nada, ${contactName}! 😊 Fico feliz em ajudar! Se precisar de mais alguma coisa, estarei aqui.`;
      
      case 'goodbye':
        return `Até mais, ${contactName}! 👋 Volte sempre que precisar. Tenha um ótimo dia!`;
      
      default:
        return this.getDefaultResponse(contactName, isBusinessHours);
    }
  }

  /**
   * Detect message intent using keyword analysis
   */
  private detectMessageIntent(message: string): string {
    const intents = {
      greeting: ['oi', 'olá', 'ola', 'bom dia', 'boa tarde', 'boa noite', 'hello', 'hi'],
      support_request: ['ajuda', 'help', 'suporte', 'problema', 'erro', 'bug', 'quebrou', 'não funciona', 'dúvida'],
      pricing_inquiry: ['preço', 'preco', 'valor', 'quanto custa', 'plano', 'assinatura', 'mensalidade', 'price'],
      urgent_request: ['urgente', 'emergência', 'emergencia', 'rapido', 'rápido', 'urgent', 'emergency'],
      queue_selection: ['fila', 'departamento', 'setor', 'queue', 'department'],
      menu_request: ['menu', 'opções', 'opcoes', 'options', 'ajuda', 'comandos'],
      thanks: ['obrigado', 'obrigada', 'valeu', 'thanks', 'thank you', 'brigado'],
      goodbye: ['tchau', 'bye', 'xau', 'até', 'goodbye', 'see you', 'flw']
    };

    for (const [intent, keywords] of Object.entries(intents)) {
      for (const keyword of keywords) {
        if (message.includes(keyword)) {
          return intent;
        }
      }
    }

    return 'unknown';
  }

  /**
   * Check if current time is within business hours
   */
  private isBusinessHours(): boolean {
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay(); // 0 = Sunday, 6 = Saturday
    
    // Monday to Friday, 9 AM to 6 PM
    return day >= 1 && day <= 5 && hour >= 9 && hour < 18;
  }

  /**
   * Get greeting response based on time of day
   */
  private getGreetingResponse(contactName: string, isBusinessHours: boolean): string {
    const now = new Date();
    const hour = now.getHours();
    
    let greeting;
    if (hour < 12) {
      greeting = 'Bom dia';
    } else if (hour < 18) {
      greeting = 'Boa tarde';
    } else {
      greeting = 'Boa noite';
    }
    
    const businessStatus = isBusinessHours 
      ? 'Estamos online e prontos para ajudar!' 
      : 'Estamos fora do horário comercial, mas sua mensagem foi recebida.';
    
    return `${greeting}, ${contactName}! 👋\n\n${businessStatus}\n\nDigite *menu* para ver as opções disponíveis.`;
  }

  /**
   * Get default response based on business hours
   */
  private getDefaultResponse(contactName: string, isBusinessHours: boolean): string {
    if (isBusinessHours) {
      return `Olá ${contactName}! 😊 Recebi sua mensagem e um atendente irá ajudá-lo em breve.\n\nDigite *menu* para ver as opções de atendimento.`;
    } else {
      return `Olá ${contactName}! 🌙 Estamos fora do horário comercial (Seg-Sex, 9h-18h), mas sua mensagem foi registrada.\n\nRetornaremos seu contato no próximo dia útil.\n\nDigite *menu* para opções de autoatendimento.`;
    }
  }

  /**
   * Mark conversation as urgent for priority handling
   */
  private async markConversationAsUrgent(conversationId: string): Promise<void> {
    try {
      await storage.updateConversation(conversationId, {
        notes: 'URGENTE - Prioridade alta solicitada pelo cliente'
      });
    } catch (error) {
      console.error('❌ Failed to mark conversation as urgent:', error);
    }
  }

  /**
   * Generate queue selection menu
   */
  private generateQueueOptions(queues: any[]): string {
    if (queues.length === 0) {
      return 'No momento não temos filas disponíveis. Um atendente geral irá ajudá-lo em breve.';
    }

    let menu = '📋 *Selecione uma opção de atendimento:*\n\n';
    queues.slice(0, 4).forEach((queue, index) => {
      menu += `${index + 1}️⃣ *${queue.name}*\n${queue.description}\n\n`;
    });
    menu += '_Digite o número da opção desejada_';
    
    return menu;
  }

  /**
   * Generate main menu with all options
   */
  private generateMainMenu(contactName: string): string {
    return `Olá ${contactName}! 👋\n\n📋 *Menu Principal:*\n\n1️⃣ Suporte Técnico\n2️⃣ Vendas\n3️⃣ Financeiro\n4️⃣ Atendimento Geral\n\n_Digite o número da opção ou descreva seu problema_`;
  }

  /**
   * Process message placeholders like {{nome_cliente}}, {{protocolo}}, etc.
   */
  private processMessagePlaceholders(message: string, contactName: string, conversation: any): string {
    const now = new Date();
    const protocol = `#${conversation.id.substring(0, 8).toUpperCase()}`;
    
    return message
      .replace(/\{\{nome_cliente\}\}/g, contactName)
      .replace(/\{\{nome_empresa\}\}/g, 'Fi.V App')
      .replace(/\{\{protocolo\}\}/g, protocol)
      .replace(/\{\{data_abertura\}\}/g, now.toLocaleString('pt-BR'))
      .replace(/\{\{fila\}\}/g, conversation.queueName || 'Atendimento Geral')
      .replace(/\{\{agente\}\}/g, conversation.agentName || 'Atendente')
      .replace(/\{\{horario_atendimento\}\}/g, 'Segunda a Sexta, 9h às 18h');
  }

  /**
   * Handle queue selection when user types numbers
   */
  private async handleQueueSelection(messageContent: string, conversation: any, connection: WhatsappConnection): Promise<void> {
    const selection = messageContent.trim();
    
    // Check if it's a valid queue selection number (1-4)
    if (/^[1-4]$/.test(selection)) {
      const queues = await storage.getAllQueues();
      const activeQueues = queues.filter(q => q.isActive);
      const selectedQueue = activeQueues[parseInt(selection) - 1];
      
      if (selectedQueue) {
        // Update conversation with selected queue
        await storage.updateConversation(conversation.id, {
          queueId: selectedQueue.id,
          status: 'waiting' // Keep in waiting status until agent takes it
        });
        
        console.log(`🎯 Conversation ${conversation.id} assigned to queue: ${selectedQueue.name}`);
      }
    }
  }

  /**
   * Get quick reply response based on keywords
   */
  private async getQuickReplyResponse(messageContent: string): Promise<{message: string} | null> {
    try {
      const quickReplies = await storage.getAllQuickReplies();
      const lowerMessage = messageContent.toLowerCase();
      
      // Find matching quick reply based on shortcut or keywords
      for (const reply of quickReplies) {
        if (reply.shortcut.toLowerCase() === lowerMessage) {
          return { message: reply.message };
        }
        
        // Check if message contains any keywords from the reply
        const keywords = reply.shortcut.toLowerCase().split(',').map(k => k.trim());
        for (const keyword of keywords) {
          if (lowerMessage.includes(keyword)) {
            return { message: reply.message };
          }
        }
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error getting quick reply response:', error);
      return null;
    }
  }

  /**
   * Send a WhatsApp message
   */
  async sendMessage(connectionId: string, to: string, message: string): Promise<boolean> {
    const session = this.sessions.get(connectionId);
    if (!session || session.connection.status !== 'connected') {
      throw new Error('WhatsApp connection not available');
    }

    try {
      // Format phone number for WhatsApp
      const chatId = to.includes('@c.us') ? to : `${to}@c.us`;
      
      await session.client.sendMessage(chatId, message);
      console.log(`📤 Message sent to ${to} via ${session.connection.name}`);
      
      return true;
    } catch (error) {
      console.error(`❌ Failed to send message via ${session.connection.name}:`, error);
      return false;
    }
  }

  /**
   * Get connection status and QR code
   */
  getConnectionInfo(connectionId: string): { status: string; qrCode?: string } | null {
    const session = this.sessions.get(connectionId);
    if (!session) return null;

    return {
      status: session.connection.status,
      qrCode: session.qrString
    };
  }

  /**
   * Disconnect a WhatsApp connection
   */
  async disconnectConnection(connectionId: string): Promise<void> {
    const session = this.sessions.get(connectionId);
    if (!session) return;

    console.log(`🔴 Disconnecting WhatsApp connection: ${session.connection.name}`);
    
    try {
      await session.client.destroy();
      this.sessions.delete(connectionId);
      
      await storage.updateWhatsAppConnection(connectionId, {
        status: 'destroyed'
      });
      
      console.log(`✅ Connection ${session.connection.name} disconnected`);
    } catch (error) {
      console.error(`❌ Failed to disconnect ${session.connection.name}:`, error);
    }
  }

  /**
   * Get all active sessions
   */
  getAllSessions(): Array<{ id: string; name: string; status: string; phone?: string }> {
    return Array.from(this.sessions.values()).map(session => ({
      id: session.connection.id,
      name: session.connection.name,
      status: session.connection.status,
      phone: session.connection.phone || undefined
    }));
  }
}

// Export singleton instance
export const whatsappService = new WhatsAppService();