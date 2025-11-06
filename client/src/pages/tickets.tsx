import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/use-auth';
import { useT } from '@/hooks/use-translation';
import { useMobile } from '@/hooks/use-mobile';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import apiClient from '@/lib/api-client';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { 
  Search, 
  Filter, 
  Plus, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  User,
  Calendar as CalendarIcon,
  MoreHorizontal,
  Phone,
  UserPlus,
  Users as UsersIcon,
  X,
  CalendarDays,
  Ban,
  Eye
} from 'lucide-react';

type TicketStatus = 'open' | 'in_progress' | 'closed' | 'canceled' | 'all';

interface Ticket {
  id: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignedTo: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  clientName: string;
  clientPhone: string;
  tags: string[];
}

interface FilterOptions {
  status: string;
  assignedTo: string;
  clientId: string;
  queueId: string;
  protocolNumber: string;
  priority: string;
  dateFrom: Date | undefined;
  dateTo: Date | undefined;
}

// Função para mapear status do backend para UI
const mapStatusToUI = (status: string): TicketStatus => {
  switch (status) {
    case 'waiting': return 'open';
    case 'in_progress': return 'in_progress';
    case 'completed': return 'closed';
    case 'closed': return 'canceled';
    default: return 'all';
  }
};

const statusLabels = {
  all: 'Todos',
  open: 'Aberto',
  in_progress: 'Em Andamento', 
  closed: 'Fechado',
  canceled: 'Cancelado'
};

const priorityLabels = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
  urgent: 'Urgente'
};

const priorityColors = {
  low: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  high: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  urgent: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
};

const statusColors = {
  all: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
  open: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  in_progress: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  closed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  canceled: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
};

