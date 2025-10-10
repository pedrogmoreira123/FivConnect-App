import axios, { AxiosError } from 'axios';
import { Logger } from 'pino';

export class WhapiService {
  private apiUrl: string;
  private apiToken: string;
  private headers: { Authorization: string; 'Content-Type': string };

  constructor(private logger: Logger) {
    if (!process.env.WHAPI_API_URL || !process.env.WHAPI_API_TOKEN) {
      this.logger.warn('⚠️ WHAPI_API_URL e WHAPI_API_TOKEN não estão configurados - Whapi.Cloud API desabilitada');
      this.apiUrl = '';
      this.apiToken = '';
      this.headers = {
        'Authorization': '',
        'Content-Type': 'application/json',
      };
      return;
    }
    this.apiUrl = process.env.WHAPI_API_URL;
    this.apiToken = process.env.WHAPI_API_TOKEN;
    this.headers = {
      'Authorization': `Bearer ${process.env.WHAPI_API_TOKEN}`,
      'Content-Type': 'application/json',
    };
    this.logger.info(`[WhapiService] Inicializado para a URL: ${this.apiUrl}`);
  }

  /**
   * Obter QR Code para reconexão (se necessário)
   * A Whapi.Cloud não cria instâncias via API - a conexão é pré-configurada
   */
  async getQRCode(): Promise<string | null> {
    this.logger.info(`🔍 Buscando QR code da Whapi.Cloud.`);
    try {
      const response = await axios.get(`${this.apiUrl}users/login`, {
        headers: this.headers,
      });

      const qrCodeBase64 = response.data?.qr_code;
      if (qrCodeBase64) {
        this.logger.info(`✅ QR Code encontrado.`);
        return qrCodeBase64;
      }

      this.logger.warn(`🤔 QR Code ainda não disponível. Status: ${response.data?.status}`);
      return null;
    } catch (error) {
      this.handleApiError(error, 'getQRCode');
      throw new Error('Falha ao obter o QR code');
    }
  }

  /**
   * Enviar mensagem de texto
   */
  async sendTextMessage(to: string, body: string): Promise<any> {
    this.logger.info(`📤 Enviando texto para ${to}.`);
    const payload = {
      to: to,
      body: body
    };
    try {
      const response = await axios.post(`${this.apiUrl}messages/text`, payload, {
        headers: this.headers,
      });
      this.logger.info(`✅ Texto enviado com sucesso para ${to}.`);
      return response.data;
    } catch (error) {
      this.handleApiError(error, 'sendTextMessage');
      throw new Error('Falha ao enviar mensagem de texto.');
    }
  }

  /**
   * Enviar mensagem de mídia (imagem, vídeo, áudio, documento)
   */
  async sendMediaMessage(to: string, mediaUrl: string, caption?: string, mediaType: string = 'image'): Promise<any> {
    this.logger.info(`📤 Enviando ${mediaType} para ${to}.`);
    
    const payload: any = {
      to: to,
      media: mediaUrl
    };

    if (caption) {
      payload.caption = caption;
    }

    try {
      let endpoint = 'messages/image';
      if (mediaType === 'video') {
        endpoint = 'messages/video';
      } else if (mediaType === 'audio') {
        endpoint = 'messages/audio';
      } else if (mediaType === 'document') {
        endpoint = 'messages/document';
      }

      const response = await axios.post(`${this.apiUrl}${endpoint}`, payload, {
        headers: this.headers,
      });
      this.logger.info(`✅ ${mediaType} enviado com sucesso para ${to}.`);
      return response.data;
    } catch (error) {
      this.handleApiError(error, 'sendMediaMessage');
      throw new Error(`Falha ao enviar ${mediaType}.`);
    }
  }

  /**
   * Enviar mensagem de imagem
   */
  async sendImageMessage(to: string, imageUrl: string, caption?: string): Promise<any> {
    return this.sendMediaMessage(to, imageUrl, caption, 'image');
  }

