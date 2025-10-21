# PROMPT TÉCNICO - MELHORIAS FIVCONNECT APP

## CONTEXTO DO PROJETO
**Tipo**: SaaS HelpDesk com comunicação Cliente X Empresa
**Stack**: React + TypeScript + TanStack Query + Wouter + Tailwind CSS
**API WhatsApp**: Whapi.Cloud Partner
**Status**: Versão em produção via VPS

---

## 🎯 OBJETIVOS PRINCIPAIS

### 1. CORREÇÃO CRÍTICA - QuickReplies
### 2. OTIMIZAÇÃO - Conversations.tsx
### 3. CORREÇÃO - Dashboard com dados reais
### 4. MELHORIAS - Tela de Clientes
### 5. REFATORAÇÃO COMPLETA - Relatórios

---

## 📋 TAREFAS DETALHADAS

### ⚠️ PRIORIDADE MÁXIMA - QuickReplies (settings.tsx)

**Arquivo**: `client/src/pages/settings.tsx`

**PROBLEMA ATUAL** (linha 712-729):
```typescript
const fetchQuickReplies = async () => {
  try {
    setLoading(true);
    const response = await authenticatedGet('/api/quick-replies');
    // ❌ ERRO: .json() não é uma função
    const data = (response as any)?.data ?? response;
    setQuickReplies(Array.isArray(data) ? data : []);
  } catch (error) {
    console.error('Error fetching quick replies:', error);
    toast({
      title: "Erro",
      description: "Erro ao carregar respostas rápidas",
      variant: "destructive"
    });
  } finally {
    setLoading(false);
  }
};
```

**SOLUÇÃO REQUERIDA**:
```typescript
const fetchQuickReplies = async () => {
  try {
    setLoading(true);

    // Usar apiRequest do queryClient (padrão do projeto)
    const response = await apiRequest('GET', '/api/quick-replies');
    const data = await response.json();

    // Validar que é array antes de setar
    setQuickReplies(Array.isArray(data) ? data : []);
  } catch (error) {
    console.error('Error fetching quick replies:', error);
    toast({
      title: "Erro",
      description: "Erro ao carregar respostas rápidas",
      variant: "destructive"
    });
    setQuickReplies([]); // Garantir array vazio em erro
  } finally {
    setLoading(false);
  }
};
```

**AÇÕES**:
1. ✅ Substituir `authenticatedGet` por `apiRequest` (já importado no topo do arquivo)
2. ✅ Adicionar `await response.json()` corretamente
3. ✅ Garantir que `setQuickReplies([])` sempre receba array
4. ✅ Testar criação, edição e exclusão de respostas rápidas

---

### 🔧 OTIMIZAÇÃO CRÍTICA - Conversations.tsx

**Arquivo**: `client/src/pages/conversations.tsx`

**PROBLEMAS IDENTIFICADOS**:

#### A) Carregamento infinito de mensagens (linhas 1447-1462)
```typescript
const { data: messages = [] } = ((): any => {
  const conversationId = selectedConversation?.id;
  const query = useQuery({
    queryKey: ['messages', conversationId],
    queryFn: async () => {
      if (!conversationId) return [] as Message[];
      const res = await apiClient.get(`/api/whatsapp/conversations/${conversationId}/messages`);
      const arr = Array.isArray(res.data) ? res.data : [];
      return arr.sort((a: any, b: any) =>
        new Date(a.sentAt || a.createdAt).getTime() -
        new Date(b.sentAt || b.createdAt).getTime()
      );
    },
    enabled: !!conversationId,
    refetchInterval: false, // ❌ Desabilitado mas ainda recarrega
    staleTime: Infinity,
  });
  return { data: query.data || [] };
})();
```

**SOLUÇÃO REQUERIDA**:
```typescript
const { data: messages = [], isLoading: isLoadingMessages, error: messagesError } = useQuery({
  queryKey: ['messages', selectedConversation?.id],
  queryFn: async () => {
    if (!selectedConversation?.id) return [] as Message[];

    try {
      const res = await apiClient.get(`/api/whatsapp/conversations/${selectedConversation.id}/messages`);
      const arr = Array.isArray(res.data) ? res.data : [];

      return arr.sort((a: any, b: any) =>
        new Date(a.sentAt || a.createdAt).getTime() -
        new Date(b.sentAt || b.createdAt).getTime()
      );
    } catch (error) {
      console.error('❌ Erro ao carregar mensagens:', error);
      return [];
    }
  },
  enabled: !!selectedConversation?.id,
  refetchInterval: false,
  refetchOnWindowFocus: false, // ⭐ ADICIONAR
  refetchOnMount: false, // ⭐ ADICIONAR
  staleTime: Infinity,
  cacheTime: Infinity, // ⭐ ADICIONAR
});
```