export default function TicketsPage() {
  const { user } = useAuth();
  const { t } = useT();
  const isMobile = useMobile();
  
  useEffect(() => {
    document.title = 'FivConnect - Atendimentos';
  }, []);
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState<TicketStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showNewTicketModal, setShowNewTicketModal] = useState(false);
  const [newTicketType, setNewTicketType] = useState<'agent' | 'client'>('agent');
  const [periodPreset, setPeriodPreset] = useState<'today' | '7days' | '30days' | 'custom'>('today');
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [showConversationModal, setShowConversationModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  
  const [filters, setFilters] = useState<FilterOptions>({
    status: 'all',
    assignedTo: 'all',
    clientId: 'all',
    queueId: 'all',
    protocolNumber: '',
    priority: 'all',
    dateFrom: undefined,
    dateTo: undefined
  });

  const [page, setPage] = useState(1);
  const limit = 20;

  const [newTicket, setNewTicket] = useState({
    title: '',
    description: '',
    priority: 'medium',
    assignedTo: '',
    clientName: '',
    clientPhone: '',
    selectedClient: ''
  });

  // Aplicar preset de período automaticamente
  useEffect(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    
    switch (periodPreset) {
      case 'today':
        setFilters(prev => ({
          ...prev,
          dateFrom: today,
          dateTo: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999)
        }));
        break;
      case '7days':
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        setFilters(prev => ({
          ...prev,
          dateFrom: weekAgo,
          dateTo: new Date()
        }));
        break;
      case '30days':
        const monthAgo = new Date(today);
        monthAgo.setDate(monthAgo.getDate() - 30);
        setFilters(prev => ({
          ...prev,
          dateFrom: monthAgo,
          dateTo: new Date()
        }));
        break;
      case 'custom':
        // Não altera automaticamente
        break;
    }
  }, [periodPreset]);

  // Query de tickets
  const { data: ticketsData, isLoading } = useQuery({
    queryKey: ['tickets', filters, page, searchQuery],
    queryFn: async () => {
      try {
        const params = new URLSearchParams();
        if (filters.status !== 'all') params.append('status', filters.status);
        if (filters.assignedTo) params.append('assignedTo', filters.assignedTo);
        if (filters.clientId) params.append('clientId', filters.clientId);
        if (filters.queueId) params.append('queueId', filters.queueId);
        if (filters.protocolNumber) params.append('protocolNumber', filters.protocolNumber);
        if (filters.dateFrom) params.append('dateFrom', filters.dateFrom.toISOString());
        if (filters.dateTo) params.append('dateTo', filters.dateTo.toISOString());
        params.append('page', page.toString());
        params.append('limit', limit.toString());
        
        const res = await apiClient.get(`/api/tickets?${params.toString()}`);
        return res.data || { tickets: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } };
      } catch (error) {
        console.error('Erro ao buscar tickets:', error);
        return { tickets: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } };
      }
    }
  });

  // Query de estatísticas
  const { data: stats } = useQuery({
    queryKey: ['tickets-stats'],
    queryFn: async () => {
      const res = await apiClient.get('/api/tickets/stats');
      return res.data;
    }
  });

  // Query de agentes (para filtro)
  const { data: agents } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/api/users');
        return res.data || [];
      } catch (error) {
        console.error('Erro ao buscar agentes:', error);
        return [];
      }
    }
  });

  // Query de clientes (para filtro)
  const { data: clients } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/api/clients');
        return res.data || [];
      } catch (error) {
        console.error('Erro ao buscar clientes:', error);
        return [];
      }
    }
  });

  // Query de mensagens do ticket selecionado
  const { data: conversationData, isLoading: loadingMessages } = useQuery({
    queryKey: ['ticket-conversation', selectedConversation],
    queryFn: async () => {
      if (!selectedConversation) return null;
      const res = await apiClient.get(`/api/tickets/${selectedConversation}/messages`);
      return res.data;
    },
    enabled: !!selectedConversation
  });

  const getStatusIcon = (status: TicketStatus) => {
    switch (status) {
      case 'open': return <AlertCircle className="h-4 w-4" />;
      case 'in_progress': return <Clock className="h-4 w-4" />;
      case 'closed': return <CheckCircle className="h-4 w-4" />;
      case 'canceled': return <XCircle className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  // Usar estatísticas da API
  const counts = stats || {
    all: 0,
    open: 0,
    in_progress: 0,
    closed: 0,
    canceled: 0
  };

  const handleCreateTicket = () => {
    if (!newTicket.title || !newTicket.assignedTo || (!newTicket.clientName && !newTicket.selectedClient)) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Preencha todos os campos obrigatórios.",
      });
      return;
    }

    const clientInfo = newTicketType === 'client' 
      ? (clients || []).find((c: any) => c.id === newTicket.selectedClient)
      : { name: newTicket.clientName, phone: newTicket.clientPhone };

    const newTicketId = `#${Math.floor(Math.random() * 100000)}`;
    
    console.log('Criando novo ticket:', {
      id: newTicketId,
      title: newTicket.title,
      description: newTicket.description,
      priority: newTicket.priority,
      assignedTo: newTicket.assignedTo,
      clientName: clientInfo?.name,
      clientPhone: clientInfo?.phone || newTicket.clientPhone,
      type: newTicketType
    });

    toast({
      title: "Atendimento criado!",
      description: `Ticket ${newTicketId} foi criado com sucesso.`,
    });

    // Reset form
    setNewTicket({
      title: '',
      description: '',
      priority: 'medium',
      assignedTo: '',
      clientName: '',
      clientPhone: '',
      selectedClient: ''
    });
    setShowNewTicketModal(false);
  };

  const clearFilters = () => {
    setFilters({
      status: 'all',
      assignedTo: 'all',
      clientId: 'all',
      queueId: 'all',
      protocolNumber: '',
      priority: 'all',
      dateFrom: undefined,
      dateTo: undefined
    });
    setSearchQuery('');
  };

  const handleAssignTicket = async () => {
    if (!selectedAgentId || !selectedTicket) return;
    
    try {
      await apiClient.put(`/api/tickets/${selectedTicket.id}/assign`, {
        agentId: selectedAgentId
      });
      
      toast({ 
        title: "Atendimento atribuído com sucesso",
        description: `Ticket ${selectedTicket.protocolNumber || selectedTicket.id.slice(0, 6)} foi atribuído.`
      });
      
      setShowAssignModal(false);
      setSelectedAgentId('');
      setSelectedTicket(null);
      
      // Recarregar dados
      window.location.reload();
    } catch (error) {
      console.error('Erro ao atribuir:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível atribuir o atendimento."
      });
    }
  };

  const handleFinishTicket = async () => {
    if (!selectedTicket) return;
    
    try {
      await apiClient.put(`/api/tickets/${selectedTicket.id}/finish`);
      
      toast({ 
        title: "Atendimento fechado com sucesso",
        description: `Ticket ${selectedTicket.protocolNumber || selectedTicket.id.slice(0, 6)} foi fechado.`
      });
      
      setShowFinishModal(false);
      setSelectedTicket(null);
      
      // Recarregar dados
      window.location.reload();
    } catch (error) {
      console.error('Erro ao fechar:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível fechar o atendimento."
      });
    }
  };

  const handleCancelTicket = async () => {
    if (!selectedTicket) return;
    
    try {
      await apiClient.put(`/api/tickets/${selectedTicket.id}/cancel`);
      
      toast({ 
        title: "Atendimento cancelado",
        description: `Ticket ${selectedTicket.protocolNumber || selectedTicket.id.slice(0, 6)} foi cancelado.`
      });
      
      setShowCancelModal(false);
      setSelectedTicket(null);
      
      // Recarregar dados
      window.location.reload();
    } catch (error) {
      console.error('Erro ao cancelar:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível cancelar o atendimento."
      });
    }
  };

  // Mostrar loading durante carregamento inicial
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" text="Carregando atendimentos..." />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Atendimentos</h1>
          <p className="text-muted-foreground">
            {user?.role === 'admin' 
              ? 'Gerencie todos os tickets do sistema'
              : 'Visualize seus tickets atribuídos'
            }
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Período */}
          <div className="flex items-center gap-2 border rounded-lg px-3 py-1.5">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Período:</span>
            
            <Select value={periodPreset} onValueChange={(value: any) => setPeriodPreset(value)}>
              <SelectTrigger className="h-8 w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Hoje</SelectItem>
                <SelectItem value="7days">Últimos 7 dias</SelectItem>
                <SelectItem value="30days">Últimos 30 dias</SelectItem>
                <SelectItem value="custom">Personalizado</SelectItem>
              </SelectContent>
            </Select>
            
            {periodPreset === 'custom' && (
              <>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8">
                      {filters.dateFrom 
                        ? format(filters.dateFrom, "dd/MM/yyyy") 
                        : "Início"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={filters.dateFrom}
                      onSelect={(date) => setFilters(prev => ({ ...prev, dateFrom: date }))}
                    />
                  </PopoverContent>
                </Popover>
                <span className="text-muted-foreground">a</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8">
                      {filters.dateTo 
                        ? format(filters.dateTo, "dd/MM/yyyy") 
                        : "Fim"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={filters.dateTo}
                      onSelect={(date) => setFilters(prev => ({ ...prev, dateTo: date }))}
                    />
                  </PopoverContent>
                </Popover>
              </>
            )}
            
            {periodPreset !== 'custom' && (
              <span className="text-xs text-muted-foreground">
                {filters.dateFrom && format(filters.dateFrom, "dd/MM")} - {filters.dateTo && format(filters.dateTo, "dd/MM")}
              </span>
            )}
          </div>
          
          <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="h-4 w-4 mr-2" />
            Filtros {showFilters && '(Ativo)'}
          </Button>
          
          <Dialog open={showNewTicketModal} onOpenChange={setShowNewTicketModal}>
            <DialogTrigger asChild>
              <Button size="sm" data-testid="button-new-ticket">
                <Plus className="h-4 w-4 mr-2" />
                Novo Atendimento
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Criar Novo Atendimento</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                {/* Tipo de criação */}
                <div className="space-y-2">
                  <Label>Tipo de Atendimento</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant={newTicketType === 'agent' ? 'default' : 'outline'}
                      onClick={() => setNewTicketType('agent')}
                      className="justify-start"
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Por Atendente
                    </Button>
                    <Button
                      variant={newTicketType === 'client' ? 'default' : 'outline'}
                      onClick={() => setNewTicketType('client')}
                      className="justify-start"
                    >
                      <UsersIcon className="h-4 w-4 mr-2" />
                      Por Cliente
                    </Button>
                  </div>
                </div>

                {/* Título */}
                <div className="space-y-2">
                  <Label htmlFor="title">Título *</Label>
                  <Input
                    id="title"
                    placeholder="Descreva o motivo do atendimento"
                    value={newTicket.title}
                    onChange={(e) => setNewTicket(prev => ({ ...prev, title: e.target.value }))}
                  />
                </div>

                {/* Cliente */}
                {newTicketType === 'client' ? (
                  <div className="space-y-2">
                    <Label htmlFor="client">Cliente *</Label>
                    <Select 
                      value={newTicket.selectedClient} 
                      onValueChange={(value) => setNewTicket(prev => ({ ...prev, selectedClient: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um cliente" />
                      </SelectTrigger>
                      <SelectContent>
                        {(clients || []).map((client: any) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.name} - {client.phone}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="clientName">Nome do Cliente *</Label>
                      <Input
                        id="clientName"
                        placeholder="Nome completo"
                        value={newTicket.clientName}
                        onChange={(e) => setNewTicket(prev => ({ ...prev, clientName: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="clientPhone">Telefone</Label>
                      <Input
                        id="clientPhone"
                        placeholder="(11) 99999-9999"
                        value={newTicket.clientPhone}
                        onChange={(e) => setNewTicket(prev => ({ ...prev, clientPhone: e.target.value }))}
                      />
                    </div>
                  </div>
                )}

                {/* Atendente */}
                <div className="space-y-2">
                  <Label htmlFor="assignedTo">Atendente Responsável *</Label>
                  <Select 
                    value={newTicket.assignedTo} 
                    onValueChange={(value) => setNewTicket(prev => ({ ...prev, assignedTo: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um atendente" />
                    </SelectTrigger>
                    <SelectContent>
                      {(agents || []).map((agent: any) => (
                        <SelectItem key={agent.id} value={agent.name}>
                          {agent.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Prioridade */}
                <div className="space-y-2">
                  <Label htmlFor="priority">Prioridade</Label>
                  <Select 
                    value={newTicket.priority} 
                    onValueChange={(value) => setNewTicket(prev => ({ ...prev, priority: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(priorityLabels).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Descrição */}
                <div className="space-y-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    placeholder="Detalhes adicionais sobre o atendimento"
                    value={newTicket.description}
                    onChange={(e) => setNewTicket(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                  />
                </div>

                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setShowNewTicketModal(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleCreateTicket}>
                    Criar Atendimento
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search and Advanced Filters */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Pesquisar por ticket, cliente, atendente ou telefone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search-tickets"
            />
          </div>
        </div>

        {showFilters && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium">Filtros Avançados</h3>
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-2" />
                  Limpar
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="space-y-2">
                  <Label>Atendente</Label>
                  <Select 
                    value={filters.assignedTo} 
                    onValueChange={(value) => setFilters(prev => ({ ...prev, assignedTo: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {(agents || []).map((agent: any) => (
                        <SelectItem key={agent.id} value={agent.id}>
                          {agent.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Cliente - NOVO */}
                <div className="space-y-2">
                  <Label>Cliente</Label>
                  <Select 
                    value={filters.clientId} 
                    onValueChange={(value) => setFilters(prev => ({ ...prev, clientId: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {(clients || []).map((client: any) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Setor (Fila) - NOVO */}
                <div className="space-y-2">
                  <Label>Setor</Label>
                  <Select 
                    value={filters.queueId} 
                    onValueChange={(value) => setFilters(prev => ({ ...prev, queueId: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {/* Buscar filas da API */}
                      <SelectItem value="support">Suporte</SelectItem>
                      <SelectItem value="sales">Vendas</SelectItem>
                      <SelectItem value="financial">Financeiro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Protocolo - NOVO */}
                <div className="space-y-2">
                  <Label>Protocolo</Label>
                  <Input
                    placeholder="Ex: 0910250001"
                    value={filters.protocolNumber}
                    onChange={(e) => setFilters(prev => ({ ...prev, protocolNumber: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Prioridade</Label>
                  <Select 
                    value={filters.priority} 
                    onValueChange={(value) => setFilters(prev => ({ ...prev, priority: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      {Object.entries(priorityLabels).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Data Início</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !filters.dateFrom && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {filters.dateFrom ? format(filters.dateFrom, "dd/MM/yyyy", { locale: ptBR }) : "Selecionar"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={filters.dateFrom}
                        onSelect={(date) => setFilters(prev => ({ ...prev, dateFrom: date }))}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>Data Fim</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !filters.dateTo && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {filters.dateTo ? format(filters.dateTo, "dd/MM/yyyy", { locale: ptBR }) : "Selecionar"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={filters.dateTo}
                        onSelect={(date) => setFilters(prev => ({ ...prev, dateTo: date }))}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Status Tabs */}
      <div className="border-b border-border">
        <div className="flex space-x-0 overflow-x-auto">
          {Object.entries(statusLabels).map(([status, label]) => (
            <button
              key={status}
              onClick={() => {
                setActiveTab(status as TicketStatus);
                setFilters(prev => ({ ...prev, status: status === 'all' ? 'all' : status }));
              }}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === status
                  ? 'border-primary text-primary bg-primary/5'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground'
              }`}
              data-testid={`tab-${status}`}
            >
              <div className="flex items-center space-x-2">
                {status !== 'all' && getStatusIcon(status as TicketStatus)}
                <span>{label}</span>
                <Badge variant="secondary" className="ml-1">
                  {counts[status as keyof typeof counts] || 0}
                </Badge>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Tickets List */}
      <div className="flex-1 space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : !ticketsData?.tickets || ticketsData.tickets.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Nenhum Registro Encontrado
            </h3>
            <p className="text-muted-foreground">
              {searchQuery 
                ? 'Nenhum ticket corresponde aos critérios de pesquisa'
                : `Nenhum ticket ${activeTab !== 'all' ? statusLabels[activeTab].toLowerCase() : ''} encontrado`
              }
            </p>
          </div>
        ) : (
          (ticketsData?.tickets || []).map((ticket: any) => (
            <Card 
              key={ticket.id} 
              className="hover:shadow-md transition-shadow"
            >
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="font-semibold text-foreground">
                        {ticket.protocolNumber || `#${ticket.id.slice(0, 6)}`}
                      </h3>
                      <Badge 
                        variant="secondary" 
                        className={statusColors[mapStatusToUI(ticket.status)]}
                      >
                        {statusLabels[mapStatusToUI(ticket.status)]}
                      </Badge>
                      <Badge 
                        variant="outline" 
                        className={priorityColors[ticket.priority]}
                      >
                        {priorityLabels[ticket.priority]}
                      </Badge>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-1">
                      Cliente: {ticket.clientName || ticket.contactName}
                    </p>
                    
                    <p className="text-sm text-muted-foreground mb-2">
                      Telefone: {ticket.contactPhone}
                    </p>

                    <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                      <div className="flex items-center space-x-1">
                        <User className="h-3 w-3" />
                        <span>Atendente: {ticket.assignedAgentName || 'Não atribuído'}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <CalendarDays className="h-3 w-3" />
                        <span>Criado: {format(new Date(ticket.createdAt), "dd/MM/yyyy HH:mm")}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={(e) => {
                            e.stopPropagation(); // Prevenir abertura do modal de conversa
                          }}
                          data-testid={`button-more-${ticket.id}`}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem 
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedConversation(ticket.id);
                            setShowConversationModal(true);
                          }}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Ver Conversa
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTicket(ticket);
                            setShowAssignModal(true);
                          }}
                        >
                          <UserPlus className="h-4 w-4 mr-2" />
                          Atribuir Atendimento
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTicket(ticket);
                            setShowFinishModal(true);
                          }}
                          disabled={ticket.status === 'completed' || ticket.status === 'closed'}
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Fechar Atendimento
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTicket(ticket);
                            setShowCancelModal(true);
                          }}
                          disabled={ticket.status === 'completed' || ticket.status === 'closed'}
                          className="text-destructive focus:text-destructive"
                        >
                          <Ban className="h-4 w-4 mr-2" />
                          Cancelar Atendimento
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Paginação */}
      {ticketsData?.pagination && (
        <div className="flex items-center justify-between border-t pt-4">
          <div className="text-sm text-muted-foreground">
            Mostrando {ticketsData.tickets.length} de {ticketsData.pagination.total} atendimentos
          </div>
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              disabled={ticketsData.pagination.page === 1}
              onClick={() => setPage(prev => prev - 1)}
            >
              Anterior
            </Button>
            <span className="text-sm">
              Página {ticketsData.pagination.page} de {ticketsData.pagination.totalPages}
            </span>
            <Button 
              variant="outline" 
              size="sm" 
              disabled={ticketsData.pagination.page === ticketsData.pagination.totalPages}
              onClick={() => setPage(prev => prev + 1)}
            >
              Próximo
            </Button>
          </div>
        </div>
      )}

      {/* Modal Atribuir Atendimento */}
      <Dialog open={showAssignModal} onOpenChange={setShowAssignModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Atribuir Atendimento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Atendente</Label>
              <Select 
                value={selectedAgentId}
                onValueChange={setSelectedAgentId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um atendente" />
                </SelectTrigger>
                <SelectContent>
                  {(agents || []).map((agent: any) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => {
                setShowAssignModal(false);
                setSelectedAgentId('');
                setSelectedTicket(null);
              }}>
                Cancelar
              </Button>
              <Button onClick={handleAssignTicket} disabled={!selectedAgentId}>
                Atribuir
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Fechar Atendimento */}
      <Dialog open={showFinishModal} onOpenChange={setShowFinishModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Fechar Atendimento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Tem certeza que deseja fechar este atendimento?
            </p>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => {
                setShowFinishModal(false);
                setSelectedTicket(null);
              }}>
                Cancelar
              </Button>
              <Button onClick={handleFinishTicket}>
                Fechar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Cancelar Atendimento */}
      <Dialog open={showCancelModal} onOpenChange={setShowCancelModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar Atendimento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Tem certeza que deseja cancelar este atendimento? Esta ação não pode ser desfeita.
            </p>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => {
                setShowCancelModal(false);
                setSelectedTicket(null);
              }}>
                Voltar
              </Button>
              <Button variant="destructive" onClick={handleCancelTicket}>
                Cancelar Atendimento
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Visualização de Conversa */}
      <Dialog open={showConversationModal} onOpenChange={(open) => {
        setShowConversationModal(open);
        if (!open) setSelectedConversation(null);
      }}>
        <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>
              Conversa - {conversationData?.conversation?.protocolNumber || 'Carregando...'}
            </DialogTitle>
          </DialogHeader>
          
          {loadingMessages ? (
            <div className="flex items-center justify-center flex-1">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : conversationData ? (
            <div className="flex-1 overflow-y-auto space-y-4 p-4">
              {/* Informações da conversa */}
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Cliente:</span>
                    <p className="font-medium">{conversationData.conversation.contactName}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Telefone:</span>
                    <p className="font-medium">{conversationData.conversation.contactPhone}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Atendente:</span>
                    <p className="font-medium">
                      {conversationData.conversation.assignedAgentName || 'Não atribuído'}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Status:</span>
                    <Badge className={statusColors[mapStatusToUI(conversationData.conversation.status)]}>
                      {statusLabels[mapStatusToUI(conversationData.conversation.status)]}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Lista de mensagens */}
              <div className="space-y-3">
                {conversationData.messages.map((message: any) => (
                  <div
                    key={message.id}
                    className={cn(
                      "flex",
                      message.direction === 'outgoing' ? 'justify-end' : 'justify-start'
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[70%] rounded-lg p-3 space-y-1",
                        message.direction === 'outgoing'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      )}
                    >
                      {message.messageType !== 'text' && (
                        <div className="text-xs opacity-70 mb-1">
                          {message.messageType === 'image' && '📷 Imagem'}
                          {message.messageType === 'video' && '🎥 Vídeo'}
                          {message.messageType === 'audio' && '🎤 Áudio'}
                          {message.messageType === 'voice' && '🎤 Mensagem de Voz'}
                          {message.messageType === 'document' && '📄 Documento'}
                        </div>
                      )}
                      
                      {message.content && (
                        <p className="text-sm whitespace-pre-wrap break-words">
                          {message.content}
                        </p>
                      )}
                      
                      {message.mediaUrl && (
                        <div className="mt-2">
                          {message.messageType === 'image' && (
                            <img 
                              src={message.mediaUrl} 
                              alt="Mídia" 
                              className="max-w-full rounded"
                            />
                          )}
                          {(message.messageType === 'audio' || message.messageType === 'voice') && (
                            <audio src={message.mediaUrl} controls className="w-full" />
                          )}
                          {message.messageType === 'video' && (
                            <video src={message.mediaUrl} controls className="max-w-full rounded" />
                          )}
                          {message.messageType === 'document' && (
                            <a 
                              href={message.mediaUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-xs underline"
                            >
                              Baixar documento
                            </a>
                          )}
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between gap-2 text-xs opacity-70 mt-1">
                        <span>
                          {format(new Date(message.sentAt), "dd/MM/yyyy HH:mm")}
                        </span>
                        {message.direction === 'outgoing' && message.status && (
                          <span className="capitalize">{message.status}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {conversationData.messages.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhuma mensagem nesta conversa
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              Erro ao carregar conversa
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}