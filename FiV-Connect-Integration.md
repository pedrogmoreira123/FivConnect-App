# Fi.V Connect - Documentação Completa da Integração

## Visão Geral

O Fi.V Connect é o sistema central de gerenciamento que controla todas as instâncias do Fi.V App. Esta documentação detalha a integração completa entre as duas plataformas, incluindo comunicação bidirecional, sincronização de dados e provisionamento automático de bancos de dados.

## Arquitetura da Integração

### 1. Comunicação Segura
- **Protocolo**: HTTPS obrigatório para todas as comunicações
- **Autenticação**: Chave de instância (`instance_key`) como token de segurança
- **Headers Obrigatórios**: 
  - `X-Instance-Key`: Chave única da instância
  - `Authorization`: Bearer token para autenticação
  - `Content-Type`: application/json

### 2. Fluxo de Dados
```
Fi.V App Instance ←→ Fi.V Connect Panel
     ↓                    ↓
  Local Database    Central Database
```

## Endpoints da API Fi.V Connect

### 1. Status da Instância
**Endpoint**: `GET /api/v1/instances/status`
**Função**: Verificar status, cobrança e recursos habilitados

**Resposta Exemplo**:
```json
{
  "instanceId": "client-abc-123",
  "status": "active",
  "billingStatus": "paid",
  "enabledFeatures": {
    "chat": true,
    "chatbot": true,
    "ai_agent": false
  }
}
```

### 2. Planos Disponíveis
**Endpoint**: `GET /api/v1/plans`
**Função**: Buscar todos os planos disponíveis

**Resposta Exemplo**:
```json
[
  {
    "id": "plan_starter",
    "name": "Starter",
    "description": "Basic plan for small businesses",
    "price": 2900,
    "currency": "BRL",
    "billingInterval": "monthly",
    "features": ["basic_chat", "email_support"],
    "maxUsers": 2,
    "maxConversations": 50,
    "storageLimit": 500,
    "isActive": true,
    "stripeProductId": "prod_starter",
    "stripePriceId": "price_starter"
  }
]
```

### 3. Bancos de Dados da Instância
**Endpoint**: `GET /api/v1/instances/:instanceId/databases`
**Função**: Buscar informações dos bancos de dados

**Resposta Exemplo**:
```json
[
  {
    "id": "db_client-abc-123_main",
    "name": "Main Database",
    "type": "postgresql",
    "host": "db.fiv-connect.com",
    "port": 5432,
    "database": "fivapp_client-abc-123",
    "status": "active",
    "created_at": "2025-01-01T00:00:00Z",
    "size_mb": 250,
    "connection_limit": 100,
    "backup_enabled": true,
    "last_backup": "2025-08-29T06:00:00Z"
  }
]
```

### 4. Relatório de Uso
**Endpoint**: `POST /api/v1/instances/:instanceId/usage`
**Função**: Receber dados de uso da instância

**Dados Enviados**:
```json
{
  "instanceId": "client-abc-123",
  "totalUsers": 5,
  "totalConversations": 150,
  "totalClients": 75,
  "totalQueues": 3,
  "activeConversations": 12,
  "environment": "production",
  "lastActivity": "2025-08-29T20:50:00Z",
  "features": {
    "chat": true,
    "chatbot": true,
    "ai_agent": false
  }
}
```

## Endpoints da API Fi.V App

### 1. Buscar Planos do Fi.V Connect
**Endpoint**: `GET /api/fiv-connect/plans`
**Acesso**: Apenas administradores
**Função**: Buscar planos disponíveis do Fi.V Connect

### 2. Buscar Bancos de Dados
**Endpoint**: `GET /api/fiv-connect/databases`
**Acesso**: Apenas administradores  
**Função**: Buscar informações dos bancos de dados da instância

### 3. Sincronizar Planos
**Endpoint**: `POST /api/fiv-connect/sync-plans`
**Acesso**: Apenas administradores
**Função**: Sincronizar planos locais com os do Fi.V Connect

### 4. Reportar Uso
**Endpoint**: `POST /api/fiv-connect/report-usage`
**Acesso**: Apenas administradores
**Função**: Enviar dados de uso para o Fi.V Connect

