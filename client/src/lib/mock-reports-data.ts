// Mock data for advanced reports module
export const mockConversationsByPeriod = [
  { date: '2024-01-20', total: 45, completed: 38, avgTime: '3m 15s' },
  { date: '2024-01-21', total: 52, completed: 41, avgTime: '2m 58s' },
  { date: '2024-01-22', total: 38, completed: 35, avgTime: '4m 02s' },
  { date: '2024-01-23', total: 61, completed: 55, avgTime: '2m 45s' },
  { date: '2024-01-24', total: 43, completed: 39, avgTime: '3m 28s' },
  { date: '2024-01-25', total: 29, completed: 27, avgTime: '2m 12s' },
  { date: '2024-01-26', total: 31, completed: 28, avgTime: '3m 55s' }
];

export const mockClientRanking = [
  { 
    name: 'TechCorp Ltda', 
    ticketsOpened: 28, 
    lastActivity: '2024-01-26 14:30', 
    status: 'Ativo',
    email: 'contato@techcorp.com.br',
    phone: '+55 11 99999-9999'
  },
  { 
    name: 'Inovação & Serviços', 
    ticketsOpened: 22, 
    lastActivity: '2024-01-26 11:15', 
    status: 'Ativo',
    email: 'suporte@inovacao.com.br',
    phone: '+55 11 88888-8888'
  },
  { 
    name: 'Digital Solutions', 
    ticketsOpened: 19, 
    lastActivity: '2024-01-25 16:45', 
    status: 'Ativo',
    email: 'help@digitalsolutions.com.br',
    phone: '+55 11 77777-7777'
  },
  { 
    name: 'Global Enterprises', 
    ticketsOpened: 15, 
    lastActivity: '2024-01-24 09:20', 
    status: 'Inativo',
    email: 'contato@global.com.br',
    phone: '+55 11 66666-6666'
  },
  { 
    name: 'Smart Business', 
    ticketsOpened: 12, 
    lastActivity: '2024-01-23 13:10', 
    status: 'Ativo',
    email: 'atendimento@smartbusiness.com.br',
    phone: '+55 11 55555-5555'
  }
];

export const mockAgentPerformance = [
  {
    id: '1',
    name: 'Maria Silva',
    role: 'agent',
    resolvedTickets: 127,
    avgResponseTime: '2m 15s',
    avgClosingTime: '15m 30s',
    completionRate: 94,
    satisfactionRating: 4.8,
    initials: 'MS'
  },
  {
    id: '2',
    name: 'João Santos',
    role: 'agent',
    resolvedTickets: 98,
    avgResponseTime: '3m 42s',
    avgClosingTime: '18m 45s',
    completionRate: 89,
    satisfactionRating: 4.6,
    initials: 'JS'
  },
  {
    id: '3',
    name: 'Ana Costa',
    role: 'supervisor',
    resolvedTickets: 156,
    avgResponseTime: '1m 58s',
    avgClosingTime: '12m 20s',
    completionRate: 97,
    satisfactionRating: 4.9,
    initials: 'AC'
  },
  {
    id: '4',
    name: 'Carlos Lima',
    role: 'agent',
    resolvedTickets: 76,
    avgResponseTime: '4m 15s',
    avgClosingTime: '22m 10s',
    completionRate: 82,
    satisfactionRating: 4.3,
    initials: 'CL'
  }
];

export const mockQueueComparison = [
  {
    name: 'Suporte Técnico',
    volume: 234,
    avgTime: '8m 45s',
    satisfaction: 87,
    activeAgents: 4,
    waitingConversations: 12
  },
  {
    name: 'Vendas',
    volume: 189,
    avgTime: '5m 20s',
    satisfaction: 92,
    activeAgents: 3,
    waitingConversations: 6
  },
  {
    name: 'Pós-Vendas',
    volume: 145,
    avgTime: '12m 15s',
    satisfaction: 79,
    activeAgents: 2,
    waitingConversations: 8
  },
  {
    name: 'Financeiro',
    volume: 98,
    avgTime: '6m 30s',
    satisfaction: 84,
    activeAgents: 2,
    waitingConversations: 3
  }
];

export const mockWeeklyConversationsTrend = [
  { week: 'Sem 1', conversations: 234, completed: 198 },
  { week: 'Sem 2', conversations: 287, completed: 245 },
  { week: 'Sem 3', conversations: 312, completed: 278 },
  { week: 'Sem 4', conversations: 298, completed: 267 }
];