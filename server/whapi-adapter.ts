import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class WhapiAdapter {
  private baseUrl: string;
  private token: string;

  constructor(baseUrl: string, token: string) {
    this.baseUrl = baseUrl;
    this.token = token;
  }

  /**
   * Download media from Whapi.Cloud
   * Supports both mediaId and direct media URLs from webhook
   */
  async downloadMedia(mediaIdOrUrl: string, clientToken?: string): Promise<{ url: string, type: string, fileName: string }> {
    try {
      console.log(`[WhapiAdapter] Downloading media: ${mediaIdOrUrl}`);
      
      // Determinar se é um ID ou URL completa
      const isUrl = mediaIdOrUrl.startsWith('http');
      const downloadUrl = isUrl 
        ? mediaIdOrUrl 
        : `${this.baseUrl}/media/${mediaIdOrUrl}`;
      
      // Usar token fornecido ou token padrão
      const authToken = clientToken || this.token;
      
      const response = await axios.get(downloadUrl, {
        headers: { 
          'Authorization': `Bearer ${authToken}`,
          'Accept': '*/*'
        },
        responseType: 'arraybuffer',
        timeout: 30000
      });

      // Detectar tipo de arquivo pelo Content-Type
      const contentType = response.headers['content-type'] || 'application/octet-stream';
      const extension = this.getExtensionFromContentType(contentType);
      
      // Gerar nome único para o arquivo
      const timestamp = Date.now();
      const uniqueId = isUrl ? `url_${timestamp}` : mediaIdOrUrl;
      const fileName = `${uniqueId}${extension}`;
      
      // Criar diretório de uploads se não existir
      const uploadDir = path.join(__dirname, '../public/uploads');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      
      const filePath = path.join(uploadDir, fileName);
      await fs.promises.writeFile(filePath, Buffer.from(response.data));
      
      // Usar caminho relativo para melhor compatibilidade
      const mediaUrl = `/uploads/${fileName}`;
      
      console.log(`[WhapiAdapter] Media downloaded successfully: ${mediaUrl} (${contentType})`);
      
      return {
        url: mediaUrl,
        type: contentType,
        fileName: fileName
      };
      
    } catch (error: any) {
      console.error(`[WhapiAdapter] Error downloading media ${mediaIdOrUrl}:`, error.message);
      
      // Se falhar, tentar com a URL direta (sem passar pelo nosso servidor)
      if (mediaIdOrUrl.startsWith('http')) {
        console.log(`[WhapiAdapter] Retornando URL original como fallback: ${mediaIdOrUrl}`);
        return {
          url: mediaIdOrUrl,
          type: 'application/octet-stream',
          fileName: 'media_file'
        };
      }
      
      throw new Error(`Failed to download media: ${error.message}`);
    }
  }

  /**
   * Get file extension from content type
   */
  private getExtensionFromContentType(contentType: string): string {
    const typeMap: { [key: string]: string } = {
      'image/jpeg': '.jpg',
      'image/jpg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'image/webp': '.webp',
      'audio/ogg': '.ogg',
      'audio/mpeg': '.mp3',
      'audio/mp3': '.mp3',
      'audio/wav': '.wav',
      'video/mp4': '.mp4',
      'video/avi': '.avi',
      'video/mov': '.mov',
      'video/quicktime': '.mov',
      'application/pdf': '.pdf',
      'application/msword': '.doc',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
      'application/vnd.ms-excel': '.xls',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
      'text/plain': '.txt'
    };
    
    return typeMap[contentType] || '.bin';
  }

  /**
   * Get media info without downloading
   */
  async getMediaInfo(mediaId: string): Promise<{ type: string, size?: number }> {
    try {
      const response = await axios.head(`${this.baseUrl}/media/${mediaId}`, {
        headers: { 
          'Authorization': `Bearer ${this.token}`
        },
        timeout: 10000
      });

      return {
        type: response.headers['content-type'] || 'application/octet-stream',
        size: parseInt(response.headers['content-length'] || '0')
      };
      
    } catch (error: any) {
      console.error(`[WhapiAdapter] Error getting media info ${mediaId}:`, error.message);
      throw new Error(`Failed to get media info: ${error.message}`);
    }
  }
}



