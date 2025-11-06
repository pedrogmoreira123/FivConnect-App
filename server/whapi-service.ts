import axios, { AxiosError } from 'axios';
import { Logger } from 'pino';

export class WhapiService {
  private apiUrl: string;
  private apiToken: string;
  private headers: { Authorization: string; 'Content-Type': string };
  
  // Partner API properties
  private partnerToken: string;
  private projectId: string;
  private managerApiUrl: string;
  private gateApiUrl: string;
  private partnerHeaders: { Authorization: string; 'Content-Type': string; 'Accept': string };

  constructor(private logger: Logger) {
    // Configuração existente da Gate API
    if (!process.env.WHAPI_API_URL || !process.env.WHAPI_API_TOKEN) {
      this.logger.warn('⚠️ WHAPI_API_URL e WHAPI_API_TOKEN não estão configurados - Whapi.Cloud API desabilitada');
      this.apiUrl = '';
      this.apiToken = '';
      this.headers = {
        'Authorization': '',
        'Content-Type': 'application/json',
      };
    } else {
      this.apiUrl = process.env.WHAPI_API_URL;
      this.apiToken = process.env.WHAPI_API_TOKEN;
      this.headers = {
        'Authorization': `Bearer ${process.env.WHAPI_API_TOKEN}`,
        'Content-Type': 'application/json',
      };
      this.logger.info(`[WhapiService] Inicializado para a URL: ${this.apiUrl}`);
    }
    
    // Configuração da Partner API
    this.partnerToken = process.env.WHAPI_PARTNER_TOKEN || '';
    this.projectId = process.env.WHAPI_PROJECT_ID || '';
    this.managerApiUrl = process.env.WHAPI_MANAGER_API_URL || 'https://manager.whapi.cloud/';
    this.gateApiUrl = process.env.WHAPI_GATE_API_URL || 'https://gate.whapi.cloud/';
    
    console.log(`🔍 [WhapiService] Configuração Partner API:`, {
      hasPartnerToken: !!this.partnerToken,
      partnerTokenLength: this.partnerToken.length,
      projectId: this.projectId,
      managerApiUrl: this.managerApiUrl,
      gateApiUrl: this.gateApiUrl
    });
    
    this.partnerHeaders = {
      'Authorization': `Bearer ${this.partnerToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
    
    if (this.partnerToken && this.projectId) {
      this.logger.info(`[WhapiService] Partner API configurada - Project ID: ${this.projectId}`);
    } else {
      this.logger.warn('⚠️ WHAPI_PARTNER_TOKEN ou WHAPI_PROJECT_ID não configurados - Partner API desabilitada');
    }
  }

  /**
   * Obter QR Code para autenticação do WhatsApp
   * Usa Gate API com token do canal específico
   * Documentação: https://whapi.readme.io/reference/loginuser
   * GET /users/login
   *
   * Implementa retry logic para aguardar o canal gerar o QR Code
   */
  async getQRCode(channelToken: string, maxRetries: number = 3): Promise<string | null> {
    this.logger.info(`🔍 Buscando QR code da Whapi.Cloud (máx ${maxRetries} tentativas).`);

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await axios.get(`${this.gateApiUrl}users/login`, {
          headers: {
            'Authorization': `Bearer ${channelToken}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          timeout: 30000
        });

        // Log da tentativa
        console.log(`[WhapiService] 📊 Tentativa ${attempt}/${maxRetries} - Status: ${response.data?.status}`);

        // Whapi.Cloud retorna o QR Code no campo 'base64', não 'qr_code'
        let qrCodeBase64 = response.data?.base64 || response.data?.qr_code;
        if (qrCodeBase64) {
          // Log do formato recebido (apenas primeiros 50 caracteres)
          console.log(`[WhapiService] 📸 Base64 recebido (preview):`, qrCodeBase64.substring(0, 50));

          // Remover prefixo se existir (ex: data:image/png;base64,)
          // Isso garante que sempre retornamos base64 puro
          if (qrCodeBase64.includes('base64,')) {
            qrCodeBase64 = qrCodeBase64.split('base64,')[1];
            console.log(`[WhapiService] 🔧 Prefixo removido - retornando base64 puro`);
          }

          this.logger.info(`✅ QR Code encontrado na tentativa ${attempt}!`);
          return qrCodeBase64;
        }

