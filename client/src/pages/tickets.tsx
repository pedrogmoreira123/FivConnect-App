import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/use-auth';
import { useT } from '@/hooks/use-translation';
import { useMobile } from '@/hooks/use-mobile';
import { 
  Search, 
  Filter, 
  Plus, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  User,
  Calendar,
  MoreHorizontal
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

// Mock data
const mockTickets: Ticket[] = [
  {
    id: '#65774',
    title: 'Pedrito Pão Quente',
    description: 'Oi',
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
    title: 'Kaitã Sartori',
    description: 'THE Black Tie - dia',
    status: 'open',
    priority: 'medium',
    assignedTo: 'Lúcas',
    createdBy: 'System',
    createdAt: '28/08/2025 16:40',
    updatedAt: '28/08/2025 16:40',
    clientName: 'Kaitã Sartori - THE Black Tie - dia',
    clientPhone: '551129404727',
    tags: ['Atendendo', 'Suporte Técnico', 'Não Informado']
  },
  {
    id: '#65770',
    title: 'Everton - Impeotto',
    description: 'Tropeiros',
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
    title: 'Tatiana - Biasa Confeitaria',
    description: 'conversa iniciada por Guilherme',
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
    title: 'Paulo - PastRão',
    description: 'Bom dia',
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

const statusLabels = {
  all: 'Todos',
  open: 'Aberto',
  in_progress: 'Em Andamento', 
  closed: 'Fechado',
  canceled: 'Cancelado'
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
  const [activeTab, setActiveTab] = useState<TicketStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // RBAC: Filter tickets based on user role
  const getFilteredTickets = () => {
    let filteredTickets = mockTickets;

    // Role-based filtering
    if (user?.role !== 'admin') {
      // Non-admin users only see their own assigned tickets
      filteredTickets = filteredTickets.filter(ticket => 
        ticket.assignedTo === user?.name
      );
    }

    // Status filtering
    if (activeTab !== 'all') {
      filteredTickets = filteredTickets.filter(ticket => ticket.status === activeTab);
    }

    // Search filtering
    if (searchQuery) {
      filteredTickets = filteredTickets.filter(ticket =>
        ticket.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ticket.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ticket.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ticket.clientPhone.includes(searchQuery)
      );
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
            Filtrar
          </Button>
          <Button size="sm" data-testid="button-new-ticket">
            <Plus className="h-4 w-4 mr-2" />
            Novo Atendimento
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Pesquisar tickets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="input-search-tickets"
          />
        </div>
        {showFilters && (
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm">Filtros avançados</Button>
          </div>
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
              Nenhum Registro Encontrado na Consulta
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
                        {ticket.priority === 'low' ? 'Baixa' : 
                         ticket.priority === 'medium' ? 'Média' :
                         ticket.priority === 'high' ? 'Alta' : 'Urgente'}
                      </Badge>
                    </div>
                    
                    <h4 className="font-medium text-foreground mb-1">
                      {ticket.clientName}
                    </h4>
                    
                    <p className="text-sm text-muted-foreground mb-2">
                      {ticket.clientPhone}
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
                        <span>{ticket.assignedTo}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-3 w-3" />
                        <span>{ticket.createdAt}</span>
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

      {/* Pagination (if needed) */}
      {filteredTickets.length > 0 && (
        <div className="flex items-center justify-between border-t border-border pt-4">
          <div className="text-sm text-muted-foreground">
            Mostrando {filteredTickets.length} de {filteredTickets.length} tickets
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