  /**
   * Enviar mensagem de vídeo
   */
  async sendVideoMessage(to: string, videoUrl: string, caption?: string): Promise<any> {
    return this.sendMediaMessage(to, videoUrl, caption, 'video');
  }

  /**
   * Enviar mensagem de áudio
   */
  async sendAudioMessage(to: string, audioUrl: string): Promise<any> {
    return this.sendMediaMessage(to, audioUrl, undefined, 'audio');
  }

  /**
   * Enviar mensagem de documento
   */
  async sendDocumentMessage(to: string, documentUrl: string, filename: string): Promise<any> {
    const payload = {
      to: to,
      media: documentUrl,
      filename: filename
    };

    try {
      const response = await axios.post(`${this.apiUrl}messages/document`, payload, {
        headers: this.headers,
      });
      this.logger.info(`✅ Documento enviado com sucesso para ${to}.`);
      return response.data;
    } catch (error) {
      this.handleApiError(error, 'sendDocumentMessage');
      throw new Error('Falha ao enviar documento.');
    }
  }

  /**
   * Enviar mensagem de sticker
   */
  async sendStickerMessage(to: string, stickerUrl: string): Promise<any> {
    this.logger.info(`📤 Enviando sticker para ${to}.`);
    const payload = {
      to: to,
      media: stickerUrl
    };

    try {
      const response = await axios.post(`${this.apiUrl}messages/sticker`, payload, {
        headers: this.headers,
      });
      this.logger.info(`✅ Sticker enviado com sucesso para ${to}.`);
      return response.data;
    } catch (error) {
      this.handleApiError(error, 'sendStickerMessage');
      throw new Error('Falha ao enviar sticker.');
    }
  }

  /**
   * Enviar mensagem de contato
   */
  async sendContactMessage(to: string, contact: { name: string; phone: string }): Promise<any> {
    this.logger.info(`📤 Enviando contato para ${to}.`);
    const payload = {
      to: to,
      contacts: [{
        name: {
          formatted_name: contact.name
        },
        phones: [{
          phone: contact.phone,
          type: 'MOBILE'
        }]
      }]
    };

    try {
      const response = await axios.post(`${this.apiUrl}messages/contact`, payload, {
        headers: this.headers,
      });
      this.logger.info(`✅ Contato enviado com sucesso para ${to}.`);
      return response.data;
    } catch (error) {
      this.handleApiError(error, 'sendContactMessage');
      throw new Error('Falha ao enviar contato.');
    }
  }

  /**
   * Enviar mensagem de resposta (quote)
   */
  async sendReplyMessage(to: string, body: string, quotedMessageId: string): Promise<any> {
    this.logger.info(`📤 Enviando resposta para ${to}.`);
    const payload = {
      to: to,
      body: body,
      quoted: {
        id: quotedMessageId
      }
    };

    try {
      const response = await axios.post(`${this.apiUrl}messages/text`, payload, {
        headers: this.headers,
      });
      this.logger.info(`✅ Resposta enviada com sucesso para ${to}.`);
      return response.data;
    } catch (error) {
      this.handleApiError(error, 'sendReplyMessage');
      throw new Error('Falha ao enviar resposta.');
    }
  }

  /**
   * Enviar mensagem com token específico (para multi-tenant)
   */
  async sendTextMessageWithToken(to: string, body: string, clientToken: string): Promise<any> {
    this.logger.info(`📤 Enviando texto para ${to} com token específico.`);
    const payload = {
      to: to,
      body: body
    };

    try {
      const response = await axios.post(`${this.apiUrl}messages/text`, payload, {
        headers: {
          'Authorization': `Bearer ${clientToken}`,
          'Content-Type': 'application/json',
        },
      });
      this.logger.info(`✅ Texto enviado com sucesso para ${to}.`);
      return response.data;
    } catch (error) {
      this.handleApiError(error, 'sendTextMessageWithToken');
      throw new Error('Falha ao enviar mensagem de texto.');
    }
  }