#### B) WebSocket causando invalidações excessivas (linhas 1421-1427)
```typescript
// ANTES
const debouncedInvalidate = useCallback(
  debounce(() => {
    queryClient.invalidateQueries({ queryKey: ['conversations'] });
  }, 500),
  [queryClient]
);
```

**MELHORAR PARA**:
```typescript
const debouncedInvalidate = useCallback(
  debounce(() => {
    // Invalidar apenas as queries necessárias
    queryClient.invalidateQueries({
      queryKey: ['conversations'],
      exact: false,
      refetchType: 'active' // ⭐ Apenas refetch queries ativas
    });
  }, 1000), // ⭐ Aumentar debounce de 500ms para 1000ms
  [queryClient]
);
```

#### C) Auto-scroll melhorado (linhas 1716-1722)
**ADICIONAR VERIFICAÇÃO**:
```typescript
useEffect(() => {
  // Só fazer scroll se estiver próximo do final
  const messagesContainer = messagesEndRef.current?.parentElement;
  if (messagesContainer) {
    const isNearBottom = messagesContainer.scrollHeight - messagesContainer.scrollTop - messagesContainer.clientHeight < 100;

    if (isNearBottom || messages.length === 1) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }
}, [messages.length, selectedConversation?.id]);
```

**AÇÕES CONVERSATIONS.TSX**:
1. ✅ Adicionar `refetchOnWindowFocus: false` e `refetchOnMount: false` na query de mensagens
2. ✅ Melhorar debounce do WebSocket (500ms → 1000ms)
3. ✅ Adicionar loading states visuais
4. ✅ Implementar scroll inteligente (só scroll se usuário estiver no fim)
5. ✅ Adicionar tratamento de erro nas queries

---

### 📊 CORREÇÃO - Dashboard com dados reais

**Arquivo**: `client/src/pages/dashboard.tsx`

**PROBLEMAS**:
- Métricas carregam mas não aparecem corretamente
- Precisa validar estrutura de resposta da API

**SOLUÇÃO** (linhas 66-95):
```typescript
const kpiCards = [
  {
    title: t('dashboard.openConversations'),
    value: metricsData?.data?.conversasAbertas ?? 0, // ⭐ VALIDAR
    icon: MessageCircle,
    iconColor: 'text-primary',
    bgColor: 'bg-primary/10'
  },
  {
    title: t('dashboard.onlineUsers'),
    value: metricsData?.data?.usuariosOnline ?? 0, // ⭐ VALIDAR
    icon: UserCheck,
    iconColor: 'text-green-600',
    bgColor: 'bg-green-100'
  },
  {
    title: t('dashboard.avgWaitingTime'),
    value: `${metricsData?.data?.tempoMedioEspera ?? 0}min`, // ⭐ VALIDAR
    icon: Clock,
    iconColor: 'text-yellow-600',
    bgColor: 'bg-yellow-100'
  },
  {
    title: t('dashboard.completedToday'),
    value: metricsData?.data?.finalizadasHoje ?? 0, // ⭐ VALIDAR
    icon: CheckCircle,
    iconColor: 'text-green-600',
    bgColor: 'bg-green-100'
  }
];
```

**AÇÕES**:
1. ✅ Adicionar `console.log('📊 metricsData:', metricsData)` para debug
2. ✅ Verificar estrutura retornada pela API `/api/dashboard/metrics`
3. ✅ Ajustar path de acesso aos dados conforme resposta real
4. ✅ Adicionar loading state visual enquanto carrega
5. ✅ Tratar erro quando API falhar

**MÉTRICAS ESPERADAS**:
- **Conversas Ativas**: Total de conversas com status `in_progress`
- **Usuários Online**: Contar usuários ativos nos últimos 5 minutos
- **Tempo Médio de Espera**: Média de `(updatedAt - createdAt)` das conversas
- **Finalizadas Hoje**: Count de conversas `status=finished` com `updatedAt >= início do dia (00:00)`

