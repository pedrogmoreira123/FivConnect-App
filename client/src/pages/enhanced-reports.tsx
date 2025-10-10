import { useState } from 'react';
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
  BarChart3 
} from 'lucide-react';

export default function EnhancedReportsPage() {
  const { t } = useT();
  
  // Set default date range to today
  const today = new Date();
  const [dateRange, setDateRange] = useState({ 
    from: today.toISOString().split('T')[0], 
    to: today.toISOString().split('T')[0], 
    period: 'daily' 
  });

  // Fetch reports data from API
  const { data: reportsData, isLoading } = useQuery({
    queryKey: ['/api/reports', dateRange.from, dateRange.to],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateRange.from) params.append('startDate', dateRange.from);
      if (dateRange.to) params.append('endDate', dateRange.to);
      
      const response = await apiRequest('GET', `/api/reports?${params.toString()}`);
      return response.json();
    },
    staleTime: 30000,
  });

  const handleDateRangeChange = (newDateRange: { from: string; to: string; period: string }) => {
    setDateRange(newDateRange);
  };

  // Use real data or fallback to empty values
  const totalConversations = reportsData?.totalConversations || 0;
  const completedConversations = reportsData?.completedConversations || 0;
  const completionRate = totalConversations > 0 ? Math.round((completedConversations / totalConversations) * 100) : 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-foreground">{t('reports.title')}</h1>
      </div>

      {/* Date Range Picker */}
      <DateRangePicker onDateRangeChange={handleDateRangeChange} />

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-fit grid-cols-3 gap-1">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="detailed">Relatórios Detalhados</TabsTrigger>
          <TabsTrigger value="sessions">Sessões Ativas</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm font-medium">
                  {t('reports.totalConversations')}
                </p>
                <p className="text-2xl font-bold text-foreground" data-testid="text-total-conversations">
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
                <p className="text-2xl font-bold text-foreground" data-testid="text-completion-rate">
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
                  Agentes Ativos
                </p>
                <p className="text-2xl font-bold text-foreground" data-testid="text-active-agents">
                  {reportsData?.agentPerformance?.length || 0}
                </p>
              </div>
              <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
                <Users className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm font-medium">
                  Tempo Médio
                </p>
                <p className="text-2xl font-bold text-foreground" data-testid="text-avg-time">
                  3m 25s
                </p>
              </div>
              <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center">
                <Clock className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </CardContent>
        </Card>
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
                data={reportsData?.conversationsByPeriod || []} 
                title="Conversas por Período" 
                reportType="conversations"
                dateRange={dateRange}
              />
            </CardHeader>
            <CardContent>
              <WeeklyPerformanceChart data={reportsData?.weeklyTrend || []} />
              
              <div className="mt-6 space-y-4">
                <h4 className="font-semibold">Detalhamento por Dia</h4>
                <div className="grid gap-4">
                  {(reportsData?.conversationsByPeriod || []).map((item, index) => (
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
                data={reportsData?.clientRanking || []} 
                title="Ranking de Clientes" 
                reportType="clients" 
              />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(reportsData?.clientRanking || []).map((client, index) => (
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
                data={reportsData?.agentPerformance || []} 
                title="Performance dos Agentes" 
                reportType="agents" 
              />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(reportsData?.agentPerformance || []).map((agent, index) => (
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
                data={reportsData?.queueComparison || []} 
                title="Comparação por Fila" 
                reportType="queues" 
              />
            </CardHeader>
            <CardContent>
              <div className="mb-6">
                <QueueVolumeChart data={reportsData?.queueComparison || []} />
              </div>
              
              <div className="space-y-4">
                {(reportsData?.queueComparison || []).map((queue, index) => (
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