        // Se status é TIMEOUT ou WAITING, aguardar e tentar novamente
        const status = response.data?.status;
        if ((status === 'TIMEOUT' || status === 'WAITING') && attempt < maxRetries) {
          const waitTime = 3000; // 3 segundos
          this.logger.info(`⏳ Status: ${status}. Aguardando ${waitTime/1000}s antes da tentativa ${attempt + 1}...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }

        // Última tentativa sem sucesso
        this.logger.warn(`🤔 QR Code não disponível após ${attempt} tentativa(s). Status: ${status}`);
        if (attempt === maxRetries) {
          return null;
        }
      } catch (error: any) {
        // Canal já autenticado (409 Conflict)
        if (error.response?.status === 409) {
          this.logger.info(`ℹ️ Canal já autenticado`);
          throw new Error('ALREADY_AUTHENTICATED');
        }

        // Se não for a última tentativa, continuar
        if (attempt < maxRetries) {
          this.logger.warn(`⚠️ Erro na tentativa ${attempt}, tentando novamente...`);
          await new Promise(resolve => setTimeout(resolve, 3000));
          continue;
        }

        this.handleApiError(error, 'getQRCode');
        throw new Error('Falha ao obter o QR code');
      }
    }

    return null;
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
        } catch (endpointError: any) {
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
   * @param channelToken Token específico do canal (opcional, usa token padrão se não fornecido)
   */
  async getConnectionStatus(channelToken?: string): Promise<any> {
    try {
      // Usar token específico do canal se fornecido, senão usar token padrão
      const headers = channelToken
        ? {
            'Authorization': `Bearer ${channelToken}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        : this.headers;

      // Tentar diferentes endpoints para status (ordem: mais específico para mais genérico)
      const endpoints = [
        `${this.apiUrl}screen/presence`,  // Melhor endpoint para verificar presença/conexão
        `${this.apiUrl}users/me`,          // Retorna dados do usuário se autenticado
        `${this.apiUrl}health`,            // Status geral do canal
        `${this.apiUrl}status`             // Status básico
      ];

      for (const endpoint of endpoints) {
        try {
          this.logger.info(`[WhapiService] Tentando endpoint de status: ${endpoint}`);
          const response = await axios.get(endpoint, {
            headers,
            timeout: 10000
          });

          // DEBUG: Log completo da resposta
          console.log(`[WhapiService] 🔍 Resposta de ${endpoint}:`, JSON.stringify(response.data, null, 2));

          // Verificar se o status indica conexão autenticada
          const statusData = response.data;

          // Múltiplas formas de verificar se está conectado
          const isConnected =
            // Estados explícitos (string)
            statusData?.status === 'AUTHORIZED' ||
            statusData?.status === 'CONNECTED' ||
            statusData?.status === 'WORKING' ||
            statusData?.state === 'WORKING' ||
            statusData?.state === 'AUTHORIZED' ||
            // Status como objeto (Whapi.Cloud /health endpoint)
            statusData?.status?.text === 'AUTH' ||
            statusData?.status?.text === 'AUTHORIZED' ||
            statusData?.status?.text === 'CONNECTED' ||
            statusData?.status?.code === 4 ||  // Code 4 = AUTH
            // Flags booleanas
            statusData?.authenticated === true ||
            statusData?.connected === true ||
            statusData?.ready === true ||
            // Presence indica que está online
            (statusData?.presence && statusData.presence !== 'unavailable') ||
            // Se tem dados de usuário, está autenticado
            (statusData?.user && statusData.user.id) ||
            (endpoint.includes('users/me') && statusData?.id);

          this.logger.info(`[WhapiService] ✅ Sucesso no endpoint ${endpoint}, connected: ${isConnected}`);

          return {
            status: isConnected ? 'connected' : 'disconnected',
            connected: isConnected,
            phone: statusData?.phone || statusData?.number || statusData?.user?.id || statusData?.id,
            name: statusData?.name || statusData?.pushname || statusData?.notify,
            profilePictureUrl: statusData?.profilePictureUrl || statusData?.profile_pic || statusData?.picture || statusData?.user?.profile_pic,
            lastSeen: statusData?.lastSeen
          };
        } catch (endpointError: any) {
          this.logger.warn(`[WhapiService] Endpoint de status ${endpoint} falhou: ${endpointError.response?.status}`);
          continue;
        }
      }

      // Se nenhum endpoint funcionou, retornar DESCONECTADO (não assumir conectado)
      this.logger.warn('[WhapiService] Nenhum endpoint de status funcionou, retornando desconectado');
      return {
        status: 'disconnected',
        connected: false,
        error: 'Unable to verify connection status'
      };
    } catch (error) {
      this.handleApiError(error, 'getConnectionStatus');
      // Em caso de erro, retornar desconectado (não assumir conectado)
      return {
        status: 'disconnected',
        connected: false,
        error: 'Failed to check connection status'
      };
    }
  }

