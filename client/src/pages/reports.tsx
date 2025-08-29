import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Progress } from '@/components/ui/progress';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { 
  CalendarIcon,
  TrendingUp,
  Users,
  MessageCircle,
  Clock,
  Activity,
  BarChart3,
  Filter,
  Download,
  RefreshCw
} from 'lucide-react';

// Mock data for reports
const mockTicketsByQueue = [
  { queueName: 'Suporte Geral', totalTickets: 145, resolvedTickets: 132, pendingTickets: 13 },
  { queueName: 'Vendas', totalTickets: 89, resolvedTickets: 78, pendingTickets: 11 },
  { queueName: 'Técnico', totalTickets: 67, resolvedTickets: 58, pendingTickets: 9 },
  { queueName: 'Financeiro', totalTickets: 34, resolvedTickets: 31, pendingTickets: 3 }
];

const mockTicketsByAgent = [
  { agentName: 'Guilherme', totalTickets: 78, resolvedTickets: 72, avgResponseTime: '2m 15s' },
  { agentName: 'Lúcas', totalTickets: 65, resolvedTickets: 59, avgResponseTime: '3m 42s' },
  { agentName: 'Ana Silva', totalTickets: 45, resolvedTickets: 41, avgResponseTime: '1m 58s' },
  { agentName: 'João Santos', totalTickets: 32, resolvedTickets: 28, avgResponseTime: '4m 10s' }
];

const mockActiveSessions = [
  { 
    id: '1', 
    agentName: 'Guilherme', 
    status: 'online', 
    openTickets: 5, 
    avgResponseTime: '2m 15s', 
    onlineTime: '7h 32m',
    lastActivity: '2 min atrás',
    avatar: 'G',
    bgColor: 'bg-blue-500'
  },
  { 
    id: '2', 
    agentName: 'Lúcas', 
    status: 'online', 
    openTickets: 3, 
    avgResponseTime: '3m 42s', 
    onlineTime: '6h 15m',
    lastActivity: '5 min atrás',
    avatar: 'L',
    bgColor: 'bg-green-500'
  },
  { 
    id: '3', 
    agentName: 'Ana Silva', 
    status: 'away', 
    openTickets: 2, 
    avgResponseTime: '1m 58s', 
    onlineTime: '4h 45m',
    lastActivity: '15 min atrás',
    avatar: 'AS',
    bgColor: 'bg-purple-500'
  },
  { 
    id: '4', 
    agentName: 'João Santos', 
    status: 'offline', 
    openTickets: 0, 
    avgResponseTime: '4m 10s', 
    onlineTime: '0h 0m',
    lastActivity: '2h atrás',
    avatar: 'JS',
    bgColor: 'bg-gray-500'
  }
];

