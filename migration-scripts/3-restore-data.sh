#!/bin/bash
###############################################################################
# Script de Restore - VPS Nova (AlmaLinux - HostGator)
# Execute este script NA VPS NOVA após o setup inicial
# Restaura: Banco de Dados + Aplicação + Configurações
###############################################################################

set -e  # Exit on error

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  FivConnect - Restore Script${NC}"
echo -e "${GREEN}  VPS Nova (AlmaLinux)${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Variables
MIGRATION_DIR="/tmp"
APP_DIR="/srv/apps/Fi.VApp-Replit"
DB_NAME="fivapp"
DB_USER="fivuser"

# Find backup files
SQL_BACKUP=$(find $MIGRATION_DIR -name "fivapp_backup_*.sql" -type f | head -n 1)
DUMP_BACKUP=$(find $MIGRATION_DIR -name "fivapp_backup_*.dump" -type f | head -n 1)
APP_BACKUP=$(find $MIGRATION_DIR -name "fivconnect_app_*.tar.gz" -type f | head -n 1)
UPLOADS_BACKUP=$(find $MIGRATION_DIR -name "fivconnect_uploads_*.tar.gz" -type f | head -n 1)
ENV_BACKUP="$MIGRATION_DIR/env.bak"
NGINX_BACKUP="$MIGRATION_DIR/nginx.conf.bak"

echo -e "${BLUE}[INFO]${NC} Verificando arquivos de backup..."
echo ""

# Check required files
MISSING_FILES=()
[ -z "$SQL_BACKUP" ] && [ -z "$DUMP_BACKUP" ] && MISSING_FILES+=("Database backup (.sql or .dump)")
[ -z "$APP_BACKUP" ] && MISSING_FILES+=("Application backup (.tar.gz)")
[ ! -f "$ENV_BACKUP" ] && MISSING_FILES+=(".env file")

