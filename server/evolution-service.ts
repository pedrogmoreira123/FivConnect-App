import axios from 'axios';

export class EvolutionService {
  private apiUrl: string;
  private apiKey: string;

  constructor() {
    this.apiUrl = process.env.EVOLUTION_API_URL || 'http://45.143.7.93:8080';
    this.apiKey = process.env.EVOLUTION_API_KEY || 'b0ce23f3-d380-47e9-a33b-978ce2758f4c';
    
    console.log('🔧 Evolution Service Configuration:');
    console.log('EVOLUTION_API_URL:', this.apiUrl);
    console.log('EVOLUTION_API_KEY:', this.apiKey ? '***SET***' : 'NOT SET');
  }

  private getHeaders() {
    return {
      'apikey': this.apiKey,
      'Content-Type': 'application/json'
    };
  }

  // Listar todas as instâncias
  async fetchInstances() {
    try {
      const response = await axios.get(`${this.apiUrl}/instance/fetchInstances`, {
        headers: this.getHeaders()
      });
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching instances:', error);
      throw new Error('Failed to fetch instances');
    }
  }

  // Criar nova instância
  async createInstance(instanceName: string, companyId: string) {
    try {
      const response = await axios.post(`${this.apiUrl}/instance/create`, {
        instanceName,
        qrcode: true
      }, {
        headers: this.getHeaders()
      });
      return response.data;
    } catch (error) {
      console.error('❌ Error creating instance:', error);
      throw new Error('Failed to create instance');
    }
  }

  // Conectar instância
  async connectInstance(instanceName: string) {
    try {
      const response = await axios.get(`${this.apiUrl}/instance/connect/${instanceName}`, {
        headers: this.getHeaders()
      });
      return response.data;
    } catch (error) {
      console.error('❌ Error connecting instance:', error);
      throw new Error('Failed to connect instance');
    }
  }

  // Obter estado da conexão
  async getConnectionState(instanceName: string) {
    try {
      const response = await axios.get(`${this.apiUrl}/instance/connectionState/${instanceName}`, {
        headers: this.getHeaders()
      });
      return response.data;
    } catch (error) {
      console.error('❌ Error getting connection state:', error);
      throw new Error('Failed to get connection state');
    }
  }

  // Deletar instância
  async deleteInstance(instanceName: string) {
    try {
      const response = await axios.delete(`${this.apiUrl}/instance/delete/${instanceName}`, {
        headers: this.getHeaders()
      });
      return response.data;
    } catch (error) {
      console.error('❌ Error deleting instance:', error);
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
        headers: this.getHeaders()
      });
      return response.data;
    } catch (error) {
      console.error('❌ Error sending message:', error);
      throw new Error('Failed to send message');
    }
  }

  // Obter QR Code da instância
  async getQRCode(instanceName: string) {
    try {
      const response = await axios.get(`${this.apiUrl}/instance/connect/${instanceName}`, {
        headers: this.getHeaders()
      });
      return response.data;
    } catch (error) {
      console.error('❌ Error getting QR code:', error);
      throw new Error('Failed to get QR code');
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
        headers: this.getHeaders()
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
}

export const evolutionService = new EvolutionService();