**REMOVER COMPONENTES** (conforme solicitado):
```typescript
// ❌ REMOVER (linha 151-189)
<div className="lg:col-span-2">
  <Card>
    <CardContent className="p-3 sm:p-4 md:p-6">
      <h3>Atividades Recentes</h3> {/* ❌ REMOVER COMPLETAMENTE */}
    </CardContent>
  </Card>
</div>

// ❌ REMOVER "Volume por fila" - ainda não existe filas
// ❌ REMOVER "Chamados Abertos hoje" - card redundante
// ❌ REMOVER "Chamados por Atendente" - card redundante
```

**ADICIONAR** (Performance Semanal):
```typescript
<Card>
  <CardHeader>
    <CardTitle>Performance Semanal</CardTitle>
  </CardHeader>
  <CardContent>
    <WeeklyPerformanceChart data={{
      labels: ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'],
      datasets: [
        // Dados REAIS dos últimos 7 dias
        // Agrupar chamados por dia e por usuário
      ]
    }} />
  </CardContent>
</Card>
```

---

### 👥 MELHORIAS - Tela de Clientes

**Arquivo**: `client/src/pages/clients.tsx`

**MUDANÇAS NECESSÁRIAS**:

#### A) Remover título duplicado "Clientes" da sidebar (linha 330)
```typescript
// ❌ ANTES (linha 328-330)
<div className="flex items-center justify-between mb-4">
  <h1 className="text-lg sm:text-xl font-semibold text-foreground">Clientes</h1>
  {/* ... */}
</div>

// ✅ DEPOIS - REMOVER essa h1, pois já tem na topbar
<div className="flex items-center justify-end mb-4">
  {/* ... botões ... */}
</div>
```

#### B) Ordenar por ordem alfabética (linha 118-129)
```typescript
const { data: clients = [], isLoading } = useQuery<Client[]>({
  queryKey: ['/api/clients', searchQuery],
  queryFn: async () => {
    const params = new URLSearchParams();
    if (searchQuery) {
      params.append('search', searchQuery);
    }
    const response = await apiRequest('GET', `/api/clients?${params.toString()}`);
    const data = await response.json();

    // ⭐ ADICIONAR ORDENAÇÃO ALFABÉTICA
    return (Array.isArray(data) ? data : []).sort((a, b) =>
      a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' })
    );
  },
  staleTime: 30000,
});
```

#### C) Pré-selecionar primeiro cliente (adicionar após linha 129)
```typescript
// ⭐ ADICIONAR useEffect para selecionar primeiro cliente
useEffect(() => {
  if (!selectedClient && clients.length > 0) {
    setSelectedClient(clients[0]);
  }
}, [clients]);
```

**AÇÕES CLIENTES**:
1. ✅ Remover `<h1>Clientes</h1>` da sidebar (linha 330)
2. ✅ Adicionar ordenação alfabética na query
3. ✅ Pré-selecionar primeiro cliente automaticamente
4. ✅ Manter topbar com título "Clientes"

---

### 📈 REFATORAÇÃO COMPLETA - Relatórios

**Arquivo**: `client/src/pages/reports.tsx`

**PROBLEMA ATUAL**: 100% dos dados são mockados (linhas 31-90)

**NOVA ESTRUTURA REQUERIDA**:

```typescript
// ⭐ SUBSTITUIR TODOS OS MOCKS POR QUERIES REAIS

import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

export default function ReportsPage() {
  const [dateFrom, setDateFrom] = useState<Date>(/* ... */);
  const [dateTo, setDateTo] = useState<Date>(/* ... */);
  const [periodPreset, setPeriodPreset] = useState<'today' | '7days' | '30days' | 'custom'>('30days');

  // 📊 QUERY 1: Conversas por Período
  const { data: conversationsByPeriod, isLoading: loadingConversations } = useQuery({
    queryKey: ['reports-conversations', dateFrom, dateTo],
    queryFn: async () => {
      const params = new URLSearchParams({
        from: dateFrom.toISOString(),
        to: dateTo.toISOString()
      });
      const res = await apiRequest('GET', `/api/reports/conversations-by-period?${params}`);
      return res.json();
    },
    enabled: !!dateFrom && !!dateTo
  });

  // 📊 QUERY 2: Ranking de Clientes
  const { data: topClients, isLoading: loadingClients } = useQuery({
    queryKey: ['reports-top-clients', dateFrom, dateTo],
    queryFn: async () => {
      const params = new URLSearchParams({
        from: dateFrom.toISOString(),
        to: dateTo.toISOString(),
        limit: '10' // Top 10 clientes
      });
      const res = await apiRequest('GET', `/api/reports/top-clients?${params}`);
      return res.json();
    },
    enabled: !!dateFrom && !!dateTo
  });

  // 📊 QUERY 3: Performance dos Usuários
  const { data: userPerformance, isLoading: loadingPerformance } = useQuery({
    queryKey: ['reports-user-performance', dateFrom, dateTo],
    queryFn: async () => {
      const params = new URLSearchParams({
        from: dateFrom.toISOString(),
        to: dateTo.toISOString()
      });
      const res = await apiRequest('GET', `/api/reports/user-performance?${params}`);
      return res.json();
    },
    enabled: !!dateFrom && !!dateTo
  });

  // 📊 QUERY 4: Usuários Online
  const { data: usersOnline, isLoading: loadingUsersOnline } = useQuery({
    queryKey: ['reports-users-online'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/reports/users-online');
      return res.json();
    },
    refetchInterval: 30000 // Atualizar a cada 30 segundos
  });

  // ... resto do componente
}
```

