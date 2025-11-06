# 🚀 Scripts de Migração VPS - FivConnect

Scripts automatizados para migração completa do FivConnect de **Debian (LuraHosting)** para **AlmaLinux (HostGator)**.

---

## 📋 Visão Geral

Este pacote contém scripts bash que automatizam a migração completa da aplicação entre VPS, incluindo:
- ✅ Backup completo (banco de dados, aplicação, configurações)
- ✅ Transferência segura de dados
- ✅ Setup automatizado da nova VPS
- ✅ Restore completo dos dados
- ✅ Checklist detalhado

---

## 📂 Arquivos

| Arquivo | Descrição | Executar em |
|---------|-----------|-------------|
| `1-backup-old-vps.sh` | Cria backup completo | VPS Antiga (Debian) |
| `2-setup-new-vps.sh` | Instala dependências | VPS Nova (AlmaLinux) |
| `3-restore-data.sh` | Restaura dados | VPS Nova (AlmaLinux) |
| `MIGRATION-CHECKLIST.md` | Checklist passo-a-passo | Documentação |
| `README.md` | Este arquivo | Documentação |

---

## 🎯 Pré-requisitos

### VPS Antiga (Debian)
- ✅ Acesso SSH root
- ✅ PostgreSQL rodando
- ✅ Aplicação funcionando (PM2)
- ✅ Pelo menos 2GB de espaço livre

### VPS Nova (AlmaLinux)
- ✅ VPS provisionada na HostGator
- ✅ Acesso SSH root
- ✅ Sistema limpo (recém-instalado)
- ✅ Pelo menos 10GB de espaço livre

### Seu Computador
- ✅ Acesso SSH às duas VPS
- ✅ Cliente SCP instalado
- ✅ Tempo estimado: 2-4 horas

---

## 🔢 Ordem de Execução

### PASSO 1️⃣: Backup (VPS Antiga)

Execute na **VPS Antiga** (Debian):

```bash
# 1. Acessar VPS antiga
ssh root@OLD_VPS_IP

# 2. Baixar scripts
cd /srv/apps/Fi.VApp-Replit/migration-scripts

# 3. Dar permissão de execução
chmod +x 1-backup-old-vps.sh

# 4. Executar backup
bash 1-backup-old-vps.sh
```

**O que faz:**
- Faz dump do banco PostgreSQL (2 formatos: `.sql` e `.dump`)
- Comprime aplicação (excluindo `node_modules` e `dist`)
- Comprime uploads separadamente
- Salva `.env`, `nginx.conf`, configurações PM2
- Gera informações do sistema
- Cria bundle único: `migration_bundle_YYYYMMDD_HHMMSS.tar.gz`

**Resultado:**
```
/tmp/fivconnect_migration/
└── migration_bundle_20251106_143022.tar.gz  (~500MB - 2GB)
```

---

### PASSO 2️⃣: Transferência

Transfira o bundle da VPS antiga para a nova:

#### Método A: SCP Direto (Recomendado)

```bash
# Na VPS ANTIGA
cd /tmp/fivconnect_migration
scp migration_bundle_*.tar.gz root@NEW_VPS_IP:/tmp/
```

#### Método B: Via Computador Local (Se SCP falhar)

```bash
# No seu COMPUTADOR
# Download da VPS antiga
scp root@OLD_VPS_IP:/tmp/fivconnect_migration/migration_bundle_*.tar.gz ~/Downloads/

# Upload para VPS nova
scp ~/Downloads/migration_bundle_*.tar.gz root@NEW_VPS_IP:/tmp/
```

**Verifique na VPS Nova:**
```bash
ssh root@NEW_VPS_IP
ls -lh /tmp/migration_bundle_*.tar.gz
```

---

### PASSO 3️⃣: Setup (VPS Nova)

Execute na **VPS Nova** (AlmaLinux):

```bash
# 1. Acessar VPS nova
ssh root@NEW_VPS_IP

# 2. Baixar scripts (via Git)
cd /tmp
git clone https://github.com/pedrogmoreira123/FivConnect-App.git
cp FivConnect-App/migration-scripts/*.sh .
chmod +x *.sh

# 3. Executar setup
sudo bash 2-setup-new-vps.sh
```