export default function ReportsPage() {
  const [dateFrom, setDateFrom] = useState<Date>(new Date()); // Hoje por padrão
  const [dateTo, setDateTo] = useState<Date>(new Date()); // Hoje por padrão
  const [activeTab, setActiveTab] = useState('overview');

  const totalTickets = mockTicketsByQueue.reduce((acc, queue) => acc + queue.totalTickets, 0);
  const totalResolved = mockTicketsByQueue.reduce((acc, queue) => acc + queue.resolvedTickets, 0);
  const totalPending = mockTicketsByQueue.reduce((acc, queue) => acc + queue.pendingTickets, 0);
  const resolutionRate = Math.round((totalResolved / totalTickets) * 100);

  const onlineAgents = mockActiveSessions.filter(session => session.status === 'online').length;
  const totalOpenTickets = mockActiveSessions.reduce((acc, session) => acc + session.openTickets, 0);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'online':
        return <Badge className="bg-green-100 text-green-800">Online</Badge>;
      case 'away':
        return <Badge className="bg-yellow-100 text-yellow-800">Ausente</Badge>;
      case 'offline':
        return <Badge className="bg-gray-100 text-gray-800">Offline</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center space-x-2">
            <BarChart3 className="h-6 w-6" />
            <span>Relatórios</span>
          </h1>
          <p className="text-muted-foreground mt-1">
            Análise de performance e atividades do sistema
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Date Range Filter */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Label className="font-medium">Período:</Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Label className="text-sm">De:</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[140px] justify-start text-left font-normal",
                      !dateFrom && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateFrom ? format(dateFrom, "dd/MM/yyyy", { locale: ptBR }) : "Selecionar"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dateFrom}
                    onSelect={(date) => date && setDateFrom(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex items-center space-x-2">
              <Label className="text-sm">Até:</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[140px] justify-start text-left font-normal",
                      !dateTo && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateTo ? format(dateTo, "dd/MM/yyyy", { locale: ptBR }) : "Selecionar"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dateTo}
                    onSelect={(date) => date && setDateTo(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <Button size="sm" className="ml-auto">
              Aplicar Filtro
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for different views */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="overview" className="flex items-center space-x-2">
            <TrendingUp className="h-4 w-4" />
            <span>Visão Geral</span>
          </TabsTrigger>
          <TabsTrigger value="sessions" className="flex items-center space-x-2">
            <Users className="h-4 w-4" />
            <span>Sessões Ativas</span>
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <MessageCircle className="h-8 w-8 text-blue-500" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total de Atendimentos</p>
                    <p className="text-2xl font-bold">{totalTickets}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(dateFrom, "dd/MM", { locale: ptBR })} - {format(dateTo, "dd/MM", { locale: ptBR })}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-8 w-8 text-green-500" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Resolvidos</p>
                    <p className="text-2xl font-bold">{totalResolved}</p>
                    <p className="text-xs text-green-600">Taxa: {resolutionRate}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <Clock className="h-8 w-8 text-yellow-500" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Pendentes</p>
                    <p className="text-2xl font-bold">{totalPending}</p>
                    <p className="text-xs text-yellow-600">Em andamento</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <Users className="h-8 w-8 text-purple-500" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Agentes Online</p>
                    <p className="text-2xl font-bold">{onlineAgents}</p>
                    <p className="text-xs text-purple-600">Ativos agora</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Performance by Queue */}
          <Card>
            <CardHeader>
              <CardTitle>Performance por Fila</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockTicketsByQueue.map((queue, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{queue.queueName}</span>
                      <span className="text-sm text-muted-foreground">
                        {queue.resolvedTickets}/{queue.totalTickets} resolvidos
                      </span>
                    </div>
                    <Progress 
                      value={(queue.resolvedTickets / queue.totalTickets) * 100} 
                      className="h-2"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Total: {queue.totalTickets}</span>
                      <span>Pendentes: {queue.pendingTickets}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Performance by Agent */}
          <Card>
            <CardHeader>
              <CardTitle>Performance por Atendente</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockTicketsByAgent.map((agent, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                        <span className="text-primary-foreground text-sm font-medium">
                          {agent.agentName.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium">{agent.agentName}</p>
                        <p className="text-sm text-muted-foreground">
                          Tempo médio: {agent.avgResponseTime}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{agent.totalTickets} atendimentos</p>
                      <p className="text-sm text-green-600">{agent.resolvedTickets} resolvidos</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Active Sessions Tab */}
        <TabsContent value="sessions" className="space-y-6">
          {/* Session Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <Activity className="h-8 w-8 text-green-500" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Agentes Online</p>
                    <p className="text-2xl font-bold">{onlineAgents}</p>
                    <p className="text-xs text-green-600">Disponíveis</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <MessageCircle className="h-8 w-8 text-blue-500" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Atendimentos Abertos</p>
                    <p className="text-2xl font-bold">{totalOpenTickets}</p>
                    <p className="text-xs text-blue-600">Em andamento</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <Clock className="h-8 w-8 text-purple-500" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Tempo Médio</p>
                    <p className="text-2xl font-bold">2m 51s</p>
                    <p className="text-xs text-purple-600">Resposta</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Active Sessions List */}
          <Card>
            <CardHeader>
              <CardTitle>Sessões de Usuários</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockActiveSessions.map((session) => (
                  <div key={session.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className={`w-12 h-12 ${session.bgColor} rounded-full flex items-center justify-center relative`}>
                        <span className="text-white font-medium text-sm">
                          {session.avatar}
                        </span>
                        {session.status === 'online' && (
                          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                        )}
                        {session.status === 'away' && (
                          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-yellow-500 rounded-full border-2 border-white"></div>
                        )}
                      </div>
                      
                      <div>
                        <h3 className="font-medium text-foreground">{session.agentName}</h3>
                        <div className="flex items-center space-x-2 mt-1">
                          {getStatusBadge(session.status)}
                          <span className="text-xs text-muted-foreground">
                            Última atividade: {session.lastActivity}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-6 text-center">
                      <div>
                        <p className="text-sm text-muted-foreground">Atendimentos</p>
                        <p className="font-medium">{session.openTickets}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Tempo Médio</p>
                        <p className="font-medium">{session.avgResponseTime}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Tempo Online</p>
                        <p className="font-medium">{session.onlineTime}</p>
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