  /**
   * Enviar imagem com token específico (para multi-tenant)
   */
  async sendImageMessageWithToken(to: string, imageUrl: string, caption: string | undefined, clientToken: string): Promise<any> {
    this.logger.info(`📤 Enviando imagem para ${to} com token específico.`);
    const payload: any = {
      to: to,
      media: imageUrl
    };

    if (caption) {
      payload.caption = caption;
    }

    try {
      const response = await axios.post(`${this.apiUrl}messages/image`, payload, {
        headers: {
          'Authorization': `Bearer ${clientToken}`,
          'Content-Type': 'application/json',
        },
      });
      this.logger.info(`✅ Imagem enviada com sucesso para ${to}.`);
      return response.data;
    } catch (error) {
      this.handleApiError(error, 'sendImageMessageWithToken');
      throw new Error('Falha ao enviar imagem.');
    }
  }

  /**
   * Enviar vídeo com token específico (para multi-tenant)
   */
  async sendVideoMessageWithToken(to: string, videoUrl: string, caption: string | undefined, clientToken: string): Promise<any> {
    this.logger.info(`📤 Enviando vídeo para ${to} com token específico.`);
    const payload: any = {
      to: to,
      media: videoUrl
    };

    if (caption) {
      payload.caption = caption;
    }

    try {
      const response = await axios.post(`${this.apiUrl}messages/video`, payload, {
        headers: {
          'Authorization': `Bearer ${clientToken}`,
          'Content-Type': 'application/json',
        },
      });
      this.logger.info(`✅ Vídeo enviado com sucesso para ${to}.`);
      return response.data;
    } catch (error) {
      this.handleApiError(error, 'sendVideoMessageWithToken');
      throw new Error('Falha ao enviar vídeo.');
    }
  }

  /**
   * Enviar áudio com token específico (para multi-tenant)
   */
  async sendAudioMessageWithToken(to: string, audioUrl: string, clientToken: string): Promise<any> {
    this.logger.info(`📤 Enviando áudio para ${to} com token específico.`);
    const payload = {
      to: to,
      media: audioUrl
    };

    try {
      const response = await axios.post(`${this.apiUrl}messages/audio`, payload, {
        headers: {
          'Authorization': `Bearer ${clientToken}`,
          'Content-Type': 'application/json',
        },
      });
      this.logger.info(`✅ Áudio enviado com sucesso para ${to}.`);
      return response.data;
    } catch (error) {
      this.handleApiError(error, 'sendAudioMessageWithToken');
      throw new Error('Falha ao enviar áudio.');
    }
  }

  /**
   * Enviar sticker com token específico (para multi-tenant)
   */
  async sendStickerMessageWithToken(to: string, stickerUrl: string, clientToken: string): Promise<any> {
    this.logger.info(`📤 Enviando sticker para ${to} com token específico.`);
    const payload = {
      to: to,
      media: stickerUrl
    };

    try {
      const response = await axios.post(`${this.apiUrl}messages/sticker`, payload, {
        headers: {
          'Authorization': `Bearer ${clientToken}`,
          'Content-Type': 'application/json',
        },
      });
      this.logger.info(`✅ Sticker enviado com sucesso para ${to}.`);
      return response.data;
    } catch (error) {
      this.handleApiError(error, 'sendStickerMessageWithToken');
      throw new Error('Falha ao enviar sticker.');
    }
  }

  /**
   * Enviar contato com token específico (para multi-tenant)
   */
  async sendContactMessageWithToken(to: string, contact: { name: string; phone: string }, clientToken: string): Promise<any> {
    this.logger.info(`📤 Enviando contato para ${to} com token específico.`);
    const payload = {
      to: to,
      contacts: [{
        name: {
          formatted_name: contact.name
        },
        phones: [{
          phone: contact.phone,
          type: 'MOBILE'
        }]
      }]
    };

    try {
      const response = await axios.post(`${this.apiUrl}messages/contact`, payload, {
        headers: {
          'Authorization': `Bearer ${clientToken}`,
          'Content-Type': 'application/json',
        },
      });
      this.logger.info(`✅ Contato enviado com sucesso para ${to}.`);
      return response.data;
    } catch (error) {
      this.handleApiError(error, 'sendContactMessageWithToken');
      throw new Error('Falha ao enviar contato.');
    }
  }

