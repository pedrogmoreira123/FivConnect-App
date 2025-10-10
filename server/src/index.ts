/**
 * Servidor principal com integração Whapi.Cloud
 */

import express, { type Request, Response, NextFunction } from "express";
import http from 'http';
import { Server } from "socket.io";
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Importar configurações e serviços
import { setupVite, serveStatic, log } from "../vite.js";
import { registerRoutes } from "../routes.js";
import { setupWebhookRoutes } from "./routes/webhooks.js";
import { setupHealthRoutes } from "./routes/health.js";
import { setupChannelRoutes } from "./routes/channels.js";
import { startWorkers } from "./queue/workers.js";
import { logger } from "./utils/logger.js";
import { metricsMiddleware } from "./utils/metrics.js";
import "./types/socket.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = http.createServer(app);

// Configuração do Socket.io
const io = new Server(server, {
  cors: {
    origin: ['https://app.fivconnect.net', 'http://localhost:3000', 'http://localhost:5173', 'http://localhost:5000'],
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000
});

// Middleware de autenticação para WebSocket (opcional para desenvolvimento)
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  
  if (!token) {
    logger.warn('WebSocket: Token não fornecido - permitindo conexão para desenvolvimento');
    socket.userId = 'anonymous';
    socket.companyId = 'default';
    return next();
  }
  
  try {
    // Verificar token JWT (simplificado para WebSocket)
    const decoded = JSON.parse(atob(token.split('.')[1]));
    socket.userId = decoded.userId;
    socket.companyId = decoded.companyId;
    logger.info(`WebSocket: Cliente autenticado - User: ${socket.userId}, Company: ${socket.companyId}`);
    next();
  } catch (error) {
    logger.warn('WebSocket: Token inválido - permitindo conexão para desenvolvimento');
    socket.userId = 'anonymous';
    socket.companyId = 'default';
    next();
  }
});

// Logs de conexão WebSocket
io.on('connection', (socket) => {
  logger.info(`Cliente WebSocket conectado: ${socket.id} (User: ${socket.userId})`);
  logger.info(`Total de clientes conectados: ${io.engine.clientsCount}`);
  
  // Join user to their company room
  socket.join(`company_${socket.companyId}`);
  
  socket.on('disconnect', () => {
    logger.info(`Cliente WebSocket desconectado: ${socket.id}`);
    logger.info(`Total de clientes conectados: ${io.engine.clientsCount}`);
  });
});

app.set('io', io); // Disponibiliza o `io` para as rotas

// Middleware para métricas
app.use(metricsMiddleware);

app.use(express.json({ limit: '200mb' }));
app.use(express.urlencoded({ extended: false, limit: '200mb' }));

// Handler para vídeos - implementar Range requests corretamente
app.get('/uploads/*', (req, res) => {
  const filePath = path.join(__dirname, '..', 'public', 'uploads', (req.params as any)[0]);
  
  logger.info(`Servindo arquivo: ${filePath}`);
  
  // Verificar se o arquivo existe
  if (!fs.existsSync(filePath)) {
    logger.warn(`Arquivo não encontrado: ${filePath}`);
    return res.status(404).json({ error: 'Arquivo não encontrado' });
  }
  
  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;
  
  logger.info(`Tamanho: ${fileSize} bytes, Range: ${range}`);
  
  // Headers básicos
  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('Content-Type', getContentType(filePath));
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Range, Content-Length');
  
  // Headers de cache - desabilitar
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  
  // Headers de segurança
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  
  if (range) {
    // Processar Range request corretamente
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    
    // Validar range
    if (start >= fileSize || end >= fileSize || start > end) {
      res.status(416).setHeader('Content-Range', `bytes */${fileSize}`);
      return res.end();
    }
    
    const chunksize = (end - start) + 1;
    
    res.status(206);
    res.setHeader('Content-Range', `bytes ${start}-${end}/${fileSize}`);
    res.setHeader('Content-Length', chunksize);
    
    logger.info(`Enviando Range: ${start}-${end}/${fileSize} (${chunksize} bytes)`);
    
    // Usar stream com tratamento de erro
    const file = fs.createReadStream(filePath, { start, end });
    
    file.on('error', (err) => {
      logger.error(`Erro no stream: ${err.message}`);
      if (!res.headersSent) {
        res.status(500).end();
      }
    });
    
    file.on('end', () => {
      logger.info(`Range enviado com sucesso: ${chunksize} bytes`);
    });
    
    file.pipe(res);
  } else {
    // Enviar arquivo completo
    res.status(200);
    res.setHeader('Content-Length', fileSize);
    
    logger.info(`Enviando arquivo completo: ${fileSize} bytes`);
    
    // Usar sendFile com tratamento de erro
    res.sendFile(filePath, (err) => {
      if (err) {
        logger.error(`Erro ao enviar arquivo: ${err.message}`);
        if (!res.headersSent) {
          res.status(500).end();
        }
      } else {
        logger.info(`Arquivo enviado com sucesso: ${fileSize} bytes`);
      }
    });
  }
});

// Função para determinar Content-Type
function getContentType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const types: { [key: string]: string } = {
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.avi': 'video/avi',
    '.mov': 'video/quicktime',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/msword',
    '.txt': 'text/plain'
  };
  return types[ext] || 'application/octet-stream';
}

// Middleware para aumentar timeout e tamanho do body
app.use((req, res, next) => {
  req.setTimeout(300000); // 5 minutos
  res.setTimeout(300000); // 5 minutos
  next();
});

// Middleware de logging
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  try {
    // 🚀 System ready for Whapi.Cloud integration
    logger.info("Sistema inicializado e pronto para integração Whapi.Cloud");

    // Configurar rotas existentes
    await registerRoutes(app);

    // Configurar novas rotas
    setupWebhookRoutes(app);
    setupHealthRoutes(app);
    setupChannelRoutes(app);

    // Iniciar workers
    startWorkers();

    // Middleware de tratamento de erros
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      logger.error('Erro na aplicação:', err);
      res.status(status).json({ message });
    });

    // Configurar Vite em desenvolvimento
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // Iniciar servidor
    const port = parseInt(process.env.PORT || '5000', 10);
    server.listen({
      port,
      host: "0.0.0.0",
      reusePort: true,
    }, async () => {
      logger.info(`Servidor rodando na porta ${port}`);
      logger.info(`Ambiente: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`Health check: http://localhost:${port}/api/health`);
      logger.info(`Métricas: http://localhost:${port}/api/metrics`);
    });

  } catch (error) {
    logger.error('Erro ao inicializar servidor:', error);
    process.exit(1);
  }
})();
