# ✅ Checklist de Migração VPS

**De:** Debian (LuraHosting)
**Para:** AlmaLinux (HostGator)
**Data:** ___/___/2025
**Responsável:** _________________

---

## 📋 PRÉ-MIGRAÇÃO

### VPS Antiga (Debian)
- [ ] Acesso SSH funcionando
- [ ] Senha do PostgreSQL conhecida (`fivuser`)
- [ ] Aplicação rodando sem erros
- [ ] PM2 com processos salvos (`pm2 list`)
- [ ] Espaço em disco suficiente para backup (pelo menos 2GB livres)
- [ ] Verificar tamanho do banco: `SELECT pg_size_pretty(pg_database_size('fivapp'));`

### VPS Nova (AlmaLinux)
- [ ] VPS provisionada na HostGator
- [ ] IP da VPS nova anotado: `____________`
- [ ] Acesso root via SSH funcionando
- [ ] Firewall da HostGator configurado (portas 80, 443, 22, 3000)
- [ ] Espaço em disco suficiente (pelo menos 10GB livres)

### Documentação
- [ ] DOCUMENTATION.md atualizado
- [ ] Scripts de migração baixados
- [ ] Senhas e tokens em local seguro

---

## 🔒 FASE 1: BACKUP (VPS Antiga)

### Executar Script de Backup
```bash
cd /srv/apps/Fi.VApp-Replit/migration-scripts
chmod +x 1-backup-old-vps.sh
bash 1-backup-old-vps.sh
```

### Verificações
- [ ] Script executado sem erros
- [ ] Bundle criado em `/tmp/fivconnect_migration/migration_bundle_*.tar.gz`
- [ ] Tamanho do bundle anotado: `________ MB`
- [ ] Backup do banco (SQL + dump) criado
- [ ] Backup da aplicação criado
- [ ] Backup dos uploads criado
- [ ] Backup do .env criado
- [ ] Backup nginx.conf criado
- [ ] Arquivo system_info.txt criado

### Download Local (Opcional - Segurança Extra)
```bash
# No seu computador local
scp root@OLD_VPS_IP:/tmp/fivconnect_migration/migration_bundle_*.tar.gz ~/fivconnect_backup/
```
- [ ] Backup baixado localmente como segurança extra

---

## 📤 FASE 2: TRANSFERÊNCIA

### Método 1: SCP Direto (Recomendado)
```bash
# Na VPS ANTIGA
cd /tmp/fivconnect_migration
scp migration_bundle_*.tar.gz root@NEW_VPS_IP:/tmp/
```
- [ ] Transferência iniciada
- [ ] Transferência concluída sem erros
- [ ] Tempo de transferência: `________ minutos`

### Método 2: Via Computador Local (Se SCP falhar)
```bash
# Baixar da VPS antiga
scp root@OLD_VPS_IP:/tmp/fivconnect_migration/migration_bundle_*.tar.gz ~/Downloads/

# Enviar para VPS nova
scp ~/Downloads/migration_bundle_*.tar.gz root@NEW_VPS_IP:/tmp/
```
- [ ] Download da VPS antiga concluído
- [ ] Upload para VPS nova concluído

### Verificação
```bash
# Na VPS NOVA
ls -lh /tmp/migration_bundle_*.tar.gz
md5sum /tmp/migration_bundle_*.tar.gz
```
- [ ] Arquivo presente na VPS nova
- [ ] Tamanho correto (comparar com VPS antiga)
- [ ] MD5 checksum conferido (opcional)

---

## ⚙️ FASE 3: SETUP (VPS Nova)

### Baixar Scripts de Migração
```bash
# Na VPS NOVA
cd /tmp
git clone https://github.com/pedrogmoreira123/FivConnect-App.git
cp FivConnect-App/migration-scripts/*.sh .
chmod +x *.sh
```
- [ ] Scripts baixados
- [ ] Permissões de execução configuradas

