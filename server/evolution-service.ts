import axios, { AxiosError } from 'axios';
import { Logger } from 'pino';

export class EvolutionService {
  private apiUrl: string;
  private apiKey: string;
  private headers: { apikey: string; 'Content-Type': string };

  constructor(private logger: Logger) {
    if (!process.env.EVOLUTION_API_URL || !process.env.EVOLUTION_API_KEY) {
      this.logger.error('EVOLUTION_API_URL e EVOLUTION_API_KEY devem ser configurados no .env');
      throw new Error('As credenciais da Evolution API não estão configuradas.');
    }
    this.apiUrl = process.env.EVOLUTION_API_URL;
    this.apiKey = process.env.EVOLUTION_API_KEY;
    this.headers = {
      'apikey': process.env.EVOLUTION_API_KEY,
      'Content-Type': 'application/json',
    };
    this.logger.info(`[EvolutionService] Inicializado para a URL: ${this.apiUrl}`);
  }

  async createInstance(connectionName: string, companyId: string): Promise<any> {
    const instanceName = `${companyId}_${connectionName}`;
    this.logger.info(`📞 Tentando criar a instância '${instanceName}'.`);

    const payload = {
      instanceName,
      integration: "WHATSAPP-BAILEYS",
      qrcode: true,
    };

    try {
      this.logger.info(`📦 Enviando payload para a Evolution API: ${JSON.stringify(payload)}`);
      const response = await axios.post(`${this.apiUrl}/instance/create`, payload, {
        headers: this.headers,
      });

      this.logger.info(`✅ Instância '${instanceName}' criada com sucesso.`);
      await this.configureWebhook(instanceName);
      return {
        ...response.data,
        instanceName: instanceName
      };
    } catch (error) {
      // Se a instância já existe, apenas reconfigura o webhook
      if (axios.isAxiosError(error) && error.response?.status === 409) {
        this.logger.warn(`⚠️ A instância '${instanceName}' já existe. Reconfigurando o webhook.`);
        await this.configureWebhook(instanceName);
        return { message: "Instance already exists, webhook reconfigured.", instanceName: instanceName };
      }
      this.handleApiError(error, 'createInstance');
      throw new Error('Falha ao criar a instância');
    }
  }

  async configureWebhook(instanceName: string): Promise<void> {
    const webhookUrl = `${process.env.MAIN_APP_URL}/api/whatsapp/webhook`;
    this.logger.info(`🔧 Configurando webhook para '${instanceName}' na URL: ${webhookUrl}`);

    const payload = {
      webhook: {
        url: webhookUrl,
        events: ["APPLICATION_STARTUP", "QRCODE_UPDATED", "CONNECTION_UPDATE", "MESSAGES_UPSERT", "MESSAGES_UPDATE"],
        enabled: true,
      }
    };

    try {
      await axios.post(`${this.apiUrl}/webhook/set/${instanceName}`, payload, { headers: this.headers });
      this.logger.info(`✅ Webhook para '${instanceName}' configurado com sucesso.`);
    } catch (error) {
      this.handleApiError(error, `configureWebhook para ${instanceName}`);
    }
  }

  async getQRCode(instanceName: string): Promise<string | null> {
    this.logger.info(`🔍 Buscando QR code para a instância '${instanceName}'.`);
    try {
      const response = await axios.get(`${this.apiUrl}/instance/connect/${instanceName}`, {
        headers: this.headers,
      });

      const qrCodeBase64 = response.data?.base64;
      if (qrCodeBase64) {
        this.logger.info(`✅ QR Code encontrado para '${instanceName}'.`);
        return qrCodeBase64;
      }

      this.logger.warn(`🤔 QR Code ainda não disponível para '${instanceName}'. Status: ${response.data?.instance?.state}`);
      return null;
    } catch (error) {
      this.handleApiError(error, 'getQRCode');
      throw new Error('Falha ao obter o QR code');
    }
  }

