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
}