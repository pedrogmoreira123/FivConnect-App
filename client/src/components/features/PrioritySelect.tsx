import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PriorityBadge } from '@/components/common/PriorityBadge';

interface PrioritySelectProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function PrioritySelect({ value, onChange, disabled }: PrioritySelectProps) {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="w-full">
        <SelectValue>
          <PriorityBadge priority={value as any} />
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="low">
          <PriorityBadge priority="low" />
        </SelectItem>
        <SelectItem value="medium">
          <PriorityBadge priority="medium" />
        </SelectItem>
        <SelectItem value="high">
          <PriorityBadge priority="high" />
        </SelectItem>
        <SelectItem value="urgent">
          <PriorityBadge priority="urgent" />
        </SelectItem>
      </SelectContent>
    </Select>
  );
}
