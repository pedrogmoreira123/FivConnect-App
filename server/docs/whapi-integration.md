# Integração Whapi.Cloud

Este documento descreve como configurar e usar a integração com Whapi.Cloud no FivConnect.

## Configuração

### 1. Variáveis de Ambiente

Adicione as seguintes variáveis ao seu arquivo `.env`:

```bash
# Configuração Whapi.Cloud
WHAPI_BASE_URL=https://gate.whapi.cloud
WHAPI_WEBHOOK_SECRET=your-webhook-secret-here

# Configuração de criptografia
ENCRYPTION_KEY=your-32-character-encryption-key-here

# Configuração do Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
```

### 2. Obter Token do Whapi.Cloud

1. Acesse o painel do Whapi.Cloud
2. Crie uma nova instância
3. Copie o token de autenticação
4. Use este token ao criar um channel

### 3. Configurar Webhook

1. No painel do Whapi.Cloud, configure o webhook para:
   - URL: `https://seu-dominio.com/api/webhooks/whapi`
   - Eventos: `messages`, `status`

## Uso da API

### Criar Channel

```bash
POST /api/channels
Content-Type: application/json

{
  "providerName": "whapi",
  "token": "seu-token-whapi",
  "phoneNumber": "+5511999999999"
}
```

### Enviar Mensagem de Teste

```bash
POST /api/channels/{channelId}/send-test
Content-Type: application/json

{
  "to": "+5511888888888",
  "message": "Olá! Esta é uma mensagem de teste."
}
```

### Obter Status do Channel

```bash
GET /api/channels/{channelId}/status
```

### Configurar Webhook

```bash
POST /api/channels/{channelId}/webhook
Content-Type: application/json

{
  "webhookUrl": "https://seu-dominio.com/api/webhooks/whapi"
}
```

## Estrutura de Dados

### Channel

```typescript
interface Channel {
  id: string;
  ownerId: string;
  providerName: 'whapi' | 'evolution';
  providerTokenEncrypted: string;
  phoneNumber?: string;
  status: 'active' | 'inactive' | 'error' | 'connecting';
  environment: 'development' | 'production';
  createdAt: Date;
  updatedAt: Date;
}
```

### Mensagem Recebida

```typescript
interface IncomingMessage {
  provider: string;
  channelId: string;
  from: string;
  type: 'text' | 'image' | 'video' | 'audio' | 'document' | 'location' | 'contact';
  message: string;
  mediaUrl?: string;
  caption?: string;
  filename?: string;
  timestamp: Date;
  messageId: string;
  quotedMessageId?: string;
}
```

## Monitoramento

### Health Check

```bash
GET /api/health
GET /api/health/detailed
```

### Métricas Prometheus

```bash
GET /api/metrics
```

### Status das Filas

```bash
GET /api/queues/status
```

## Filas e Workers

O sistema usa BullMQ para processamento assíncrono:

- **outgoing-messages**: Mensagens de saída
- **incoming-messages**: Mensagens de entrada
- **media-processing**: Processamento de mídia

### Rate Limiting

- Limite padrão: 10 mensagens por minuto por número
- Configurável via variável de ambiente

## Logs

Os logs são estruturados usando Pino:

```bash
# Nível de log
LOG_LEVEL=info

# Logs específicos por contexto
- api: Requisições HTTP
- webhook: Webhooks recebidos
- queue: Processamento de filas
- provider: Comunicação com providers
- database: Operações de banco
```

## Segurança

### Criptografia de Tokens

- Tokens são criptografados usando AES-256-GCM
- Chave de criptografia deve ter 32 caracteres
- Tokens são descriptografados apenas quando necessário

### Validação de Webhook

- Assinatura HMAC-SHA256 opcional
- Configurável via `WHAPI_WEBHOOK_SECRET`

## Troubleshooting

### Problemas Comuns

1. **Token inválido**
   - Verifique se o token está correto
   - Confirme se a instância está ativa no Whapi.Cloud

2. **Webhook não recebe mensagens**
   - Verifique se a URL está acessível
   - Confirme se os eventos estão configurados

3. **Mensagens não são enviadas**
   - Verifique o status do channel
   - Confirme se o número está no formato correto

### Logs de Debug

```bash
# Ativar logs detalhados
LOG_LEVEL=debug

# Verificar status das filas
GET /api/queues/status

# Verificar métricas
GET /api/metrics
```

## Migração do Evolution API

Para migrar do Evolution API:

1. Crie um novo channel com provider 'whapi'
2. Configure o webhook
3. Teste o envio de mensagens
4. Atualize as integrações para usar o novo channel
5. Remova as configurações do Evolution API

## Suporte

Para suporte técnico:
- Documentação Whapi.Cloud: https://docs.whapi.cloud
- Issues do projeto: [GitHub Issues]
- Email: suporte@fivconnect.net