**O que faz:**
- ✅ Atualiza AlmaLinux (`dnf update`)
- ✅ Instala Node.js 22.x (via NodeSource)
- ✅ Instala PostgreSQL 16
- ✅ Instala Nginx
- ✅ Instala Certbot (Let's Encrypt)
- ✅ Configura firewall (firewalld)
- ✅ Instala PM2 globalmente
- ✅ Cria usuário e banco de dados PostgreSQL
- ✅ Detecta bundle de migração (se presente)

**Tempo estimado:** 10-15 minutos

**Serviços instalados:**
- Node.js 22.x
- PostgreSQL 16
- Nginx
- PM2
- Certbot

---

### PASSO 4️⃣: Restore (VPS Nova)

Execute na **VPS Nova** após o setup:

```bash
# Extrair bundle (se não foi feito automaticamente)
cd /tmp
tar -xzf migration_bundle_*.tar.gz

# Executar restore
bash 3-restore-data.sh
```

**O que faz:**
- ✅ Restaura banco de dados PostgreSQL
- ✅ Cria estrutura `/srv/apps/Fi.VApp-Replit`
- ✅ Extrai aplicação
- ✅ Restaura uploads
- ✅ Restaura `.env`
- ✅ Executa `npm install`
- ✅ Executa `npm run build`
- ✅ (Opcional) Restaura `nginx.conf`

**Tempo estimado:** 15-30 minutos (depende do tamanho)

**Verificações automáticas:**
- Contagem de usuários no banco
- Contagem de conversas
- Número de arquivos em uploads
- Tamanho do build (`dist/`)

---

### PASSO 5️⃣: Iniciar Aplicação (VPS Nova)

```bash
cd /srv/apps/Fi.VApp-Replit

# Iniciar com PM2
pm2 start ecosystem.config.cjs

# Verificar logs
pm2 logs 0 --lines 50

# Salvar configuração
pm2 save

# Configurar auto-start
pm2 startup
# Executar o comando sudo sugerido
```

---

### PASSO 6️⃣: Configurar SSL (VPS Nova)

```bash
# Parar Nginx
sudo systemctl stop nginx

# Gerar certificado Let's Encrypt
sudo certbot certonly --standalone -d app.fivconnect.net

# Iniciar Nginx
sudo systemctl start nginx

# Verificar
curl -I https://localhost
```

---

### PASSO 7️⃣: Testar Localmente

**No seu computador**, edite o arquivo `hosts`:

- **Windows:** `C:\Windows\System32\drivers\etc\hosts`
- **Mac/Linux:** `/etc/hosts`

Adicione a linha (substitua `NEW_VPS_IP`):
```
NEW_VPS_IP app.fivconnect.net
```

**Teste no navegador:**
1. Abrir: `https://app.fivconnect.net`
2. Fazer login
3. Acessar conversas
4. Verificar uploads
5. Testar dashboard

**Se tudo OK, prossiga para o DNS.**

---

### PASSO 8️⃣: Atualizar DNS (GO LIVE)

**No painel da HostGator (DNS):**

```
Tipo: A
Nome: app
Valor: [IP da VPS Nova]
TTL: 300 (5 minutos)
```

**Aguardar propagação (5-30 minutos):**
```bash
# Verificar
dig app.fivconnect.net
nslookup app.fivconnect.net 8.8.8.8
```

**Verificar globalmente:**
- https://www.whatsmydns.net/#A/app.fivconnect.net

**Remover linha do /etc/hosts** e testar novamente.

---

## ✅ Verificações de Sucesso

### VPS Nova - Checklist Rápido

```bash
# 1. Serviços ativos
systemctl is-active postgresql-16  # Deve retornar: active
systemctl is-active nginx           # Deve retornar: active
pm2 list                            # Deve mostrar fiv-backend online

# 2. Portas escutando
sudo ss -tlnp | grep :80            # Nginx HTTP
sudo ss -tlnp | grep :443           # Nginx HTTPS
sudo ss -tlnp | grep :3000          # Node.js/Express
sudo ss -tlnp | grep :5432          # PostgreSQL

# 3. Banco de dados
psql -U fivuser -h localhost fivapp -c "SELECT COUNT(*) FROM users;"
psql -U fivuser -h localhost fivapp -c "SELECT COUNT(*) FROM conversations;"

# 4. Arquivos
ls -la /srv/apps/Fi.VApp-Replit/dist/
ls -la /srv/apps/Fi.VApp-Replit/public/uploads/

# 5. Logs sem erros
pm2 logs 0 --lines 20
sudo tail -20 /var/log/nginx/error.log

# 6. Teste HTTP local
curl -I http://localhost:3000  # Deve retornar 200 ou 301
curl -I https://localhost       # Deve retornar 200
```

**Tudo OK? ✅ Migração concluída!**

---

## 🆘 Troubleshooting

### Problema 1: "pg_dump: command not found"

**Solução:**
```bash
# VPS Antiga (Debian)
export PATH=$PATH:/usr/lib/postgresql/14/bin
# Ou instalar: sudo apt install postgresql-client
```

### Problema 2: "Permission denied" ao restaurar banco

**Solução:**
```bash
# VPS Nova
# Editar pg_hba.conf
sudo nano /var/lib/pgsql/16/data/pg_hba.conf

# Adicionar ANTES das outras linhas:
local   all   fivuser   md5
host    all   fivuser   127.0.0.1/32   md5

# Reiniciar PostgreSQL
sudo systemctl restart postgresql-16
```

### Problema 3: Nginx não inicia após restore

**Solução:**
```bash
# Testar configuração
sudo nginx -t

# Verificar erro específico
sudo journalctl -u nginx -n 50

# Restaurar config original se necessário
sudo cp /etc/nginx/nginx.conf.original /etc/nginx/nginx.conf
sudo nginx -t
sudo systemctl start nginx
```

### Problema 4: PM2 não inicia a aplicação

**Solução:**
```bash
# Verificar logs
pm2 logs 0 --err

# Testar manualmente
cd /srv/apps/Fi.VApp-Replit
node dist/index.js

# Verificar .env
nano .env  # Conferir DATABASE_URL

# Testar conexão ao banco
psql -U fivuser -h localhost fivapp -c "SELECT 1;"
```

### Problema 5: SSL "Standalone bind failed"

**Causa:** Porta 80/443 já em uso pelo Nginx

**Solução:**
```bash
# Parar Nginx ANTES de gerar SSL
sudo systemctl stop nginx

# Gerar certificado
sudo certbot certonly --standalone -d app.fivconnect.net

# Iniciar Nginx DEPOIS
sudo systemctl start nginx
```

### Problema 6: Transferência SCP muito lenta

**Soluções:**
- Usar compressão: `scp -C bundle.tar.gz root@NEW_VPS_IP:/tmp/`
- Usar rsync: `rsync -avz -e ssh bundle.tar.gz root@NEW_VPS_IP:/tmp/`
- Transferir via computador local (método B)
- Usar screen/tmux para manter sessão ativa

### Problema 7: SELinux bloqueando (AlmaLinux)

**Solução Temporária:**
```bash
sudo setenforce 0  # Desabilitar temporariamente
```

**Solução Permanente:**
```bash
sudo nano /etc/selinux/config
# Alterar: SELINUX=disabled
sudo reboot
```

---

## 📊 Estatísticas Típicas

| Métrica | Valor Estimado |
|---------|----------------|
| Tamanho do backup | 500MB - 2GB |
| Tempo de backup | 5-10 min |
| Tempo de transferência | 10-30 min |
| Tempo de setup VPS nova | 10-15 min |
| Tempo de restore | 15-30 min |
| Tempo de build npm | 5-10 min |
| **Total (sem DNS)** | **45-95 min** |
| Tempo de propagação DNS | 5-30 min |
| **TOTAL COMPLETO** | **50-125 min** |

---

## 🔒 Rollback Plan

Se algo der errado:

### Passo 1: Reverter DNS
No painel HostGator, mudar IP do registro A de volta para VPS antiga.

### Passo 2: Reativar VPS Antiga
```bash
ssh root@OLD_VPS_IP
pm2 start all
sudo systemctl start nginx
```

### Passo 3: Aguardar propagação DNS (5-10 min)

### Passo 4: Site volta ao normal ✅

**Depois, investigue o problema offline na VPS nova.**

---

## 📞 Suporte

- **Documentação completa:** [DOCUMENTATION.md](../DOCUMENTATION.md)
- **Checklist detalhado:** [MIGRATION-CHECKLIST.md](./MIGRATION-CHECKLIST.md)
- **Repositório:** https://github.com/pedrogmoreira123/FivConnect-App
- **Issues:** https://github.com/pedrogmoreira123/FivConnect-App/issues

---

## 📝 Notas Importantes

### Diferenças Debian vs AlmaLinux

| Aspecto | Debian | AlmaLinux |
|---------|--------|-----------|
| Package Manager | `apt` | `dnf` |
| Firewall | `ufw` | `firewalld` |
| PostgreSQL paths | `/etc/postgresql/` | `/var/lib/pgsql/16/` |
| SELinux | Disabled | **Enabled** |
| Init system | systemd | systemd |

### Comandos Equivalentes

| Debian (apt) | AlmaLinux (dnf) |
|-------------|-----------------|
| `apt update` | `dnf update` |
| `apt install pkg` | `dnf install pkg` |
| `apt remove pkg` | `dnf remove pkg` |
| `apt search pkg` | `dnf search pkg` |

### Firewall

| Debian (ufw) | AlmaLinux (firewalld) |
|--------------|------------------------|
| `ufw allow 80` | `firewall-cmd --permanent --add-service=http && firewall-cmd --reload` |
| `ufw enable` | `systemctl start firewalld` |
| `ufw status` | `firewall-cmd --list-all` |

---

## 📄 Licença

Scripts de migração desenvolvidos para FivConnect.
© 2025 FivConnect - Todos os direitos reservados.

---

## ✨ Changelog

### v1.0.0 (06/11/2025)
- ✅ Script inicial de backup
- ✅ Script de setup AlmaLinux
- ✅ Script de restore
- ✅ Checklist completo
- ✅ Documentação README
- ✅ Suporte para PostgreSQL 16
- ✅ Suporte para Node.js 22.x
- ✅ Configuração automática de firewall
- ✅ Detecção automática de bundle

---

**Boa migração! 🚀**

Se encontrar problemas, consulte o [MIGRATION-CHECKLIST.md](./MIGRATION-CHECKLIST.md) ou abra uma issue no GitHub.
