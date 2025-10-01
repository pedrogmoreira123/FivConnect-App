console.log("--- DEBUG PM2 ENV VARS ---", { websocket: process.env.WEBSOCKET_URL, wss: process.env.WSS_URL, vite: process.env.VITE_WEBSOCKET_URL });
import express, { type Request, Response, NextFunction } from "express";
import http from 'http';
import { Server } from "socket.io";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = http.createServer(app);

// Configuração do Socket.io
const io = new Server(server, {
  cors: {
    origin: ['https://app.fivconnect.net', 'http://localhost:3000', 'http://localhost:5173'],
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

app.set('io', io); // Disponibiliza o `io` para as rotas

app.use(express.json({ limit: '200mb' }));
app.use(express.urlencoded({ extended: false, limit: '200mb' }));

// Servir arquivos de upload
app.use('/uploads', express.static(path.join(__dirname, '..', 'public', 'uploads')));

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

  // Socket.io event handlers
  io.on('connection', (socket) => {
    console.log(`[Socket.io] Novo cliente conectado: ${socket.id}`);
    socket.on('disconnect', () => {
      console.log(`[Socket.io] Cliente desconectado: ${socket.id}`);
    });
  });

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
    
  });
})();
