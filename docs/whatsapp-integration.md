# Integração do Microserviço WhatsApp

## Visão Geral

Este documento descreve a integração completa do microserviço "Serviço de Conexão WhatsApp" com a aplicação principal Fi.VApp.

## Arquitetura

```
Frontend (React) → Backend Principal (Gateway) → Microserviço WhatsApp
```

O Backend Principal atua como um gateway seguro, intermediando todas as requisições entre o Frontend e o Microserviço WhatsApp.

## Configuração

### Variáveis de Ambiente

Adicione as seguintes variáveis ao seu arquivo `.env`:

```env
# WhatsApp Connection Service
CONNECTION_SERVICE_URL=http://localhost:3001
CONNECTION_SERVICE_API_KEY=your-connection-service-api-key
```

### Endpoints Implementados

#### Backend Principal (Gateway)

1. **POST /api/whatsapp/connect**
   - Inicia uma nova sessão WhatsApp
   - Chama: `POST /sessions/start` no microserviço

2. **GET /api/whatsapp/status/:tenantId**
   - Verifica o status da conexão
   - Chama: `GET /sessions/:tenantId/status` no microserviço

3. **DELETE /api/whatsapp/disconnect/:tenantId**
   - Desconecta a sessão WhatsApp
   - Chama: `DELETE /sessions/:tenantId` no microserviço

4. **POST /api/conversations/:conversationId/send-message**
   - Envia mensagem via WhatsApp
   - Chama: `POST /message/send` no microserviço

5. **POST /api/webhooks/whatsapp**
   - Webhook para receber mensagens do WhatsApp
   - Configurar no microserviço como webhook URL

#### Frontend

1. **Página de Configurações**: `/whatsapp-settings`
   - Interface para conectar/desconectar WhatsApp
   - Exibição de QR Code
   - Status da conexão em tempo real

2. **Página de Conversas**: `/conversations`
   - Envio de mensagens integrado
   - Recebimento em tempo real (via WebSocket)

## Funcionalidades

### 1. Conexão WhatsApp

- **Conectar**: Gera QR Code para escaneamento
- **Status**: Verificação automática do status da conexão
- **Desconectar**: Remove a conexão ativa

### 2. Envio de Mensagens

- **Interface**: Formulário de envio na página de conversas
- **API**: Integração com endpoint de envio
- **Feedback**: Confirmação de envio e atualização da interface

### 3. Recebimento de Mensagens

- **Webhook**: Endpoint para receber mensagens do WhatsApp
- **Processamento**: Salva mensagens no banco de dados
- **Tempo Real**: WebSocket para atualizações instantâneas

## Fluxo de Dados

### Conexão WhatsApp

1. Usuário clica em "Conectar WhatsApp"
2. Frontend chama `POST /api/whatsapp/connect`
3. Backend chama `POST /sessions/start` no microserviço
4. Microserviço retorna QR Code
5. Frontend exibe QR Code
6. Usuário escaneia com WhatsApp
7. Frontend verifica status periodicamente
8. Quando conectado, atualiza interface

### Envio de Mensagem

1. Usuário digita mensagem e clica "Enviar"
2. Frontend chama `POST /api/conversations/:id/send-message`
3. Backend chama `POST /message/send` no microserviço
4. Microserviço envia via WhatsApp
5. Backend salva mensagem no banco
6. Frontend atualiza interface

### Recebimento de Mensagem

1. WhatsApp envia mensagem para o microserviço
2. Microserviço chama webhook `POST /api/webhooks/whatsapp`
3. Backend processa e salva mensagem
4. Backend emite evento WebSocket
5. Frontend recebe e atualiza interface

## Segurança

- **API Key**: Todas as requisições ao microserviço incluem header `X-API-KEY`
- **Autenticação**: Endpoints protegidos por JWT
- **Validação**: Validação de dados em todas as requisições
- **Rate Limiting**: Implementar se necessário

## Monitoramento

- **Logs**: Todas as operações são logadas
- **Status**: Verificação periódica do status das conexões
- **Erros**: Tratamento e notificação de erros
- **Métricas**: Contadores de mensagens enviadas/recebidas

## Próximos Passos

1. **WebSocket**: Implementar comunicação em tempo real
2. **Notificações**: Sistema de notificações push
3. **Mídia**: Suporte a imagens, vídeos e documentos
4. **Grupos**: Suporte a conversas em grupo
5. **Automação**: Respostas automáticas e chatbots
