import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type Priority = 'low' | 'medium' | 'high' | 'urgent';

interface PriorityBadgeProps {
  priority: Priority;
  className?: string;
}

const priorityConfig = {
  low: { label: 'Baixa', className: 'bg-green-500 hover:bg-green-600' },
  medium: { label: 'Média', className: 'bg-yellow-500 hover:bg-yellow-600' },
  high: { label: 'Alta', className: 'bg-orange-500 hover:bg-orange-600' },
  urgent: { label: 'Urgente', className: 'bg-red-500 hover:bg-red-600' }
};

export function PriorityBadge({ priority, className }: PriorityBadgeProps) {
  const config = priorityConfig[priority];
  
  return (
    <Badge className={cn(config.className, 'text-white', className)}>
      {config.label}
    </Badge>
  );
}
