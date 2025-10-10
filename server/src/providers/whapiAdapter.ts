/**
 * Adapter para Whapi.Cloud
 * Implementa IWhatsappProvider para integração com Whapi.Cloud
 */

import axios, { AxiosError } from 'axios';
import { IWhatsappProvider, SendResult, MediaPayload, ProviderStatus } from './IWhatsappProvider.js';

export interface WhapiConfig {
  token: string;
  baseUrl?: string;
  webhookUrl?: string;
}

export class WhapiAdapter implements IWhatsappProvider {
  private config: WhapiConfig;
  private baseUrl: string;

  constructor(config: WhapiConfig) {
    this.config = config;
    this.baseUrl = config.baseUrl || 'https://gate.whapi.cloud';
  }

  /**
   * Enviar mensagem de texto
   */
  async sendText(channelId: string, to: string, text: string): Promise<SendResult> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/messages/text`,
        {
          to: to,
          body: text,
          preview_url: false
        },
        {
          headers: {
            'Authorization': `Bearer ${this.config.token}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      return {
        success: true,
        messageId: response.data?.messages?.[0]?.id,
        provider: 'whapi'
      };
    } catch (error) {
      return this.handleError(error, 'sendText');
    }
  }

  /**
   * Enviar mídia
   */
  async sendMedia(channelId: string, to: string, media: MediaPayload): Promise<SendResult> {
    try {
      let endpoint = '';
      let payload: any = {
        to: to
      };

      switch (media.type) {
        case 'image':
          endpoint = '/messages/image';
          payload = {
            ...payload,
            media: media.url,
            caption: media.caption || ''
          };
          break;
        case 'video':
          endpoint = '/messages/video';
          payload = {
            ...payload,
            media: media.url,
            caption: media.caption || ''
          };
          break;
        case 'audio':
          endpoint = '/messages/audio';
          payload = {
            ...payload,
            media: media.url
          };
          break;
        case 'document':
          endpoint = '/messages/document';
          payload = {
            ...payload,
            media: media.url,
            filename: media.filename || 'document'
          };
          break;
        default:
          throw new Error(`Tipo de mídia não suportado: ${media.type}`);
      }

      const response = await axios.post(
        `${this.baseUrl}${endpoint}`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${this.config.token}`,
            'Content-Type': 'application/json'
          },
          timeout: 60000 // Timeout maior para mídia
        }
      );

      return {
        success: true,
        messageId: response.data?.messages?.[0]?.id,
        provider: 'whapi'
      };
    } catch (error) {
      return this.handleError(error, 'sendMedia');
    }
  }

  /**
   * Obter status da conexão
   */
  async getStatus(channelId: string): Promise<ProviderStatus> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/status`,
        {
          headers: {
            'Authorization': `Bearer ${this.config.token}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      const status = response.data?.status;
      const connected = status === 'connected' || status === 'open';

      return {
        connected,
        status: connected ? 'connected' : 'disconnected',
        phoneNumber: response.data?.phone_number,
        lastSeen: response.data?.last_seen ? new Date(response.data.last_seen) : undefined
      };
    } catch (error) {
      return {
        connected: false,
        status: 'error',
        error: this.getErrorMessage(error)
      };
    }
  }

  /**
   * Desconectar canal
   */
  async disconnect(channelId: string): Promise<void> {
    try {
      await axios.post(
        `${this.baseUrl}/logout`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${this.config.token}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );
    } catch (error) {
      console.error('Erro ao desconectar Whapi.Cloud:', error);
      // Não lançar erro para desconexão
    }
  }

  /**
   * Configurar webhook
   */
  async setWebhook(channelId: string, webhookUrl: string): Promise<void> {
    try {
      await axios.post(
        `${this.baseUrl}/settings`,
        {
          webhook_url: webhookUrl,
          webhook_events: [
            'messages',
            'status'
          ]
        },
        {
          headers: {
            'Authorization': `Bearer ${this.config.token}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );
    } catch (error) {
      console.error('Erro ao configurar webhook Whapi.Cloud:', error);
      throw new Error(`Falha ao configurar webhook: ${this.getErrorMessage(error)}`);
    }
  }

  /**
   * Tratar erros da API
   */
  private handleError(error: any, context: string): SendResult {
    const errorMessage = this.getErrorMessage(error);
    console.error(`Erro no WhapiAdapter.${context}:`, errorMessage);
    
    return {
      success: false,
      error: errorMessage,
      provider: 'whapi'
    };
  }

  /**
   * Extrair mensagem de erro
   */
  private getErrorMessage(error: any): string {
    if (axios.isAxiosError(error)) {
      const response = error.response;
      if (response?.data?.error) {
        return response.data.error;
      }
      if (response?.data?.message) {
        return response.data.message;
      }
      return `HTTP ${response?.status}: ${response?.statusText || error.message}`;
    }
    return error.message || 'Erro desconhecido';
  }

  /**
   * Validar configuração
   */
  static validateConfig(config: WhapiConfig): boolean {
    return !!(config.token && config.token.length > 0);
  }
}

