#!/bin/bash
###############################################################################
# Script de Setup - VPS Nova (AlmaLinux - HostGator)
# Execute este script NA VPS NOVA após receber o bundle de backup
###############################################################################

set -e  # Exit on error

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  FivConnect - Setup Script${NC}"
echo -e "${GREEN}  VPS Nova (AlmaLinux)${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}✗ Este script deve ser executado como root${NC}"
  echo -e "Execute: ${YELLOW}sudo bash 2-setup-new-vps.sh${NC}"
  exit 1
fi

# Variables
MIGRATION_DIR="/tmp"
APP_DIR="/srv/apps/Fi.VApp-Replit"
DB_NAME="fivapp"
DB_USER="fivuser"
DB_PASS="FiVApp"

echo -e "${BLUE}[INFO]${NC} Este script irá:"
echo "  1. Atualizar o sistema AlmaLinux"
echo "  2. Instalar Node.js 22.x"
echo "  3. Instalar PostgreSQL 16"
echo "  4. Instalar Nginx"
echo "  5. Configurar firewall"
echo "  6. Restaurar banco de dados"
echo "  7. Restaurar aplicação"
echo "  8. Configurar PM2"
echo ""
read -p "Deseja continuar? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
fi

# ============================================================================
# PHASE 1: System Update
# ============================================================================
echo ""
echo -e "${YELLOW}[1/10] Atualizando sistema AlmaLinux...${NC}"
dnf update -y
dnf install -y epel-release
echo -e "${GREEN}✓ Sistema atualizado${NC}"

# ============================================================================
# PHASE 2: Install Node.js 22.x
# ============================================================================
echo ""
echo -e "${YELLOW}[2/10] Instalando Node.js 22.x...${NC}"
curl -fsSL https://rpm.nodesource.com/setup_22.x | bash -
dnf install -y nodejs
echo -e "${GREEN}✓ Node.js instalado: $(node --version)${NC}"

# ============================================================================
# PHASE 3: Install Build Tools
# ============================================================================
echo ""
echo -e "${YELLOW}[3/10] Instalando ferramentas de build...${NC}"
dnf groupinstall -y "Development Tools"
dnf install -y git wget curl
echo -e "${GREEN}✓ Build tools instalados${NC}"

# ============================================================================
# PHASE 4: Install PostgreSQL 16
# ============================================================================
echo ""
echo -e "${YELLOW}[4/10] Instalando PostgreSQL 16...${NC}"

# Add PostgreSQL repository
dnf install -y https://download.postgresql.org/pub/repos/yum/reporpms/EL-9-x86_64/pgdg-redhat-repo-latest.noarch.rpm

# Disable built-in PostgreSQL module
dnf -qy module disable postgresql

# Install PostgreSQL 16
dnf install -y postgresql16-server postgresql16

# Initialize database
/usr/pgsql-16/bin/postgresql-16-setup initdb

# Enable and start
systemctl enable postgresql-16
systemctl start postgresql-16

echo -e "${GREEN}✓ PostgreSQL 16 instalado e iniciado${NC}"

# ============================================================================
# PHASE 5: Configure PostgreSQL
# ============================================================================
echo ""
echo -e "${YELLOW}[5/10] Configurando PostgreSQL...${NC}"

# Create user and database
sudo -u postgres psql << EOF
-- Create user
CREATE USER $DB_USER WITH PASSWORD '$DB_PASS';

-- Create database
CREATE DATABASE $DB_NAME OWNER $DB_USER;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;

-- Exit
\q
EOF

# Configure authentication
PG_HBA="/var/lib/pgsql/16/data/pg_hba.conf"
if ! grep -q "# FivConnect migration" "$PG_HBA"; then
  sed -i '/^# TYPE/a # FivConnect migration\nlocal   all   fivuser   md5\nhost    all   fivuser   127.0.0.1/32   md5' "$PG_HBA"
  systemctl restart postgresql-16
  echo -e "${GREEN}✓ PostgreSQL configurado${NC}"
else
  echo -e "${YELLOW}⚠ PostgreSQL já configurado${NC}"
fi

