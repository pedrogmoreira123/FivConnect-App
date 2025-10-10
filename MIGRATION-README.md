# Migração Evolution API → Whapi.Cloud

Este documento descreve a migração completa do Evolution API para Whapi.Cloud no projeto FivConnect.

## ✅ Implementações Concluídas

### 1. Providers / Engine Abstração
- ✅ Interface `IWhatsappProvider` criada
- ✅ Adapter `WhapiAdapter` implementado
- ✅ Suporte a envio de texto e mídia
- ✅ Gerenciamento de status e desconexão
- ✅ Configuração de webhook

### 2. Banco de Dados
- ✅ Migration Drizzle para tabela `channels`
- ✅ Criptografia de tokens com AES-256-GCM
- ✅ Suporte multi-tenant por `owner_id`
- ✅ Campos para provider, status e metadados

### 3. Webhooks
- ✅ Rota `POST /api/webhooks/whapi`
- ✅ Validação de assinatura HMAC-SHA256
- ✅ Normalização de payload para formato interno
- ✅ Enfileiramento de mensagens recebidas

### 4. Filas e Workers
- ✅ Configuração BullMQ com Redis
- ✅ Worker para mensagens de saída
- ✅ Worker para mensagens de entrada
- ✅ Worker para processamento de mídia
- ✅ Rate limiting por número de telefone
- ✅ Retry com exponential backoff

### 5. Observabilidade
- ✅ Logs estruturados com Pino
- ✅ Métricas Prometheus
- ✅ Health check endpoints
- ✅ Monitoramento de filas e channels

### 6. Migração Evolution → Whapi
- ✅ Substituição completa da engine
- ✅ Manutenção de compatibilidade com API existente
- ✅ Configuração via variáveis de ambiente
- ✅ Suporte a múltiplos providers

### 7. Testes
- ✅ Testes unitários para WhapiAdapter
- ✅ Testes para rotas de webhook
- ✅ Testes para serviço de criptografia
- ✅ Configuração Jest com TypeScript
- ✅ GitHub Actions para CI/CD

### 8. Documentação
- ✅ Documentação completa de integração
- ✅ Guia de configuração
- ✅ Exemplos de uso da API
- ✅ Troubleshooting e suporte

## 🚀 Como Usar

### 1. Configuração Inicial

```bash
# Instalar dependências
npm install

# Configurar variáveis de ambiente
cp .env.example .env
# Editar .env com suas configurações

# Aplicar migrations
npm run db:migrate

# Iniciar servidor
npm run dev
```

### 2. Criar Channel Whapi

```bash
curl -X POST http://localhost:5000/api/channels \
  -H "Content-Type: application/json" \
  -d '{
    "providerName": "whapi",
    "token": "seu-token-whapi",
    "phoneNumber": "+5511999999999"
  }'
```

### 3. Enviar Mensagem de Teste

```bash
curl -X POST http://localhost:5000/api/channels/{channelId}/send-test \
  -H "Content-Type: application/json" \
  -d '{
    "to": "+5511888888888",
    "message": "Olá! Esta é uma mensagem de teste."
  }'
```

### 4. Configurar Webhook

No painel do Whapi.Cloud:
- URL: `https://seu-dominio.com/api/webhooks/whapi`
- Eventos: `messages`, `status`

## 📊 Monitoramento

### Health Check
```bash
curl http://localhost:5000/api/health
```

### Métricas Prometheus
```bash
curl http://localhost:5000/api/metrics
```

### Status das Filas
```bash
curl http://localhost:5000/api/queues/status
```

## 🧪 Testes

```bash
# Executar todos os testes
npm test

# Testes com coverage
npm run test:coverage

# Testes em modo watch
npm run test:watch
```

## 🔧 Configuração de Produção

### Variáveis de Ambiente Obrigatórias

```bash
# Banco de dados
DATABASE_URL=postgresql://user:pass@host:5432/db

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password

# Criptografia
ENCRYPTION_KEY=your-32-character-encryption-key

# Whapi.Cloud
WHAPI_BASE_URL=https://gate.whapi.cloud
WHAPI_WEBHOOK_SECRET=your-webhook-secret

# Aplicação
NODE_ENV=production
PORT=5000
MAIN_APP_URL=https://seu-dominio.com
```

### Deploy

```bash
# Build da aplicação
npm run build

# Iniciar em produção
npm start
```

## 🔄 Migração do Evolution API

### Passo a Passo

1. **Criar novo channel Whapi**
   ```bash
   POST /api/channels
   {
     "providerName": "whapi",
     "token": "novo-token-whapi"
   }
   ```

2. **Testar envio de mensagens**
   ```bash
   POST /api/channels/{channelId}/send-test
   ```

3. **Configurar webhook**
   - Atualizar URL no painel Whapi.Cloud
   - Testar recebimento de mensagens

4. **Atualizar integrações**
   - Substituir `instanceName` por `channelId`
   - Atualizar chamadas de API

5. **Remover Evolution API**
   - Remover variáveis de ambiente
   - Deletar channels antigos
   - Limpar código legado

## 🛠️ Estrutura do Projeto

```
server/src/
├── providers/
│   ├── IWhatsappProvider.ts    # Interface do provider
│   └── whapiAdapter.ts         # Implementação Whapi.Cloud
├── services/
│   └── channelService.ts       # Gerenciamento de channels
├── routes/
│   ├── webhooks.ts             # Rotas de webhook
│   ├── health.ts               # Health check e métricas
│   └── channels.ts             # CRUD de channels
├── queue/
│   ├── redis.ts                # Configuração Redis
│   ├── queues.ts               # Definição das filas
│   └── workers.ts              # Workers BullMQ
├── utils/
│   ├── encryption.ts           # Criptografia de tokens
│   ├── logger.ts               # Logs estruturados
│   └── metrics.ts              # Métricas Prometheus
└── __tests__/                  # Testes unitários
```

## 📈 Benefícios da Migração

### Performance
- ✅ Processamento assíncrono com filas
- ✅ Rate limiting inteligente
- ✅ Retry automático com backoff
- ✅ Cache de providers

### Observabilidade
- ✅ Logs estruturados
- ✅ Métricas detalhadas
- ✅ Health checks
- ✅ Monitoramento de filas

### Escalabilidade
- ✅ Multi-tenant por design
- ✅ Suporte a múltiplos providers
- ✅ Workers distribuídos
- ✅ Rate limiting por número

### Segurança
- ✅ Tokens criptografados
- ✅ Validação de webhook
- ✅ Isolamento por tenant
- ✅ Headers de segurança

## 🆘 Suporte

- 📖 Documentação: `server/docs/whapi-integration.md`
- 🐛 Issues: [GitHub Issues]
- 📧 Email: suporte@fivconnect.net
- 💬 Discord: [Link do Discord]

## 📝 Changelog

### v1.0.0 - Migração Completa
- ✅ Implementação completa do WhapiAdapter
- ✅ Sistema de filas com BullMQ
- ✅ Observabilidade com Pino e Prometheus
- ✅ Testes unitários abrangentes
- ✅ Documentação completa
- ✅ CI/CD com GitHub Actions

---

**Status**: ✅ **MIGRAÇÃO CONCLUÍDA**

A migração do Evolution API para Whapi.Cloud foi implementada com sucesso, incluindo todas as funcionalidades solicitadas e melhorias adicionais de observabilidade, escalabilidade e segurança.

