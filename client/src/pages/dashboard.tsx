import { Card, CardContent } from '@/components/ui/card';
import QueueVolumeChart from '@/components/charts/queue-volume-chart';
import WeeklyPerformanceChart from '@/components/charts/weekly-performance-chart';
import { mockKPIData, mockRecentActivity, mockChartData } from '@/lib/mock-data';
import { useT } from '@/hooks/use-translation';
import { MessageCircle, UserCheck, Clock, CheckCircle, User, Check, Plus } from 'lucide-react';

export default function DashboardPage() {
  const { t } = useT();
  const kpiData = mockKPIData;
  const recentActivity = mockRecentActivity;
  const chartData = mockChartData;

  const kpiCards = [
    {
      title: t('dashboard.openConversations'),
      value: kpiData.openConversations,
      icon: MessageCircle,
      iconColor: 'text-primary',
      bgColor: 'bg-primary/10'
    },
    {
      title: t('dashboard.onlineAgents'),
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

      {/* Charts and Activity */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-6">
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

        <Card>
          <CardContent className="p-3 sm:p-4 md:p-6">
            <h3 className="text-base sm:text-lg font-semibold text-foreground mb-3 md:mb-4">
              {t('dashboard.recentActivity')}
            </h3>
            <div className="space-y-3 sm:space-y-4">
              {recentActivity.map((activity, index) => {
                const Icon = getActivityIcon(activity.type);
                const colorClass = getActivityColor(activity.type);
                
                return (
                  <div key={activity.id} className="flex items-start space-x-3" data-testid={`activity-${index}`}>
                    <div className={`w-6 h-6 sm:w-8 sm:h-8 ${colorClass} rounded-full flex items-center justify-center flex-shrink-0 mt-0.5`}>
                      <Icon className="text-white" size={12} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm text-foreground leading-relaxed">
                        {activity.type === 'handled' && 
                          t('dashboard.activity.handled', { 
                            agentName: activity.agentName,
                            clientName: activity.clientName
                          })
                        }
                        {activity.type === 'completed' && 
                          t('dashboard.activity.completed', { 
                            agentName: activity.agentName
                          })
                        }
                        {activity.type === 'assigned' && 
                          t('dashboard.activity.assigned', { 
                            agentName: activity.agentName
                          })
                        }
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">{activity.timestamp}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
