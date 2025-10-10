/**
 * Interface para providers de WhatsApp
 * Define o contrato que todos os providers devem implementar
 */

export interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  provider?: string;
}

export interface MediaPayload {
  type: 'image' | 'video' | 'audio' | 'document';
  url: string;
  caption?: string;
  filename?: string;
}

export interface ProviderStatus {
  connected: boolean;
  status: 'connected' | 'disconnected' | 'connecting' | 'error';
  phoneNumber?: string;
  lastSeen?: Date;
  error?: string;
}

export interface IncomingMessage {
  provider: string;
  channelId: string;
  from: string;
  type: 'text' | 'image' | 'video' | 'audio' | 'document' | 'location' | 'contact';
  message: string;
  mediaUrl?: string;
  caption?: string;
  filename?: string;
  timestamp: Date;
  messageId: string;
  quotedMessageId?: string;
}

/**
 * Interface principal para providers de WhatsApp
 */
export interface IWhatsappProvider {
  /**
   * Enviar mensagem de texto
   */
  sendText(channelId: string, to: string, text: string): Promise<SendResult>;

  /**
   * Enviar mídia (imagem, vídeo, áudio, documento)
   */
  sendMedia(channelId: string, to: string, media: MediaPayload): Promise<SendResult>;

  /**
   * Obter status da conexão
   */
  getStatus(channelId: string): Promise<ProviderStatus>;

  /**
   * Desconectar canal
   */
  disconnect(channelId: string): Promise<void>;

  /**
   * Conectar canal (se aplicável)
   */
  connect?(channelId: string): Promise<void>;

  /**
   * Obter QR Code (se aplicável)
   */
  getQRCode?(channelId: string): Promise<string | null>;

  /**
   * Configurar webhook
   */
  setWebhook?(channelId: string, webhookUrl: string): Promise<void>;
}

