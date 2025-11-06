/**
 * AI Service - Integração com provedores de IA (Gemini, OpenAI, etc.)
 */

import { Logger } from 'pino';

export interface AIGenerateParams {
  provider: 'gemini' | 'openai' | 'custom';
  apiKey: string;
  systemPrompt: string;
  userMessage: string;
  context: ConversationContext[];
  temperature: number;
  maxTokens: number;
}

export interface ConversationContext {
  direction: 'incoming' | 'outgoing';
  content: string;
  timestamp: Date;
}

export class AIService {
  constructor(private logger: Logger) {}

  async generateResponse(params: AIGenerateParams): Promise<string> {
    try {
      this.logger.info(`[AIService] Generating response with provider: ${params.provider}`);

      switch (params.provider) {
        case 'gemini':
          return await this.generateWithGemini(params);
        case 'openai':
          return await this.generateWithOpenAI(params);
        case 'custom':
          return await this.generateWithCustomAPI(params);
        default:
          throw new Error(`Provider ${params.provider} not supported`);
      }
    } catch (error: any) {
      this.logger.error(`[AIService] Error generating response:`, error);
      throw error;
    }
  }

  private async generateWithGemini(params: AIGenerateParams): Promise<string> {
    try {
      const { GoogleGenerativeAI } = await import('@google/generative-ai');

      this.logger.info('[AIService] Initializing Gemini AI...');
      const genAI = new GoogleGenerativeAI(params.apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

      // Construir histórico de conversa
      const history = params.context.slice(-10).map(msg => ({
        role: msg.direction === 'incoming' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      }));

      this.logger.info(`[AIService] Starting chat with ${history.length} messages in context`);

      const chat = model.startChat({
        history,
        generationConfig: {
          temperature: params.temperature,
          maxOutputTokens: params.maxTokens,
        }
      });

      // Construir prompt completo
      const fullPrompt = `${params.systemPrompt}\n\nMensagem do usuário: ${params.userMessage}`;

      const result = await chat.sendMessage(fullPrompt);
      const response = result.response.text();

      this.logger.info('[AIService] Successfully generated response with Gemini');
      return response;
    } catch (error: any) {
      this.logger.error('[AIService] Error with Gemini:', error);
      throw new Error(`Gemini API error: ${error.message}`);
    }
  }

  private async generateWithOpenAI(params: AIGenerateParams): Promise<string> {
    try {
      this.logger.info('[AIService] Initializing OpenAI...');

      // Construir mensagens para OpenAI
      const messages: any[] = [
        { role: 'system', content: params.systemPrompt }
      ];

      // Adicionar contexto
      params.context.slice(-10).forEach(msg => {
        messages.push({
          role: msg.direction === 'incoming' ? 'user' : 'assistant',
          content: msg.content
        });
      });

      // Adicionar mensagem atual
      messages.push({
        role: 'user',
        content: params.userMessage
      });

      this.logger.info(`[AIService] Calling OpenAI with ${messages.length} messages`);

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${params.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages,
          temperature: params.temperature,
          max_tokens: params.maxTokens
        })
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenAI API error: ${error}`);
      }

      const data = await response.json();
      const aiResponse = data.choices[0]?.message?.content || '';

      this.logger.info('[AIService] Successfully generated response with OpenAI');
      return aiResponse;
    } catch (error: any) {
      this.logger.error('[AIService] Error with OpenAI:', error);
      throw new Error(`OpenAI API error: ${error.message}`);
    }
  }

  private async generateWithCustomAPI(params: AIGenerateParams): Promise<string> {
    try {
      this.logger.info('[AIService] Using custom API...');

      // Implementar integração customizada aqui
      throw new Error('Custom API not implemented yet');
    } catch (error: any) {
      this.logger.error('[AIService] Error with custom API:', error);
      throw error;
    }
  }

  /**
   * Testar se a API key é válida
   */
  async testApiKey(provider: 'gemini' | 'openai', apiKey: string): Promise<boolean> {
    try {
      this.logger.info(`[AIService] Testing API key for provider: ${provider}`);

      if (provider === 'gemini') {
        const { GoogleGenerativeAI } = await import('@google/generative-ai');
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

        // Fazer uma chamada simples para testar
        const result = await model.generateContent('Hello');
        return !!result.response.text();
      } else if (provider === 'openai') {
        const response = await fetch('https://api.openai.com/v1/models', {
          headers: {
            'Authorization': `Bearer ${apiKey}`
          }
        });
        return response.ok;
      }

      return false;
    } catch (error: any) {
      this.logger.error(`[AIService] API key test failed:`, error);
      return false;
    }
  }
}