### 5. Configuração da Instância
**Endpoints**:
- `GET /api/instance/config` - Obter configuração atual
- `POST /api/instance/config` - Criar/atualizar configuração
- `POST /api/instance/check-status` - Verificação manual de status
- `GET /api/instance/status-logs` - Logs de verificação

## Sistema de Verificação de Status

### Serviço Automático
- **Frequência**: A cada 60 minutos (configurável)
- **Tipos de Verificação**: 
  - `startup`: Ao iniciar a aplicação
  - `scheduled`: Verificações periódicas
  - `manual`: Verificação manual via API

### Estados da Instância
1. **active**: Instância funcionando normalmente
2. **suspended**: Instância suspensa (acesso bloqueado)
3. **pending_payment**: Pagamento pendente (notificação mostrada)

### Status de Cobrança
1. **paid**: Pagamentos em dia
2. **overdue**: Pagamento em atraso

## Configuração de Ambiente

### Variáveis de Ambiente
```bash
# Fi.V Connect API Configuration
FIV_APP_API_URL=https://connect.fiv-app.com
FIV_APP_API_KEY=your_instance_key_here

# Environment Configuration
NODE_ENV=production  # ou development

# Database Configuration
DATABASE_URL=postgresql://user:password@host:port/database
```

### Configuração da Instância
```javascript
{
  "instanceId": "unique-instance-id",
  "instanceKey": "secret-api-key",
  "connectApiUrl": "https://connect.fiv-app.com",
  "status": "active",
  "billingStatus": "paid",
  "enabledFeatures": {
    "chat": true,
    "chatbot": true,
    "ai_agent": false
  },
  "checkIntervalMinutes": 60,
  "isLocked": false
}
```

## Scripts de Provisionamento

### 1. Script SQL para Criação de Banco
**Arquivo**: `database-setup-script.sql`
**Função**: Criar todas as tabelas necessárias para uma nova instância

**Uso**:
```sql
-- Execute no banco de dados da nova instância
\i database-setup-script.sql
```

### 2. Script de Configuração Automática
**Arquivo**: `setup-new-instance.js`
**Função**: Configurar automaticamente uma nova instância com dados iniciais

**Uso**:
```bash
node setup-new-instance.js \
  --database-url="postgresql://..." \
  --admin-email="admin@empresa.com" \
  --admin-password="senha123" \
  --company-name="Nome da Empresa"
```

**Resposta do Script**:
```json
{
  "success": true,
  "databaseSetup": true,
  "adminCredentials": {
    "email": "admin@empresa.com",
    "password": "senha123"
  },
  "companySettings": {
    "name": "Nome da Empresa"
  },
  "defaultQueues": ["Technical Support", "Sales"],
  "timestamp": "2025-08-29T20:50:00Z"
}
```

## Separação de Ambientes

### Sistema de Ambientes
- **Development**: Dados de teste e homologação
- **Production**: Dados reais dos clientes

### Funcionalidades
1. **Filtragem Automática**: Cada consulta filtra por ambiente atual
2. **Isolamento Completo**: Dados de teste nunca aparecem em produção
3. **Limpeza de Dados**: Endpoint para limpar dados de teste
4. **Configuração Dinâmica**: Ambiente determinado pela variável `NODE_ENV`

### Tabelas com Separação de Ambiente
- `users` - Usuários do sistema
- `clients` - Clientes/contatos
- `conversations` - Conversas
- `messages` - Mensagens
- `queues` - Filas de atendimento

### Script de Teste de Produção
**Arquivo**: `run-production-test.js`
**Função**: Testar aplicação em modo produção temporariamente

**Uso**:
```bash
node run-production-test.js
```

## Esquema do Banco de Dados

### Tabelas Principais

#### 1. Users
```sql
CREATE TABLE users (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  password text NOT NULL,
  role text NOT NULL DEFAULT 'agent',
  is_online boolean DEFAULT false,
  custom_theme json,
  environment text NOT NULL DEFAULT 'production',
  created_at timestamp DEFAULT now()
);
```

