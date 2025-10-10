/**
 * Configuração global dos testes
 */

import dotenv from 'dotenv';

// Carregar variáveis de ambiente para testes
dotenv.config({ path: '.env.test' });

// Configurar variáveis de ambiente padrão para testes
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/fivconnect_test';
process.env.REDIS_HOST = process.env.REDIS_HOST || 'localhost';
process.env.REDIS_PORT = process.env.REDIS_PORT || '6379';
process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'test-encryption-key-32-chars';
process.env.LOG_LEVEL = 'error'; // Reduzir logs durante testes

// Mock do console para reduzir output durante testes
const originalConsole = console;
global.console = {
  ...originalConsole,
  log: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
};

// Timeout global para testes
if (typeof jest !== 'undefined') {
  jest.setTimeout(10000);
}