if [ ${#MISSING_FILES[@]} -gt 0 ]; then
  echo -e "${RED}✗ Arquivos de backup faltando:${NC}"
  for file in "${MISSING_FILES[@]}"; do
    echo -e "  - $file"
  done
  echo ""
  echo -e "${YELLOW}Verifique se o bundle foi extraído corretamente em $MIGRATION_DIR${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Todos os arquivos de backup encontrados${NC}"
echo ""

# ============================================================================
# PHASE 1: Restore Database
# ============================================================================
echo -e "${YELLOW}[1/6] Restaurando banco de dados...${NC}"

# Use dump format if available (faster)
if [ -n "$DUMP_BACKUP" ]; then
  echo -e "${BLUE}[INFO]${NC} Usando format dump (mais rápido)..."
  pg_restore -U $DB_USER -h localhost -d $DB_NAME "$DUMP_BACKUP" || {
    echo -e "${YELLOW}⚠ Dump restore falhou, tentando SQL...${NC}"
    if [ -n "$SQL_BACKUP" ]; then
      psql -U $DB_USER -h localhost $DB_NAME < "$SQL_BACKUP"
    else
      echo -e "${RED}✗ Nenhum backup disponível${NC}"
      exit 1
    fi
  }
elif [ -n "$SQL_BACKUP" ]; then
  echo -e "${BLUE}[INFO]${NC} Restaurando do SQL dump..."
  psql -U $DB_USER -h localhost $DB_NAME < "$SQL_BACKUP"
fi

echo -e "${GREEN}✓ Banco de dados restaurado${NC}"

# Verify database
USERS_COUNT=$(psql -U $DB_USER -h localhost $DB_NAME -t -c "SELECT COUNT(*) FROM users;" 2>/dev/null | xargs)
CONVS_COUNT=$(psql -U $DB_USER -h localhost $DB_NAME -t -c "SELECT COUNT(*) FROM conversations;" 2>/dev/null | xargs)
echo -e "${BLUE}[INFO]${NC} Verificação:"
echo -e "  - Usuários: ${GREEN}${USERS_COUNT}${NC}"
echo -e "  - Conversas: ${GREEN}${CONVS_COUNT}${NC}"

# ============================================================================
# PHASE 2: Create Application Directory
# ============================================================================
echo ""
echo -e "${YELLOW}[2/6] Criando estrutura de diretórios...${NC}"
mkdir -p /srv/apps
chown -R $(whoami):$(whoami) /srv/apps
echo -e "${GREEN}✓ Diretórios criados${NC}"

# ============================================================================
# PHASE 3: Restore Application
# ============================================================================
echo ""
echo -e "${YELLOW}[3/6] Restaurando aplicação...${NC}"
cd /srv/apps
tar -xzf "$APP_BACKUP"

if [ ! -d "$APP_DIR" ]; then
  echo -e "${RED}✗ Diretório da aplicação não encontrado após extração${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Aplicação extraída${NC}"

# ============================================================================
# PHASE 4: Restore Uploads
# ============================================================================
echo ""
echo -e "${YELLOW}[4/6] Restaurando uploads...${NC}"

if [ -f "$UPLOADS_BACKUP" ] && [ -s "$UPLOADS_BACKUP" ]; then
  mkdir -p $APP_DIR/public
  cd $APP_DIR/public
  tar -xzf "$UPLOADS_BACKUP"
  UPLOAD_COUNT=$(find $APP_DIR/public/uploads -type f 2>/dev/null | wc -l)
  echo -e "${GREEN}✓ Uploads restaurados ($UPLOAD_COUNT arquivos)${NC}"
else
  echo -e "${YELLOW}⚠ Nenhum upload para restaurar${NC}"
  mkdir -p $APP_DIR/public/uploads
fi

# ============================================================================
# PHASE 5: Restore Environment Variables
# ============================================================================
echo ""
echo -e "${YELLOW}[5/6] Restaurando variáveis de ambiente...${NC}"

cp "$ENV_BACKUP" "$APP_DIR/.env"
echo -e "${GREEN}✓ Arquivo .env restaurado${NC}"

echo ""
echo -e "${YELLOW}IMPORTANTE: Verifique o arquivo .env e atualize se necessário:${NC}"
echo -e "  ${GREEN}nano $APP_DIR/.env${NC}"
echo ""
read -p "Pressione ENTER para continuar..."

# ============================================================================
# PHASE 6: Install Dependencies and Build
# ============================================================================
echo ""
echo -e "${YELLOW}[6/6] Instalando dependências e build...${NC}"

cd $APP_DIR

# Install dependencies
echo -e "${BLUE}[INFO]${NC} Instalando dependências (isso pode demorar)..."
npm install

# Build application
echo -e "${BLUE}[INFO]${NC} Executando build..."
npm run build

# Verify dist directory
if [ -d "$APP_DIR/dist" ]; then
  DIST_SIZE=$(du -sh $APP_DIR/dist | awk '{print $1}')
  echo -e "${GREEN}✓ Build concluído ($DIST_SIZE)${NC}"
else
  echo -e "${RED}✗ Diretório dist não foi criado${NC}"
  exit 1
fi

# ============================================================================
# PHASE 7: Restore Nginx Configuration
# ============================================================================
echo ""
echo -e "${YELLOW}[BONUS] Restaurar configuração Nginx?${NC}"
read -p "Deseja copiar nginx.conf da VPS antiga? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  if [ -f "$NGINX_BACKUP" ]; then
    cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.original
    cp "$NGINX_BACKUP" /etc/nginx/nginx.conf

    # Test nginx config
    nginx -t && {
      echo -e "${GREEN}✓ Nginx configurado${NC}"
      systemctl reload nginx
    } || {
      echo -e "${RED}✗ Erro na configuração do Nginx${NC}"
      echo -e "${YELLOW}Restaurando backup original...${NC}"
      cp /etc/nginx/nginx.conf.original /etc/nginx/nginx.conf
    }
  else
    echo -e "${YELLOW}⚠ Backup do Nginx não encontrado${NC}"
  fi
fi

# ============================================================================
# Summary
# ============================================================================
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  ✓ RESTORE CONCLUÍDO COM SUCESSO!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}Próximos passos:${NC}"
echo ""
echo -e "1. ${YELLOW}Iniciar aplicação com PM2:${NC}"
echo -e "   ${GREEN}cd $APP_DIR${NC}"
echo -e "   ${GREEN}pm2 start ecosystem.config.cjs${NC}"
echo -e "   ${GREEN}pm2 save${NC}"
echo -e "   ${GREEN}pm2 startup${NC}  # Execute o comando sugerido"
echo ""
echo -e "2. ${YELLOW}Verificar logs:${NC}"
echo -e "   ${GREEN}pm2 logs 0${NC}"
echo ""
echo -e "3. ${YELLOW}Configurar SSL (Let's Encrypt):${NC}"
echo -e "   ${GREEN}systemctl stop nginx${NC}"
echo -e "   ${GREEN}certbot certonly --standalone -d app.fivconnect.net${NC}"
echo -e "   ${GREEN}systemctl start nginx${NC}"
echo ""
echo -e "4. ${YELLOW}Testar localmente (editar /etc/hosts no seu PC):${NC}"
echo -e "   ${GREEN}$(curl -s ifconfig.me) app.fivconnect.net${NC}"
echo ""
echo -e "5. ${YELLOW}Após testes OK, atualizar DNS:${NC}"
echo -e "   - Apontar app.fivconnect.net para: ${GREEN}$(curl -s ifconfig.me)${NC}"
echo ""