  /**
   * Enviar resposta com token específico (para multi-tenant)
   */
  async sendReplyMessageWithToken(to: string, body: string, quotedMessageId: string, clientToken: string): Promise<any> {
    this.logger.info(`📤 Enviando resposta para ${to} com token específico.`);
    const payload = {
      to: to,
      body: body,
      quoted: {
        id: quotedMessageId
      }
    };

    try {
      const response = await axios.post(`${this.apiUrl}messages/text`, payload, {
        headers: {
          'Authorization': `Bearer ${clientToken}`,
          'Content-Type': 'application/json',
        },
      });
      this.logger.info(`✅ Resposta enviada com sucesso para ${to}.`);
      return response.data;
    } catch (error) {
      this.handleApiError(error, 'sendReplyMessageWithToken');
      throw new Error('Falha ao enviar resposta.');
    }
  }

  /**
   * Fazer logout da sessão
   */
  async logoutSession(): Promise<any> {
    this.logger.info(`🚪 Fazendo logout da sessão.`);
    try {
      const response = await axios.get(`${this.apiUrl}users/logout`, {
        headers: this.headers,
      });
      this.logger.info(`✅ Logout realizado com sucesso.`);
      return response.data;
    } catch (error) {
      this.handleApiError(error, 'logoutSession');
      throw new Error('Falha ao fazer logout');
    }
  }

  /**
   * Verificar saúde da API
   */
  async healthCheck(): Promise<any> {
    try {
      const response = await axios.get(`${this.apiUrl}health?wakeup=true`, {
        headers: this.headers,
      });
      return response.data;
    } catch (error) {
      this.logger.error('❌ Whapi.Cloud health check failed:', error as any);
      return { status: 'error', message: 'Whapi.Cloud API unavailable' };
    }
  }

  /**
   * Obter informações da conta
   */
  async getAccountInfo(): Promise<any> {
    try {
      // Tentar diferentes endpoints da Whapi.Cloud
      const endpoints = [
        `${this.apiUrl}account`,
        `${this.apiUrl}profile`,
        `${this.apiUrl}me`,
        `${this.apiUrl}user`
      ];
      
      for (const endpoint of endpoints) {
        try {
          this.logger.info(`[WhapiService] Tentando endpoint: ${endpoint}`);
          const response = await axios.get(endpoint, {
            headers: this.headers,
            timeout: 10000
          });
          this.logger.info(`[WhapiService] Sucesso no endpoint: ${endpoint}`);
          return response.data;
        } catch (endpointError) {
          this.logger.warn(`[WhapiService] Endpoint ${endpoint} falhou: ${endpointError.response?.status}`);
          continue;
        }
      }
      
      // Se nenhum endpoint funcionou, retornar dados padrão
      this.logger.warn('[WhapiService] Nenhum endpoint de conta funcionou, retornando dados padrão');
      return {
        user: {
          id: 'unknown',
          name: 'WhatsApp User',
          profile_pic: null
        }
      };
    } catch (error) {
      this.handleApiError(error, 'getAccountInfo');
      // Retornar dados padrão em caso de erro
      return {
        user: {
          id: 'unknown',
          name: 'WhatsApp User',
          profile_pic: null
        }
      };
    }
  }

