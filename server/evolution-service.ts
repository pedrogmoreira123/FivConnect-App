import axios, { AxiosError } from 'axios';

export class EvolutionService {
  private apiUrl: string;
  private headers: { apikey: string; 'Content-Type': string };

  constructor() {
    if (!process.env.EVOLUTION_API_URL || !process.env.EVOLUTION_API_KEY) {
      console.error('EVOLUTION_API_URL and EVOLUTION_API_KEY must be set in .env');
      throw new Error('Evolution API credentials are not configured.');
    }
    this.apiUrl = process.env.EVOLUTION_API_URL;
    this.headers = {
      'apikey': process.env.EVOLUTION_API_KEY,
      'Content-Type': 'application/json',
    };
    console.log(`[EvolutionService] Initialized for URL: ${this.apiUrl}`);
  }

  // 1. CRIA A INSTÂNCIA COM UM PAYLOAD MÍNIMO E VÁLIDO
  async createInstance(connectionName: string, companyId: string): Promise<any> {
    // Gerar nome único com timestamp para evitar conflitos
    const timestamp = Date.now();
    const instanceName = `${companyId}_${connectionName}_${timestamp}`;
    console.log(`📞 Attempting to create instance '${instanceName}'.`);

    const payload = {
      instanceName,
      integration: "WHATSAPP-BAILEYS", // Obrigatório na versão 2.3.4
      qrcode: true, // Solicita a geração inicial do QR Code
    };

    try {
      console.log(`📦 Sending payload to Evolution API for creation: ${JSON.stringify(payload)}`);
      const response = await axios.post(`${this.apiUrl}/instance/create`, payload, {
        headers: this.headers,
      });

      console.log(`✅ Instance '${instanceName}' created successfully.`);

      // Configura o webhook APÓS a criação bem-sucedida da instância
      await this.configureWebhook(instanceName);

      // Aguarda um pouco para a instância se estabilizar
      console.log(`⏳ Waiting for instance to stabilize...`);
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Extrai o QR Code da resposta se disponível
      const qrCodeBase64 = response.data?.qrcode?.base64;
      if (qrCodeBase64) {
        console.log(`✅ QR Code found in creation response for '${instanceName}'.`);
      } else {
        console.log(`🤔 QR Code not found in creation response for '${instanceName}'.`);
      }

      return {
        ...response.data,
        instanceName: instanceName,
        qrCodeBase64: qrCodeBase64
      };
    } catch (error) {
      this.handleApiError(error, 'createInstance');
      throw new Error('Failed to create instance');
    }
  }

  // 2. CONFIGURA O WEBHOOK APÓS A INSTÂNCIA SER CRIADA
  async configureWebhook(instanceName: string): Promise<void> {
    const webhookUrl = `${process.env.MAIN_APP_URL}/api/whatsapp/webhook`;
    console.log(`🔧 Configuring webhook for '${instanceName}' to URL: ${webhookUrl}`);

    const payload = {
      webhook: {
        url: webhookUrl,
        webhook_by_events: false,
        webhook_base64: false,
        events: [
          "QRCODE_UPDATED",
          "MESSAGES_UPSERT",
          "MESSAGES_UPDATE",
          "CONNECTION_UPDATE",
          "APPLICATION_STARTUP"
        ],
        enabled: true,
      }
    };

    try {
      await axios.post(`${this.apiUrl}/webhook/set/${instanceName}`, payload, {
        headers: this.headers,
      });
      console.log(`✅ Webhook for '${instanceName}' configured successfully.`);
    } catch (error) {
      this.handleApiError(error, `configureWebhook for ${instanceName}`);
      // Não lançamos um erro aqui para não quebrar o fluxo principal se o webhook falhar
    }
  }

  // 3. BUSCA O QR CODE DO ENDPOINT CORRETO
  async getQRCode(instanceName: string): Promise<string | null> {
    console.log(`🔍 Fetching QR code for instance '${instanceName}' from connectionState.`);
    
    // Tenta obter o QR Code até 5 vezes com intervalo de 2 segundos
    for (let attempt = 1; attempt <= 5; attempt++) {
      try {
        const response = await axios.get(`${this.apiUrl}/instance/connectionState/${instanceName}`, {
          headers: this.headers,
        });

        const qrCodeBase64 = response.data?.instance?.qrcode?.base64;
        if (qrCodeBase64) {
          console.log(`✅ QR Code found for '${instanceName}' on attempt ${attempt}.`);
          return qrCodeBase64;
        }

        console.log(`🤔 QR Code not available yet for '${instanceName}' (attempt ${attempt}/5). Status: ${response.data?.instance?.state}`);
        
        // Se não é a última tentativa, aguarda antes de tentar novamente
        if (attempt < 5) {
          console.log(`⏳ Waiting 2 seconds before next attempt...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      } catch (error) {
        console.log(`❌ Error on attempt ${attempt}:`, error.message);
        if (attempt === 5) {
          this.handleApiError(error, 'getQRCode');
          throw new Error('Failed to get QR code after 5 attempts');
        }
        // Aguarda antes de tentar novamente
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    console.log(`❌ QR Code not available after 5 attempts for '${instanceName}'.`);
    return null;
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

  // HELPER PARA TRATAMENTO DE ERRO CENTRALIZADO
  private handleApiError(error: any, context: string): void {
    if (axios.isAxiosError(error)) {
      const evolutionError = error.response?.data;
      console.error(`❌ Error during [${context}] from Evolution API: Status ${error.response?.status}`);
      console.error('   Detailed error:', JSON.stringify(evolutionError, null, 2));
    } else {
      console.error(`❌ An unexpected error occurred during [${context}]:`, error);
    }
  }
}

export const evolutionService = new EvolutionService();