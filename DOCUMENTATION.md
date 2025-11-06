# 📚 FivConnect - Documentação Completa

**Versão:** 1.0.0
**Última atualização:** 02 de Novembro de 2025
**Ambiente:** Produção - https://app.fivconnect.net

---

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Stack Tecnológico](#stack-tecnológico)
3. [Estrutura do Projeto](#estrutura-do-projeto)
4. [Frontend (Client)](#frontend-client)
5. [Backend (Server)](#backend-server)
6. [Features Principais](#features-principais)
7. [Banco de Dados](#banco-de-dados)
8. [Integrações Externas](#integrações-externas)
9. [Infraestrutura](#infraestrutura)
10. [Configuração e Deploy](#configuração-e-deploy)

---

## 🎯 Visão Geral

**FivConnect** é uma plataforma SaaS completa de HelpDesk com integração nativa ao WhatsApp, desenvolvida para empresas que precisam gerenciar atendimentos multicanal com eficiência.

### Principais Características

- ✅ **Multi-tenant**: Suporta múltiplas empresas com isolamento total de dados
- ✅ **WhatsApp Business**: Integração via Whapi.Cloud com suporte a múltiplos canais
- ✅ **Chatbot IA**: Bot simples ou agente de IA com Google Gemini e OpenAI
- ✅ **Real-time**: Atualizações instantâneas via WebSocket (Socket.IO)
- ✅ **Gestão Completa**: Conversas, tickets, filas, tags, relatórios
- ✅ **Controle de Acesso**: RBAC com 4 níveis (Superadmin, Admin, Supervisor, Agente)
- ✅ **Assinatura e Cobrança**: Integração com Stripe
- ✅ **Multi-idioma**: Suporte a PT-BR e EN-US

---

## 🛠 Stack Tecnológico

### Frontend
| Tecnologia | Versão | Uso |
|------------|--------|-----|
| React | 18.3.1 | Framework UI |
| TypeScript | 5.6.3 | Linguagem |
| Vite | 5.4.19 | Build tool |
| Wouter | 3.4.2 | Roteamento |
| TanStack Query | 5.60.5 | State management |
| Tailwind CSS | 3.4.17 | Estilização |
| Radix UI | - | Componentes |
| Socket.IO Client | 4.8.1 | WebSocket |
| React Hook Form | 7.55.0 | Formulários |
| Zod | 3.24.2 | Validação |
| Recharts | 2.15.2 | Gráficos |
| i18next | 25.4.2 | Internacionalização |

### Backend
| Tecnologia | Versão | Uso |
|------------|--------|-----|
| Node.js | 22.x | Runtime |
| Express | 4.21.2 | Framework web |
| TypeScript | 5.6.3 | Linguagem |
| Socket.IO | 4.8.1 | WebSocket |
| Drizzle ORM | 0.39.1 | ORM |
| PostgreSQL | 16.x | Banco de dados |
| BullMQ | 5.61.0 | Filas |
| Redis | - | Cache/Jobs |
| Pino | 10.0.0 | Logging |
| Passport | 0.8.0 | Autenticação |
| jsonwebtoken | 9.0.2 | JWT |
| Multer | 2.0.2 | Upload |

### Infraestrutura
| Tecnologia | Uso |
|------------|-----|
| Nginx | Reverse proxy + SSL |
| PM2 | Process manager |
| Let's Encrypt | Certificado SSL |
| VPS LuraHosting | Hospedagem |

---

## 📁 Estrutura do Projeto

```
/srv/apps/Fi.VApp-Replit/
├── client/                     # Frontend React
│   ├── src/
│   │   ├── components/         # Componentes reutilizáveis
│   │   │   ├── layout/         # Header, Sidebar, Layout
│   │   │   ├── ui/             # Radix UI primitives (40+)
│   │   │   ├── messages/       # Renderizadores de mensagem
│   │   │   ├── conversation/   # Chat UI
│   │   │   ├── chatbot/        # Config do chatbot
│   │   │   ├── backoffice/     # Admin components
│   │   │   └── reports/        # Visualizações
│   │   ├── contexts/           # React Contexts
│   │   │   ├── auth-context.tsx
│   │   │   ├── theme-context.tsx
│   │   │   └── settings-context.tsx
│   │   ├── hooks/              # Custom hooks
│   │   ├── lib/                # Utilities
│   │   │   ├── api-client.ts   # Axios config
│   │   │   ├── queryClient.ts  # TanStack Query
│   │   │   └── i18n.ts         # i18next
│   │   ├── pages/              # Páginas principais
│   │   └── assets/             # Imagens, animations
│   └── index.html
├── server/                     # Backend Express
│   ├── services/               # Serviços de negócio
│   │   ├── message-processor.ts    # Processamento de mensagens
│   │   ├── whapi-service.ts        # Integração WhatsApp
│   │   ├── ai-service.ts           # Integração IA
│   │   └── email-service.ts        # Envio de emails
│   ├── routes/                 # Rotas modulares
│   │   ├── webhooks.ts         # Webhooks Whapi
│   │   └── channels.ts         # Gestão de canais
│   ├── utils/                  # Utilitários
│   ├── storage.ts              # Data access layer (2900+ linhas)
│   ├── routes.ts               # Rotas principais (2000+ linhas)
│   ├── whatsapp-routes.ts      # Rotas WhatsApp (3700+ linhas)
│   ├── dashboard-routes.ts     # Dashboard & reports
│   ├── admin-routes.ts         # Admin endpoints
│   ├── index.ts                # Entry point + WebSocket
│   └── db.ts                   # Conexão PostgreSQL
├── shared/                     # Código compartilhado
│   └── schema.ts               # Schema Drizzle (820 linhas)
├── public/                     # Assets estáticos
│   ├── uploads/                # Arquivos enviados
│   └── sounds/                 # Sons de notificação
├── drizzle/                    # Migrations
├── dist/                       # Build de produção
├── docs/                       # Documentação adicional
├── scripts/                    # Scripts utilitários
├── package.json                # Dependências
├── tsconfig.json               # Config TypeScript
├── vite.config.ts              # Config Vite
├── drizzle.config.ts           # Config Drizzle
├── tailwind.config.ts          # Config Tailwind
└── ecosystem.config.cjs        # Config PM2
```

---

## 🎨 Frontend (Client)

### Páginas e Rotas

| Rota | Componente | Descrição | Acesso |
|------|-----------|-----------|--------|
| `/login` | LoginPage | Autenticação | Público |
| `/primeiro-acesso` | PrimeiroAcessoPage | Onboarding | Público |
| `/` | DashboardPage | Dashboard principal | Autenticado |
| `/conversations` | ConversationsPage | Chat WhatsApp | Agente+ |
| `/tickets` | TicketsPage | Gestão de tickets | Agente+ |
| `/clients` | ClientsPage | CRM/Contatos | Agente+ |
| `/queues` | QueuesPage | Filas de atendimento | Admin+ |
| `/users` | UsersPage | Gestão de usuários | Admin+ |
| `/ai-agent` | ChatbotHubPage | Config chatbot/IA | Admin+ |
| `/reports` | ReportsPage | Relatórios básicos | Supervisor+ |
| `/enhanced-reports` | EnhancedReportsPage | Analytics avançado | Supervisor+ |
| `/settings` | SettingsPage | Configurações gerais | Admin+ |
| `/backoffice` | BackofficePage | Backoffice | Admin+ |
| `/feedback` | FeedbackPage | Sistema de feedback | Agente+ |
| `/financeiro` | FinanceiroPage | Gestão financeira | Admin+ |
| `/admin` | AdminPage | Painel superadmin | Superadmin |
| `/announcements` | AnnouncementsPage | Comunicados | Agente+ |
| `/whatsapp-settings` | WhatsAppSettingsPage | Config WhatsApp | Admin+ |

### Componentes UI (Radix UI)

**40+ componentes** incluindo:
- Dialog, Sheet, Popover, Dropdown Menu
- Button, Input, Textarea, Select
- Table, Tabs, Accordion
- Toast, Alert, Badge, Avatar
- Calendar, DatePicker
- Checkbox, Radio, Switch
- Progress, Slider
- Tooltip, HoverCard
- Context Menu, Command
- Separator, Scroll Area

### State Management

**TanStack Query (React Query)**:
- Cache de dados do servidor
- Invalidação automática
- Optimistic updates
- Retry e loading states

**React Context**:
- `AuthContext`: Estado de autenticação
- `ThemeContext`: Tema claro/escuro
- `SettingsContext`: Configurações globais
- `ThemeCustomizationContext`: Personalização

**Local State**: useState/useReducer para UI

### WebSocket (Socket.IO)

**Eventos recebidos**:
- `newMessage` - Nova mensagem
- `conversationUpdate` - Atualização de conversa
- `whatsappStatusUpdate` - Status WhatsApp
- `messageStatusUpdate` - Status de mensagem
- `userTyping` - Indicador de digitação

**Eventos enviados**:
- `joinConversation` - Entrar em conversa
- `leaveConversation` - Sair de conversa
- `typing` - Notificar digitação

---

## ⚙️ Backend (Server)

### API Endpoints Completa

#### 🔐 Autenticação (`/api/auth`)

```typescript
POST   /api/auth/login              // Login (email/username + company)
POST   /api/auth/logout             // Logout
GET    /api/auth/validate           // Validar token
POST   /api/auth/change-password    // Alterar senha
POST   /api/auth/register           // Registro
POST   /api/auth/accept-invite      // Aceitar convite
```

#### 👥 Usuários (`/api/users`)

```typescript
GET    /api/users                   // Listar usuários
POST   /api/users                   // Criar usuário
PUT    /api/users/:id               // Atualizar usuário
DELETE /api/users/:id               // Deletar usuário
POST   /api/users/:id/online-status // Status online
```

#### 📞 Clientes/Contatos (`/api/clients`)

```typescript
GET    /api/clients                 // Listar clientes
POST   /api/clients                 // Criar cliente
PUT    /api/clients/:id             // Atualizar cliente
DELETE /api/clients/:id             // Deletar cliente
```

#### 📋 Filas (`/api/queues`)

```typescript
GET    /api/queues                  // Listar filas
POST   /api/queues                  // Criar fila
PUT    /api/queues/:id              // Atualizar fila
DELETE /api/queues/:id              // Deletar fila
```

#### 💬 Respostas Rápidas (`/api/quick-replies`)

```typescript
GET    /api/quick-replies           // Listar respostas
POST   /api/quick-replies           // Criar resposta
PUT    /api/quick-replies/:id       // Atualizar resposta
DELETE /api/quick-replies/:id       // Deletar resposta
```

#### 🏢 Empresas (`/api/companies`)

```typescript
GET    /api/companies               // Listar empresas (superadmin)
POST   /api/companies               // Criar empresa
PUT    /api/companies/:id           // Atualizar empresa
GET    /api/companies/:id/users     // Usuários da empresa
POST   /api/companies/invite        // Enviar convite
```

#### 📱 WhatsApp (`/api/whatsapp`)

**Conexões**:
```typescript
POST   /api/whatsapp/connections            // Criar conexão
GET    /api/whatsapp/connections            // Listar conexões
GET    /api/whatsapp/connections/:id/status // Status
GET    /api/whatsapp/connections/:id/qr     // QR Code
POST   /api/whatsapp/connections/:id/disconnect // Desconectar
DELETE /api/whatsapp/connections/:id        // Deletar
```

**Conversas**:
```typescript
GET    /api/whatsapp/conversations              // Listar conversas
POST   /api/whatsapp/conversations/:id/take    // Assumir conversa
POST   /api/whatsapp/conversations/:id/finish  // Finalizar
GET    /api/whatsapp/conversations/:id/messages // Mensagens
POST   /api/whatsapp/conversations/:id/send    // Enviar mensagem
POST   /api/whatsapp/conversations/:id/messages/:msgId/react // Reagir
PUT    /api/whatsapp/conversations/:id/messages/:msgId/read  // Marcar lido
```

**Webhook**:
```typescript
POST   /api/whatsapp/webhook        // Receber eventos Whapi.Cloud
```

#### 📊 Dashboard (`/api/dashboard`)

```typescript
GET    /api/dashboard/stats                     // Estatísticas
GET    /api/dashboard/activity                  // Atividade recente
GET    /api/dashboard/agent-performance         // Performance agentes
GET    /api/dashboard/reports/conversations     // Relatório conversas
```

#### 🤖 Chatbot (`/api/chatbot-configs`)

```typescript
GET    /api/chatbot-configs         // Listar configs
POST   /api/chatbot-configs         // Criar config
PUT    /api/chatbot-configs/:id     // Atualizar config
DELETE /api/chatbot-configs/:id     // Deletar config
POST   /api/chatbot/test-ai-key     // Testar chave IA
```

#### 🔧 Admin (`/api/admin`)

```typescript
GET    /api/admin/companies                  // Todas empresas
POST   /api/admin/companies/:id/suspend      // Suspender empresa
GET    /api/admin/system-stats               // Stats sistema
```

### Serviços Principais

#### 1. MessageProcessor (`/server/services/message-processor.ts`)

**Responsabilidades**:
- Processar mensagens recebidas do WhatsApp
- Salvar mensagens no banco de dados
- Detectar modo do chatbot (simples/IA/desabilitado)
- Verificar horário comercial
- Detectar palavras-chave de transferência
- Rotear para agente humano
- Gerenciar contexto de conversação

**Métodos principais**:
```typescript
processIncomingMessage(message: IncomingMessage): Promise<void>
saveIncomingMessage(message: IncomingMessage, connection: any): Promise<void>
processSimpleBot(message, config, connection): Promise<void>
processAIAgent(message, config, connection): Promise<void>
routeToHuman(message, connection): Promise<void>
transferToHuman(message, connection): Promise<void>
```

#### 2. WhapiService (`/server/whapi-service.ts`)

**1638 linhas** - Serviço mais complexo

**Partner API** (Manager):
- Criação de canais WhatsApp por empresa
- Ativação (sandbox/production)
- Configuração de webhook
- Monitoramento de status

**Client API** (Gate):
- Geração de QR Code com retry automático
- Envio de mensagens (todos os tipos)
- Busca de mensagens
- Status de conexão
- Upload de mídia

**Tipos de mensagem suportados**:
- Text, Image, Video, Audio, Voice
- Document, Sticker, Location, Contact
- Reaction, Link Preview, Poll, Interactive

#### 3. AIService (`/server/services/ai-service.ts`)

**Providers suportados**:
- **Google Gemini Pro**: @google/generative-ai
- **OpenAI GPT-3.5-turbo**: REST API
- **Custom API**: Endpoint configurável

**Features**:
- Context memory (últimas 10 mensagens)
- Temperatura configurável
- Max tokens configurável
- System prompt customizável

#### 4. EmailService (`/server/services/email-service.ts`)

**Provider**: Resend.com

**Templates**:
- Email de boas-vindas
- Recuperação de senha
- Convite de empresa
- Notificações do sistema

### Storage Layer (`/server/storage.ts`)

**2900+ linhas** - Camada de acesso a dados completa

**Principais métodos**:
- Users: CRUD + autenticação
- Clients: CRUD
- Conversations: CRUD + queries complexas
- Messages: CRUD + paginação
- WhatsApp Connections: CRUD + status
- Companies: Multi-tenant CRUD
- Queues, Tags, Quick Replies
- Chatbot Configs
- Audit Logs
- Subscriptions/Billing

---

## 🚀 Features Principais

### 1. Integração WhatsApp (Whapi.Cloud)

**Arquitetura Multi-tenant**:
- Cada empresa tem canais isolados
- Partner API para gestão de canais
- Client API para operações por canal
- Tokens criptografados no banco

**Fluxo de Conexão**:
1. Admin cria nova conexão WhatsApp
2. Sistema cria canal via Partner API
3. QR Code gerado via Client API
4. Retry automático a cada 5s (timeout 5min)
5. Webhook configurado automaticamente
6. Status monitorado via CRON (fallback 10s)

**Webhook Events**:
- `messages.in` - Mensagem recebida
- `messages.out` - Mensagem enviada
- `messages.status` - Status de entrega
- `qr.code` - QR Code atualizado
- `connection.update` - Status conexão

**CRON Polling**:
- Executa a cada 10 segundos
- Verifica status de todas as conexões
- Fallback caso webhook falhe
- Emite eventos WebSocket

### 2. Sistema de Conversas

**Status de Conversa**:
- `waiting` - Aguardando atendimento
- `in_progress` - Em atendimento
- `completed` - Finalizada
- `closed` - Fechada

**Features**:
- Protocolo único (formato: DDMMAA + sequencial)
- Atribuição automática via regras
- Filas de atendimento
- Sistema de tags (cores)
- Prioridades: low, medium, high, urgent
- Histórico completo do cliente
- Busca e filtros avançados
- Audit log de todas ações

**Interface de Chat**:
- UI estilo WhatsApp
- Renderizadores por tipo de mídia
- Gravação de áudio com waveform
- Upload drag-and-drop
- Respostas rápidas (atalhos)
- Indicador de digitação
- Status online/offline
- Reações emoji
- Respostas a mensagens (quote)

### 3. Chatbot com IA

**Modo 1: Bot Simples**
- Mensagem de boas-vindas
- Seleção de fila
- Horário comercial
- Resposta fora de horário
- Roteamento por palavra-chave
- Transferência para humano

**Configurações**:
```typescript
{
  welcomeMessage: string,
  queueSelectionMessage: string,
  outsideHoursMessage: string,
  transferMessage: string,
  responseDelay: number,
  workingHours: {
    enabled: boolean,
    schedule: {
      monday: { enabled: boolean, start: string, end: string },
      // ... outros dias
    }
  }
}
```

**Modo 2: Agente IA**
- Google Gemini Pro
- OpenAI GPT-3.5-turbo
- Memory context (últimas 10 mensagens)
- System prompt customizável
- Temperatura e max tokens configuráveis
- Fallback automático para humano em caso de erro

**Trigger Rules**:
- Auto-reply habilitado/desabilitado
- Apenas horário comercial
- Max mensagens antes de transferir
- Palavras-chave para transferência: "atendente", "humano", "pessoa"

### 4. Multi-tenancy

**Isolamento de Dados**:
- Campo `environment` em todas as tabelas
- Campo `companyId` para dados de empresa
- Filtros automáticos em todas queries
- Tokens JWT com `companyId`

**Gestão de Empresas**:
- Criação via superadmin
- Settings customizados por empresa
- Planos de assinatura (basic, pro, enterprise)
- Limites de uso (usuários, conexões, filas)
- Status: active, suspended, canceled, trial

**Relação User-Company**:
- N:M (usuário pode estar em múltiplas empresas)
- Role diferente por empresa
- Company owner designation
- Seleção de empresa no login

### 5. Controle de Acesso (RBAC)

**Roles**:

| Role | Permissões |
|------|-----------|
| **Superadmin** | Acesso total, gestão de empresas, admin global |
| **Admin** | Gestão completa da empresa, config WhatsApp, usuários |
| **Supervisor** | Visualização de relatórios, monitoramento de equipe |
| **Agent** | Atendimento de conversas, gestão de tickets |

**Middleware de Proteção**:
```typescript
requireAuth()          // JWT válido
requireRole('admin')   // Role mínima necessária
requireCompany()       // Empresa ativa
```

### 6. Dashboard e Relatórios

**Métricas do Dashboard**:
- Total de conversas (ativas, aguardando, finalizadas)
- Performance de agentes (tempo resposta, taxa resolução)
- Volume de mensagens (diário, semanal, mensal)
- Análise de horários de pico
- Distribuição por fila
- Analytics por tag

**Relatórios**:
- Conversas por período
- Performance de agentes
- Performance de filas
- Tendências de volume
- Export Excel (xlsx)
- Export PDF (jspdf)

**Gráficos**:
- Line charts (séries temporais)
- Bar charts (comparações)
- Pie charts (distribuições)
- Bibliotecas: Recharts + Chart.js

### 7. Sistema de Assinatura

**Integração Stripe**:
- Produtos e preços
- Criação de assinaturas
- Gestão de invoices
- Tracking de pagamentos
- Webhooks de eventos

**Planos**:
- **Basic**: Funcionalidades básicas
- **Professional**: Features avançadas
- **Enterprise**: Tudo liberado + suporte

**Limites por Plano**:
- Max usuários
- Max conexões WhatsApp
- Max filas
- Max canais WhatsApp
- Storage de mídia

---

## 🗄 Banco de Dados

### PostgreSQL + Drizzle ORM

**Configuração**:
```typescript
// drizzle.config.ts
{
  schema: "./shared/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL
  }
}
```

### Schema Completo

#### Tabelas Core

**1. users** - Usuários do sistema
```typescript
{
  id: UUID (PK),
  username: string (unique),
  email: string (unique),
  password: string (bcrypt),
  role: 'superadmin' | 'admin' | 'supervisor' | 'agent',
  isActive: boolean,
  environment: 'development' | 'production',
  createdAt: timestamp,
  updatedAt: timestamp
}
```

**2. companies** - Empresas (tenants)
```typescript
{
  id: UUID (PK),
  name: string,
  slug: string (unique),
  status: 'active' | 'suspended' | 'canceled' | 'trial',
  trialEndsAt: timestamp,
  maxUsers: number,
  maxConnections: number,
  maxQueues: number,
  environment: 'development' | 'production',
  createdAt: timestamp
}
```

**3. user_companies** - Relação N:M
```typescript
{
  id: UUID (PK),
  userId: UUID (FK users),
  companyId: UUID (FK companies),
  role: 'admin' | 'supervisor' | 'agent',
  isOwner: boolean,
  isActive: boolean
}
```

**4. whatsapp_connections** - Conexões WhatsApp
```typescript
{
  id: UUID (PK),
  companyId: UUID (FK companies),
  name: string,
  phone: string,
  status: 'connected' | 'disconnected' | 'connecting',
  whapiChannelId: string,
  whapiToken: text (encrypted),
  qrCode: text,
  profilePictureUrl: text,
  environment: 'development' | 'production',
  createdAt: timestamp
}
```

**5. conversations** - Conversas/Tickets
```typescript
{
  id: UUID (PK),
  companyId: UUID (FK companies),
  clientId: UUID (FK clients),
  whatsappConnectionId: UUID (FK whatsapp_connections),
  assignedUserId: UUID (FK users),
  queueId: UUID (FK queues),
  contactName: string,
  contactPhone: string,
  status: 'waiting' | 'in_progress' | 'completed' | 'closed',
  priority: 'low' | 'medium' | 'high' | 'urgent',
  protocolNumber: string (unique),
  isGroup: boolean,
  isFinished: boolean,
  finishedAt: timestamp,
  finishedBy: UUID (FK users),
  lastMessageAt: timestamp,
  lastMessage: text,
  lastMessageType: string,
  environment: 'development' | 'production',
  createdAt: timestamp
}
```

**6. messages** - Mensagens
```typescript
{
  id: UUID (PK),
  conversationId: UUID (FK conversations),
  senderId: UUID (FK users),
  content: text,
  messageType: 'text' | 'image' | 'video' | 'audio' | 'document' | 'voice' |
               'sticker' | 'location' | 'contact' | 'reaction' | 'gif' |
               'short_video' | 'link_preview' | 'poll' | 'interactive',
  direction: 'incoming' | 'outgoing',
  mediaUrl: text,
  caption: text,
  fileName: text,
  fileSize: integer,
  mimeType: text,
  externalId: string (unique), // ID do provider
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed',
  quotedMessageId: UUID (FK messages),
  metadata: JSONB,
  sentAt: timestamp,
  deliveredAt: timestamp,
  readAt: timestamp,
  processedAt: timestamp,
  environment: 'development' | 'production'
}
```

**7. clients** - Clientes/Contatos
```typescript
{
  id: UUID (PK),
  companyId: UUID (FK companies),
  name: string,
  phone: string,
  email: string,
  metadata: JSONB,
  environment: 'development' | 'production',
  createdAt: timestamp
}
```

#### Tabelas de Configuração

**8. queues** - Filas de atendimento
**9. tags** - Tags para conversas
**10. conversation_tags** - N:M Conversations-Tags
**11. quick_replies** - Respostas rápidas
**12. message_templates** - Templates de mensagem
**13. auto_assign_rules** - Regras de atribuição automática
**14. chatbot_configs** - Configurações de chatbot

#### Tabelas de Sistema

**15. sessions** - Sessões de usuário
**16. audit_logs** - Log de auditoria
**17. announcements** - Comunicados
**18. feedbacks** - Feedback de usuários
**19. company_invites** - Convites de empresa
**20. company_settings** - Settings por empresa

#### Tabelas de Billing

**21. plans** - Planos de assinatura
**22. subscriptions** - Assinaturas
**23. invoices** - Faturas
**24. payments** - Pagamentos

### Relacionamentos

```
users ←→ user_companies ←→ companies
companies → whatsapp_connections
companies → clients
companies → conversations
conversations → messages
conversations → conversation_tags → tags
users → conversations (assignedUserId)
clients → conversations
whatsapp_connections → conversations
queues → conversations
```

### Indexes

```sql
-- Performance indexes
CREATE INDEX idx_conversations_company ON conversations(companyId);
CREATE INDEX idx_conversations_status ON conversations(status);
CREATE INDEX idx_conversations_assigned ON conversations(assignedUserId);
CREATE INDEX idx_messages_conversation ON messages(conversationId);
CREATE INDEX idx_messages_external ON messages(externalId);
CREATE INDEX idx_clients_phone ON clients(phone);
```

---

## 🔌 Integrações Externas

### 1. Whapi.Cloud (WhatsApp)

**URLs**:
- Partner API: `https://manager.whapi.cloud/api/v1/`
- Client API: `https://gate.whapi.cloud/`

**Autenticação**:
```bash
# Partner API
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...

# Client API (per-channel)
Authorization: Bearer {channelToken}
```

**Partner API Endpoints**:
```typescript
// Canais
GET    /channels?project_id={projectId}
GET    /channels/{channelId}
POST   /channels/create
DELETE /channels/{channelId}

// Settings
PATCH  /channels/{channelId}/settings
```

**Client API Endpoints**:
```typescript
// Status
GET    /status

// Mensagens
POST   /messages/text
POST   /messages/image
POST   /messages/video
POST   /messages/audio
POST   /messages/document
POST   /messages/location
POST   /messages/contact
POST   /messages/sticker
POST   /messages/reaction
GET    /messages/list/{chatId}

// Mídia
POST   /media?type=image
```

**Webhook Payload** (messages.in):
```json
{
  "event": "message",
  "data": {
    "id": "true_5511999999999@c.us_3EB0...",
    "from": "5511999999999@c.us",
    "from_name": "Nome Contato",
    "type": "text",
    "body": "Olá!",
    "timestamp": 1698765432,
    "chat_id": "5511999999999@c.us"
  }
}
```

### 2. Google Gemini (IA)

**SDK**: @google/generative-ai@0.24.1

**Configuração**:
```typescript
const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({
  model: "gemini-pro"
});

const chat = model.startChat({
  history: contextMessages,
  generationConfig: {
    temperature: 0.7,
    maxOutputTokens: 150
  }
});
```

**Formato de Contexto**:
```typescript
[
  { role: "user", parts: [{ text: "Olá" }] },
  { role: "model", parts: [{ text: "Oi! Como posso ajudar?" }] }
]
```

### 3. OpenAI (IA)

**Endpoint**: `https://api.openai.com/v1/chat/completions`

**Request**:
```json
{
  "model": "gpt-3.5-turbo",
  "messages": [
    { "role": "system", "content": "System prompt..." },
    { "role": "user", "content": "Mensagem do usuário" }
  ],
  "temperature": 0.7,
  "max_tokens": 150
}
```

### 4. Resend (Email)

**SDK**: resend@6.2.2

**Configuração**:
```typescript
const resend = new Resend(process.env.RESEND_API_KEY);

await resend.emails.send({
  from: 'FivConnect <noreply@fivconnect.net>',
  to: ['user@example.com'],
  subject: 'Welcome!',
  html: htmlTemplate
});
```

### 5. Stripe (Pagamentos)

**SDK**: stripe@18.5.0

**Features**:
- Produtos e preços
- Assinaturas recorrentes
- Invoices
- Payment intents
- Webhooks

---

## 🏗 Infraestrutura

### WebSocket (Socket.IO)

**Server** (`/server/index.ts`):
```typescript
const io = new Server(httpServer, {
  cors: { origin: '*' },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000
});

// Autenticação JWT
io.use(async (socket, next) => {
  const token = socket.handshake.auth.token;
  // Validar JWT...
  next();
});
```

**Rooms**:
- `company_{companyId}` - Eventos da empresa
- `conversation:{conversationId}` - Chat específico

**Events Emitidos**:
- `newMessage` - Nova mensagem
- `conversationUpdate` - Atualização conversa
- `whatsappStatusUpdate` - Status WhatsApp
- `messageStatusUpdate` - Status mensagem
- `connectionUpdate` - Legacy

**Client** (`/client/src/lib/api-client.ts`):
```typescript
const socket = io(WEBSOCKET_URL, {
  auth: { token: localStorage.getItem('token') },
  transports: ['websocket', 'polling']
});

socket.on('newMessage', (data) => {
  // Invalidar cache TanStack Query
  queryClient.invalidateQueries(['conversations']);
});
```

### Nginx (Reverse Proxy)

**Configuração** (`/etc/nginx/nginx.conf`):

```nginx
upstream main_app {
    server 127.0.0.1:3000;
}

# HTTP → HTTPS redirect
server {
    listen 80;
    server_name app.fivconnect.net;
    return 301 https://$server_name$request_uri;
}

# HTTPS
server {
    listen 443 ssl;
    server_name app.fivconnect.net;
    client_max_body_size 16M;

    # SSL
    ssl_certificate /etc/letsencrypt/live/app.fivconnect.net/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/app.fivconnect.net/privkey.pem;

    # WebSocket
    location /socket.io/ {
        proxy_pass http://main_app/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_buffering off;
        proxy_read_timeout 86400s;
    }

    # API
    location /api/ {
        proxy_pass http://main_app/api/;
    }

    # Frontend
    location / {
        proxy_pass http://main_app/;
    }
}
```

### PM2 (Process Manager)

**Configuração** (`ecosystem.config.cjs`):
```javascript
module.exports = {
  apps: [{
    name: 'fiv-backend',
    script: './dist/index.js',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};
```

**Comandos**:
```bash
pm2 start ecosystem.config.cjs
pm2 restart 0
pm2 logs 0
pm2 monit
```

### PostgreSQL

**Configuração**:
```bash
# Usuário e banco
User: fivuser
Database: fivapp
Port: 5432

# Connection string
DATABASE_URL=postgresql://fivuser:password@localhost:5432/fivapp
```

**Backup**:
```bash
pg_dump -U fivuser fivapp > backup.sql
```

### Redis (Opcional - BullMQ)

**Uso**:
- Filas de jobs assíncronos
- Cache de sessão (alternativa)
- Rate limiting

---

## ⚙️ Configuração e Deploy

### Variáveis de Ambiente

**Arquivo**: `.env`

```bash
# Database
DATABASE_URL=postgresql://fivuser:FiVApp@localhost:5432/fivapp

# Server
NODE_ENV=production
PORT=3000
MAIN_APP_URL=https://app.fivconnect.net
WEBSOCKET_URL=wss://app.fivconnect.net

# JWT & Encryption
JWT_SECRET=your-super-secret-jwt-key-change-in-production
ENCRYPTION_KEY=your-super-secret-encryption-key-32-chars

# Whapi.Cloud
WHAPI_PARTNER_TOKEN=eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
WHAPI_PROJECT_ID=QxlvpuqTZh2rIAbmJN0F
WHAPI_MANAGER_API_URL=https://manager.whapi.cloud/
WHAPI_GATE_API_URL=https://gate.whapi.cloud/
WEBHOOK_URL=https://app.fivconnect.net/api/whatsapp/webhook

# Email (Resend)
RESEND_API_KEY=re_XYHYZFzf_AVdJsSB5wZPqY2x3YJdzQaDz

# Stripe (Opcional)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...

# Redis (Opcional)
REDIS_URL=redis://localhost:6379
```

### Build para Produção

```bash
# 1. Instalar dependências
npm install

# 2. Build frontend + backend
npm run build

# Output:
# - Frontend: dist/public/
# - Backend: dist/index.js
```

### Deploy Inicial

```bash
# 1. Clonar repositório
git clone <repo-url> /srv/apps/Fi.VApp-Replit
cd /srv/apps/Fi.VApp-Replit

# 2. Instalar dependências
npm install

# 3. Configurar .env
cp .env.example .env
nano .env

# 4. Setup banco de dados
npm run db:push

# 5. Build
npm run build

# 6. Configurar Nginx
sudo cp nginx-config.conf /etc/nginx/nginx.conf
sudo nginx -t
sudo systemctl reload nginx

# 7. Configurar SSL
sudo certbot --nginx -d app.fivconnect.net

# 8. Iniciar com PM2
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup

# 9. Verificar
pm2 logs 0
curl https://app.fivconnect.net/health
```

### Atualizações

```bash
# 1. Pull latest changes
cd /srv/apps/Fi.VApp-Replit
git pull origin main

# 2. Instalar novas dependências
npm install

# 3. Build
npm run build

# 4. Restart PM2
pm2 restart 0

# 5. Verificar logs
pm2 logs 0 --lines 50
```

### Migrations

```bash
# Gerar migration
npm run db:generate

# Aplicar migration
npm run db:push

# Rollback (manual via SQL)
psql -U fivuser fivapp < drizzle/rollback.sql
```

### Monitoramento

```bash
# PM2
pm2 monit
pm2 status
pm2 logs 0

# Nginx
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Database
psql -U fivuser fivapp -c "SELECT COUNT(*) FROM conversations;"

# Disk usage
df -h
du -sh /srv/apps/Fi.VApp-Replit/public/uploads
```

### Backup

**Script de Backup**:
```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)

# Database
pg_dump -U fivuser fivapp > /backups/fivapp_$DATE.sql

# Uploads
tar -czf /backups/uploads_$DATE.tar.gz /srv/apps/Fi.VApp-Replit/public/uploads

# Limpar backups antigos (>30 dias)
find /backups -name "*.sql" -mtime +30 -delete
find /backups -name "*.tar.gz" -mtime +30 -delete
```

**Cron** (diário às 3h):
```bash
0 3 * * * /scripts/backup.sh
```

---

## 📊 Estatísticas do Projeto

| Métrica | Valor |
|---------|-------|
| **Linhas de Código** | ~25.000+ |
| **Arquivos TypeScript** | 150+ |
| **Componentes React** | 80+ |
| **API Endpoints** | 60+ |
| **Tabelas Database** | 27 |
| **Integrações Externas** | 5 |
| **Dependências NPM** | 150+ |
| **Tempo de Build** | ~30s |
| **Tamanho Build** | ~2MB (gzip) |

---

## 🔧 Troubleshooting

### Problema: WebSocket não conecta

**Solução**:
```bash
# 1. Verificar Nginx
sudo nginx -t
sudo systemctl status nginx

# 2. Verificar PM2
pm2 logs 0 | grep -i socket

# 3. Testar localmente
curl http://localhost:3000/socket.io/
```

### Problema: Mensagens não aparecem

**Solução**:
- Verificar webhook configurado no Whapi.Cloud
- Conferir logs do servidor: `pm2 logs 0`
- Testar endpoint: `curl -X POST https://app.fivconnect.net/api/whatsapp/webhook`
- Verificar MessageProcessor salvando mensagens

### Problema: QR Code não gera

**Solução**:
```bash
# Verificar token Whapi
curl -H "Authorization: Bearer {token}" https://gate.whapi.cloud/status

# Logs do servidor
pm2 logs 0 | grep -i "qr"

# Retry manual via API
curl -X GET https://app.fivconnect.net/api/whatsapp/connections/{id}/qr
```

### Problema: Build falha

**Solução**:
```bash
# Limpar cache
rm -rf node_modules dist
npm install

# Verificar TypeScript
npx tsc --noEmit

# Build isolado
npm run build -- --debug
```

---

## 📝 Changelog Recente

### 02/11/2025 - v1.0.5

✅ **Fix**: Mensagens recebidas agora são salvas no banco de dados
- Adicionado método `saveIncomingMessage()` ao MessageProcessor
- Mensagens aparecem em `/conversations` imediatamente
- Verificação de duplicatas por `externalId`
- Atualização de `lastMessage` na conversa

✅ **Feature**: Animação Lottie na conexão WhatsApp
- Substituído toast por animação de sucesso
- Auto-fechamento após 3 segundos
- Reabertura automática se dialog estiver fechado
- Fix de React stale closure com callback pattern

✅ **Fix**: WebSocket multi-tenant corrigido
- Eventos agora incluem `companyId` correto
- Rooms isoladas por empresa
- Emissões de CRON e Webhook alinhadas

📚 **Docs**: Documentação completa criada
- DOCUMENTATION.md com arquitetura completa
- Endpoints API documentados
- Schema de banco detalhado
- Guias de deploy e troubleshooting

---

## 👥 Equipe

**Desenvolvido por**: FivConnect Team
**Contato**: suporte@fivconnect.net
**Website**: https://app.fivconnect.net

---

## 📄 Licença

Proprietary - Todos os direitos reservados © 2025 FivConnect

---

**Última atualização**: 02 de Novembro de 2025
**Versão do documento**: 1.0.0
