/**
 * Utilitário de criptografia para tokens sensíveis
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits
const TAG_LENGTH = 16; // 128 bits

export class EncryptionService {
  private key: Buffer;

  constructor() {
    const encryptionKey = process.env.ENCRYPTION_KEY;
    if (!encryptionKey) {
      throw new Error('ENCRYPTION_KEY environment variable is required');
    }
    
    // Gerar chave a partir da string de ambiente
    this.key = crypto.scryptSync(encryptionKey, 'salt', KEY_LENGTH);
  }

  /**
   * Criptografar texto
   */
  encrypt(text: string): string {
    try {
      const iv = crypto.randomBytes(IV_LENGTH);
      const cipher = crypto.createCipher(ALGORITHM, this.key);
      cipher.setAAD(Buffer.from('whapi-token', 'utf8'));
      
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const tag = cipher.getAuthTag();
      
      // Combinar IV + tag + dados criptografados
      const combined = Buffer.concat([iv, tag, Buffer.from(encrypted, 'hex')]);
      return combined.toString('base64');
    } catch (error) {
      throw new Error(`Falha ao criptografar: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  /**
   * Descriptografar texto
   */
  decrypt(encryptedData: string): string {
    try {
      const combined = Buffer.from(encryptedData, 'base64');
      
      // Extrair IV, tag e dados criptografados
      const iv = combined.subarray(0, IV_LENGTH);
      const tag = combined.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
      const encrypted = combined.subarray(IV_LENGTH + TAG_LENGTH);
      
      const decipher = crypto.createDecipher(ALGORITHM, this.key);
      decipher.setAAD(Buffer.from('whapi-token', 'utf8'));
      decipher.setAuthTag(tag);
      
      let decrypted = decipher.update(encrypted, undefined, 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      throw new Error(`Falha ao descriptografar: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  /**
   * Verificar se a string está criptografada
   */
  isEncrypted(text: string): boolean {
    try {
      // Tentar decodificar como base64
      const decoded = Buffer.from(text, 'base64');
      // Verificar se tem o tamanho mínimo esperado (IV + TAG + dados)
      return decoded.length >= IV_LENGTH + TAG_LENGTH + 1;
    } catch {
      return false;
    }
  }
}

// Instância singleton
export const encryptionService = new EncryptionService();
