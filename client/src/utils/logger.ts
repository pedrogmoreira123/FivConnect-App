export interface LogContext {
  userId?: string;
  email?: string;
  action?: string;
  component?: string;
  error?: any;
  [key: string]: any;
}

export class ClientLogger {
  private static isDevelopment = import.meta.env.DEV;
  
  private static formatMessage(level: string, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const prefix = this.getLevelEmoji(level);
    
    let baseMessage = `${prefix} [${timestamp}] ${message}`;
    
    if (context) {
      const contextStr = Object.entries(context)
        .filter(([_, value]) => value !== undefined && value !== null)
        .map(([key, value]) => `${key}=${typeof value === 'object' ? JSON.stringify(value) : value}`)
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
      case 'api': return '🌐';
      default: return '📝';
    }
  }
  
  static info(message: string, context?: LogContext) {
    if (this.isDevelopment) {
      const formattedMessage = this.formatMessage('info', message, context);
      console.log(formattedMessage);
    }
  }
  
  static success(message: string, context?: LogContext) {
    if (this.isDevelopment) {
      const formattedMessage = this.formatMessage('success', message, context);
      console.log(formattedMessage);
    }
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
        if (error.stack && this.isDevelopment) {
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
  
  static api(message: string, context?: LogContext) {
    if (this.isDevelopment) {
      const formattedMessage = this.formatMessage('api', message, context);
      console.log(formattedMessage);
    }
  }
  
  static debug(message: string, context?: LogContext) {
    if (this.isDevelopment) {
      const formattedMessage = this.formatMessage('debug', message, context);
      console.debug(formattedMessage);
    }
  }
  
  // Helper para criar contexto de usuario
  static createUserContext(user?: any): LogContext {
    return {
      userId: user?.id,
      email: user?.email,
      role: user?.role,
    };
  }
}