  // FUNÇÕES EXISTENTES (getConnections, deleteInstance) - SEM ALTERAÇÕES
  async getConnections(): Promise<any> {
    try {
      const response = await axios.get(`${this.apiUrl}/instance/fetchInstances`, {
        headers: this.headers,
      });
      return response.data;
    } catch (error) {
      this.handleApiError(error, 'getConnections');
      throw new Error('Failed to fetch connections');
    }
  }

  async deleteInstance(instanceName: string): Promise<any> {
    console.log(`🔥 Deleting instance '${instanceName}'.`);
    try {
      const response = await axios.delete(`${this.apiUrl}/instance/delete/${instanceName}`, {
        headers: this.headers,
      });
      await axios.delete(`${this.apiUrl}/instance/logout/${instanceName}`, { headers: this.headers });
      console.log(`✅ Instance '${instanceName}' deleted successfully.`);
      return response.data;
    } catch (error) {
      this.handleApiError(error, 'deleteInstance');
      throw new Error('Failed to delete instance');
    }
  }

  // Enviar mensagem
  async sendMessage(instanceName: string, to: string, message: string) {
    try {
      const response = await axios.post(`${this.apiUrl}/message/sendText/${instanceName}`, {
        number: to,
        text: message
      }, {
        headers: this.headers,
      });
      return response.data;
    } catch (error) {
      console.error('❌ Error sending message:', error);
      throw new Error('Failed to send message');
    }
  }

  // Configurar webhook para uma instância
  async setWebhook(instanceName: string, webhookUrl: string) {
    try {
      const response = await axios.post(`${this.apiUrl}/webhook/set/${instanceName}`, {
        webhook: {
          url: webhookUrl,
          enabled: true,
          events: ['MESSAGES_UPSERT', 'MESSAGES_UPDATE', 'QRCODE_UPDATED']
        }
      }, {
        headers: this.headers,
      });
      return response.data;
    } catch (error) {
      console.error('❌ Error setting webhook:', error);
      throw new Error('Failed to set webhook');
    }
  }

  // Verificar se a Evolution API está funcionando
  async healthCheck() {
    try {
      const response = await axios.get(`${this.apiUrl}/`);
      return response.data;
    } catch (error) {
      console.error('❌ Evolution API health check failed:', error);
      return { status: 'error', message: 'Evolution API unavailable' };
    }
  }

  async getMessages(instanceName: string): Promise<any> {
    try {
      const response = await axios.get(`${this.apiUrl}/chat/findMessages/${instanceName}`, {
        headers: {
          'apikey': this.apiKey
        }
      });
      return response.data;
    } catch (error) {
      this.logger.error('Error fetching messages:', error);
      throw error;
    }
  }

  async connectInstance(instanceName: string): Promise<any> {
    try {
      // Para conectar uma instância, precisamos apenas verificar o status
      // A conexão real acontece quando o QR code é escaneado
      const response = await axios.get(`${this.apiUrl}/instance/connectionState/${instanceName}`, {
        headers: {
          'apikey': this.apiKey
        }
      });
      return response.data;
    } catch (error) {
      this.logger.error('Error connecting instance:', error);
      throw error;
    }
  }

  async disconnectInstance(instanceName: string): Promise<any> {
    try {
      const response = await axios.delete(`${this.apiUrl}/instance/delete/${instanceName}`, {
        headers: {
          'apikey': this.apiKey
        }
      });
      return response.data;
    } catch (error) {
      this.logger.error('Error disconnecting instance:', error);
      throw error;
    }
  }

  async fetchInstances(): Promise<any[]> {
    try {
      this.logger.info(`Fetching instances from: ${this.apiUrl}/instance/fetchInstances`);
      this.logger.info(`Using API key: ${this.apiKey ? this.apiKey.substring(0, 8) + '...' : 'UNDEFINED'}`);
      
      const response = await axios.get(`${this.apiUrl}/instance/fetchInstances`, {
        headers: {
          'apikey': this.apiKey
        }
      });
      return response.data;
    } catch (error) {
      this.logger.error('Error fetching instances:', error);
      throw error;
    }
  }