  /**
   * Métodos de compatibilidade com a interface anterior (para facilitar a migração)
   */
  
  // Compatibilidade: createInstance -> getQRCode
  async createInstance(connectionName: string, companyId: string, channelToken?: string): Promise<any> {
    this.logger.info(`📞 Whapi.Cloud não requer criação de instância. Obtendo QR code.`);
    if (!channelToken) {
      throw new Error('channelToken é obrigatório para obter QR Code');
    }
    const qrCode = await this.getQRCode(channelToken);
    return {
      success: true,
      message: "Whapi.Cloud connection ready",
      instanceName: `${companyId}_${connectionName}`,
      qrcode: qrCode
    };
  }

  // Compatibilidade: getQRCode com instanceName
  async getQRCodeForInstance(_instanceName: string, channelToken: string): Promise<string | null> {
    return this.getQRCode(channelToken);
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
      
      // Normalizar número de telefone usando utilitário
      const { normalizePhoneForSearch } = await import('./utils/phone-normalizer');
      const contactPhone = normalizePhoneForSearch(from);
      
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
      this.logger.info(`[WhapiService] Buscando conversa para chatId: ${chatId}`);
      let conversation = await storage.getConversationByClient(client.id, '59b4b086-9171-4dbf-8177-b7c6d6fd1e33');
      
      if (!conversation) {
        this.logger.info(`[WhapiService] Nenhuma conversa encontrada para cliente ${client.id}, criando nova conversa`);
        conversation = await storage.createConversation({
          contactName: client.name,
          contactPhone: client.phone,
          clientId: client.id,
          companyId: '59b4b086-9171-4dbf-8177-b7c6d6fd1e33',
          status: 'waiting',
          priority: 'medium',
          isGroup: false,
          isFinished: false,
          lastMessageAt: new Date(),
          lastMessage: content,
          lastMessageType: messageType
        });
        this.logger.info(`[WhapiService] ✅ Nova conversa criada: ${conversation.id} com status: ${conversation.status}`);
      } else {
        this.logger.info(`[WhapiService] ✅ Conversa existente encontrada: ${conversation.id} com status: ${conversation.status}`);
      }
      
      // Verificar se mensagem já existe antes de salvar
      const existingMessage = await storage.getMessageByExternalId(messageId);
      if (existingMessage) {
        this.logger.info(`[WhapiService] Mensagem já existe, ignorando: ${messageId}`);
        return;
      }

      // Salvar mensagem
      const message = await storage.createMessage({
        conversationId: conversation.id,
        content: content,
        messageType: messageType,
        direction: 'incoming',
        externalId: messageId,
        chatId: chatId, // Adicionar chatId à mensagem
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
        lastMessageAt: new Date(),
        lastMessage: content,
        lastMessageType: messageType
      });
      
      this.logger.info(`[WhapiService] Mensagem perdida processada com sucesso: ${messageId}`);
    } catch (error: any) {
      this.logger.error(`[WhapiService] Erro ao processar mensagem perdida:`, error);
    }
  }

  /**
   * Buscar mensagens por chat ID usando a API do Whapi.Cloud
   */
  async getMessagesByChatId(chatId: string, clientToken: string): Promise<any> {
    try {
      this.logger.info(`[WhapiService] Buscando mensagens para chat: ${chatId}`);
      
      const response = await axios.get(`https://gate.whapi.cloud/messages/list/${chatId}`, {
        headers: {
          'Authorization': `Bearer ${clientToken}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000
      });
      
      this.logger.info(`[WhapiService] Mensagens encontradas: ${response.data?.messages?.length || 0}`);
      return response.data;
    } catch (error: any) {
      this.logger.error(`[WhapiService] Erro ao buscar mensagens por chat ID:`, error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Processar mensagens de um chat específico
   */
  async processMessagesByChatId(chatId: string, clientToken: string, storage: any): Promise<void> {
    try {
      this.logger.info(`[WhapiService] Processando mensagens para chat: ${chatId}`);
      
      const response = await this.getMessagesByChatId(chatId, clientToken);
      
      if (response?.messages && response.messages.length > 0) {
        this.logger.info(`[WhapiService] Processando ${response.messages.length} mensagens do chat ${chatId}`);
        
        for (const messageData of response.messages) {
          // Pular mensagens enviadas por nós
          if (messageData.from_me) {
            continue;
          }
          
          // IGNORAR MENSAGENS DE GRUPOS (@g.us)
          if (chatId.includes('@g.us')) {
            continue;
          }
          
          // Processar mensagem
          await this.processMissedMessage(messageData, storage);
        }
        
        this.logger.info(`[WhapiService] ✅ Processamento concluído para chat ${chatId}`);
      } else {
        this.logger.info(`[WhapiService] Nenhuma mensagem encontrada para chat ${chatId}`);
      }
    } catch (error: any) {
      this.logger.error(`[WhapiService] Erro ao processar mensagens do chat ${chatId}:`, error);
    }
  }


  // ===== MÉTODOS PARTNER API =====

  /**
   * Buscar canais do parceiro
   * GET /channels
   */
  async getPartnerChannels(): Promise<{ channels: any[] }> {
    try {
      if (!this.projectId) {
        this.logger.warn('[WhapiService] Project ID não configurado');
        return { channels: [] };
      }

      this.logger.info(`[WhapiService] Buscando canais do parceiro (Project: ${this.projectId})...`);
      
      const response = await axios.get(
        `${this.managerApiUrl}api/v1/channels`,
        {
          headers: this.partnerHeaders,
          params: { project_id: this.projectId },
          timeout: 30000
        }
      );
      
      this.logger.info(`[WhapiService] Canais encontrados: ${response.data?.channels?.length || 0}`);
      return response.data || { channels: [] };
    } catch (error: any) {
      this.logger.error(`[WhapiService] Erro ao buscar canais do parceiro:`, error.response?.data || error.message);
      return { channels: [] };
    }
  }

  /**
   * Obter detalhes de um canal específico
   * GET https://manager.whapi.cloud/api/v1/channels/{channelId}
   */
  async getChannelDetails(channelId: string): Promise<any> {
    try {
      if (!channelId) {
        throw new Error('Channel ID é obrigatório');
      }

      this.logger.info(`[WhapiService] Buscando detalhes do canal ${channelId}...`);
      console.log(`🔍 [WhapiService] URL completa: ${this.managerApiUrl}channels/${channelId}`);
      
      const response = await axios.get(
        `${this.managerApiUrl}channels/${channelId}`,
        {
          headers: this.partnerHeaders,
          timeout: 10000
        }
      );
      
      console.log(`📊 [WhapiService] Resposta completa do canal ${channelId}:`, JSON.stringify(response.data, null, 2));
      console.log(`📊 [WhapiService] Campo 'mode' do canal:`, response.data?.mode);
      console.log(`📊 [WhapiService] Campo 'status' do canal:`, response.data?.status);
      console.log(`📊 [WhapiService] Campo 'valid_until' do canal:`, response.data?.valid_until);
      console.log(`📊 [WhapiService] Campos disponíveis no canal:`, Object.keys(response.data));
      
      this.logger.info(`[WhapiService] Detalhes do canal ${channelId} obtidos com sucesso`);
      return response.data;
    } catch (error: any) {
      console.error(`❌ [WhapiService] Erro detalhado ao buscar canal ${channelId}:`, {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        url: error.config?.url,
        headers: error.config?.headers
      });
      
      // Se o canal não for encontrado (404), tentar buscar via listProjectChannels
      if (error.response?.status === 404) {
        console.log(`⚠️ [WhapiService] Canal ${channelId} não encontrado diretamente, tentando buscar via listProjectChannels...`);
        try {
          const projectChannels = await this.listProjectChannels();
          const foundChannel = projectChannels.find((ch: any) => ch.id === channelId);
          if (foundChannel) {
            console.log(`✅ [WhapiService] Canal ${channelId} encontrado via listProjectChannels:`, JSON.stringify(foundChannel, null, 2));
            return foundChannel;
          }
        } catch (listError: any) {
          console.warn(`⚠️ [WhapiService] Erro ao buscar via listProjectChannels:`, listError.message);
        }
        
        console.log(`⚠️ [WhapiService] Canal ${channelId} não encontrado em nenhum método, usando dados padrão`);
        return {
          id: channelId,
          mode: 'live', // Assumir modo live como padrão
          status: 'unknown',
          valid_until: null,
          created_at: null,
          updated_at: null
        };
      }
      
      this.logger.error(`[WhapiService] Erro ao buscar detalhes do canal ${channelId}:`, error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Alterar modo do canal (sandbox -> live ou live -> sandbox)
   * POST https://gate.whapi.cloud/partners/channels/{channelId}/mode
   */
  async changeChannelMode(channelId: string, mode: 'sandbox' | 'live'): Promise<any> {
    try {
      if (!channelId || !mode) {
        throw new Error('Channel ID e modo são obrigatórios');
      }

      this.logger.info(`[WhapiService] Alterando modo do canal ${channelId} para ${mode}...`);
      
      const response = await axios.post(
        `${this.gateApiUrl}partners/channels/${channelId}/mode`,
        { mode },
        {
          headers: this.partnerHeaders,
          timeout: 30000
        }
      );
      
      this.logger.info(`[WhapiService] Modo do canal ${channelId} alterado para ${mode} com sucesso`);
      return response.data;
    } catch (error: any) {
      this.logger.error(`[WhapiService] Erro ao alterar modo do canal:`, error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Configurar download automático de mídia
   * POST /channels/{channelId}/configure
   */
  async configureAutoDownload(channelId: string, enableAll: boolean = true): Promise<any> {
    try {
      this.logger.info(`[WhapiService] Configurando download automático para canal ${channelId}...`);
      
      const response = await axios.post(`${this.apiUrl}channels/${channelId}/configure`, {
        auto_download: enableAll
      }, {
        headers: this.headers,
        timeout: 30000
      });
      
      this.logger.info(`[WhapiService] Configuração de download automático aplicada`);
      return response.data;
    } catch (error: any) {
      this.logger.error(`[WhapiService] Erro ao configurar download automático:`, error.response?.data || error.message);
      throw error;
    }
  }



  // ========================================
  // PARTNER API METHODS
  // ========================================

  /**
   * Criar novo canal no Whapi.Cloud
   * Documentação: https://support.whapi.cloud/help-desk/partner-documentation/partner-documentation/channel-creation
   * Usa Partner API: PUT /channels
   */
  async createChannel(channelName: string): Promise<any> {
    try {
      this.logger.info(`[WhapiService] Criando canal: ${channelName}`);
      
      const response = await axios.put(
        `${this.managerApiUrl}channels`,
        {
          name: channelName,
          projectId: this.projectId
        },
        {
          headers: this.partnerHeaders,
          timeout: 30000
        }
      );
      
      this.logger.info(`[WhapiService] Canal criado: ${response.data.id}`);
      
      // Automaticamente configurar webhook após criação
      if (response.data.token) {
        try {
          await this.configureWebhook(response.data.token);
          this.logger.info(`[WhapiService] Webhook configurado automaticamente para o canal ${response.data.id}`);
        } catch (webhookError: any) {
          this.logger.warn(`[WhapiService] Erro ao configurar webhook automaticamente:`, webhookError);
        }
      }
      
      return response.data;
    } catch (error: any) {
      this.logger.error(`[WhapiService] Erro ao criar canal:`, error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Listar canais do projeto
   * Usa Partner API: GET /channels
   */
  async listProjectChannels(): Promise<any[]> {
    try {
      this.logger.info(`[WhapiService] Listando canais do projeto ${this.projectId}`);
      
      const response = await axios.get(
        `${this.managerApiUrl}channels`,
        {
          headers: this.partnerHeaders,
          timeout: 30000
        }
      );
      
      // Filtrar canais do nosso projeto
      const projectChannels = response.data.filter(
        (channel: any) => channel.projectId === this.projectId
      );
      
      this.logger.info(`[WhapiService] Canais encontrados: ${projectChannels.length}`);
      return projectChannels;
    } catch (error: any) {
      this.logger.error(`[WhapiService] Erro ao listar canais:`, error.response?.data || error.message);
      return [];
    }
  }


  /**
   * Estender dias de um canal
   * Documentação: https://support.whapi.cloud/help-desk/partner-documentation/partner-documentation/channel-extension
   * Usa Partner API: POST /channels/{channelId}/extend
   */
  async extendChannelDays(channelId: string, days: number): Promise<any> {
    try {
      this.logger.info(`[WhapiService] Estendendo canal ${channelId} por ${days} dias`);
      console.log(`🔍 [WhapiService] URL completa: ${this.managerApiUrl}channels/${channelId}/extend`);
      console.log(`🔍 [WhapiService] Payload:`, { days, comment: "FivConnect - Channel Extension" });
      console.log(`🔍 [WhapiService] Headers:`, {
        ...this.partnerHeaders,
        Authorization: this.partnerHeaders.Authorization ? 'Bearer [TOKEN]' : 'undefined'
      });
      
      const response = await axios.post(
        `${this.managerApiUrl}channels/${channelId}/extend`,
        { 
          days, 
          comment: "FivConnect - Channel Extension" 
        },
        {
          headers: this.partnerHeaders,
          timeout: 30000
        }
      );
      
      console.log(`✅ [WhapiService] Resposta da API:`, JSON.stringify(response.data, null, 2));
      this.logger.info(`[WhapiService] Canal estendido até: ${response.data.activeTill}`);
      return response.data;
    } catch (error: any) {
      console.error(`❌ [WhapiService] Erro detalhado ao estender canal ${channelId}:`, {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        url: error.config?.url,
        headers: error.config?.headers
      });
      this.logger.error(`[WhapiService] Erro ao estender canal:`, error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Enviar mídia usando endpoint unificado /messages/media/{type}
   * Suporta: image, video, audio, voice, document, sticker
   * Documentação: https://whapi.readme.io/reference/sendmediamessage
   */
  async sendMediaMessageWithToken(
    to: string, 
    mediaType: 'image' | 'video' | 'audio' | 'voice' | 'document' | 'sticker',
    mediaUrl: string, 
    options: {
      caption?: string;
      fileName?: string;
      token: string;
    }
  ): Promise<any> {
    this.logger.info(`📤 Enviando ${mediaType} para ${to} via endpoint unificado`);
    
    const payload: any = {
      to: to,
      media: mediaUrl // Pode ser URL, Base64, ou media_id
    };

    if (options.caption) {
      payload.caption = options.caption;
    }
    
    if (mediaType === 'document' && options.fileName) {
      payload.fileName = options.fileName;
    }

    try {
      const response = await axios.post(
        `${this.apiUrl}messages/media/${mediaType}`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${options.token}`,
            'Content-Type': 'application/json',
          },
          timeout: 60000 // 60s para uploads grandes
        }
      );
      
      this.logger.info(`✅ ${mediaType} enviado com sucesso para ${to}`);
      return response.data;
    } catch (error) {
      this.handleApiError(error, 'sendMediaMessageWithToken');
      throw new Error(`Falha ao enviar ${mediaType}.`);
    }
  }

  /**
   * Get WhatsApp profile picture
   */
  async getProfilePicture(phoneNumber: string, channelToken?: string): Promise<string | null> {
    try {
      // Use channel token if provided, otherwise use default token
      const token = channelToken || this.apiToken;
      if (!token) {
        this.logger.warn('[WhapiService] No token available for profile picture request');
        return null;
      }

      const chatId = phoneNumber.includes('@') ? phoneNumber : `${phoneNumber}@s.whatsapp.net`;
      const response = await axios.get(`${this.gateApiUrl}contacts/${chatId}/profile-picture`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000
      });
      
      return response.data?.profilePictureUrl || response.data?.url || null;
    } catch (error: any) {
      this.logger.warn(`[WhapiService] Erro ao buscar foto de perfil: ${error.message}`);
      return null;
    }
  }

  // ===== PARTNER API METHODS (PLAN IMPLEMENTATION) =====

  /**
   * Obter informações do partner (saldo geral)
   * GET /partners/{PartnerName}/settings
   */
  async getPartnerInfo(): Promise<{
    balance: number;
    currency: string;
    id: string;
    valid_until?: string;
    liveDays?: number;
    trialDays?: number;
    totalDays?: number;
  }> {
    try {
      this.logger.info(`[WhapiService] Buscando informações do partner...`);
      
      // Primeiro, buscar informações básicas do partner
      const partnerResponse = await axios.get(`${this.managerApiUrl}partners`, {
        headers: this.partnerHeaders,
        timeout: 30000
      });
      
      console.log(`📊 [WhapiService] Resposta básica do Partner:`, JSON.stringify(partnerResponse.data, null, 2));
      
      // Depois, buscar configurações do partner (onde estão liveDays e trialDays)
      const settingsResponse = await axios.get(`${this.managerApiUrl}partners/whapicloud/settings`, {
        headers: this.partnerHeaders,
        timeout: 30000
      });
      
      console.log(`📊 [WhapiService] Resposta das configurações:`, JSON.stringify(settingsResponse.data, null, 2));
      console.log(`📊 [WhapiService] Campos disponíveis nas configurações:`, Object.keys(settingsResponse.data));
      console.log(`📊 [WhapiService] liveDays:`, settingsResponse.data?.liveDays);
      console.log(`📊 [WhapiService] trialDays:`, settingsResponse.data?.trialDays);
      
      // Calcular totalDays a partir das configurações
      const liveDays = settingsResponse.data?.liveDays || 0;
      const trialDays = settingsResponse.data?.trialDays || 0;
      const totalDays = liveDays + trialDays;
      console.log(`📊 [WhapiService] Total de dias calculado: ${totalDays} (Live: ${liveDays} + Trial: ${trialDays})`);
      
      this.logger.info(`[WhapiService] Informações do partner obtidas com sucesso`);
      
      return {
        balance: partnerResponse.data?.balance || 0,
        currency: partnerResponse.data?.currency || 'BRL',
        id: partnerResponse.data?.id || 'partner-unknown',
        liveDays: liveDays,
        trialDays: trialDays,
        totalDays: totalDays
      };
    } catch (error: any) {
      this.logger.error(`[WhapiService] Erro ao buscar informações do partner:`, error.response?.data || error.message);
      
      // Return fallback data if API is not available
      this.logger.warn(`[WhapiService] Retornando dados de fallback para partner info`);
      return {
        balance: 0,
        currency: 'BRL',
        id: 'partner-fallback',
        valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
        liveDays: 0,
        trialDays: 0,
        totalDays: 0
      };
    }
  }

  /**
   * Listar todos os canais do partner
   * GET /channels
   */
  async listPartnerChannels(): Promise<Array<{
    id: string;
    name: string;
    phone: string;
    status: string;
    daysLeft: number;
    expiresAt: string;
  }>> {
    try {
      this.logger.info(`[WhapiService] Listando canais do partner...`);
      
      const response = await axios.get(`${this.managerApiUrl}channels`, {
        headers: this.partnerHeaders,
        timeout: 30000
      });
      
      this.logger.info(`[WhapiService] Canais do partner encontrados: ${response.data?.length || 0}`);
      return response.data || [];
    } catch (error: any) {
      this.logger.error(`[WhapiService] Erro ao listar canais do partner:`, error.response?.data || error.message);
      
      // Return empty array if API is not available
      this.logger.warn(`[WhapiService] Retornando array vazio para canais do partner`);
      return [];
    }
  }

  /**
   * Estender dias de um canal específico
   * POST /channels/{channelId}/extend
   */

  /**
   * Adicionar créditos à conta partner
   * POST /credits/add
   */
  async addPartnerCredits(amount: number, currency: string = 'BRL'): Promise<void> {
    try {
      this.logger.info(`[WhapiService] Adicionando ${amount} ${currency} de créditos ao partner...`);

      await axios.post(`${this.managerApiUrl}credits/add`,
        { amount, currency },
        {
          headers: this.partnerHeaders,
          timeout: 30000
        }
      );

      this.logger.info(`[WhapiService] Créditos adicionados com sucesso: ${amount} ${currency}`);
    } catch (error: any) {
      this.logger.error(`[WhapiService] Erro ao adicionar créditos:`, error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Provisionar e ativar canal completo
   * Cria um novo canal no Whapi.Cloud e retorna as credenciais
   * Documentação: https://whapi-partner.readme.io/reference/createchannel
   * PUT /channels
   */
  async provisionAndActivateChannel(
    _companyId: string,
    connectionName: string,
    companyName: string
  ): Promise<{ channelId: string; clientToken: string }> {
    try {
      this.logger.info(`[WhapiService] 🚀 Provisionando canal: ${connectionName} para empresa ${companyName}`);

      // Validar configuração do Partner API
      if (!this.partnerToken || !this.projectId) {
        throw new Error('Partner API não configurada. Configure WHAPI_PARTNER_TOKEN e WHAPI_PROJECT_ID');
      }

      console.log(`[WhapiService] 📋 Criando canal com dados:`, {
        name: connectionName,
        projectId: this.projectId,
        managerUrl: this.managerApiUrl
      });

      // 1. Criar canal via Partner API
      const response = await axios.put(
        `${this.managerApiUrl}channels`,
        {
          name: connectionName,
          projectId: this.projectId
        },
        {
          headers: this.partnerHeaders,
          timeout: 30000
        }
      );

      const channelData = response.data;

      console.log(`[WhapiService] 📊 Resposta da API:`, {
        statusCode: response.status,
        channelId: channelData?.id,
        channelName: channelData?.name,
        channelStatus: channelData?.status,
        hasToken: !!channelData?.token,
        responseKeys: Object.keys(channelData || {})
      });

      if (!channelData.id || !channelData.token) {
        throw new Error('Canal criado mas sem ID ou token na resposta');
      }

      // 2. Verificar se o canal realmente existe fazendo uma chamada de teste
      console.log(`[WhapiService] 🔍 Verificando se canal ${channelData.id} existe...`);
      try {
        const testResponse = await axios.get(`${this.gateApiUrl}health`, {
          headers: {
            'Authorization': `Bearer ${channelData.token}`,
            'Accept': 'application/json'
          },
          timeout: 10000
        });
        console.log(`[WhapiService] ✅ Canal verificado - Status: ${testResponse.data?.status?.text || 'OK'}`);
      } catch (testError: any) {
        // 404 ou 401 significa que o canal não existe ou o token é inválido
        if (testError.response?.status === 404 || testError.response?.status === 401) {
          throw new Error(`Canal criado mas não está acessível via Gate API. Status: ${testError.response.status}`);
        }
        // Outros erros podem ser temporários, não vamos falhar
        console.warn(`[WhapiService] ⚠️ Aviso ao verificar canal (não crítico):`, testError.message);
      }

      console.log(`[WhapiService] ✅ Canal criado e verificado com sucesso:`, {
        channelId: channelData.id,
        name: channelData.name,
        status: channelData.status
      });

      return {
        channelId: channelData.id,
        clientToken: channelData.token
      };
    } catch (error: any) {
      console.error(`[WhapiService] ❌ Erro ao provisionar canal:`, {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        url: error.config?.url,
        headers: error.config?.headers ? { Authorization: '***' } : undefined
      });

      // Melhorar mensagem de erro para o usuário
      let errorMessage = 'Falha ao criar canal WhatsApp';
      if (error.response?.status === 401) {
        errorMessage = 'Token do Partner API inválido ou expirado';
      } else if (error.response?.status === 403) {
        errorMessage = 'Sem permissão para criar canais. Verifique créditos ou limites da conta Partner';
      } else if (error.response?.status === 404) {
        errorMessage = 'API do Partner não encontrada. Verifique a configuração WHAPI_MANAGER_API_URL';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      throw new Error(errorMessage);
    }
  }

  /**
   * Configurar webhook de um canal
   * Configura a URL do webhook para receber mensagens e eventos
   * Documentação: https://whapi.readme.io/reference/setsettings
   * PATCH /settings
   */
  async configureChannelWebhook(clientToken: string, webhookUrl: string, channelId: string, maxRetries: number = 3): Promise<void> {
    // Incluir channelId como query parameter para identificar qual canal enviou o webhook
    const webhookUrlWithChannel = `${webhookUrl}?channelId=${encodeURIComponent(channelId)}`;

    const webhookConfig = {
      webhooks: [
        {
          url: webhookUrlWithChannel,
          events: [
            { type: 'messages', method: 'post' },
            { type: 'statuses', method: 'post' },
            { type: 'users', method: 'post' },      // Eventos de conexão/desconexão do usuário
            { type: 'channel', method: 'post' }     // Eventos de status do canal
          ],
          mode: 'method'
        }
      ]
    };

    const axiosConfig = {
      headers: {
        'Authorization': `Bearer ${clientToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: 30000
    };

    // Tentar configurar webhook com retry
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        this.logger.info(`[WhapiService] 🔗 Configurando webhook (tentativa ${attempt}/${maxRetries}): ${webhookUrlWithChannel}`);

        await axios.patch(
          `${this.gateApiUrl}settings`,
          webhookConfig,
          axiosConfig
        );

        this.logger.info(`[WhapiService] ✅ Webhook configurado com sucesso na tentativa ${attempt}`);
        return; // Sucesso, sair da função

      } catch (error: any) {
        const isLastAttempt = attempt === maxRetries;
        const status = error.response?.status;
        const isRetryableError = status === 503 || status === 502 || status === 504 || !status;

        console.error(`[WhapiService] ❌ Erro ao configurar webhook (tentativa ${attempt}/${maxRetries}):`, {
          message: error.message,
          status: status,
          data: error.response?.data,
          url: error.config?.url
        });

        // Se não é o último retry e é um erro que vale a pena tentar novamente
        if (!isLastAttempt && isRetryableError) {
          const delay = attempt * 2000; // 2s, 4s, 6s...
          console.log(`[WhapiService] ⏳ Aguardando ${delay}ms antes de tentar novamente...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }

        // Último retry ou erro não-retryable, lançar exceção
        throw new Error(`Falha ao configurar webhook após ${attempt} tentativa(s): ${error.response?.data?.message || error.message}`);
      }
    }
  }

  /**
   * Deletar canal do Whapi.Cloud
   * Remove o canal completamente via Partner API
   * Documentação: https://whapi-partner.readme.io/reference/deletechannel
   * DELETE /channels/{ChannelID}
   */
  async deleteChannel(channelId: string): Promise<void> {
    try {
      this.logger.info(`[WhapiService] 🗑️ Deletando canal: ${channelId}`);

      await axios.delete(
        `${this.managerApiUrl}channels/${channelId}`,
        {
          headers: this.partnerHeaders,
          timeout: 30000
        }
      );

      this.logger.info(`[WhapiService] ✅ Canal ${channelId} deletado com sucesso do Whapi.Cloud`);
    } catch (error: any) {
      console.error(`[WhapiService] ❌ Erro ao deletar canal:`, {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        channelId
      });
      throw new Error(`Falha ao deletar canal: ${error.response?.data?.message || error.message}`);
    }
  }

}
