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

  private static formatStructuredLog(level: string, message: string, context?: LogContext, error?: any): object {
    const timestamp = new Date().toISOString();
    const env = context?.environment || storage.getCurrentEnvironment();
    
    const logEntry: any = {
      timestamp,
      level: level.toUpperCase(),
      message,
      environment: env,
      ...context
    };

    if (error) {
      logEntry.error = {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        name: error instanceof Error ? error.name : undefined
      };
    }

    return logEntry;
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
    
    // Also log structured JSON for production monitoring
    if (process.env.NODE_ENV === 'production') {
      const structuredLog = this.formatStructuredLog('info', message, context);
      console.log(JSON.stringify(structuredLog));
    }
  }
  
  static success(message: string, context?: LogContext) {
    const formattedMessage = this.formatMessage('success', message, context);
    console.log(formattedMessage);
    
    // Also log structured JSON for production monitoring
    if (process.env.NODE_ENV === 'production') {
      const structuredLog = this.formatStructuredLog('success', message, context);
      console.log(JSON.stringify(structuredLog));
    }
  }
  
  static warn(message: string, context?: LogContext) {
    const formattedMessage = this.formatMessage('warn', message, context);
    console.warn(formattedMessage);
    
    // Also log structured JSON for production monitoring
    if (process.env.NODE_ENV === 'production') {
      const structuredLog = this.formatStructuredLog('warn', message, context);
      console.log(JSON.stringify(structuredLog));
    }
  }
  
  static error(message: string, error?: any, context?: LogContext) {
    const formattedMessage = this.formatMessage('error', message, context);
    console.error(formattedMessage);
    
    // Also log structured JSON for production monitoring
    if (process.env.NODE_ENV === 'production') {
      const structuredLog = this.formatStructuredLog('error', message, context, error);
      console.log(JSON.stringify(structuredLog));
    }
    
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