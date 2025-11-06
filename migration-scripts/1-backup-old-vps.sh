#!/bin/bash
###############################################################################
# Script de Backup - VPS Antiga (Debian - LuraHosting)
# Execute este script NA VPS ANTIGA antes da migração
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  FivConnect - Backup Script${NC}"
echo -e "${GREEN}  VPS Antiga (Debian)${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Variables
BACKUP_DIR="/tmp/fivconnect_migration"
DATE=$(date +%Y%m%d_%H%M%S)
APP_DIR="/srv/apps/Fi.VApp-Replit"

# Create backup directory
echo -e "${YELLOW}[1/7] Criando diretório de backup...${NC}"
mkdir -p $BACKUP_DIR
cd $BACKUP_DIR

# Backup PostgreSQL Database
echo -e "${YELLOW}[2/7] Backup do banco de dados PostgreSQL...${NC}"
pg_dump -U fivuser -h localhost fivapp > fivapp_backup_${DATE}.sql
pg_dump -U fivuser -Fc fivapp > fivapp_backup_${DATE}.dump
echo -e "${GREEN}✓ Banco de dados salvo:${NC}"
ls -lh fivapp_backup_${DATE}.*

# Backup Application (without node_modules and dist)
echo -e "${YELLOW}[3/7] Backup da aplicação...${NC}"
cd /srv/apps
tar -czf $BACKUP_DIR/fivconnect_app_${DATE}.tar.gz Fi.VApp-Replit/ \
  --exclude='node_modules' \
  --exclude='dist' \
  --exclude='.git' \
  --exclude='*.log'
echo -e "${GREEN}✓ Aplicação salva:${NC}"
ls -lh $BACKUP_DIR/fivconnect_app_${DATE}.tar.gz

# Backup Uploads separately (can be large)
echo -e "${YELLOW}[4/7] Backup dos uploads...${NC}"
if [ -d "$APP_DIR/public/uploads" ]; then
  tar -czf $BACKUP_DIR/fivconnect_uploads_${DATE}.tar.gz \
    -C $APP_DIR/public uploads/
  echo -e "${GREEN}✓ Uploads salvos:${NC}"
  ls -lh $BACKUP_DIR/fivconnect_uploads_${DATE}.tar.gz
else
  echo -e "${YELLOW}⚠ Diretório de uploads não encontrado${NC}"
  touch $BACKUP_DIR/fivconnect_uploads_${DATE}.tar.gz
fi

# Backup Nginx configuration
echo -e "${YELLOW}[5/7] Backup das configurações Nginx...${NC}"
sudo cp /etc/nginx/nginx.conf $BACKUP_DIR/nginx.conf.bak
echo -e "${GREEN}✓ Nginx config salvo${NC}"

# Backup Environment variables
echo -e "${YELLOW}[6/7] Backup das variáveis de ambiente...${NC}"
if [ -f "$APP_DIR/.env" ]; then
  cp $APP_DIR/.env $BACKUP_DIR/env.bak
  echo -e "${GREEN}✓ .env salvo${NC}"
else
  echo -e "${RED}✗ Arquivo .env não encontrado!${NC}"
  exit 1
fi

# Backup PM2 configuration
pm2 save
if [ -f "$HOME/.pm2/dump.pm2" ]; then
  cp $HOME/.pm2/dump.pm2 $BACKUP_DIR/pm2_backup.json
  echo -e "${GREEN}✓ PM2 config salvo${NC}"
fi

# Save system information
echo -e "${YELLOW}[7/7] Salvando informações do sistema...${NC}"
cat > $BACKUP_DIR/system_info.txt << EOF
=== System Information ===
Date: $(date)
Hostname: $(hostname)
OS: $(cat /etc/os-release | grep PRETTY_NAME)

=== Versions ===
Node: $(node --version)
NPM: $(npm --version)
PostgreSQL: $(psql --version)
Nginx: $(nginx -v 2>&1)
PM2: $(pm2 --version)

=== Network ===
IP: $(curl -s ifconfig.me)

=== Disk Usage ===
$(df -h)

=== PM2 Processes ===
$(pm2 list)
EOF

echo -e "${GREEN}✓ Informações do sistema salvas${NC}"

# Create final bundle
echo ""
echo -e "${YELLOW}Criando bundle final para transferência...${NC}"
cd $BACKUP_DIR
tar -czf migration_bundle_${DATE}.tar.gz \
  fivapp_backup_${DATE}.sql \
  fivapp_backup_${DATE}.dump \
  fivconnect_app_${DATE}.tar.gz \
  fivconnect_uploads_${DATE}.tar.gz \
  nginx.conf.bak \
  env.bak \
  pm2_backup.json \
  system_info.txt

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  ✓ BACKUP CONCLUÍDO COM SUCESSO!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "Bundle de migração: ${GREEN}$BACKUP_DIR/migration_bundle_${DATE}.tar.gz${NC}"
echo -e "Tamanho: ${GREEN}$(ls -lh $BACKUP_DIR/migration_bundle_${DATE}.tar.gz | awk '{print $5}')${NC}"
echo ""
echo -e "${YELLOW}Próximos passos:${NC}"
echo -e "1. Transfira o bundle para a nova VPS:"
echo -e "   ${GREEN}scp $BACKUP_DIR/migration_bundle_${DATE}.tar.gz root@NEW_VPS_IP:/tmp/${NC}"
echo ""
echo -e "2. Na nova VPS, extraia o bundle:"
echo -e "   ${GREEN}cd /tmp && tar -xzf migration_bundle_${DATE}.tar.gz${NC}"
echo ""
echo -e "3. Execute o script de setup na nova VPS (AlmaLinux)"
echo ""
