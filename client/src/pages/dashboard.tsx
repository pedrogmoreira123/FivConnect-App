import { useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import QueueVolumeChart from '@/components/charts/queue-volume-chart';
import WeeklyPerformanceChart from '@/components/charts/weekly-performance-chart';
import TicketsTodayChart from '@/components/charts/tickets-today-chart';
import TicketsPerAgentChart from '@/components/charts/tickets-per-agent-chart';
import AnnouncementsCard from '@/components/announcements/announcements-card';
import { useT } from '@/hooks/use-translation';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { MessageCircle, UserCheck, Clock, CheckCircle, User, Check, Plus } from 'lucide-react';

export default function DashboardPage() {
  const { t } = useT();
  
  useEffect(() => {
    document.title = 'FivConnect - Dashboard';
  }, []);
  
  // Fetch real dashboard data
  const { data: kpiData = { openConversations: 0, onlineAgents: 0, avgWaitingTime: '0min', completedConversations: 0 } } = useQuery({
    queryKey: ['dashboard-kpis'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/dashboard/kpis');
      return response.json();
    }
  });

  const { data: recentActivity = [] } = useQuery({
    queryKey: ['dashboard-activity'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/dashboard/activity');
      return response.json();
    }
  });

  const { data: chartData = { queueVolume: [], weeklyPerformance: [] } } = useQuery({
    queryKey: ['dashboard-charts'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/dashboard/charts');
      return response.json();
    }
  });

  // Fetch new chart data
  const { data: ticketsTodayData = 0 } = useQuery({
    queryKey: ['dashboard-tickets-today'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/dashboard/charts/tickets-today');
      return response.json();
    }
  });

  const { data: ticketsPerAgentData = [] } = useQuery({
    queryKey: ['dashboard-tickets-per-agent'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/dashboard/charts/tickets-per-agent');
      return response.json();
    }
  });

  const kpiCards = [
    {
      title: t('dashboard.openConversations'),
      value: kpiData.openConversations,
      icon: MessageCircle,
      iconColor: 'text-primary',
      bgColor: 'bg-primary/10'
    },
    {
      title: t('dashboard.onlineUsers'),
      value: kpiData.onlineAgents,
      icon: UserCheck,
      iconColor: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      title: t('dashboard.avgWaitingTime'),
      value: kpiData.avgWaitingTime,
      icon: Clock,
      iconColor: 'text-yellow-600',
      bgColor: 'bg-yellow-100'
    },
    {
      title: t('dashboard.completedToday'),
      value: kpiData.completedConversations,
      icon: CheckCircle,
      iconColor: 'text-green-600',
      bgColor: 'bg-green-100'
    }
  ];

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'handled':
        return User;
      case 'completed':
        return Check;
      case 'assigned':
        return Plus;
      default:
        return User;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'handled':
        return 'bg-primary';
      case 'completed':
        return 'bg-green-500';
      case 'assigned':
        return 'bg-blue-500';
      default:
        return 'bg-primary';
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
        {kpiCards.map((kpi, index) => {
          const Icon = kpi.icon;
          return (
            <Card key={index}>
              <CardContent className="p-3 sm:p-4 md:p-6">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-muted-foreground text-xs sm:text-sm font-medium truncate" data-testid={`text-kpi-${index}-title`}>
                      {kpi.title}
                    </p>
                    <p className="text-lg sm:text-xl md:text-2xl font-bold text-foreground" data-testid={`text-kpi-${index}-value`}>
                      {kpi.value}
                    </p>
                  </div>
                  <div className={`w-8 h-8 sm:w-10 sm:h-10 ${kpi.bgColor} rounded-lg flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`${kpi.iconColor}`} size={16} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Announcements moved to top */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="p-3 sm:p-4 md:p-6">
              <h3 className="text-base sm:text-lg font-semibold text-foreground mb-3 md:mb-4">
                {t('dashboard.queueVolume')}
              </h3>
              <div className="h-48 sm:h-64 md:h-auto">
                <QueueVolumeChart data={chartData.queueVolume} />
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div>
          <AnnouncementsCard />
        </div>
      </div>

      {/* New Charts Section */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-6">
        <Card>
          <CardContent className="p-3 sm:p-4 md:p-6">
            <h3 className="text-base sm:text-lg font-semibold text-foreground mb-3 md:mb-4">
              {t('dashboard.ticketsToday')}
            </h3>
            <div className="h-48 sm:h-64 md:h-auto">
              <TicketsTodayChart data={ticketsTodayData} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-4 md:p-6">
            <h3 className="text-base sm:text-lg font-semibold text-foreground mb-3 md:mb-4">
              {t('dashboard.ticketsPerAgent')}
            </h3>
            <div className="h-48 sm:h-64 md:h-auto">
              <TicketsPerAgentChart data={ticketsPerAgentData} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Performance */}
      <div className="grid grid-cols-1 gap-4 md:gap-6">
        <Card>
          <CardContent className="p-3 sm:p-4 md:p-6">
            <h3 className="text-base sm:text-lg font-semibold text-foreground mb-3 md:mb-4">
              {t('dashboard.weeklyPerformance')}
            </h3>
            <div className="h-48 sm:h-64 md:h-auto">
              <WeeklyPerformanceChart data={chartData.weeklyPerformance} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