import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class WhapiAdapter {
  private baseUrl: string;
  private token: string;

  constructor(baseUrl: string, token: string) {
    this.baseUrl = baseUrl;
    this.token = token;
  }

  /**
   * Download media from Whapi.Cloud
   * Supports both mediaId and direct media URLs from webhook
   */
  async downloadMedia(mediaIdOrUrl: string, clientToken?: string): Promise<{ url: string, type: string, fileName: string }> {
    try {
      console.log(`[WhapiAdapter] Downloading media: ${mediaIdOrUrl}`);
      
      // Determinar se é um ID ou URL completa
      const isUrl = mediaIdOrUrl.startsWith('http');
      const downloadUrl = isUrl 
        ? mediaIdOrUrl 
        : `${this.baseUrl}/media/${mediaIdOrUrl}`;
      
      // Usar token fornecido ou token padrão
      const authToken = clientToken || this.token;
      
      const response = await axios.get(downloadUrl, {
        headers: { 
          'Authorization': `Bearer ${authToken}`,
          'Accept': '*/*'
        },
        responseType: 'arraybuffer',
        timeout: 30000
      });

      // Detectar tipo de arquivo pelo Content-Type
      const contentType = response.headers['content-type'] || 'application/octet-stream';
      const extension = this.getExtensionFromContentType(contentType);
      
      // Gerar nome único para o arquivo
      const timestamp = Date.now();
      const uniqueId = isUrl ? `url_${timestamp}` : mediaIdOrUrl;
      const fileName = `${uniqueId}${extension}`;
      
      // Criar diretório de uploads se não existir
      const uploadDir = path.join(__dirname, '../public/uploads');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      
      const filePath = path.join(uploadDir, fileName);
      await fs.promises.writeFile(filePath, Buffer.from(response.data));
      
      // Usar caminho relativo para melhor compatibilidade
      const mediaUrl = `/uploads/${fileName}`;
      
      console.log(`[WhapiAdapter] Media downloaded successfully: ${mediaUrl} (${contentType})`);
      
      return {
        url: mediaUrl,
        type: contentType,
        fileName: fileName
      };
      
    } catch (error: any) {
      console.error(`[WhapiAdapter] Error downloading media ${mediaIdOrUrl}:`, error.message);
      
      // Se falhar, tentar com a URL direta (sem passar pelo nosso servidor)
      if (mediaIdOrUrl.startsWith('http')) {
        console.log(`[WhapiAdapter] Retornando URL original como fallback: ${mediaIdOrUrl}`);
        return {
          url: mediaIdOrUrl,
          type: 'application/octet-stream',
          fileName: 'media_file'
        };
      }
      
      throw new Error(`Failed to download media: ${error.message}`);
    }
  }

  /**
   * Get file extension from content type
   */
  private getExtensionFromContentType(contentType: string): string {
    const typeMap: { [key: string]: string } = {
      'image/jpeg': '.jpg',
      'image/jpg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'image/webp': '.webp',
      'audio/ogg': '.ogg',
      'audio/mpeg': '.mp3',
      'audio/mp3': '.mp3',
      'audio/wav': '.wav',
      'video/mp4': '.mp4',
      'video/avi': '.avi',
      'video/mov': '.mov',
      'video/quicktime': '.mov',
      'application/pdf': '.pdf',
      'application/msword': '.doc',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
      'application/vnd.ms-excel': '.xls',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
      'text/plain': '.txt'
    };
    
    return typeMap[contentType] || '.bin';
  }

  /**
   * Get media info without downloading
   */
  async getMediaInfo(mediaId: string): Promise<{ type: string, size?: number }> {
    try {
      const response = await axios.head(`${this.baseUrl}/media/${mediaId}`, {
        headers: { 
          'Authorization': `Bearer ${this.token}`
        },
        timeout: 10000
      });

      return {
        type: response.headers['content-type'] || 'application/octet-stream',
        size: parseInt(response.headers['content-length'] || '0')
      };
      
    } catch (error: any) {
      console.error(`[WhapiAdapter] Error getting media info ${mediaId}:`, error.message);
      throw new Error(`Failed to get media info: ${error.message}`);
    }
  }
}

