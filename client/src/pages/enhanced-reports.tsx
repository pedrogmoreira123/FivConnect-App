import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useT } from '@/hooks/use-translation';
import DateRangePicker from '@/components/reports/date-range-picker';
import ReportExport from '@/components/reports/report-export';
import WeeklyPerformanceChart from '@/components/charts/weekly-performance-chart';
import QueueVolumeChart from '@/components/charts/queue-volume-chart';
import { 
  mockConversationsByPeriod, 
  mockClientRanking, 
  mockAgentPerformance, 
  mockQueueComparison,
  mockWeeklyConversationsTrend 
} from '@/lib/mock-reports-data';
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
  const [dateRange, setDateRange] = useState({ from: '', to: '', period: 'weekly' });

  const handleDateRangeChange = (newDateRange: { from: string; to: string; period: string }) => {
    setDateRange(newDateRange);
    // In a real app, this would trigger data fetching with the new date range
    console.log('Date range changed:', newDateRange);
  };

  const totalConversations = mockConversationsByPeriod.reduce((sum, item) => sum + item.total, 0);
  const completedConversations = mockConversationsByPeriod.reduce((sum, item) => sum + item.completed, 0);
  const completionRate = Math.round((completedConversations / totalConversations) * 100);

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-foreground">{t('reports.title')}</h1>
      </div>

      {/* Date Range Picker */}
      <DateRangePicker onDateRangeChange={handleDateRangeChange} />

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
                  {mockAgentPerformance.length}
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
                data={mockConversationsByPeriod} 
                title="Conversas por Período" 
                reportType="conversations" 
              />
            </CardHeader>
            <CardContent>
              <WeeklyPerformanceChart data={mockWeeklyConversationsTrend} />
              
              <div className="mt-6 space-y-4">
                <h4 className="font-semibold">Detalhamento por Dia</h4>
                <div className="grid gap-4">
                  {mockConversationsByPeriod.map((item, index) => (
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
                data={mockClientRanking} 
                title="Ranking de Clientes" 
                reportType="clients" 
              />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockClientRanking.map((client, index) => (
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
                data={mockAgentPerformance} 
                title="Performance dos Agentes" 
                reportType="agents" 
              />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockAgentPerformance.map((agent, index) => (
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
                data={mockQueueComparison} 
                title="Comparação por Fila" 
                reportType="queues" 
              />
            </CardHeader>
            <CardContent>
              <div className="mb-6">
                <QueueVolumeChart data={mockQueueComparison} />
              </div>
              
              <div className="space-y-4">
                {mockQueueComparison.map((queue, index) => (
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
      </Tabs>
    </div>
  );
}