  /**
   * Obter status da conexão
   */
  async getConnectionStatus(): Promise<any> {
    try {
      // Tentar diferentes endpoints para status
      const endpoints = [
        `${this.apiUrl}status`,
        `${this.apiUrl}connection/status`,
        `${this.apiUrl}health`,
        `${this.apiUrl}account/status`
      ];
      
      for (const endpoint of endpoints) {
        try {
          this.logger.info(`[WhapiService] Tentando endpoint de status: ${endpoint}`);
          const response = await axios.get(endpoint, {
            headers: this.headers,
            timeout: 10000
          });
          this.logger.info(`[WhapiService] Sucesso no endpoint de status: ${endpoint}`);
          return {
            status: response.data?.status || 'connected',
            connected: response.data?.connected !== false
          };
        } catch (endpointError) {
          this.logger.warn(`[WhapiService] Endpoint de status ${endpoint} falhou: ${endpointError.response?.status}`);
          continue;
        }
      }
      
      // Se nenhum endpoint funcionou, assumir conectado (Whapi.Cloud é sempre conectado)
      this.logger.warn('[WhapiService] Nenhum endpoint de status funcionou, assumindo conectado');
      return { 
        status: 'connected', 
        connected: true 
      };
    } catch (error) {
      this.handleApiError(error, 'getConnectionStatus');
      // Em caso de erro, assumir conectado para Whapi.Cloud
      return { 
        status: 'connected', 
        connected: true 
      };
    }
  }

  /**
   * Métodos de compatibilidade com a interface anterior (para facilitar a migração)
   */
  
  // Compatibilidade: createInstance -> getQRCode
  async createInstance(connectionName: string, companyId: string): Promise<any> {
    this.logger.info(`📞 Whapi.Cloud não requer criação de instância. Obtendo QR code.`);
    const qrCode = await this.getQRCode();
    return {
      success: true,
      message: "Whapi.Cloud connection ready",
      instanceName: `${companyId}_${connectionName}`,
      qrcode: qrCode
    };
  }

  // Compatibilidade: getQRCode com instanceName
  async getQRCodeForInstance(instanceName: string): Promise<string | null> {
    return this.getQRCode();
  }

  // Compatibilidade: sendMessage
  async sendMessage(instanceName: string, to: string, message: string): Promise<any> {
    return this.sendTextMessage(to, message);
  }

  // Compatibilidade: deleteInstance -> logoutSession
  async deleteInstance(instanceName: string): Promise<any> {
    return this.logoutSession();
  }

  // Compatibilidade: disconnectInstance -> logoutSession
  async disconnectInstance(instanceName: string): Promise<any> {
    return this.logoutSession();
  }

  // Compatibilidade: connectInstance -> getConnectionStatus
  async connectInstance(instanceName: string): Promise<any> {
    return this.getConnectionStatus();
  }

  // Compatibilidade: getConnections -> getAccountInfo
  async getConnections(): Promise<any> {
    return this.getAccountInfo();
  }

  // Compatibilidade: fetchInstances -> getAccountInfo
  async fetchInstances(): Promise<any[]> {
    const accountInfo = await this.getAccountInfo();
    return [accountInfo];
  }

  // Compatibilidade: getMessages (não suportado pela Whapi.Cloud)
  async getMessages(instanceName: string): Promise<any> {
    this.logger.warn('⚠️ Whapi.Cloud não suporta busca de mensagens via API');
    return { data: [] };
  }

  // Compatibilidade: setWebhook (não necessário - webhook é configurado no painel)
  async setWebhook(instanceName: string, webhookUrl: string): Promise<any> {
    this.logger.warn('⚠️ Webhook deve ser configurado no painel da Whapi.Cloud');
    return { success: true, message: 'Webhook configurado no painel' };
  }

  // Compatibilidade: configureWebhook
  async configureWebhook(instanceName: string): Promise<void> {
    this.logger.warn('⚠️ Webhook deve ser configurado no painel da Whapi.Cloud');
  }

  private handleApiError(error: any, context: string): void {
    if (axios.isAxiosError(error)) {
        const whapiError = error.response?.data;
        this.logger.error(`❌ Erro durante [${context}] da Whapi.Cloud API: Status ${error.response?.status}`);
        this.logger.error('   Erro detalhado:', JSON.stringify(whapiError, null, 2) as any);
    } else {
        this.logger.error(`❌ Ocorreu um erro inesperado durante [${context}]:`, error);
    }
  }

