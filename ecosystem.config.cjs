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

          //WEBSOCKET
          WEBSOCKET_URL: "wss://app.fivconnect.net/v2",
	  WSS_URL: "wss://app.fivconnect.net/v2",
          VITE_WEBSOCKET_URL: "wss://app.fivconnect.net/v2",
	  NODE_TLS_REJECT_UNAUTHORIZED: 0,

          // Whapi.Cloud Integration - API do Cliente
          WHAPI_API_URL: "https://gate.whapi.cloud/",
          WHAPI_API_TOKEN: "LyGZfX7Go2ACmk6RaEhdklEalMjfumIm",
          
          // Whapi.Cloud Integration - API de Parceiro (NOVO)
          WHAPI_PARTNER_URL: "https://manager.whapi.cloud",
          WHAPI_PARTNER_TOKEN: "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6ImExZDI2YWYyYmY4MjVmYjI5MzVjNWI3OTY3ZDA3YmYwZTMxZWIxYjcifQ.eyJwYXJ0bmVyIjp0cnVlLCJpc3MiOiJodHRwczovL3NlY3VyZXRva2VuLmdvb2dsZS5jb20vd2hhcGktYTcyMWYiLCJhdWQiOiJ3aGFwaS1hNzIxZiIsImF1dGhfdGltZSI6MTc1OTkyNTU4NCwidXNlcl9pZCI6IjhOejlLYU55ZG5kc2RtQ3lYdDROZjY2Rm9ldjIiLCJzdWIiOiI4Tno5S2FOeWRuZHNkbUN5WHQ0TmY2NkZvZXYyIiwiaWF0IjoxNzU5OTI1NTg0LCJleHAiOjE4MjA0MDU1ODQsImVtYWlsIjoicGVkcm8uZy5tb3JlaXJhMTIzQGdtYWlsLmNvbSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJmaXJlYmFzZSI6eyJpZGVudGl0aWVzIjp7ImVtYWlsIjpbInBlZHJvLmcubW9yZWlyYTEyM0BnbWFpbC5jb20iXX0sInNpZ25faW5fcHJvdmlkZXIiOiJwYXNzd29yZCJ9fQ.PUZcorVT0yGlzNh7eX_dOoberdS5g_kZxhu0L0LoSf_VBvt-Jd69fu2xr19mQyzRgiqCD1UlBm90q8zEplCWkjvGDZDJghu68Uh2fH2W7gsdKA8_LPSxuEVhBv9UUwpIvgqpVd0_FW5bg8Qr4RPgkR9QXWMNXLfu9uWvSHkZLPDSrAMjB9UQmHbxzaZRaLDEZ6WZHbQ71QyQNwTHcWKZLy1LvyMyo-n0AJl8kE0_mYFovffbVnDl3i6Nur1k5yZrHwhjImSPLPHUDeLNk_xJW2ylEBCwdwzEpSqk0JjccDb8RUbyjWDiciBurkj9e_OcSlObIKVPCv3ogsRUNR3Fhw",
          
          MAIN_APP_URL: "https://app.fivconnect.net"
        }
      }
    ]
  }
