module.exports = {
    apps: [
      {
        name: "fiv-backend",
        script: "dist/index.js",            // Arquivo principal do backend compilado
        cwd: "/srv/apps/Fi.VApp-Replit",     // Caminho absoluto do projeto
        env: {
          NODE_ENV: "production",
          PORT: 3000,

          // Banco de dados (Postgres local)
          DATABASE_URL: "postgresql://fivuser:FiVApp@localhost:5432/fivapp",

          // Sessões
          SESSION_SECRET: "ea7701b52c7453ea56662473c69aad2b",

          // JWT
          JWT_SECRET: "a45d21e802e31bb98d119b77938bbfa3",

          // Redis (se você ativar)
          REDIS_URL: "redis://localhost:6379",

          //WEBSOCKET - Atualizado para app.fivconnect.net
          WEBSOCKET_URL: "wss://app.fivconnect.net/v2",
	  WSS_URL: "wss://app.fivconnect.net/v2",
          VITE_WEBSOCKET_URL: "wss://app.fivconnect.net/v2",
	  NODE_TLS_REJECT_UNAUTHORIZED: 0,

          // Whapi.Cloud Integration
          WHAPI_API_URL: "https://gate.whapi.cloud/",
          WHAPI_API_TOKEN: "LyGZfX7Go2ACmk6RaEhdklEalMjfumIm",
          MAIN_APP_URL: "https://app.fivconnect.net"
        }
      }
    ]
  }