#### 2. Instance Config
```sql
CREATE TABLE instance_config (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id text NOT NULL,
  instance_key text NOT NULL,
  connect_api_url text NOT NULL,
  status text DEFAULT 'active',
  billing_status text DEFAULT 'paid',
  enabled_features json DEFAULT '{"chat": true, "chatbot": true, "ai_agent": false}',
  last_status_check timestamp,
  check_interval_minutes integer DEFAULT 60,
  is_locked boolean DEFAULT false,
  created_at timestamp DEFAULT now()
);
```

#### 3. Plans
```sql
CREATE TABLE plans (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  price integer NOT NULL,
  currency text NOT NULL DEFAULT 'BRL',
  billing_interval text NOT NULL,
  features json NOT NULL,
  max_users integer DEFAULT 1,
  max_conversations integer DEFAULT 100,
  storage_limit integer DEFAULT 1000,
  is_active boolean DEFAULT true,
  stripe_product_id text,
  stripe_price_id text,
  created_at timestamp DEFAULT now()
);
```

## Funcionalidades da Integração

### 1. Verificação Automática de Status
- Verifica status da instância a cada hora
- Bloqueia acesso se suspenso
- Mostra notificações de pagamento
- Registra logs de todas as verificações

### 2. Sincronização de Planos
- Busca planos atualizados do Fi.V Connect
- Sincroniza com banco local automaticamente
- Atualiza preços e recursos em tempo real

### 3. Relatórios de Uso
- Envia estatísticas de uso para Fi.V Connect
- Monitora atividade da instância
- Rastreia uso de recursos

### 4. Provisionamento Automático
- Cria bancos de dados automaticamente
- Configura usuário administrador
- Instala filas padrão
- Define configurações iniciais

## Logs e Monitoramento

### Logs de Verificação de Status
```sql
CREATE TABLE status_check_logs (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_config_id varchar NOT NULL,
  check_type text NOT NULL,
  success boolean NOT NULL,
  status_received text,
  error_message text,
  response_time integer,
  created_at timestamp DEFAULT now()
);
```

### Exemplos de Logs
```
🌍 Database Environment: development (NODE_ENV: development)
🚀 Starting Fi.V App database setup...
📧 Admin Email: admin@empresa.com
🏢 Company Name: Nome da Empresa
✅ Database tables created successfully
👤 Default admin user created
📋 Default queues created
⚙️ Default settings configured
🎉 Fi.V App database setup completed successfully!
```

## Configuração para Produção

### 1. Configurar Instância
```javascript
POST /api/instance/config
{
  "instanceId": "unique-client-id",
  "instanceKey": "secure-api-key",
  "connectApiUrl": "https://connect.fiv-app.com",
  "checkIntervalMinutes": 60
}
```

### 2. Configurar Ambiente de Produção
```javascript
POST /api/environment/setup-production
{
  "companyName": "Nome da Empresa",
  "adminEmail": "admin@empresa.com", 
  "adminPassword": "senha_segura_123"
}
```

### 3. Sincronizar Planos
```javascript
POST /api/fiv-connect/sync-plans
// Sincroniza automaticamente todos os planos do Fi.V Connect
```

## Segurança

### Chaves de API
- Armazenadas como variáveis de ambiente
- Nunca expostas nos logs
- Validadas a cada requisição
- Criptografadas no banco de dados

### Controle de Acesso
- Apenas administradores podem acessar endpoints de integração
- Verificação de token JWT obrigatória
- Logs de todas as operações sensíveis

### Ambiente Isolado
- Desenvolvimento e produção completamente separados
- Impossível misturar dados entre ambientes
- Limpeza automática de dados de teste

## Troubleshooting

### Problemas Comuns

#### 1. "Instance not configured"
**Causa**: Configuração da instância não foi criada
**Solução**: Configurar via `POST /api/instance/config`

#### 2. "Missing instance key"
**Causa**: Header `X-Instance-Key` ausente
**Solução**: Configurar variável `FIV_APP_API_KEY`

#### 3. "Authorization token required"
**Causa**: Token JWT inválido ou expirado
**Solução**: Fazer login novamente para obter novo token

#### 4. "Fi.V Connect API returned 500"
**Causa**: Erro no servidor Fi.V Connect
**Solução**: Verificar logs e status do Fi.V Connect

### Comandos de Diagnóstico