# ============================================================================
# PHASE 6: Install Nginx
# ============================================================================
echo ""
echo -e "${YELLOW}[6/10] Instalando Nginx...${NC}"
dnf install -y nginx
systemctl enable nginx
systemctl start nginx
echo -e "${GREEN}✓ Nginx instalado e iniciado${NC}"

# ============================================================================
# PHASE 7: Install Certbot
# ============================================================================
echo ""
echo -e "${YELLOW}[7/10] Instalando Certbot...${NC}"
dnf install -y certbot python3-certbot-nginx
echo -e "${GREEN}✓ Certbot instalado${NC}"

# ============================================================================
# PHASE 8: Configure Firewall
# ============================================================================
echo ""
echo -e "${YELLOW}[8/10] Configurando firewall...${NC}"
systemctl enable firewalld
systemctl start firewalld

firewall-cmd --permanent --add-service=http
firewall-cmd --permanent --add-service=https
firewall-cmd --permanent --add-service=ssh
firewall-cmd --permanent --add-port=3000/tcp
firewall-cmd --reload

echo -e "${GREEN}✓ Firewall configurado${NC}"
firewall-cmd --list-all

# ============================================================================
# PHASE 9: Install PM2
# ============================================================================
echo ""
echo -e "${YELLOW}[9/10] Instalando PM2...${NC}"
npm install -g pm2
echo -e "${GREEN}✓ PM2 instalado: $(pm2 --version)${NC}"

# ============================================================================
# PHASE 10: Check for migration bundle
# ============================================================================
echo ""
echo -e "${YELLOW}[10/10] Verificando bundle de migração...${NC}"

# Find migration bundle
BUNDLE=$(find $MIGRATION_DIR -name "migration_bundle_*.tar.gz" -type f 2>/dev/null | head -n 1)

if [ -z "$BUNDLE" ]; then
  echo -e "${YELLOW}⚠ Bundle de migração não encontrado em $MIGRATION_DIR${NC}"
  echo ""
  echo -e "${BLUE}Próximos passos MANUAIS:${NC}"
  echo -e "1. Transfira o bundle da VPS antiga:"
  echo -e "   ${GREEN}scp root@OLD_VPS_IP:/tmp/fivconnect_migration/migration_bundle_*.tar.gz /tmp/${NC}"
  echo ""
  echo -e "2. Execute o script de restore:"
  echo -e "   ${GREEN}bash 3-restore-data.sh${NC}"
else
  echo -e "${GREEN}✓ Bundle encontrado: $BUNDLE${NC}"

  # Extract bundle
  echo -e "${YELLOW}Extraindo bundle...${NC}"
  cd $MIGRATION_DIR
  tar -xzf "$BUNDLE"
  echo -e "${GREEN}✓ Bundle extraído${NC}"

  echo ""
  echo -e "${BLUE}Próximo passo:${NC}"
  echo -e "Execute o script de restore:"
  echo -e "   ${GREEN}bash 3-restore-data.sh${NC}"
fi

# ============================================================================
# Summary
# ============================================================================
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  ✓ SETUP CONCLUÍDO COM SUCESSO!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}Versões instaladas:${NC}"
echo -e "  Node.js: ${GREEN}$(node --version)${NC}"
echo -e "  NPM: ${GREEN}$(npm --version)${NC}"
echo -e "  PostgreSQL: ${GREEN}$(psql --version | awk '{print $3}')${NC}"
echo -e "  Nginx: ${GREEN}$(nginx -v 2>&1 | awk '{print $3}')${NC}"
echo -e "  PM2: ${GREEN}$(pm2 --version)${NC}"
echo ""
echo -e "${BLUE}Serviços rodando:${NC}"
systemctl is-active postgresql-16 && echo -e "  PostgreSQL: ${GREEN}✓ Ativo${NC}" || echo -e "  PostgreSQL: ${RED}✗ Inativo${NC}"
systemctl is-active nginx && echo -e "  Nginx: ${GREEN}✓ Ativo${NC}" || echo -e "  Nginx: ${RED}✗ Inativo${NC}"
systemctl is-active firewalld && echo -e "  Firewalld: ${GREEN}✓ Ativo${NC}" || echo -e "  Firewalld: ${RED}✗ Inativo${NC}"
echo ""
