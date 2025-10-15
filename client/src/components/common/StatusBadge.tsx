import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Clock, CheckCircle, XCircle, Ban } from 'lucide-react';

type Status = 'open' | 'in_progress' | 'closed' | 'canceled';

interface StatusBadgeProps {
  status: Status;
  showIcon?: boolean;
  className?: string;
}

const statusConfig = {
  open: { 
    label: 'Aberto', 
    className: 'bg-blue-500 hover:bg-blue-600',
    icon: Clock
  },
  in_progress: { 
    label: 'Em Andamento', 
    className: 'bg-yellow-500 hover:bg-yellow-600',
    icon: Clock
  },
  closed: { 
    label: 'Fechado', 
    className: 'bg-green-500 hover:bg-green-600',
    icon: CheckCircle
  },
  canceled: { 
    label: 'Cancelado', 
    className: 'bg-gray-500 hover:bg-gray-600',
    icon: Ban
  }
};

export function StatusBadge({ status, showIcon = true, className }: StatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;
  
  return (
    <Badge className={cn(config.className, 'text-white gap-1', className)}>
      {showIcon && <Icon className="h-3 w-3" />}
      {config.label}
    </Badge>
  );
}