```bash
# Verificar status da instância
curl -H "X-Instance-Key: sua_chave" \
     -H "Authorization: Bearer sua_chave" \
     https://connect.fiv-app.com/api/v1/instances/status

# Testar conectividade
curl -H "X-Instance-Key: sua_chave" \
     https://connect.fiv-app.com/api/v1/plans

# Verificar logs locais
curl -H "Authorization: Bearer jwt_token" \
     http://localhost:5000/api/instance/status-logs
```

## Planos Disponíveis

### Starter - R$ 29,00/mês
- 2 usuários máximo
- 50 conversas máximo
- 500 MB de armazenamento
- Chat básico
- Suporte por email

### Professional - R$ 99,00/mês
- 10 usuários máximo
- 500 conversas máximo
- 5 GB de armazenamento
- Chat avançado
- Chatbot com IA
- Suporte prioritário
- Analytics

### Enterprise - R$ 299,00/mês
- 50 usuários máximo
- 2000 conversas máximo
- 20 GB de armazenamento
- Chat completo
- Agente IA avançado
- Integração WhatsApp
- Marca personalizada
- Suporte 24/7

## Estrutura dos Arquivos

### Scripts de Provisionamento
- `database-setup-script.sql` - Script SQL para criação de banco
- `setup-new-instance.js` - Script Node.js para configuração automática
- `run-production-test.js` - Script para testar em modo produção

### Arquivos de Configuração
- `server/routes.ts` - Endpoints da API
- `server/storage.ts` - Interface de armazenamento
- `server/status-check-service.ts` - Serviço de verificação de status
- `shared/schema.ts` - Esquema do banco de dados

### Variáveis de Ambiente
```bash
# Obrigatórias para integração
FIV_APP_API_URL=https://connect.fiv-app.com
FIV_APP_API_KEY=instance_key_from_fiv_connect

# Configuração do banco
DATABASE_URL=postgresql://...

# Ambiente da aplicação  
NODE_ENV=production
```

## Processo de Deploy

### 1. Para Nova Instância
1. Execute o script de setup: `node setup-new-instance.js`
2. Configure as variáveis de ambiente
3. Configure a instância via API
4. Sincronize os planos
5. Inicie a aplicação

### 2. Para Instância Existente
1. Configure as variáveis `FIV_APP_API_URL` e `FIV_APP_API_KEY`
2. Execute `POST /api/instance/config` com os dados da instância
3. Execute `POST /api/fiv-connect/sync-plans` para sincronizar planos
4. Verifique se o status check está funcionando

## Cronograma de Verificações

### Verificação de Startup
- Executada ao iniciar a aplicação
- Verifica se a instância está ativa
- Bloqueia acesso se suspensa

### Verificações Periódicas
- A cada 60 minutos por padrão
- Configurable via `checkIntervalMinutes`
- Logs de todas as verificações mantidos

### Verificação Manual
- Via endpoint `/api/instance/check-status`
- Útil para diagnósticos
- Resposta imediata do status atual

## Monitoramento e Alertas

### Logs Estruturados
Todos os logs incluem:
- Timestamp
- Tipo de operação
- Status de sucesso/erro
- Tempo de resposta
- Dados recebidos

### Alertas Automáticos
- ⚠️ Instância suspensa
- 💰 Pagamento pendente
- ❌ Falha na comunicação
- ✅ Status verificado com sucesso

## Considerações de Segurança

### Proteção de Dados
- Senhas sempre criptografadas (bcrypt)
- Tokens JWT com expiração
- Chaves de API nunca expostas em logs
- HTTPS obrigatório para comunicação

### Isolamento
- Ambientes completamente isolados
- Dados de teste não vazam para produção
- Usuários só veem dados do seu ambiente

### Auditoria
- Logs completos de todas as operações
- Rastreamento de mudanças
- Histórico de verificações de status

## Conclusão

Esta integração garante que:
1. **Dados de teste não aparecem em produção**
2. **Comunicação segura entre plataformas**
3. **Provisionamento automático de novas instâncias**
4. **Sincronização de planos e configurações**
5. **Monitoramento contínuo de status**
6. **Separação completa de ambientes**

O sistema está pronto para uso em produção com todas as funcionalidades de integração ativas.