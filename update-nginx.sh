#!/bin/bash

# Backup da configuração atual
sudo cp /etc/nginx/sites-available/fivconnect.net /etc/nginx/sites-available/fivconnect.net.backup

# Criar nova configuração com limite de upload
cat > /tmp/fivconnect.net << 'EOF'
server {
    server_name app.fivconnect.net www.app.fivconnect.net;

    # Configurações de limite de upload
    client_max_body_size 200M;
    client_body_timeout 300s;
    client_header_timeout 300s;
    proxy_connect_timeout 300s;
    proxy_send_timeout 300s;
    proxy_read_timeout 300s;
    send_timeout 300s;

    # 1. Aponta para a pasta onde o site (frontend) foi compilado.
    root /srv/apps/Fi.VApp-Replit/dist/public;
    index index.html;

    # 2. Encaminha apenas as chamadas de API para o backend.
    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Configurações específicas para upload
        proxy_request_buffering off;
        proxy_max_temp_file_size 0;
    }

    # 3. Encaminha as conexões WebSocket para o backend.
    location /v2 {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }

    # 4. Regra para o site (React) funcionar corretamente.
    # Se não encontrar um arquivo, entrega o index.html para o React cuidar da rota.
    location / {
        try_files $uri $uri/ /index.html;
    }

    # --- Suas configurações de SSL (não precisam mudar) ---
    listen 443 ssl; # managed by Certbot
    ssl_certificate /etc/letsencrypt/live/app.fivconnect.net/fullchain.pem; # managed by Certbot
    ssl_certificate_key /etc/letsencrypt/live/app.fivconnect.net/privkey.pem; # managed by Certbot
    include /etc/letsencrypt/options-ssl-nginx.conf; # managed by Certbot
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem; # managed by Certbot
}
server {
    if ($host = www.app.fivconnect.net) {
        return 301 https://$host$request_uri;
    } # managed by Certbot


    if ($host = app.fivconnect.net) {
        return 301 https://$host$request_uri;
    } # managed by Certbot


    listen 80;
    server_name app.fivconnect.net www.app.fivconnect.net;
    return 404; # managed by Certbot




}
EOF

# Aplicar nova configuração
sudo cp /tmp/fivconnect.net /etc/nginx/sites-available/fivconnect.net

# Testar configuração
sudo nginx -t

# Recarregar nginx
sudo systemctl reload nginx

echo "✅ Configuração do nginx atualizada com limite de upload de 200MB"
