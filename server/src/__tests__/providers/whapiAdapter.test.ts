/**
 * Testes para WhapiAdapter
 */

import { WhapiAdapter, type WhapiConfig } from '../../providers/whapiAdapter.js';
import axios from 'axios';

// Mock do axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('WhapiAdapter', () => {
  let adapter: WhapiAdapter;
  let config: WhapiConfig;

  beforeEach(() => {
    config = {
      token: 'test-token',
      baseUrl: 'https://gate.whapi.cloud',
    };
    adapter = new WhapiAdapter(config);
    jest.clearAllMocks();
  });

  describe('sendText', () => {
    it('deve enviar mensagem de texto com sucesso', async () => {
      const mockResponse = {
        data: {
          messages: [{ id: 'msg-123' }],
        },
      };
      mockedAxios.post.mockResolvedValue(mockResponse);

      const result = await adapter.sendText('channel-1', '+5511999999999', 'Olá!');

      expect(result).toEqual({
        success: true,
        messageId: 'msg-123',
        provider: 'whapi',
      });

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://gate.whapi.cloud/messages/text',
        {
          to: '+5511999999999',
          body: 'Olá!',
          preview_url: false,
        },
        {
          headers: {
            'Authorization': 'Bearer test-token',
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        }
      );
    });

    it('deve retornar erro quando falha ao enviar', async () => {
      const mockError = {
        response: {
          status: 400,
          data: { error: 'Invalid phone number' },
        },
      };
      mockedAxios.post.mockRejectedValue(mockError);

      const result = await adapter.sendText('channel-1', 'invalid', 'Olá!');

      expect(result).toEqual({
        success: false,
        error: 'Invalid phone number',
        provider: 'whapi',
      });
    });
  });

  describe('sendMedia', () => {
    it('deve enviar imagem com sucesso', async () => {
      const mockResponse = {
        data: {
          messages: [{ id: 'msg-456' }],
        },
      };
      mockedAxios.post.mockResolvedValue(mockResponse);

      const media = {
        type: 'image' as const,
        url: 'https://example.com/image.jpg',
        caption: 'Imagem de teste',
      };

      const result = await adapter.sendMedia('channel-1', '+5511999999999', media);

      expect(result).toEqual({
        success: true,
        messageId: 'msg-456',
        provider: 'whapi',
      });

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://gate.whapi.cloud/messages/image',
        {
          to: '+5511999999999',
          media: 'https://example.com/image.jpg',
          caption: 'Imagem de teste',
        },
        expect.any(Object)
      );
    });

    it('deve enviar documento com sucesso', async () => {
      const mockResponse = {
        data: {
          messages: [{ id: 'msg-789' }],
        },
      };
      mockedAxios.post.mockResolvedValue(mockResponse);

      const media = {
        type: 'document' as const,
        url: 'https://example.com/doc.pdf',
        filename: 'documento.pdf',
      };

      const result = await adapter.sendMedia('channel-1', '+5511999999999', media);

      expect(result).toEqual({
        success: true,
        messageId: 'msg-789',
        provider: 'whapi',
      });

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://gate.whapi.cloud/messages/document',
        {
          to: '+5511999999999',
          media: 'https://example.com/doc.pdf',
          filename: 'documento.pdf',
        },
        expect.any(Object)
      );
    });

    it('deve retornar erro para tipo de mídia não suportado', async () => {
      const media = {
        type: 'unsupported' as any,
        url: 'https://example.com/file.xyz',
      };

      const result = await adapter.sendMedia('channel-1', '+5511999999999', media);

      expect(result).toEqual({
        success: false,
        error: 'Tipo de mídia não suportado: unsupported',
        provider: 'whapi',
      });
    });
  });

  describe('getStatus', () => {
    it('deve retornar status conectado', async () => {
      const mockResponse = {
        data: {
          status: 'connected',
          phone_number: '+5511999999999',
          last_seen: '2024-01-01T00:00:00Z',
        },
      };
      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await adapter.getStatus('channel-1');

      expect(result).toEqual({
        connected: true,
        status: 'connected',
        phoneNumber: '+5511999999999',
        lastSeen: new Date('2024-01-01T00:00:00Z'),
      });
    });

    it('deve retornar status desconectado', async () => {
      const mockResponse = {
        data: {
          status: 'disconnected',
        },
      };
      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await adapter.getStatus('channel-1');

      expect(result).toEqual({
        connected: false,
        status: 'disconnected',
      });
    });

    it('deve retornar erro quando falha ao obter status', async () => {
      const mockError = {
        message: 'Network error',
      };
      mockedAxios.get.mockRejectedValue(mockError);

      const result = await adapter.getStatus('channel-1');

      expect(result).toEqual({
        connected: false,
        status: 'error',
        error: 'Network error',
      });
    });
  });

  describe('disconnect', () => {
    it('deve desconectar com sucesso', async () => {
      mockedAxios.post.mockResolvedValue({ data: {} });

      await expect(adapter.disconnect('channel-1')).resolves.not.toThrow();

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://gate.whapi.cloud/logout',
        {},
        expect.any(Object)
      );
    });

    it('não deve lançar erro quando falha ao desconectar', async () => {
      mockedAxios.post.mockRejectedValue(new Error('Network error'));

      await expect(adapter.disconnect('channel-1')).resolves.not.toThrow();
    });
  });

  describe('setWebhook', () => {
    it('deve configurar webhook com sucesso', async () => {
      mockedAxios.post.mockResolvedValue({ data: {} });

      await expect(adapter.setWebhook('channel-1', 'https://example.com/webhook')).resolves.not.toThrow();

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://gate.whapi.cloud/settings',
        {
          webhook_url: 'https://example.com/webhook',
          webhook_events: ['messages', 'status'],
        },
        expect.any(Object)
      );
    });

    it('deve lançar erro quando falha ao configurar webhook', async () => {
      const mockError = {
        response: {
          status: 400,
          data: { error: 'Invalid webhook URL' },
        },
      };
      mockedAxios.post.mockRejectedValue(mockError);

      await expect(adapter.setWebhook('channel-1', 'invalid-url')).rejects.toThrow('Falha ao configurar webhook: Invalid webhook URL');
    });
  });

  describe('validateConfig', () => {
    it('deve validar configuração válida', () => {
      expect(WhapiAdapter.validateConfig({ token: 'valid-token' })).toBe(true);
    });

    it('deve rejeitar configuração inválida', () => {
      expect(WhapiAdapter.validateConfig({ token: '' })).toBe(false);
      expect(WhapiAdapter.validateConfig({} as any)).toBe(false);
    });
  });
});

