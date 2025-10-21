import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useT } from '@/hooks/use-translation';
import DateRangePicker from '@/components/reports/date-range-picker';
import ReportExport from '@/components/reports/report-export';
import WeeklyPerformanceChart from '@/components/charts/weekly-performance-chart';
import QueueVolumeChart from '@/components/charts/queue-volume-chart';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { 
  Users, 
  MessageCircle, 
  Clock, 
  TrendingUp, 
  Star,
  Target,
  Award,
  BarChart3,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Wifi,
  WifiOff
} from 'lucide-react';

export default function EnhancedReportsPage() {
  const { t } = useT();
  
  useEffect(() => {
    document.title = 'FivConnect - Relatorios';
  }, []);
  
  // Set default date range to today
  const today = new Date();
  const [dateRange, setDateRange] = useState({ 
    from: today.toISOString().split('T')[0], 
    to: today.toISOString().split('T')[0], 
    period: 'daily' 
  });

  // Fetch SLA metrics from API
  const { data: slaData, isLoading: slaLoading } = useQuery({
    queryKey: ['/api/whatsapp/analytics/sla', dateRange.from, dateRange.to],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateRange.from) params.append('dateFrom', dateRange.from);
      if (dateRange.to) params.append('dateTo', dateRange.to);
      
      const response = await apiRequest('GET', `/api/whatsapp/analytics/sla?${params.toString()}`);
      return response.json();
    },
    staleTime: 30000,
  });

  // Fetch heatmap data
  const { data: heatmapData, isLoading: heatmapLoading } = useQuery({
    queryKey: ['/api/whatsapp/analytics/heatmap', dateRange.from, dateRange.to],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateRange.from) params.append('dateFrom', dateRange.from);
      if (dateRange.to) params.append('dateTo', dateRange.to);
      
      const response = await apiRequest('GET', `/api/whatsapp/analytics/heatmap?${params.toString()}`);
      return response.json();
    },
    staleTime: 30000,
  });

  // Fetch agent performance
  const { data: agentData, isLoading: agentLoading } = useQuery({
    queryKey: ['/api/whatsapp/analytics/agent-performance', dateRange.from, dateRange.to],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateRange.from) params.append('dateFrom', dateRange.from);
      if (dateRange.to) params.append('dateTo', dateRange.to);
      
      const response = await apiRequest('GET', `/api/whatsapp/analytics/agent-performance?${params.toString()}`);
      return response.json();
    },
    staleTime: 30000,
  });

  // Fetch channel status
  const { data: channelData, isLoading: channelLoading } = useQuery({
    queryKey: ['/api/whatsapp/analytics/channel-status'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/whatsapp/analytics/channel-status');
      return response.json();
    },
    staleTime: 30000,
  });

  const handleDateRangeChange = (newDateRange: { from: string; to: string; period: string }) => {
    setDateRange(newDateRange);
  };

  // Use real data from analytics endpoints
  const metrics = slaData?.metrics || {};
  const totalConversations = metrics.totalConversations || 0;
  const completedConversations = metrics.completedConversations || 0;
  const completionRate = metrics.completionRate || 0;
  const avgFirstResponse = metrics.avgFirstResponse || '0m 0s';
  const avgResolution = metrics.avgResolution || '0m 0s';
  const conversationsByStatus = metrics.conversationsByStatus || { waiting: 0, in_progress: 0, finished: 0 };
  
  const agentPerformance = agentData?.agentPerformance || [];
  const channels = channelData?.channels || [];
  const heatmap = heatmapData?.heatmapData || [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-foreground">{t('reports.title')}</h1>
      </div>

      {/* Date Range Picker */}
      <DateRangePicker onDateRangeChange={handleDateRangeChange} />

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-fit grid-cols-5 gap-1">
          <TabsTrigger value="overview">SLA Dashboard</TabsTrigger>
          <TabsTrigger value="heatmap">Heatmap</TabsTrigger>
          <TabsTrigger value="agents">Performance</TabsTrigger>
          <TabsTrigger value="channels">Status Canais</TabsTrigger>
          <TabsTrigger value="detailed">Relatórios</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* SLA Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-sm font-medium">
                      Total de Conversas
                    </p>
                    <p className="text-2xl font-bold text-foreground">
                      {totalConversations}
                    </p>
                  </div>
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                    <MessageCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-sm font-medium">
                      Taxa de Finalização
                    </p>
                    <p className="text-2xl font-bold text-foreground">
                      {completionRate}%
                    </p>
                  </div>
                  <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                    <Target className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-sm font-medium">
                      Primeira Resposta
                    </p>
                    <p className="text-2xl font-bold text-foreground">
                      {avgFirstResponse}
                    </p>
                  </div>
                  <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
                    <Clock className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-sm font-medium">
                      Tempo de Resolução
                    </p>
                    <p className="text-2xl font-bold text-foreground">
                      {avgResolution}
                    </p>
                  </div>
                  <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center">
                    <Award className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Status Distribution */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  Em Espera
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-yellow-600">
                  {conversationsByStatus.waiting}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  Em Andamento
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-blue-600">
                  {conversationsByStatus.in_progress}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  Finalizadas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-green-600">
                  {conversationsByStatus.finished}
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Heatmap Tab */}
        <TabsContent value="heatmap" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Heatmap de Atendimento</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-8 gap-1">
                {/* Header com horas */}
                <div></div>
                {Array.from({ length: 24 }, (_, i) => (
                  <div key={i} className="text-xs text-center font-medium">
                    {i}h
                  </div>
                ))}
                
                {/* Dias da semana */}
                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day, dayIndex) => (
                  <div key={day} className="contents">
                    <div className="text-sm font-medium flex items-center justify-center">
                      {day}
                    </div>
                    {Array.from({ length: 24 }, (_, hourIndex) => {
                      const data = heatmap.find(h => h.dayIndex === dayIndex && h.hourIndex === hourIndex);
                      const intensity = data ? Math.min(data.value / 50, 1) : 0;
                      const bgColor = intensity > 0.7 ? 'bg-red-500' : 
                                   intensity > 0.4 ? 'bg-yellow-500' : 
                                   intensity > 0.1 ? 'bg-green-500' : 'bg-gray-200';
                      
                      return (
                        <div
                          key={`${dayIndex}-${hourIndex}`}
                          className={`w-6 h-6 ${bgColor} rounded-sm hover:opacity-80 cursor-pointer`}
                          title={`${day} ${hourIndex}h: ${data?.value || 0} conversas`}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Agent Performance Tab */}
        <TabsContent value="agents" className="space-y-6">
          <div className="grid grid-cols-1 gap-6">
            {agentPerformance.map((agent: any) => (
              <Card key={agent.agentId}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <Users className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">{agent.agentName}</h3>
                        <p className="text-sm text-muted-foreground">
                          {agent.totalConversations} conversas • {agent.completedConversations} finalizadas
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-6">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-green-600">{agent.completionRate}%</p>
                        <p className="text-xs text-muted-foreground">Taxa de Finalização</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-blue-600">{agent.avgResponseTime}</p>
                        <p className="text-xs text-muted-foreground">Tempo Médio</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-yellow-600">{agent.satisfaction}</p>
                        <p className="text-xs text-muted-foreground">Satisfação</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Channel Status Tab */}
        <TabsContent value="channels" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {channels.map((channel: any) => (
              <Card key={channel.id}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        channel.isOnline ? 'bg-green-100' : 'bg-red-100'
                      }`}>
                        {channel.isOnline ? (
                          <Wifi className="h-6 w-6 text-green-600" />
                        ) : (
                          <WifiOff className="h-6 w-6 text-red-600" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">{channel.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          Última atividade: {new Date(channel.lastSeen).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={channel.isOnline ? "default" : "destructive"}>
                        {channel.isOnline ? 'Online' : 'Offline'}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Main Reports Tabs */}
      <Tabs defaultValue="conversations" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="conversations">{t('reports.conversationsByPeriod')}</TabsTrigger>
          <TabsTrigger value="clients">{t('reports.topClients')}</TabsTrigger>
          <TabsTrigger value="agents">{t('reports.agentPerformance')}</TabsTrigger>
          <TabsTrigger value="queues">{t('reports.queueComparison')}</TabsTrigger>
        </TabsList>

        {/* Conversations by Period */}
        <TabsContent value="conversations" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{t('reports.conversationsByPeriod')}</CardTitle>
              <ReportExport 
                data={[]} 
                title="Conversas por Período" 
                reportType="conversations"
                dateRange={dateRange}
              />
            </CardHeader>
            <CardContent>
              <WeeklyPerformanceChart data={[]} />
              
              <div className="mt-6 space-y-4">
                <h4 className="font-semibold">Detalhamento por Dia</h4>
                <div className="grid gap-4">
                  {[].map((item, index) => (
                    <div 
                      key={index}
                      className="flex items-center justify-between p-4 bg-muted rounded-lg"
                      data-testid={`conversation-detail-${index}`}
                    >
                      <div className="flex items-center space-x-4">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <span className="font-medium">{new Date(item.date).toLocaleDateString('pt-BR')}</span>
                      </div>
                      <div className="flex space-x-6 text-sm">
                        <span><strong>{item.total}</strong> conversas</span>
                        <span><strong>{item.completed}</strong> finalizadas</span>
                        <span>Tempo médio: <strong>{item.avgTime}</strong></span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Client Ranking */}
        <TabsContent value="clients" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{t('reports.clientRanking')}</CardTitle>
              <ReportExport 
                data={[]} 
                title="Ranking de Clientes" 
                reportType="clients" 
              />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[].map((client, index) => (
                  <div 
                    key={index}
                    className="flex items-center justify-between p-4 border rounded-lg"
                    data-testid={`client-ranking-${index}`}
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold">
                        #{index + 1}
                      </div>
                      <div>
                        <p className="font-semibold">{client.name}</p>
                        <p className="text-sm text-muted-foreground">{client.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-6">
                      <div className="text-center">
                        <p className="font-bold text-lg">{client.ticketsOpened}</p>
                        <p className="text-xs text-muted-foreground">{t('reports.ticketsOpened')}</p>
                      </div>
                      <Badge variant={client.status === 'Ativo' ? 'default' : 'secondary'}>
                        {client.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Agent Performance */}
        <TabsContent value="agents" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{t('reports.agentRanking')}</CardTitle>
              <ReportExport 
                data={agentPerformance} 
                title="Performance dos Agentes" 
                reportType="agents" 
              />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {agentPerformance.map((agent, index) => (
                  <div 
                    key={agent.id}
                    className="p-4 border rounded-lg"
                    data-testid={`agent-performance-${index}`}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                          <span className="text-primary-foreground font-medium">{agent.initials}</span>
                        </div>
                        <div>
                          <p className="font-semibold">{agent.name}</p>
                          <p className="text-sm text-muted-foreground capitalize">{agent.role}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Star className="h-4 w-4 text-yellow-500" />
                        <span className="font-semibold">{agent.satisfactionRating}</span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div className="text-center p-2 bg-muted rounded">
                        <p className="font-bold text-lg">{agent.resolvedTickets}</p>
                        <p className="text-muted-foreground">{t('reports.resolvedTickets')}</p>
                      </div>
                      <div className="text-center p-2 bg-muted rounded">
                        <p className="font-bold text-lg">{agent.avgResponseTime}</p>
                        <p className="text-muted-foreground">{t('reports.avgResponseTime')}</p>
                      </div>
                      <div className="text-center p-2 bg-muted rounded">
                        <p className="font-bold text-lg">{agent.avgClosingTime}</p>
                        <p className="text-muted-foreground">{t('reports.avgClosingTime')}</p>
                      </div>
                      <div className="text-center p-2 bg-muted rounded">
                        <p className="font-bold text-lg">{agent.completionRate}%</p>
                        <p className="text-muted-foreground">Taxa Finalização</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Queue Comparison */}
        <TabsContent value="queues" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{t('reports.queueVolume')}</CardTitle>
              <ReportExport 
                data={[]} 
                title="Comparação por Fila" 
                reportType="queues" 
              />
            </CardHeader>
            <CardContent>
              <div className="mb-6">
                <QueueVolumeChart data={[]} />
              </div>
              
              <div className="space-y-4">
                {[].map((queue, index) => (
                  <div 
                    key={index}
                    className="p-4 border rounded-lg"
                    data-testid={`queue-comparison-${index}`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-lg">{queue.name}</h4>
                      <Badge variant={queue.satisfaction > 85 ? 'default' : 'secondary'}>
                        {queue.satisfaction}% satisfação
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div className="text-center p-2 bg-muted rounded">
                        <p className="font-bold text-lg">{queue.volume}</p>
                        <p className="text-muted-foreground">Volume</p>
                      </div>
                      <div className="text-center p-2 bg-muted rounded">
                        <p className="font-bold text-lg">{queue.avgTime}</p>
                        <p className="text-muted-foreground">Tempo Médio</p>
                      </div>
                      <div className="text-center p-2 bg-muted rounded">
                        <p className="font-bold text-lg">{queue.activeAgents}</p>
                        <p className="text-muted-foreground">Agentes Ativos</p>
                      </div>
                      <div className="text-center p-2 bg-muted rounded">
                        <p className="font-bold text-lg">{queue.waitingConversations}</p>
                        <p className="text-muted-foreground">Na Fila</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Active Sessions Tab */}
        <TabsContent value="sessions" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Active Sessions Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="h-5 w-5" />
                  <span>Sessões Ativas</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <p className="text-2xl font-bold text-blue-600">5</p>
                      <p className="text-sm text-muted-foreground">Usuários Online</p>
                    </div>
                    <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <p className="text-2xl font-bold text-green-600">3</p>
                      <p className="text-sm text-muted-foreground">Em Atendimento</p>
                    </div>
                  </div>
                  <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                    <p className="text-2xl font-bold text-orange-600">2h 30m</p>
                    <p className="text-sm text-muted-foreground">Tempo Médio de Sessão</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Clock className="h-5 w-5" />
                  <span>Atividade Recente</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs font-medium">GA</span>
                      </div>
                      <div>
                        <p className="font-medium text-sm">Guilherme Admin</p>
                        <p className="text-xs text-muted-foreground">Login realizado</p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">13:45</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs font-medium">LU</span>
                      </div>
                      <div>
                        <p className="font-medium text-sm">Lúcas User</p>
                        <p className="text-xs text-muted-foreground">Iniciou atendimento</p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">13:32</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Active Sessions Table */}
          <Card>
            <CardHeader>
              <CardTitle>Sessões Ativas Detalhadas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3">Usuário</th>
                      <th className="text-left p-3">Role</th>
                      <th className="text-left p-3">Login</th>
                      <th className="text-left p-3">Duração</th>
                      <th className="text-left p-3">IP</th>
                      <th className="text-left p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b hover:bg-muted/50">
                      <td className="p-3">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-xs font-medium">GA</span>
                          </div>
                          <span className="font-medium">Guilherme Admin</span>
                        </div>
                      </td>
                      <td className="p-3">
                        <Badge variant="default">Admin</Badge>
                      </td>
                      <td className="p-3 text-sm text-muted-foreground">29/08 09:15</td>
                      <td className="p-3 text-sm">4h 33m</td>
                      <td className="p-3 text-sm text-muted-foreground">192.168.1.100</td>
                      <td className="p-3">
                        <Badge variant="default" className="bg-green-100 text-green-800">Online</Badge>
                      </td>
                    </tr>
                    <tr className="border-b hover:bg-muted/50">
                      <td className="p-3">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-xs font-medium">LU</span>
                          </div>
                          <span className="font-medium">Lúcas User</span>
                        </div>
                      </td>
                      <td className="p-3">
                        <Badge variant="secondary">Agente</Badge>
                      </td>
                      <td className="p-3 text-sm text-muted-foreground">29/08 10:30</td>
                      <td className="p-3 text-sm">3h 18m</td>
                      <td className="p-3 text-sm text-muted-foreground">192.168.1.101</td>
                      <td className="p-3">
                        <Badge variant="default" className="bg-green-100 text-green-800">Online</Badge>
                      </td>
                    </tr>
                    <tr className="border-b hover:bg-muted/50">
                      <td className="p-3">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-xs font-medium">MA</span>
                          </div>
                          <span className="font-medium">Maria Silva</span>
                        </div>
                      </td>
                      <td className="p-3">
                        <Badge variant="secondary">Supervisor</Badge>
                      </td>
                      <td className="p-3 text-sm text-muted-foreground">29/08 11:00</td>
                      <td className="p-3 text-sm">2h 48m</td>
                      <td className="p-3 text-sm text-muted-foreground">192.168.1.102</td>
                      <td className="p-3">
                        <Badge variant="default" className="bg-green-100 text-green-800">Online</Badge>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Detailed Reports Tab */}
        <TabsContent value="detailed" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Relatórios Detalhados</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Esta seção conterá relatórios detalhados sobre performance de agentes, 
                análise de conversas, e métricas avançadas de produtividade.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
}