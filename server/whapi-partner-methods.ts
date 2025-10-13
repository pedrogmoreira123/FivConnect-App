import axios from 'axios';
import { Logger } from 'pino';

export class WhapiPartnerMethods {
  private partnerToken: string;
  private projectId: string;
  private managerApiUrl: string;
  private gateApiUrl: string;
  private partnerHeaders: { Authorization: string; 'Content-Type': string; 'Accept': string };

  constructor(private logger: Logger) {
    this.partnerToken = process.env.WHAPI_PARTNER_TOKEN || '';
    this.projectId = process.env.WHAPI_PROJECT_ID || '';
    this.managerApiUrl = process.env.WHAPI_MANAGER_API_URL || 'https://manager.whapi.cloud/';
    this.gateApiUrl = process.env.WHAPI_GATE_API_URL || 'https://gate.whapi.cloud/';
    
    this.partnerHeaders = {
      'Authorization': `Bearer ${this.partnerToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
  }

  /**
   * Criar novo canal no Whapi.Cloud
   * Documentação: https://support.whapi.cloud/help-desk/partner-documentation/partner-documentation/channel-creation
   * Usa Partner API: PUT /channels
   */
  async createChannel(channelName: string): Promise<any> {
    try {
      this.logger.info(`[WhapiPartner] Criando canal: ${channelName}`);
      
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
      
      this.logger.info(`[WhapiPartner] Canal criado: ${response.data.id}`);
      return response.data;
    } catch (error: any) {
      this.logger.error(`[WhapiPartner] Erro ao criar canal:`, error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Listar canais do projeto
   * Usa Partner API: GET /channels
   */
  async listProjectChannels(): Promise<any[]> {
    try {
      this.logger.info(`[WhapiPartner] Listando canais do projeto ${this.projectId}`);
      
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
      
      this.logger.info(`[WhapiPartner] Canais encontrados: ${projectChannels.length}`);
      return projectChannels;
    } catch (error: any) {
      this.logger.error(`[WhapiPartner] Erro ao listar canais:`, error.response?.data || error.message);
      return [];
    }
  }

  /**
   * Mudar modo do canal (trial -> live)
   * Documentação: https://support.whapi.cloud/help-desk/partner-documentation/partner-documentation/changing-channel-mode
   * Usa Partner API: PATCH /channels/{channelId}/mode
   */
  async changeChannelMode(channelId: string, mode: 'trial' | 'sandbox' | 'live'): Promise<any> {
    try {
      this.logger.info(`[WhapiPartner] Mudando canal ${channelId} para modo ${mode}`);
      
      const response = await axios.patch(
        `${this.managerApiUrl}channels/${channelId}/mode`,
        { mode },
        {
          headers: this.partnerHeaders,
          timeout: 30000
        }
      );
      
      this.logger.info(`[WhapiPartner] Modo do canal alterado com sucesso`);
      return response.data;
    } catch (error: any) {
      this.logger.error(`[WhapiPartner] Erro ao mudar modo:`, error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Estender dias de um canal
   * Documentação: https://support.whapi.cloud/help-desk/partner-documentation/partner-documentation/channel-extension
   * Usa Partner API: POST /channels/{channelId}/extend
   */
  async extendChannelDays(channelId: string, days: number): Promise<any> {
    try {
      this.logger.info(`[WhapiPartner] Estendendo canal ${channelId} por ${days} dias`);
      
      const response = await axios.post(
        `${this.managerApiUrl}channels/${channelId}/extend`,
        { days },
        {
          headers: this.partnerHeaders,
          timeout: 30000
        }
      );
      
      this.logger.info(`[WhapiPartner] Canal estendido até: ${response.data.activeTill}`);
      return response.data;
    } catch (error: any) {
      this.logger.error(`[WhapiPartner] Erro ao estender canal:`, error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Buscar mensagens de um chat específico
   * Documentação: https://whapi.readme.io/reference/getmessagesbychatid
   * Usa Gate API: GET /messages/list/{chatId}
   */
  async getMessagesByChatId(channelToken: string, chatId: string, count: number = 100): Promise<any> {
    try {
      this.logger.info(`[WhapiPartner] Buscando mensagens do chat ${chatId}`);
      
      const response = await axios.get(
        `${this.gateApiUrl}messages/list/${chatId}`,
        {
          params: { count },
          headers: {
            'Authorization': `Bearer ${channelToken}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );
      
      return response.data;
    } catch (error: any) {
      this.logger.error(`[WhapiPartner] Erro ao buscar mensagens:`, error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Enviar mensagem de texto
   * Documentação: https://support.whapi.cloud/help-desk/sending/send-text-message
   * Usa Gate API: POST /messages/text
   */
  async sendTextMessage(channelToken: string, to: string, body: string): Promise<any> {
    try {
      this.logger.info(`[WhapiPartner] Enviando mensagem para ${to}`);
      
      const response = await axios.post(
        `${this.gateApiUrl}messages/text`,
        {
          to,
          body
        },
        {
          headers: {
            'Authorization': `Bearer ${channelToken}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );
      
      this.logger.info(`[WhapiPartner] Mensagem enviada: ${response.data.id}`);
      return response.data;
    } catch (error: any) {
      this.logger.error(`[WhapiPartner] Erro ao enviar mensagem:`, error.response?.data || error.message);
      throw error;
    }
  }
}