**NOVOS RELATÓRIOS REQUERIDOS**:

1. **Conversas Por Período** (Gráfico de Linha)
   - Eixo X: Dias do período
   - Eixo Y: Quantidade de conversas
   - Dados: Agrupar conversas por dia

2. **Ranking de Clientes** (Tabela)
   - Top 10 clientes com mais conversas
   - Colunas: Nome, Total de Conversas, Última Interação

3. **Performance dos Usuários** (Gráfico de Barras)
   - Mostrar por usuário:
     - Total de chamados atribuídos
     - Chamados resolvidos
     - Tempo médio de resposta
     - Taxa de resolução (%)

4. **Usuários Online** (Lista em tempo real)
   - Status atual (Online/Offline)
   - Última vez online (se offline)
   - Total de chamados vinculados
   - Tempo médio de resposta

**ESTRUTURA VISUAL SUGERIDA**:

```tsx
<Tabs defaultValue="overview">
  <TabsList>
    <TabsTrigger value="overview">Visão Geral</TabsTrigger>
    <TabsTrigger value="conversations">Conversas</TabsTrigger>
    <TabsTrigger value="clients">Clientes</TabsTrigger>
    <TabsTrigger value="performance">Performance</TabsTrigger>
    <TabsTrigger value="users">Usuários Online</TabsTrigger>
  </TabsList>

  <TabsContent value="overview">
    {/* KPIs gerais */}
    <div className="grid grid-cols-4 gap-4">
      <MetricCard title="Total de Conversas" value={conversationsByPeriod?.total} />
      <MetricCard title="Resolvidas" value={conversationsByPeriod?.resolved} />
      <MetricCard title="Pendentes" value={conversationsByPeriod?.pending} />
      <MetricCard title="Taxa de Resolução" value={`${conversationsByPeriod?.resolutionRate}%`} />
    </div>
  </TabsContent>

  <TabsContent value="conversations">
    {/* Gráfico de conversas por período */}
    <ConversationsByPeriodChart data={conversationsByPeriod} />
  </TabsContent>

  <TabsContent value="clients">
    {/* Ranking de clientes */}
    <TopClientsTable data={topClients} />
  </TabsContent>

  <TabsContent value="performance">
    {/* Performance dos usuários */}
    <UserPerformanceChart data={userPerformance} />
  </TabsContent>

  <TabsContent value="users">
    {/* Usuários online - já existe UsersOnlineReport */}
    <UsersOnlineReport />
  </TabsContent>
</Tabs>
```

**AÇÕES RELATÓRIOS**:
1. ✅ Criar 4 queries para buscar dados reais
2. ✅ Remover todos os mocks (linhas 31-90)
3. ✅ Implementar componentes de gráfico com dados reais
4. ✅ Adicionar loading states
5. ✅ Adicionar exportação de relatórios (CSV/PDF)

---

## 🎨 IDEIAS ADICIONAIS DE MELHORIAS

### 1. **Dashboard**
- **Widget de Alertas**: Mostrar conversas com tempo de espera > 5 minutos
- **Mini-gráfico de Satisfação**: Se houver sistema de avaliação
- **Indicador de Carga**: % de capacidade atual (conversas ativas / total de agentes)

### 2. **Conversations.tsx**
- **Indicador de digitação**: "Cliente está digitando..."
- **Mensagens fixadas**: Pin de mensagens importantes
- **Busca de mensagens**: Ctrl+F dentro da conversa
- **Atalhos de teclado**: Enter para enviar, Esc para fechar modais

