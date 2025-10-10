/**
 * Testes para rotas de webhook
 */

import request from 'supertest';
import express, { Express } from 'express';
import { setupWebhookRoutes } from '../../routes/webhooks.js';

describe('Webhook Routes', () => {
  let app: Express;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    setupWebhookRoutes(app);
  });

  describe('POST /api/webhooks/whapi', () => {
    it('deve processar webhook de mensagem com sucesso', async () => {
      const webhookPayload = {
        event: 'message',
        data: {
          id: 'msg-123',
          from: '+5511999999999',
          type: 'text',
          body: 'Olá!',
          timestamp: 1640995200,
        },
      };

      const response = await request(app)
        .post('/api/webhooks/whapi')
        .send(webhookPayload)
        .expect(200);

      expect(response.body).toEqual({ success: true });
    });

    it('deve processar webhook de status com sucesso', async () => {
      const webhookPayload = {
        event: 'status',
        data: {
          status: 'connected',
          phone_number: '+5511999999999',
        },
      };

      const response = await request(app)
        .post('/api/webhooks/whapi')
        .send(webhookPayload)
        .expect(200);

      expect(response.body).toEqual({ success: true });
    });

    it('deve processar evento não reconhecido', async () => {
      const webhookPayload = {
        event: 'unknown_event',
        data: {},
      };

      const response = await request(app)
        .post('/api/webhooks/whapi')
        .send(webhookPayload)
        .expect(200);

      expect(response.body).toEqual({ success: true });
    });

    it('deve retornar erro 500 quando ocorre exceção', async () => {
      // Mock para simular erro
      const originalConsoleError = console.error;
      console.error = jest.fn();

      const webhookPayload = {
        event: 'message',
        data: null, // Dados inválidos para causar erro
      };

      const response = await request(app)
        .post('/api/webhooks/whapi')
        .send(webhookPayload)
        .expect(500);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Erro interno do servidor');

      console.error = originalConsoleError;
    });
  });

  describe('POST /api/webhooks/:provider', () => {
    it('deve processar webhook de provider genérico', async () => {
      const webhookPayload = {
        event: 'test',
        data: { message: 'test' },
      };

      const response = await request(app)
        .post('/api/webhooks/evolution')
        .send(webhookPayload)
        .expect(200);

      expect(response.body).toEqual({ success: true });
    });

    it('deve retornar erro 500 quando ocorre exceção', async () => {
      const originalConsoleError = console.error;
      console.error = jest.fn();

      const response = await request(app)
        .post('/api/webhooks/evolution')
        .send({}) // Dados vazios
        .expect(500);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Erro interno do servidor');

      console.error = originalConsoleError;
    });
  });
});