  async sendTextMessage(instanceName: string, number: string, text: string): Promise<any> {
    this.logger.info(`📤 Enviando texto para ${number} a partir da instância '${instanceName}'.`);
    const payload = {
      number,
      text,
      options: {
        delay: 1200,
        presence: 'composing',
      },
    };
    try {
      const response = await axios.post(`${this.apiUrl}/message/sendText/${instanceName}`, payload, {
        headers: this.headers,
      });
      this.logger.info(`✅ Texto enviado com sucesso para ${number}.`);
      return response.data;
    } catch (error) {
      this.handleApiError(error, 'sendTextMessage');
      throw new Error('Falha ao enviar mensagem de texto.');
    }
  }

  async sendImageMessage(instanceName: string, number: string, imageUrl: string, caption?: string): Promise<any> {
    this.logger.info(`📤 Enviando imagem para ${number} a partir da instância '${instanceName}'.`);
    const payload = {
      number,
      options: {
        delay: 1200,
        presence: 'composing',
      },
      mediatype: 'image',
      media: imageUrl,
      caption: caption || '',
    };
    try {
      const response = await axios.post(`${this.apiUrl}/message/sendMedia/${instanceName}`, payload, {
        headers: this.headers,
      });
      this.logger.info(`✅ Imagem enviada com sucesso para ${number}.`);
      return response.data;
    } catch (error) {
      this.handleApiError(error, 'sendImageMessage');
      throw new Error('Falha ao enviar imagem.');
    }
  }

  async sendAudioMessage(instanceName: string, number: string, audioUrl: string): Promise<any> {
    this.logger.info(`📤 Enviando áudio para ${number} a partir da instância '${instanceName}'.`);
    const payload = {
      number,
      options: {
        delay: 1200,
        presence: 'composing',
      },
      mediatype: 'audio',
      media: audioUrl,
    };
    try {
      const response = await axios.post(`${this.apiUrl}/message/sendMedia/${instanceName}`, payload, {
        headers: this.headers,
      });
      this.logger.info(`✅ Áudio enviado com sucesso para ${number}.`);
      return response.data;
    } catch (error) {
      this.handleApiError(error, 'sendAudioMessage');
      throw new Error('Falha ao enviar áudio.');
    }
  }

  async sendVideoMessage(instanceName: string, number: string, videoUrl: string, caption?: string): Promise<any> {
    this.logger.info(`📤 Enviando vídeo para ${number} a partir da instância '${instanceName}'.`);
    const payload = {
      number,
      options: {
        delay: 1200,
        presence: 'composing',
      },
      mediatype: 'video',
      media: videoUrl,
      caption: caption || '',
    };
    try {
      const response = await axios.post(`${this.apiUrl}/message/sendMedia/${instanceName}`, payload, {
        headers: this.headers,
      });
      this.logger.info(`✅ Vídeo enviado com sucesso para ${number}.`);
      return response.data;
    } catch (error) {
      this.handleApiError(error, 'sendVideoMessage');
      throw new Error('Falha ao enviar vídeo.');
    }
  }

  async sendDocumentMessage(instanceName: string, number: string, documentUrl: string, filename: string): Promise<any> {
    this.logger.info(`📤 Enviando documento para ${number} a partir da instância '${instanceName}'.`);
    const payload = {
      number,
      options: {
        delay: 1200,
        presence: 'composing',
      },
      mediatype: 'document',
      media: documentUrl,
      fileName: filename,
    };
    try {
      const response = await axios.post(`${this.apiUrl}/message/sendMedia/${instanceName}`, payload, {
        headers: this.headers,
      });
      this.logger.info(`✅ Documento enviado com sucesso para ${number}.`);
      return response.data;
    } catch (error) {
      this.handleApiError(error, 'sendDocumentMessage');
      throw new Error('Falha ao enviar documento.');
    }
  }

  private handleApiError(error: any, context: string): void {
    if (axios.isAxiosError(error)) {
        const evolutionError = error.response?.data;
        this.logger.error(`❌ Erro durante [${context}] da Evolution API: Status ${error.response?.status}`);
        this.logger.error('   Erro detalhado:', JSON.stringify(evolutionError, null, 2));
    } else {
        this.logger.error(`❌ Ocorreu um erro inesperado durante [${context}]:`, error);
    }
  }
}