import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class WhapiAdapter {
  private baseUrl: string;
  private token: string;

  constructor(baseUrl: string, token: string) {
    this.baseUrl = baseUrl;
    this.token = token;
  }

  /**
   * Download media from Whapi.Cloud
   * Supports both mediaId and direct media URLs from webhook
   */
  async downloadMedia(mediaIdOrUrl: string, clientToken?: string): Promise<{ url: string, type: string, fileName: string }> {
    try {
      console.log(`[WhapiAdapter] Downloading media: ${mediaIdOrUrl}`);
      
      // Determinar se é um ID ou URL completa
      const isUrl = mediaIdOrUrl.startsWith('http');
      const downloadUrl = isUrl 
        ? mediaIdOrUrl 
        : `${this.baseUrl}/media/${mediaIdOrUrl}`;
      
      // Usar token fornecido ou token padrão
      const authToken = clientToken || this.token;
      
      const response = await axios.get(downloadUrl, {
        headers: { 
          'Authorization': `Bearer ${authToken}`,
          'Accept': '*/*'
        },
        responseType: 'arraybuffer',
        timeout: 30000
      });

      // Detectar tipo de arquivo pelo Content-Type
      const contentType = response.headers['content-type'] || 'application/octet-stream';
      const extension = this.getExtensionFromContentType(contentType);
      
      // Gerar nome único para o arquivo
      const timestamp = Date.now();
      const uniqueId = isUrl ? `url_${timestamp}` : mediaIdOrUrl;
      const fileName = `${uniqueId}${extension}`;
      
      // Criar diretório de uploads se não existir
      const uploadDir = path.join(__dirname, '../public/uploads');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      
      const filePath = path.join(uploadDir, fileName);
      await fs.promises.writeFile(filePath, Buffer.from(response.data));
      
      // Usar caminho relativo para melhor compatibilidade
      const mediaUrl = `/uploads/${fileName}`;
      
      console.log(`[WhapiAdapter] Media downloaded successfully: ${mediaUrl} (${contentType})`);
      
      return {
        url: mediaUrl,
        type: contentType,
        fileName: fileName
      };
      
    } catch (error: any) {
      console.error(`[WhapiAdapter] Error downloading media ${mediaIdOrUrl}:`, error.message);
      
      // Se falhar, tentar com a URL direta (sem passar pelo nosso servidor)
      if (mediaIdOrUrl.startsWith('http')) {
        console.log(`[WhapiAdapter] Retornando URL original como fallback: ${mediaIdOrUrl}`);
        return {
          url: mediaIdOrUrl,
          type: 'application/octet-stream',
          fileName: 'media_file'
        };
      }
      
      throw new Error(`Failed to download media: ${error.message}`);
    }
  }

  /**
   * Get file extension from content type
   */
  private getExtensionFromContentType(contentType: string): string {
    const typeMap: { [key: string]: string } = {
      'image/jpeg': '.jpg',
      'image/jpg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'image/webp': '.webp',
      'audio/ogg': '.ogg',
      'audio/mpeg': '.mp3',
      'audio/mp3': '.mp3',
      'audio/wav': '.wav',
      'video/mp4': '.mp4',
      'video/avi': '.avi',
      'video/mov': '.mov',
      'video/quicktime': '.mov',
      'application/pdf': '.pdf',
      'application/msword': '.doc',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
      'application/vnd.ms-excel': '.xls',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
      'text/plain': '.txt'
    };
    
    return typeMap[contentType] || '.bin';
  }

  /**
   * Get media info without downloading
   */
  async getMediaInfo(mediaId: string): Promise<{ type: string, size?: number }> {
    try {
      const response = await axios.head(`${this.baseUrl}/media/${mediaId}`, {
        headers: { 
          'Authorization': `Bearer ${this.token}`
        },
        timeout: 10000
      });

      return {
        type: response.headers['content-type'] || 'application/octet-stream',
        size: parseInt(response.headers['content-length'] || '0')
      };
      
    } catch (error: any) {
      console.error(`[WhapiAdapter] Error getting media info ${mediaId}:`, error.message);
      throw new Error(`Failed to get media info: ${error.message}`);
    }
  }
}