### 3. **Clientes**
- **Tags/Labels**: Categorizar clientes (VIP, Premium, etc.)
- **Notas internas**: Campo para observações dos atendentes
- **Histórico de atendimentos**: Timeline visual
- **Importação em massa**: Melhorar UX do upload de Excel

### 4. **Relatórios**
- **Exportação agendada**: Enviar relatórios por email semanalmente
- **Comparação de períodos**: "vs. período anterior"
- **Metas e KPIs**: Configurar metas e mostrar progresso
- **Heatmap de atendimentos**: Horários de maior volume

### 5. **Settings**
- **Preview de tema em tempo real**: Ao mudar cores
- **Backup de configurações**: Exportar/importar settings
- **Logs de auditoria**: Rastrear mudanças nas configurações

---

## ✅ CHECKLIST DE IMPLEMENTAÇÃO

### Fase 1 - Correções Críticas (1-2 dias)
- [ ] Corrigir erro de QuickReplies em settings.tsx
- [ ] Otimizar carregamento de mensagens em conversations.tsx
- [ ] Adicionar refetchOnWindowFocus: false nas queries

### Fase 2 - Dashboard e Clientes (2-3 dias)
- [ ] Validar e corrigir métricas do Dashboard
- [ ] Remover componentes desnecessários do Dashboard
- [ ] Adicionar Performance Semanal com dados reais
- [ ] Implementar ordenação alfabética em Clientes
- [ ] Pré-selecionar primeiro cliente
- [ ] Remover título duplicado

### Fase 3 - Atendimentos (1 dia)
- [ ] Corrigir contador de "Todos" nos TabButtons
- [ ] Mover "Ver Conversa" para ícone de olho
- [ ] Validar que não há outros problemas visuais

### Fase 4 - Relatórios (3-4 dias)
- [ ] Criar endpoint `/api/reports/conversations-by-period`
- [ ] Criar endpoint `/api/reports/top-clients`
- [ ] Criar endpoint `/api/reports/user-performance`
- [ ] Implementar queries no frontend
- [ ] Criar componentes de gráfico
- [ ] Adicionar exportação de relatórios

### Fase 5 - Polimento e Testes (2-3 dias)
- [ ] Testar todas as funcionalidades corrigidas
- [ ] Adicionar loading states onde faltam
- [ ] Revisar responsividade mobile
- [ ] Otimizar performance geral
- [ ] Deploy em staging para testes

---

## 🔍 VALIDAÇÕES NECESSÁRIAS

### Backend (Validar com time de backend)
1. **Endpoint `/api/quick-replies`**: Retorna array direto ou dentro de `{ data: [] }`?
2. **Endpoint `/api/dashboard/metrics`**: Qual a estrutura exata de resposta?
3. **WebSocket events**: `newMessage` e `conversationUpdate` estão funcionando?
4. **Novos endpoints de relatórios**: Precisam ser criados?

### Frontend
1. **apiRequest vs authenticatedGet**: Padronizar em todo projeto
2. **React Query config**: Revisar staleTime e cacheTime globais
3. **Performance**: Verificar re-renders desnecessários

---

## 📝 OBSERVAÇÕES IMPORTANTES

1. **Não quebrar funcionalidades existentes**: Testar tudo após cada mudança
2. **Manter padrão do projeto**: Seguir convenções de código já estabelecidas
3. **TypeScript strict**: Garantir tipagem correta
4. **Commits atômicos**: Um commit por funcionalidade/correção
5. **Documentação**: Atualizar comentários onde necessário

---

## 🚀 PRIORIDADE DE EXECUÇÃO

**ALTA** 🔴:
- Correção QuickReplies (CRÍTICO)
- Otimização Conversations.tsx (carregamento infinito)
- Dashboard métricas corretas

**MÉDIA** 🟡:
- Melhorias Clientes (ordenação, seleção)
- Atendimentos (contador correto)

**BAIXA** 🟢:
- Refatoração Relatórios (pode ser feita em sprint separada)
- Ideias adicionais

---

## 📞 SUPORTE

Em caso de dúvidas sobre o prompt ou necessidade de esclarecimentos:
1. Validar estrutura de APIs no backend primeiro
2. Testar cada correção isoladamente
3. Usar `console.log` para debug de dados
4. Verificar DevTools > Network > API calls
