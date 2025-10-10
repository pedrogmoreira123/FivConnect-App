console.log("--- DEBUG PM2 ENV VARS ---", { websocket: process.env.WEBSOCKET_URL, wss: process.env.WSS_URL, vite: process.env.VITE_WEBSOCKET_URL });
import express, { type Request, Response, NextFunction } from "express";
import http from 'http';
import { Server } from "socket.io";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import cron from 'node-cron';
import { WhapiService } from './whapi-service';
import { storage } from './storage';
import { Logger } from './logger';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = http.createServer(app);

// Configuração do Socket.io
const io = new Server(server, {
  cors: {
    origin: "*", // Temporariamente permitir todas as origens para debug
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000,
  allowEIO3: true
});

console.log('🔧 Socket.IO configurado com CORS liberado para debug');

// Middleware de autenticação para WebSocket (simplificado para debug)
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  
  console.log('🔐 WebSocket: Tentativa de conexão com token:', token ? 'SIM' : 'NÃO');
  
  // Para debug, permitir todas as conexões
  socket.userId = 'debug-user';
  socket.companyId = '59b4b086-9171-4dbf-8177-b7c6d6fd1e33'; // Company ID fixo para debug
  
  console.log(`✅ WebSocket: Conexão permitida - User: ${socket.userId}, Company: ${socket.companyId}`);
  next();
});

// Logs de conexão WebSocket
io.on('connection', (socket) => {
  console.log(`🔌 Cliente WebSocket conectado: ${socket.id} (User: ${socket.userId})`);
  console.log(`📊 Total de clientes conectados: ${io.engine.clientsCount}`);
  console.log(`🏢 Company ID: ${socket.companyId}`);
  console.log(`🔗 Transport: ${socket.conn.transport.name}`);
  
  // Join user to their company room
  socket.join(`company_${socket.companyId}`);
  console.log(`🏠 Cliente ${socket.id} entrou na sala: company_${socket.companyId}`);
  
  socket.on('disconnect', (reason) => {
    console.log(`🔌 Cliente WebSocket desconectado: ${socket.id} (Motivo: ${reason})`);
    console.log(`📊 Total de clientes conectados: ${io.engine.clientsCount}`);
  });
});

// Função para notificar atualizações de status do WhatsApp
export const notifyWhatsAppStatusUpdate = (companyId: string, connectionId: string, status: string, connectionData?: any) => {
  console.log(`📢 Notificando atualização de status WhatsApp: Company ${companyId}, Connection ${connectionId}, Status: ${status}`);
  
  io.to(`company_${companyId}`).emit('whatsappStatusUpdate', {
    connectionId,
    status,
    connectionData,
    timestamp: new Date().toISOString()
  });
};

app.set('io', io); // Disponibiliza o `io` para as rotas

app.use(express.json({ limit: '200mb' }));
app.use(express.urlencoded({ extended: false, limit: '200mb' }));

// Handler para /uploads/ - retornar 404 para forçar nginx a servir
app.get('/uploads/*', (req, res) => {
  // Retornar 404 para forçar o nginx a servir o arquivo diretamente
  res.status(404).end();
});

// Middleware para aumentar timeout e tamanho do body
app.use((req, res, next) => {
  req.setTimeout(300000); // 5 minutos
  res.setTimeout(300000); // 5 minutos
  next();
});

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
  // 🚀 System ready for Evolution API integration
  console.log("✅ System initialized and ready for Evolution API integration");

  await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Socket.io event handlers já configurados acima

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, async () => {
    log(`serving on port ${port}`);
    console.log(`🚀 Server running on port ${port}`);
    console.log(`🌐 Environment: ${app.get("env")}`);
    console.log(`📡 WebSocket URL: ${process.env.WEBSOCKET_URL || process.env.WSS_URL}`);
    
    // Inicializar polling automático para mensagens WhatsApp
    const whapiService = new WhapiService(Logger as any);
    
    // Polling otimizado a cada 3 segundos para melhor responsividade
    cron.schedule('*/3 * * * * *', async () => {
      try {
        // Verificar se há clientes WebSocket conectados
        const connectedClients = io.sockets.sockets.size;
        
        // Polling desabilitado - webhook está ativo
        // TODO: Remover cron após confirmar que webhook está estável
        const now = new Date();
        if (now.getSeconds() % 30 === 0) {
          console.log(`[CRON] Webhook ativo, polling desabilitado`);
        }
      } catch (error) {
        console.error('[CRON] Erro no polling automático:', error);
      }
    });
    
    console.log('[CRON] Polling otimizado de mensagens WhatsApp iniciado (a cada 5 segundos, pausado se WebSocket ativo)');
  });
})();
