import { Card, CardContent } from '@/components/ui/card';
import WeeklyPerformanceChart from '@/components/charts/weekly-performance-chart';
import { mockChartData, mockUsers } from '@/lib/mock-data';

export default function ReportsPage() {
  const chartData = mockChartData;
  const agentPerformance = mockUsers.map((user, index) => ({
    ...user,
    chats: [24, 18, 15][index] || 12,
    avgTime: ['2m 15s', '3m 42s', '1m 58s'][index] || '2m 30s'
  }));

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold text-foreground mb-6">Reports</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Weekly Performance
            </h3>
            <WeeklyPerformanceChart data={chartData.weeklyPerformance} />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Agent Performance
            </h3>
            <div className="space-y-3">
              {agentPerformance.map((agent, index) => (
                <div 
                  key={agent.id} 
                  className="flex items-center justify-between p-3 bg-muted rounded-lg"
                  data-testid={`agent-performance-${index}`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                      <span className="text-primary-foreground text-sm font-medium">
                        {agent.initials}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-foreground" data-testid={`text-agent-name-${index}`}>
                        {agent.name}
                      </p>
                      <p className="text-sm text-muted-foreground" data-testid={`text-agent-role-${index}`}>
                        {agent.role === 'admin' ? 'Administrator' : 
                         agent.role === 'supervisor' ? 'Supervisor' : 'Agent'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-foreground" data-testid={`text-agent-chats-${index}`}>
                      {agent.chats} chats
                    </p>
                    <p className="text-sm text-muted-foreground" data-testid={`text-agent-avg-time-${index}`}>
                      {agent.avgTime} avg
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
