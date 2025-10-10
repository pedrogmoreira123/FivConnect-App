import { Card, CardContent } from '@/components/ui/card';

interface TicketsTodayChartProps {
  data: number;
}

export default function TicketsTodayChart({ data }: TicketsTodayChartProps) {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <div className="text-4xl font-bold text-primary mb-2">
          {data}
        </div>
        <div className="text-sm text-muted-foreground">
          Chamados abertos hoje
        </div>
      </div>
    </div>
  );
}


