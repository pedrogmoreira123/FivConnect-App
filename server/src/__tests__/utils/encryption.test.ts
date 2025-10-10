/**
 * Testes para serviço de criptografia
 */

import { EncryptionService } from '../../utils/encryption.js';

describe('EncryptionService', () => {
  let encryptionService: EncryptionService;

  beforeEach(() => {
    // Configurar chave de teste
    process.env.ENCRYPTION_KEY = 'test-encryption-key-32-chars-long';
    encryptionService = new EncryptionService();
  });

  afterEach(() => {
    delete process.env.ENCRYPTION_KEY;
  });

  describe('encrypt', () => {
    it('deve criptografar texto com sucesso', () => {
      const text = 'test-token-123';
      const encrypted = encryptionService.encrypt(text);

      expect(encrypted).toBeDefined();
      expect(encrypted).not.toBe(text);
      expect(typeof encrypted).toBe('string');
      expect(encrypted.length).toBeGreaterThan(0);
    });

    it('deve gerar resultados diferentes para o mesmo texto', () => {
      const text = 'test-token-123';
      const encrypted1 = encryptionService.encrypt(text);
      const encrypted2 = encryptionService.encrypt(text);

      expect(encrypted1).not.toBe(encrypted2);
    });

    it('deve lançar erro quando ENCRYPTION_KEY não está definida', () => {
      delete process.env.ENCRYPTION_KEY;

      expect(() => new EncryptionService()).toThrow('ENCRYPTION_KEY environment variable is required');
    });
  });

  describe('decrypt', () => {
    it('deve descriptografar texto com sucesso', () => {
      const originalText = 'test-token-123';
      const encrypted = encryptionService.encrypt(originalText);
      const decrypted = encryptionService.decrypt(encrypted);

      expect(decrypted).toBe(originalText);
    });

    it('deve descriptografar diferentes textos criptografados', () => {
      const texts = ['token1', 'token2', 'very-long-token-with-special-chars-123!@#'];
      
      texts.forEach(text => {
        const encrypted = encryptionService.encrypt(text);
        const decrypted = encryptionService.decrypt(encrypted);
        expect(decrypted).toBe(text);
      });
    });

    it('deve lançar erro para dados inválidos', () => {
      expect(() => encryptionService.decrypt('invalid-data')).toThrow();
      expect(() => encryptionService.decrypt('')).toThrow();
    });
  });

  describe('isEncrypted', () => {
    it('deve identificar texto criptografado', () => {
      const text = 'test-token-123';
      const encrypted = encryptionService.encrypt(text);

      expect(encryptionService.isEncrypted(encrypted)).toBe(true);
    });

    it('deve identificar texto não criptografado', () => {
      const texts = [
        'plain-text',
        'token-123',
        'not-encrypted',
        '',
        'short',
      ];

      texts.forEach(text => {
        expect(encryptionService.isEncrypted(text)).toBe(false);
      });
    });

    it('deve retornar false para dados inválidos', () => {
      expect(encryptionService.isEncrypted('invalid-base64')).toBe(false);
      expect(encryptionService.isEncrypted('!@#$%^&*()')).toBe(false);
    });
  });

  describe('roundtrip', () => {
    it('deve manter integridade em múltiplas operações', () => {
      const originalText = 'sensitive-token-data-123';
      
      // Criptografar e descriptografar múltiplas vezes
      let currentText = originalText;
      for (let i = 0; i < 5; i++) {
        const encrypted = encryptionService.encrypt(currentText);
        const decrypted = encryptionService.decrypt(encrypted);
        expect(decrypted).toBe(currentText);
        currentText = decrypted;
      }
    });

    it('deve funcionar com caracteres especiais', () => {
      const specialTexts = [
        'token-with-émojis-🚀',
        'token-with-çedilha',
        'token-with-ñ-tilde',
        'token-with-中文',
        'token-with-русский',
      ];

      specialTexts.forEach(text => {
        const encrypted = encryptionService.encrypt(text);
        const decrypted = encryptionService.decrypt(encrypted);
        expect(decrypted).toBe(text);
      });
    });
  });
});

