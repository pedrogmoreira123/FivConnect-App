/**
 * Serviço de gerenciamento de channels
 */

import { db } from '../db.js';
import { channels, type Channel, type InsertChannel } from '../../shared/schema.js';
import { eq, and } from 'drizzle-orm';
import { encryptionService } from '../utils/encryption.js';
import { WhapiAdapter, type WhapiConfig } from '../providers/whapiAdapter.js';
import { IWhatsappProvider } from '../providers/IWhatsappProvider.js';

export class ChannelService {
  private providers: Map<string, IWhatsappProvider> = new Map();

  /**
   * Criar novo channel
   */
  async createChannel(data: Omit<InsertChannel, 'providerTokenEncrypted'> & { token: string }): Promise<Channel> {
    const encryptedToken = encryptionService.encrypt(data.token);
    
    const [channel] = await db.insert(channels).values({
      ...data,
      providerTokenEncrypted: encryptedToken
    }).returning();

    // Criar instância do provider
    await this.createProviderInstance(channel);

    return channel;
  }

  /**
   * Obter channel por ID
   */
  async getChannel(channelId: string): Promise<Channel | null> {
    const [channel] = await db.select().from(channels).where(eq(channels.id, channelId));
    return channel || null;
  }

  /**
   * Obter channels por owner
   */
  async getChannelsByOwner(ownerId: string): Promise<Channel[]> {
    return await db.select().from(channels).where(eq(channels.ownerId, ownerId));
  }

  /**
   * Atualizar channel
   */
  async updateChannel(channelId: string, data: Partial<InsertChannel>): Promise<Channel | null> {
    const [channel] = await db.update(channels)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(channels.id, channelId))
      .returning();

    if (channel) {
      // Recriar instância do provider se necessário
      await this.createProviderInstance(channel);
    }

    return channel || null;
  }

  /**
   * Deletar channel
   */
  async deleteChannel(channelId: string): Promise<boolean> {
    const result = await db.delete(channels).where(eq(channels.id, channelId));
    this.providers.delete(channelId);
    return result.rowCount > 0;
  }

  /**
   * Obter provider para um channel
   */
  async getProvider(channelId: string): Promise<IWhatsappProvider | null> {
    // Verificar se já existe na cache
    if (this.providers.has(channelId)) {
      return this.providers.get(channelId)!;
    }

    // Buscar channel no banco
    const channel = await this.getChannel(channelId);
    if (!channel) {
      return null;
    }

    // Criar instância do provider
    await this.createProviderInstance(channel);
    return this.providers.get(channelId) || null;
  }

  /**
   * Criar instância do provider
   */
  private async createProviderInstance(channel: Channel): Promise<void> {
    try {
      const decryptedToken = encryptionService.decrypt(channel.providerTokenEncrypted);
      
      let provider: IWhatsappProvider;
      
      switch (channel.providerName) {
        case 'whapi':
          const config: WhapiConfig = {
            token: decryptedToken,
            baseUrl: process.env.WHAPI_BASE_URL || 'https://gate.whapi.cloud'
          };
          provider = new WhapiAdapter(config);
          break;
        default:
          throw new Error(`Provider não suportado: ${channel.providerName}`);
      }

      this.providers.set(channel.id, provider);
    } catch (error) {
      console.error(`Erro ao criar provider para channel ${channel.id}:`, error);
      throw error;
    }
  }

  /**
   * Enviar mensagem de texto
   */
  async sendText(channelId: string, to: string, text: string) {
    const provider = await this.getProvider(channelId);
    if (!provider) {
      throw new Error(`Channel ${channelId} não encontrado`);
    }

    return await provider.sendText(channelId, to, text);
  }

  /**
   * Enviar mídia
   */
  async sendMedia(channelId: string, to: string, media: any) {
    const provider = await this.getProvider(channelId);
    if (!provider) {
      throw new Error(`Channel ${channelId} não encontrado`);
    }

    return await provider.sendMedia(channelId, to, media);
  }

  /**
   * Obter status do channel
   */
  async getStatus(channelId: string) {
    const provider = await this.getProvider(channelId);
    if (!provider) {
      throw new Error(`Channel ${channelId} não encontrado`);
    }

    return await provider.getStatus(channelId);
  }

  /**
   * Desconectar channel
   */
  async disconnect(channelId: string) {
    const provider = await this.getProvider(channelId);
    if (!provider) {
      throw new Error(`Channel ${channelId} não encontrado`);
    }

    await provider.disconnect(channelId);
    
    // Atualizar status no banco
    await this.updateChannel(channelId, { status: 'inactive' });
  }

  /**
   * Configurar webhook
   */
  async setWebhook(channelId: string, webhookUrl: string) {
    const provider = await this.getProvider(channelId);
    if (!provider || !provider.setWebhook) {
      throw new Error(`Channel ${channelId} não suporta webhook`);
    }

    await provider.setWebhook(channelId, webhookUrl);
  }

  /**
   * Limpar cache de providers
   */
  clearProvidersCache(): void {
    this.providers.clear();
  }
}

// Instância singleton
export const channelService = new ChannelService();