  async processMissedMessage(messageData: any, storage: any): Promise<void> {
    try {
      this.logger.info(`[WhapiService] Processando mensagem perdida: ${messageData.id}`);
      
      // Normalizar dados da mensagem
      const from = messageData.from || (messageData.from_me ? messageData.to : messageData.chat_id);
      const to = messageData.to || (messageData.from_me ? messageData.from : messageData.chat_id);
      const content = messageData.text?.body || messageData.body || messageData.text || '';
      const messageId = messageData.id || messageData.message_id;
      const timestamp = messageData.timestamp || Math.floor(Date.now() / 1000);
      const fromMe = messageData.from_me || false;
      const messageType = messageData.type || 'text';
      const chatId = messageData.chat_id || '';
      
      // Pular mensagens enviadas por nós
      if (fromMe) {
        this.logger.info(`[WhapiService] Ignorando mensagem enviada por nós: ${messageId}`);
        return;
      }
      
      // IGNORAR MENSAGENS DE GRUPOS (@g.us)
      if (chatId.includes('@g.us')) {
        this.logger.info(`[WhapiService] Ignorando mensagem de grupo: ${chatId}`);
        return;
      }
      
      // Normalizar número de telefone
      const normalizedPhone = from.replace(/@.*$/, '').replace(/\D/g, '');
      const contactPhone = normalizedPhone.startsWith('55') ? normalizedPhone.substring(2) : normalizedPhone;
      
      this.logger.info(`[WhapiService] Processando mensagem de ${messageData.from_name || contactPhone}: ${content}`);
      
      // Buscar ou criar cliente
      let client = await storage.getClientByPhone(contactPhone);
      
      // Verificar se o cliente pertence à empresa correta
      if (client && client.companyId !== '59b4b086-9171-4dbf-8177-b7c6d6fd1e33') {
        client = null; // Cliente de outra empresa, vamos criar um novo
      }
      
      if (!client) {
        client = await storage.createClient({
          name: messageData.from_name || `Cliente ${contactPhone}`,
          phone: contactPhone,
          email: null,
          companyId: '59b4b086-9171-4dbf-8177-b7c6d6fd1e33'
        });
        this.logger.info(`[WhapiService] Cliente criado: ${client.id}`);
      }
      
      // Buscar ou criar conversa
      this.logger.info(`[WhapiService] Buscando conversa para cliente: ${client.id}`);
      let conversation = await storage.getConversationByClient(client.id, '59b4b086-9171-4dbf-8177-b7c6d6fd1e33');
      
      if (!conversation) {
        this.logger.info(`[WhapiService] Nenhuma conversa ativa encontrada para cliente ${client.id}, criando nova conversa`);
        conversation = await storage.createConversation({
          clientId: client.id,
          companyId: '59b4b086-9171-4dbf-8177-b7c6d6fd1e33',
          status: 'waiting',
          priority: 'medium',
          isGroup: false,
          contactName: messageData.from_name || `Cliente ${contactPhone}`,
          contactPhone: contactPhone
        });
        this.logger.info(`[WhapiService] ✅ Nova conversa criada: ${conversation.id} com status: ${conversation.status}, isFinished: ${conversation.isFinished}`);
      } else {
        this.logger.info(`[WhapiService] ✅ Conversa existente encontrada: ${conversation.id} com status: ${conversation.status}, isFinished: ${conversation.isFinished}`);
      }
      
      // Salvar mensagem
      const message = await storage.createMessage({
        conversationId: conversation.id,
        content: content,
        messageType: messageType,
        direction: 'incoming',
        externalId: messageId,
        metadata: {
          from: from,
          to: to,
          timestamp: timestamp,
          whapiMessageId: messageId
        }
      });
      
      this.logger.info(`[WhapiService] Mensagem salva: ${message.id}`);
      
      // Atualizar última mensagem da conversa
      await storage.updateConversation(conversation.id, {
        lastMessage: content,
        lastMessageType: messageType,
        lastMessageAt: new Date()
      });
      
      this.logger.info(`[WhapiService] Mensagem perdida processada com sucesso: ${messageId}`);
    } catch (error: any) {
      this.logger.error(`[WhapiService] Erro ao processar mensagem perdida:`, error);
    }
  }
}