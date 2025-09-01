import { storage } from './storage';

export interface LogContext {
  userId?: string;
  email?: string;
  companyId?: string;
  environment?: string;
  ip?: string;
  userAgent?: string;
  endpoint?: string;
  method?: string;
  [key: string]: any;
}

export class Logger {
  private static formatMessage(level: string, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const env = context?.environment || storage.getCurrentEnvironment();
    const prefix = this.getLevelEmoji(level);
    
    let baseMessage = `${prefix} [${timestamp}] ${message}`;
    
    if (context) {
      const contextStr = Object.entries(context)
        .filter(([_, value]) => value !== undefined)
        .map(([key, value]) => `${key}=${value}`)
        .join(', ');
      
      if (contextStr) {
        baseMessage += ` | Context: {${contextStr}}`;
      }
    }
    
    return baseMessage;
  }
  
  private static getLevelEmoji(level: string): string {
    switch (level.toLowerCase()) {
      case 'error': return '🚨';
      case 'warn': return '⚠️';
      case 'info': return 'ℹ️';
      case 'success': return '✅';
      case 'debug': return '🔍';
      case 'auth': return '🔐';
      default: return '📝';
    }
  }
  
  static info(message: string, context?: LogContext) {
    const formattedMessage = this.formatMessage('info', message, context);
    console.log(formattedMessage);
  }
  
  static success(message: string, context?: LogContext) {
    const formattedMessage = this.formatMessage('success', message, context);
    console.log(formattedMessage);
  }
  
  static warn(message: string, context?: LogContext) {
    const formattedMessage = this.formatMessage('warn', message, context);
    console.warn(formattedMessage);
  }
  
  static error(message: string, error?: any, context?: LogContext) {
    const formattedMessage = this.formatMessage('error', message, context);
    console.error(formattedMessage);
    
    if (error) {
      if (error instanceof Error) {
        console.error(`Error details: ${error.message}`);
        if (error.stack) {
          console.error(`Stack trace: ${error.stack}`);
        }
      } else {
        console.error('Error details:', error);
      }
    }
  }
  
  static auth(message: string, context?: LogContext) {
    const formattedMessage = this.formatMessage('auth', message, context);
    console.log(formattedMessage);
  }
  
  static debug(message: string, context?: LogContext) {
    const formattedMessage = this.formatMessage('debug', message, context);
    console.debug(formattedMessage);
  }
  
  // Helper para criar contexto de request
  static createRequestContext(req: any): LogContext {
    return {
      userId: req.user?.id,
      email: req.user?.email,
      companyId: req.user?.company?.id,
      environment: storage.getCurrentEnvironment(),
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      endpoint: req.originalUrl || req.url,
      method: req.method,
    };
  }
}