import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class WhapiAdapter {
  private baseUrl: string;
  private token: string;

  constructor(baseUrl: string, token: string) {
    this.baseUrl = baseUrl;
    this.token = token;
  }

  /**
   * Download media from Whapi.Cloud
   * Supports both mediaId and direct media URLs from webhook
   */
  async downloadMedia(mediaIdOrUrl: string, clientToken?: string): Promise<{ url: string, type: string, fileName: string }> {
    try {
      console.log(`[WhapiAdapter] Downloading media: ${mediaIdOrUrl}`);
      
      // Determinar se é um ID ou URL completa
      const isUrl = mediaIdOrUrl.startsWith('http');
      const downloadUrl = isUrl 
        ? mediaIdOrUrl 
        : `${this.baseUrl}/media/${mediaIdOrUrl}`;
      
      // Usar token fornecido ou token padrão
      const authToken = clientToken || this.token;
      
      const response = await axios.get(downloadUrl, {
        headers: { 
          'Authorization': `Bearer ${authToken}`,
          'Accept': '*/*'
        },
        responseType: 'arraybuffer',
        timeout: 30000
      });

      // Detectar tipo de arquivo pelo Content-Type
      const contentType = response.headers['content-type'] || 'application/octet-stream';
      const extension = this.getExtensionFromContentType(contentType);
      
      // Gerar nome único para o arquivo
      const timestamp = Date.now();
      const uniqueId = isUrl ? `url_${timestamp}` : mediaIdOrUrl;
      const fileName = `${uniqueId}${extension}`;
      
      // Criar diretório de uploads se não existir
      const uploadDir = path.join(__dirname, '../public/uploads');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      
      const filePath = path.join(uploadDir, fileName);
      await fs.promises.writeFile(filePath, Buffer.from(response.data));
      
      // Usar caminho relativo para melhor compatibilidade
      const mediaUrl = `/uploads/${fileName}`;
      
      console.log(`[WhapiAdapter] Media downloaded successfully: ${mediaUrl} (${contentType})`);
      
      return {
        url: mediaUrl,
        type: contentType,
        fileName: fileName
      };
      
    } catch (error: any) {
      console.error(`[WhapiAdapter] Error downloading media ${mediaIdOrUrl}:`, error.message);
      
      // Se falhar, tentar com a URL direta (sem passar pelo nosso servidor)
      if (mediaIdOrUrl.startsWith('http')) {
        console.log(`[WhapiAdapter] Retornando URL original como fallback: ${mediaIdOrUrl}`);
        return {
          url: mediaIdOrUrl,
          type: 'application/octet-stream',
          fileName: 'media_file'
        };
      }
      
      throw new Error(`Failed to download media: ${error.message}`);
    }
  }

  /**
   * Get file extension from content type
   */
  private getExtensionFromContentType(contentType: string): string {
    const typeMap: { [key: string]: string } = {
      'image/jpeg': '.jpg',
      'image/jpg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'image/webp': '.webp',
      'audio/ogg': '.ogg',
      'audio/mpeg': '.mp3',
      'audio/mp3': '.mp3',
      'audio/wav': '.wav',
      'video/mp4': '.mp4',
      'video/avi': '.avi',
      'video/mov': '.mov',
      'video/quicktime': '.mov',
      'application/pdf': '.pdf',
      'application/msword': '.doc',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
      'application/vnd.ms-excel': '.xls',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
      'text/plain': '.txt'
    };
    
    return typeMap[contentType] || '.bin';
  }

  /**
   * Get media info without downloading
   */
  async getMediaInfo(mediaId: string): Promise<{ type: string, size?: number }> {
    try {
      const response = await axios.head(`${this.baseUrl}/media/${mediaId}`, {
        headers: { 
          'Authorization': `Bearer ${this.token}`
        },
        timeout: 10000
      });

      return {
        type: response.headers['content-type'] || 'application/octet-stream',
        size: parseInt(response.headers['content-length'] || '0')
      };
      
    } catch (error: any) {
      console.error(`[WhapiAdapter] Error getting media info ${mediaId}:`, error.message);
      throw new Error(`Failed to get media info: ${error.message}`);
    }
  }
}

