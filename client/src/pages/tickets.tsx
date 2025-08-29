import { useState } from 'react';
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
import { useAuth } from '@/hooks/use-auth';
import { useT } from '@/hooks/use-translation';
import { useMobile } from '@/hooks/use-mobile';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
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
  CalendarDays
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
  assignedTo: string;
  priority: string;
  dateFrom: Date | undefined;
  dateTo: Date | undefined;
}

// Mock data
const mockTickets: Ticket[] = [
  {
    id: '#65774',
    title: 'Problema com produto',
    description: 'Cliente relatou problema com o produto entregue',
    status: 'open',
    priority: 'medium',
    assignedTo: 'Guilherme',
    createdBy: 'System',
    createdAt: '28/08/2025 13:08',
    updatedAt: '28/08/2025 13:08',
    clientName: 'Pedrito Pão Quente / Biaso',
    clientPhone: '551199062500',
    tags: ['Atendendo', 'Suporte Técnico', 'Não Informado']
  },
  {
    id: '#65771',
    title: 'Dúvida sobre serviço',
    description: 'Cliente com dúvidas sobre serviços disponíveis',
    status: 'open',
    priority: 'medium',
    assignedTo: 'Lúcas',
    createdBy: 'System',
    createdAt: '28/08/2025 16:40',
    updatedAt: '28/08/2025 16:40',
    clientName: 'Kaitã Sartori - THE Black Tie',
    clientPhone: '551129404727',
    tags: ['Atendendo', 'Suporte Técnico', 'Não Informado']
  },
  {
    id: '#65770',
    title: 'Solicitação de orçamento',
    description: 'Cliente solicitou orçamento para evento',
    status: 'in_progress',
    priority: 'high',
    assignedTo: 'Guilherme',
    createdBy: 'System',
    createdAt: '28/08/2025 16:44',
    updatedAt: '28/08/2025 16:44',
    clientName: 'Everton - Impeotto',
    clientPhone: '551199062500',
    tags: ['Atendendo', 'Suporte Técnico', 'Não Informado']
  },
  {
    id: '#65769',
    title: 'Atendimento finalizado',
    description: 'Cliente teve sua solicitação atendida com sucesso',
    status: 'closed',
    priority: 'low',
    assignedTo: 'Guilherme',
    createdBy: 'Guilherme',
    createdAt: '29/08/2025 16:40',
    updatedAt: '29/08/2025 17:15',
    clientName: 'Tatiana - Biasa Confeitaria',
    clientPhone: '551790225579',
    tags: ['Atendendo', 'Não Informado']
  },
  {
    id: '#65767',
    title: 'Atendimento cancelado',
    description: 'Cliente não respondeu às tentativas de contato',
    status: 'canceled',
    priority: 'low',
    assignedTo: 'Lúcas',
    createdBy: 'System',
    createdAt: '29/08/2025 10:09',
    updatedAt: '29/08/2025 10:30',
    clientName: 'Paulo - PastRão',
    clientPhone: '555599201585',
    tags: ['Atendendo', 'Suporte Técnico', 'Não Informado']
  }
];

const mockAgents = [
  { id: '1', name: 'Guilherme' },
  { id: '2', name: 'Lúcas' },
  { id: '3', name: 'Ana Silva' },
  { id: '4', name: 'João Santos' }
];

