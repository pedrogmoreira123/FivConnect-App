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