import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class WhapiAdapter {
  private baseUrl: string;
  private token: string;

  constructor(baseUrl: string, token: string) {
    this.baseUrl = baseUrl;
    this.token = token;
  }

  /**
   * Download media from Whapi.Cloud
   * Supports both mediaId and direct media URLs from webhook
   */
  async downloadMedia(mediaIdOrUrl: string, clientToken?: string): Promise<{ url: string, type: string, fileName: string }> {
    try {
      console.log(`[WhapiAdapter] Downloading media: ${mediaIdOrUrl}`);
      
      // Determinar se é um ID ou URL completa
      const isUrl = mediaIdOrUrl.startsWith('http');
      const downloadUrl = isUrl 
        ? mediaIdOrUrl 
        : `${this.baseUrl}/media/${mediaIdOrUrl}`;
      
      // Usar token fornecido ou token padrão
      const authToken = clientToken || this.token;
      
      const response = await axios.get(downloadUrl, {
        headers: { 
          'Authorization': `Bearer ${authToken}`,
          'Accept': '*/*'
        },
        responseType: 'arraybuffer',
        timeout: 30000
      });

      // Detectar tipo de arquivo pelo Content-Type
      const contentType = response.headers['content-type'] || 'application/octet-stream';
      const extension = this.getExtensionFromContentType(contentType);
      
      // Gerar nome único para o arquivo
      const timestamp = Date.now();
      const uniqueId = isUrl ? `url_${timestamp}` : mediaIdOrUrl;
      const fileName = `${uniqueId}${extension}`;
      
      // Criar diretório de uploads se não existir
      const uploadDir = path.join(__dirname, '../public/uploads');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      
      const filePath = path.join(uploadDir, fileName);
      await fs.promises.writeFile(filePath, Buffer.from(response.data));
      
      // Usar caminho relativo para melhor compatibilidade
      const mediaUrl = `/uploads/${fileName}`;
      
      console.log(`[WhapiAdapter] Media downloaded successfully: ${mediaUrl} (${contentType})`);
      
      return {
        url: mediaUrl,
        type: contentType,
        fileName: fileName
      };
      
    } catch (error: any) {
      console.error(`[WhapiAdapter] Error downloading media ${mediaIdOrUrl}:`, error.message);
      
      // Se falhar, tentar com a URL direta (sem passar pelo nosso servidor)
      if (mediaIdOrUrl.startsWith('http')) {
        console.log(`[WhapiAdapter] Retornando URL original como fallback: ${mediaIdOrUrl}`);
        return {
          url: mediaIdOrUrl,
          type: 'application/octet-stream',
          fileName: 'media_file'
        };
      }
      
      throw new Error(`Failed to download media: ${error.message}`);
    }
  }

  /**
   * Get file extension from content type
   */
  private getExtensionFromContentType(contentType: string): string {
    const typeMap: { [key: string]: string } = {
      'image/jpeg': '.jpg',
      'image/jpg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'image/webp': '.webp',
      'audio/ogg': '.ogg',
      'audio/mpeg': '.mp3',
      'audio/mp3': '.mp3',
      'audio/wav': '.wav',
      'video/mp4': '.mp4',
      'video/avi': '.avi',
      'video/mov': '.mov',
      'video/quicktime': '.mov',
      'application/pdf': '.pdf',
      'application/msword': '.doc',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
      'application/vnd.ms-excel': '.xls',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
      'text/plain': '.txt'
    };
    
    return typeMap[contentType] || '.bin';
  }

  /**
   * Get media info without downloading
   */
  async getMediaInfo(mediaId: string): Promise<{ type: string, size?: number }> {
    try {
      const response = await axios.head(`${this.baseUrl}/media/${mediaId}`, {
        headers: { 
          'Authorization': `Bearer ${this.token}`
        },
        timeout: 10000
      });

      return {
        type: response.headers['content-type'] || 'application/octet-stream',
        size: parseInt(response.headers['content-length'] || '0')
      };
      
    } catch (error: any) {
      console.error(`[WhapiAdapter] Error getting media info ${mediaId}:`, error.message);
      throw new Error(`Failed to get media info: ${error.message}`);
    }
  }
}