### Executar Setup
```bash
sudo bash 2-setup-new-vps.sh
```
- [ ] Script iniciado
- [ ] AlmaLinux atualizado
- [ ] Node.js 22.x instalado: `node --version`
- [ ] PostgreSQL 16 instalado: `psql --version`
- [ ] Nginx instalado: `nginx -v`
- [ ] PM2 instalado: `pm2 --version`
- [ ] Firewall configurado: `sudo firewall-cmd --list-all`
- [ ] Banco de dados `fivapp` criado
- [ ] Usuário `fivuser` criado
- [ ] Script concluído sem erros

### Verificações Pós-Setup
```bash
# Verificar serviços
systemctl status postgresql-16
systemctl status nginx
systemctl status firewalld

# Testar conexão ao banco
psql -U fivuser -h localhost -d fivapp -c "\l"
```
- [ ] PostgreSQL rodando
- [ ] Nginx rodando
- [ ] Firewall rodando
- [ ] Conexão ao banco funcionando

---

## 📦 FASE 4: RESTORE (VPS Nova)

### Extrair Bundle
```bash
cd /tmp
tar -xzf migration_bundle_*.tar.gz
ls -la
```
- [ ] Bundle extraído
- [ ] Arquivos de backup visíveis

### Executar Restore
```bash
bash 3-restore-data.sh
```
- [ ] Script iniciado
- [ ] Banco de dados restaurado
- [ ] Número de usuários: `________`
- [ ] Número de conversas: `________`
- [ ] Aplicação extraída em `/srv/apps/Fi.VApp-Replit`
- [ ] Uploads restaurados
- [ ] `.env` restaurado
- [ ] `npm install` concluído
- [ ] `npm run build` concluído
- [ ] Diretório `dist/` criado

### Verificação do .env
```bash
nano /srv/apps/Fi.VApp-Replit/.env
```
**Verificar/Atualizar:**
- [ ] `DATABASE_URL` correto
- [ ] `MAIN_APP_URL` com IP/domínio novo
- [ ] `WEBSOCKET_URL` com IP/domínio novo
- [ ] `JWT_SECRET` preservado
- [ ] `WHAPI_PARTNER_TOKEN` preservado
- [ ] Todas as outras variáveis corretas

---

## 🚀 FASE 5: INICIAR APLICAÇÃO (VPS Nova)

### Iniciar PM2
```bash
cd /srv/apps/Fi.VApp-Replit
pm2 start ecosystem.config.cjs
pm2 logs 0 --lines 50
```
- [ ] PM2 iniciado
- [ ] Processo rodando: `pm2 list`
- [ ] Logs sem erros críticos
- [ ] Aplicação conectou ao banco de dados
- [ ] Porta 3000 escutando: `netstat -tlnp | grep 3000`

### Configurar Auto-start
```bash
pm2 save
pm2 startup
# Executar o comando sudo sugerido
```
- [ ] `pm2 save` executado
- [ ] `pm2 startup` configurado
- [ ] Comando sudo executado

### Teste Local (Porta 3000)
```bash
curl http://localhost:3000
```
- [ ] Resposta HTTP 200 OK
- [ ] HTML retornado

---

## 🔒 FASE 6: CONFIGURAR SSL (VPS Nova)

### Parar Nginx Temporariamente
```bash
sudo systemctl stop nginx
```
- [ ] Nginx parado

### Gerar Certificado
```bash
sudo certbot certonly --standalone -d app.fivconnect.net
```
- [ ] Certificado gerado com sucesso
- [ ] Arquivos em `/etc/letsencrypt/live/app.fivconnect.net/`

### Configurar Nginx
```bash
# Se não restaurou automaticamente, configurar manualmente
sudo nano /etc/nginx/nginx.conf
```
- [ ] `server_name app.fivconnect.net;`
- [ ] `ssl_certificate` apontando para `/etc/letsencrypt/live/app.fivconnect.net/fullchain.pem`
- [ ] `ssl_certificate_key` apontando para `/etc/letsencrypt/live/app.fivconnect.net/privkey.pem`
- [ ] Proxy pass para `http://127.0.0.1:3000`
- [ ] WebSocket `/socket.io/` configurado

