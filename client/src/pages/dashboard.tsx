import { Card, CardContent } from '@/components/ui/card';
import QueueVolumeChart from '@/components/charts/queue-volume-chart';
import WeeklyPerformanceChart from '@/components/charts/weekly-performance-chart';
import { mockKPIData, mockRecentActivity, mockChartData } from '@/lib/mock-data';
import { MessageCircle, UserCheck, Clock, CheckCircle, User, Check, Plus } from 'lucide-react';

export default function DashboardPage() {
  const kpiData = mockKPIData;
  const recentActivity = mockRecentActivity;
  const chartData = mockChartData;

  const kpiCards = [
    {
      title: 'Open Conversations',
      value: kpiData.openConversations,
      icon: MessageCircle,
      iconColor: 'text-primary',
      bgColor: 'bg-primary/10'
    },
    {
      title: 'Online Agents',
      value: kpiData.onlineAgents,
      icon: UserCheck,
      iconColor: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      title: 'Avg. Waiting Time',
      value: kpiData.avgWaitingTime,
      icon: Clock,
      iconColor: 'text-yellow-600',
      bgColor: 'bg-yellow-100'
    },
    {
      title: 'Completed Today',
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
    <div className="p-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {kpiCards.map((kpi, index) => {
          const Icon = kpi.icon;
          return (
            <Card key={index}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-sm font-medium" data-testid={`text-kpi-${index}-title`}>
                      {kpi.title}
                    </p>
                    <p className="text-2xl font-bold text-foreground" data-testid={`text-kpi-${index}-value`}>
                      {kpi.value}
                    </p>
                  </div>
                  <div className={`w-10 h-10 ${kpi.bgColor} rounded-lg flex items-center justify-center`}>
                    <Icon className={`${kpi.iconColor}`} size={20} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts and Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Volume per Queue (Last 24h)
            </h3>
            <QueueVolumeChart data={chartData.queueVolume} />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Recent Activity
            </h3>
            <div className="space-y-4">
              {recentActivity.map((activity, index) => {
                const Icon = getActivityIcon(activity.type);
                const colorClass = getActivityColor(activity.type);
                
                return (
                  <div key={activity.id} className="flex items-center space-x-3" data-testid={`activity-${index}`}>
                    <div className={`w-8 h-8 ${colorClass} rounded-full flex items-center justify-center`}>
                      <Icon className="text-white text-sm" size={16} />
                    </div>
                    <div>
                      <p className="text-sm text-foreground">
                        {activity.type === 'handled' && (
                          <>
                            Agent <span className="font-medium">{activity.agentName}</span> handled client{' '}
                            <span className="font-medium">{activity.clientName}</span>
                          </>
                        )}
                        {activity.type === 'completed' && (
                          <>
                            Conversation completed by <span className="font-medium">{activity.agentName}</span>
                          </>
                        )}
                        {activity.type === 'assigned' && (
                          <>
                            New conversation assigned to <span className="font-medium">{activity.agentName}</span>
                          </>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">{activity.timestamp}</p>
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