import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class WhapiAdapter {
  private baseUrl: string;
  private token: string;

  constructor(baseUrl: string, token: string) {
    this.baseUrl = baseUrl;
    this.token = token;
  }

  /**
   * Download media from Whapi.Cloud
   * Supports both mediaId and direct media URLs from webhook
   */
  async downloadMedia(mediaIdOrUrl: string, clientToken?: string): Promise<{ url: string, type: string, fileName: string }> {
    try {
      console.log(`[WhapiAdapter] Downloading media: ${mediaIdOrUrl}`);
      
      // Determinar se é um ID ou URL completa
      const isUrl = mediaIdOrUrl.startsWith('http');
      const downloadUrl = isUrl 
        ? mediaIdOrUrl 
        : `${this.baseUrl}/media/${mediaIdOrUrl}`;
      
      // Usar token fornecido ou token padrão
      const authToken = clientToken || this.token;
      
      const response = await axios.get(downloadUrl, {
        headers: { 
          'Authorization': `Bearer ${authToken}`,
          'Accept': '*/*'
        },
        responseType: 'arraybuffer',
        timeout: 30000
      });

      // Detectar tipo de arquivo pelo Content-Type
      const contentType = response.headers['content-type'] || 'application/octet-stream';
      const extension = this.getExtensionFromContentType(contentType);
      
      // Gerar nome único para o arquivo
      const timestamp = Date.now();
      const uniqueId = isUrl ? `url_${timestamp}` : mediaIdOrUrl;
      const fileName = `${uniqueId}${extension}`;
      
      // Criar diretório de uploads se não existir
      const uploadDir = path.join(__dirname, '../public/uploads');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      
      const filePath = path.join(uploadDir, fileName);
      await fs.promises.writeFile(filePath, Buffer.from(response.data));
      
      // Usar caminho relativo para melhor compatibilidade
      const mediaUrl = `/uploads/${fileName}`;
      
      console.log(`[WhapiAdapter] Media downloaded successfully: ${mediaUrl} (${contentType})`);
      
      return {
        url: mediaUrl,
        type: contentType,
        fileName: fileName
      };
      
    } catch (error: any) {
      console.error(`[WhapiAdapter] Error downloading media ${mediaIdOrUrl}:`, error.message);
      
      // Se falhar, tentar com a URL direta (sem passar pelo nosso servidor)
      if (mediaIdOrUrl.startsWith('http')) {
        console.log(`[WhapiAdapter] Retornando URL original como fallback: ${mediaIdOrUrl}`);
        return {
          url: mediaIdOrUrl,
          type: 'application/octet-stream',
          fileName: 'media_file'
        };
      }
      
      throw new Error(`Failed to download media: ${error.message}`);
    }
  }

  /**
   * Get file extension from content type
   */
  private getExtensionFromContentType(contentType: string): string {
    const typeMap: { [key: string]: string } = {
      'image/jpeg': '.jpg',
      'image/jpg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'image/webp': '.webp',
      'audio/ogg': '.ogg',
      'audio/mpeg': '.mp3',
      'audio/mp3': '.mp3',
      'audio/wav': '.wav',
      'video/mp4': '.mp4',
      'video/avi': '.avi',
      'video/mov': '.mov',
      'video/quicktime': '.mov',
      'application/pdf': '.pdf',
      'application/msword': '.doc',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
      'application/vnd.ms-excel': '.xls',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
      'text/plain': '.txt'
    };
    
    return typeMap[contentType] || '.bin';
  }

  /**
   * Get media info without downloading
   */
  async getMediaInfo(mediaId: string): Promise<{ type: string, size?: number }> {
    try {
      const response = await axios.head(`${this.baseUrl}/media/${mediaId}`, {
        headers: { 
          'Authorization': `Bearer ${this.token}`
        },
        timeout: 10000
      });

      return {
        type: response.headers['content-type'] || 'application/octet-stream',
        size: parseInt(response.headers['content-length'] || '0')
      };
      
    } catch (error: any) {
      console.error(`[WhapiAdapter] Error getting media info ${mediaId}:`, error.message);
      throw new Error(`Failed to get media info: ${error.message}`);
    }
  }
}