### Testar e Iniciar
```bash
sudo nginx -t
sudo systemctl start nginx
sudo systemctl status nginx
```
- [ ] Configuração válida
- [ ] Nginx iniciado
- [ ] Sem erros nos logs

---

## 🧪 FASE 7: TESTES PRÉ-MIGRAÇÃO

### Teste 1: Via /etc/hosts (Seu Computador)
```bash
# Windows: C:\Windows\System32\drivers\etc\hosts
# Linux/Mac: /etc/hosts
# Adicionar linha:
NEW_VPS_IP app.fivconnect.net
```
- [ ] Linha adicionada ao hosts
- [ ] Abrir navegador: `https://app.fivconnect.net`
- [ ] Página carrega
- [ ] SSL válido (cadeado verde)

### Teste 2: Login
- [ ] Fazer login com usuário existente
- [ ] Dashboard carrega
- [ ] Dados aparecem corretamente

### Teste 3: Conversas
- [ ] Acessar `/conversations`
- [ ] Conversas antigas visíveis
- [ ] Mensagens carregam

### Teste 4: WhatsApp
- [ ] Conexões WhatsApp visíveis em `/whatsapp-settings`
- [ ] Status de conexão correto
- [ ] **NÃO RECONECTAR AINDA** (aguardar DNS)

### Teste 5: WebSocket
```bash
# Abrir console do navegador em app.fivconnect.net
# Verificar conexão Socket.IO
```
- [ ] WebSocket conectado
- [ ] Sem erros no console

### Teste 6: Uploads
- [ ] Fazer upload de arquivo teste
- [ ] Arquivo salvo
- [ ] Arquivo acessível via URL

### Teste 7: Relatórios
- [ ] Dashboard com métricas
- [ ] Relatórios carregam
- [ ] Gráficos funcionam

---

## 🌐 FASE 8: MIGRAÇÃO DNS (GO LIVE)

### Anotar IP Novo
```bash
# Na VPS NOVA
curl ifconfig.me
```
- IP da VPS Nova: `___.___.___.___`

### Atualizar DNS (Painel HostGator)
**Configuração:**
```
Tipo: A
Nome: app (ou @ se for domínio raiz)
Valor: [IP da VPS Nova]
TTL: 300 (5 minutos - temporário)
```
- [ ] DNS atualizado no painel
- [ ] Horário da alteração: `______:______`

### Aguardar Propagação
```bash
# Verificar propagação DNS
dig app.fivconnect.net
nslookup app.fivconnect.net 8.8.8.8
```
- [ ] Propagação iniciada
- [ ] Novo IP retornando (aguardar 5-30 minutos)

### Verificar Propagação Global
- [ ] Abrir: https://www.whatsmydns.net/#A/app.fivconnect.net
- [ ] Maioria dos servidores mostrando novo IP

### Remover Linha do /etc/hosts
- [ ] Remover linha temporária do arquivo hosts do seu PC
- [ ] Limpar cache DNS do navegador (Ctrl+Shift+Del)
- [ ] Limpar cache DNS do sistema:
  - **Windows:** `ipconfig /flushdns`
  - **Mac:** `sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder`
  - **Linux:** `sudo systemd-resolve --flush-caches`

### Teste Público
- [ ] Abrir `https://app.fivconnect.net` (sem /etc/hosts)
- [ ] Site carrega normalmente
- [ ] Login funciona
- [ ] Todos os testes anteriores OK

---

## 📱 FASE 9: RECONECTAR WHATSAPP (Pós-DNS)

### Desconectar WhatsApp da VPS Antiga
```bash
# Na VPS ANTIGA (se ainda ativa)
pm2 stop all
```
- [ ] PM2 parado na VPS antiga

