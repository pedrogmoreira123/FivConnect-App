import { KPIData, ActivityItem, ConversationData, MessageData, UserRole, QueueData, ContactHistory, AppSettings, AIAgentSettings } from '@/types';

export const mockKPIData: KPIData = {
  openConversations: 24,
  onlineAgents: 8,
  avgWaitingTime: "2m 30s",
  completedConversations: 156
};

export const mockRecentActivity: ActivityItem[] = [
  {
    id: "1",
    type: "handled",
    agentName: "John Smith",
    clientName: "Maria Garcia",
    timestamp: "2 minutes ago",
    description: "handled client"
  },
  {
    id: "2",
    type: "completed",
    agentName: "Sarah Johnson",
    timestamp: "5 minutes ago",
    description: "Conversation completed"
  },
  {
    id: "3",
    type: "assigned",
    agentName: "Michael Brown",
    timestamp: "8 minutes ago",
    description: "New conversation assigned"
  }
];

export const mockInProgressConversations: ConversationData[] = [
  {
    id: "1",
    contactName: "Maria Garcia",
    contactPhone: "+55 11 99999-9999",
    lastMessage: "Thank you for your help!",
    time: "10:30 AM",
    status: "in_progress",
    initials: "MG"
  },
  {
    id: "2",
    contactName: "John Silva",
    contactPhone: "+55 11 88888-8888",
    lastMessage: "I need help with my order",
    time: "10:15 AM",
    status: "in_progress",
    initials: "JS"
  }
];

export const mockQueueConversations: ConversationData[] = [
  {
    id: "3",
    contactName: "Ana Rodriguez",
    contactPhone: "+55 11 77777-7777",
    lastMessage: "Hello, can someone help me?",
    time: "3m 20s ago",
    status: "waiting",
    initials: "AR"
  }
];

export const mockMessages: MessageData[] = [
  {
    id: "1",
    content: "Hello, I need help with my order #12345",
    direction: "incoming",
    timestamp: "10:15 AM",
    type: "text"
  },
  {
    id: "2",
    content: "Hi Maria! I'd be happy to help you with your order. Let me check the status for you.",
    direction: "outgoing",
    timestamp: "10:16 AM",
    type: "text"
  },
  {
    id: "3",
    content: "Thank you!",
    direction: "incoming",
    timestamp: "10:17 AM",
    type: "text"
  }
];

export const mockUsers: UserRole[] = [
  {
    id: "1",
    name: "John Doe",
    email: "john.doe@company.com",
    role: "admin",
    isOnline: true,
    initials: "JD"
  },
  {
    id: "2",
    name: "Sarah Johnson",
    email: "sarah.johnson@company.com",
    role: "supervisor",
    isOnline: true,
    initials: "SJ"
  },
  {
    id: "3",
    name: "Michael Brown",
    email: "michael.brown@company.com",
    role: "agent",
    isOnline: false,
    initials: "MB"
  }
];

export const mockQueues: QueueData[] = [
  {
    id: "1",
    name: "Technical Support",
    description: "Help with technical issues",
    workingHours: "Mon-Fri 9:00-18:00",
    activeConversations: 8,
    isActive: true
  },
  {
    id: "2",
    name: "Sales",
    description: "Sales inquiries and quotes",
    workingHours: "Mon-Sat 8:00-20:00",
    activeConversations: 12,
    isActive: true
  }
];

export const mockContactHistory: ContactHistory[] = [
  {
    id: "1",
    type: "Previous Chat",
    description: "Resolved billing inquiry",
    timestamp: "Yesterday"
  },
  {
    id: "2",
    type: "Order Support",
    description: "Helped with order tracking",
    timestamp: "Last week"
  }
];

export const mockAppSettings: AppSettings = {
  companyName: "Fi.V App",
  cnpj: "",
  primaryColor: "#3B82F6",
  secondaryColor: "#64748B",
  whatsappConnected: true
};

export const mockAIAgentSettings: AIAgentSettings = {
  isEnabled: true,
  welcomeMessage: "Hello! I'm your virtual assistant. How can I help you today?\n\nAvailable variables:\n- {{name}} - Customer name\n- {{protocol}} - Conversation protocol\n- {{datetime}} - Current date and time",
  responseDelay: 3
};

export const mockChartData = {
  queueVolume: {
    labels: ['Technical Support', 'Sales', 'Billing', 'General'],
    data: [24, 18, 12, 8]
  },
  weeklyPerformance: {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    data: [45, 52, 38, 65, 59, 42, 28]
  }
};