const mockClients = [
  { id: '1', name: 'Pedrito Pão Quente', phone: '551199062500' },
  { id: '2', name: 'Kaitã Sartori', phone: '551129404727' },
  { id: '3', name: 'Everton Impeotto', phone: '551199062500' },
  { id: '4', name: 'Tatiana Biasa', phone: '551790225579' },
  { id: '5', name: 'Paulo PastRão', phone: '555599201585' }
];

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
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState<TicketStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showNewTicketModal, setShowNewTicketModal] = useState(false);
  const [newTicketType, setNewTicketType] = useState<'agent' | 'client'>('agent');
  
  const [filters, setFilters] = useState<FilterOptions>({
    assignedTo: '',
    priority: '',
    dateFrom: undefined,
    dateTo: undefined
  });

  const [newTicket, setNewTicket] = useState({
    title: '',
    description: '',
    priority: 'medium',
    assignedTo: '',
    clientName: '',
    clientPhone: '',
    selectedClient: ''
  });

  // RBAC: Filter tickets based on user role
  const getFilteredTickets = () => {
    let filteredTickets = mockTickets;

    // Role-based filtering
    if (user?.role !== 'admin') {
      filteredTickets = filteredTickets.filter(ticket => 
        ticket.assignedTo === user?.name
      );
    }

    // Status filtering
    if (activeTab !== 'all') {
      filteredTickets = filteredTickets.filter(ticket => ticket.status === activeTab);
    }

    // Search filtering (ticket ID, client name, agent, phone)
    if (searchQuery) {
      filteredTickets = filteredTickets.filter(ticket =>
        ticket.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ticket.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ticket.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ticket.assignedTo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ticket.clientPhone.includes(searchQuery)
      );
    }

    // Advanced filters
    if (filters.assignedTo) {
      filteredTickets = filteredTickets.filter(ticket => 
        ticket.assignedTo === filters.assignedTo
      );
    }

    if (filters.priority) {
      filteredTickets = filteredTickets.filter(ticket => 
        ticket.priority === filters.priority
      );
    }

    // Date filtering (basic implementation)
    if (filters.dateFrom || filters.dateTo) {
      filteredTickets = filteredTickets.filter(ticket => {
        const ticketDate = new Date(ticket.createdAt.split(' ')[0].split('/').reverse().join('-'));
        
        if (filters.dateFrom && ticketDate < filters.dateFrom) return false;
        if (filters.dateTo && ticketDate > filters.dateTo) return false;
        
        return true;
      });
    }

    return filteredTickets;
  };

  const filteredTickets = getFilteredTickets();

  const getStatusIcon = (status: TicketStatus) => {
    switch (status) {
      case 'open': return <AlertCircle className="h-4 w-4" />;
      case 'in_progress': return <Clock className="h-4 w-4" />;
      case 'closed': return <CheckCircle className="h-4 w-4" />;
      case 'canceled': return <XCircle className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getTicketCounts = () => {
    const userTickets = user?.role === 'admin' ? mockTickets : 
      mockTickets.filter(ticket => ticket.assignedTo === user?.name);
      
    return {
      all: userTickets.length,
      open: userTickets.filter(t => t.status === 'open').length,
      in_progress: userTickets.filter(t => t.status === 'in_progress').length,
      closed: userTickets.filter(t => t.status === 'closed').length,
      canceled: userTickets.filter(t => t.status === 'canceled').length,
    };
  };

  const counts = getTicketCounts();

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
      ? mockClients.find(c => c.id === newTicket.selectedClient)
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
      assignedTo: '',
      priority: '',
      dateFrom: undefined,
      dateTo: undefined
    });
    setSearchQuery('');
  };

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
        <div className="flex items-center space-x-2">
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
                        {mockClients.map((client) => (
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
                      {mockAgents.map((agent) => (
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
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                      <SelectItem value="">Todos</SelectItem>
                      {mockAgents.map((agent) => (
                        <SelectItem key={agent.id} value={agent.name}>
                          {agent.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                      <SelectItem value="">Todas</SelectItem>
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
              onClick={() => setActiveTab(status as TicketStatus)}
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
                  {counts[status as keyof typeof counts]}
                </Badge>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Tickets List */}
      <div className="flex-1 space-y-3">
        {filteredTickets.length === 0 ? (
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
          filteredTickets.map((ticket) => (
            <Card key={ticket.id} className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="font-semibold text-foreground">{ticket.id}</h3>
                      <Badge 
                        variant="secondary" 
                        className={statusColors[ticket.status]}
                      >
                        {statusLabels[ticket.status]}
                      </Badge>
                      <Badge 
                        variant="outline" 
                        className={priorityColors[ticket.priority]}
                      >
                        {priorityLabels[ticket.priority]}
                      </Badge>
                    </div>
                    
                    <h4 className="font-medium text-foreground mb-1">
                      {ticket.title}
                    </h4>
                    
                    <p className="text-sm text-muted-foreground mb-1">
                      Cliente: {ticket.clientName}
                    </p>
                    
                    <p className="text-sm text-muted-foreground mb-2">
                      Telefone: {ticket.clientPhone}
                    </p>

                    <div className="flex flex-wrap gap-1 mb-3">
                      {ticket.tags.map((tag, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>

                    <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                      <div className="flex items-center space-x-1">
                        <User className="h-3 w-3" />
                        <span>Atendente: {ticket.assignedTo}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <CalendarDays className="h-3 w-3" />
                        <span>Criado: {ticket.createdAt}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Button variant="ghost" size="sm" data-testid={`button-more-${ticket.id}`}>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Results Summary */}
      {filteredTickets.length > 0 && (
        <div className="flex items-center justify-between border-t border-border pt-4">
          <div className="text-sm text-muted-foreground">
            Mostrando {filteredTickets.length} de {mockTickets.length} atendimentos
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" disabled>
              Anterior
            </Button>
            <Button variant="outline" size="sm" disabled>
              Próximo
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}