### Reconectar WhatsApp na VPS Nova
- [ ] Acessar `/whatsapp-settings`
- [ ] Clicar em "Reconectar" nas conexões
- [ ] Escanear QR Code
- [ ] Status mudou para "Conectado"
- [ ] Enviar mensagem teste
- [ ] Receber mensagem teste

---

## 📊 FASE 10: MONITORAMENTO (Primeiras 24-48h)

### Logs
```bash
# PM2
pm2 logs 0

# Nginx
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log

# PostgreSQL
sudo journalctl -u postgresql-16 -f
```
- [ ] Monitoramento ativo
- [ ] Sem erros críticos

### Performance
```bash
# CPU e Memória
htop

# Disco
df -h

# Processos PM2
pm2 monit
```
- [ ] CPU < 80%
- [ ] RAM < 80%
- [ ] Disco < 70%
- [ ] PM2 sem restart loops

### Teste de Carga
- [ ] Enviar 10+ mensagens WhatsApp
- [ ] Abrir 5+ conversas simultaneamente
- [ ] Gerar relatório grande
- [ ] Sistema responde normalmente

---

## 🗑️ FASE 11: DESATIVAR VPS ANTIGA

### ⏰ Aguardar 7 Dias
- Data de início: `___/___/2025`
- Data para desativação: `___/___/2025`

### Verificações Antes de Cancelar
- [ ] VPS nova estável por 7+ dias
- [ ] Nenhum rollback necessário
- [ ] Todos os dados migrados corretamente
- [ ] Backup local do bundle (segurança)

### Desativar Serviços (VPS Antiga)
```bash
# Na VPS ANTIGA
pm2 stop all
pm2 delete all
sudo systemctl stop nginx
sudo systemctl stop postgresql
```
- [ ] PM2 parado
- [ ] Nginx parado
- [ ] PostgreSQL parado

### Cancelar Plano
- [ ] Abrir ticket na LuraHosting
- [ ] Solicitar cancelamento
- [ ] Confirmar não haverá cobranças futuras

---

## 🎉 MIGRAÇÃO CONCLUÍDA

### Checklist Final
- [ ] Aplicação rodando na VPS nova (AlmaLinux)
- [ ] DNS apontando para IP novo
- [ ] SSL válido e funcionando
- [ ] Banco de dados migrado (100% dos dados)
- [ ] Uploads migrados
- [ ] WhatsApp reconectado e funcionando
- [ ] Monitoramento OK por 7+ dias
- [ ] VPS antiga desativada
- [ ] DOCUMENTATION.md atualizado com novo IP
- [ ] Equipe notificada da migração

### Informações Finais
**VPS Nova:**
- Provider: HostGator
- OS: AlmaLinux
- IP: `___.___.___.___`
- Node.js: `________`
- PostgreSQL: `________`

**Data de Conclusão:** `___/___/2025`
**Downtime Total:** `________ minutos`
**Status:** ✅ **MIGRAÇÃO CONCLUÍDA COM SUCESSO**

---

## 🆘 ROLLBACK PLAN

Se algo der errado durante a migração:

### Passo 1: Reverter DNS
```
No painel HostGator/DNS:
Tipo: A
Nome: app
Valor: [IP da VPS ANTIGA]
TTL: 300
```
- Aguardar 5-10 minutos

### Passo 2: Reativar VPS Antiga
```bash
# Na VPS ANTIGA
pm2 start all
sudo systemctl start nginx
```

### Passo 3: Verificar
- Acessar app.fivconnect.net
- Verificar se voltou ao normal

### Passo 4: Investigar
- Analisar logs da VPS nova
- Identificar problema
- Corrigir offline
- Tentar novamente

---

**Assinaturas:**

Executado por: _________________ Data: ___/___/___

Verificado por: _________________ Data: ___/___/___
