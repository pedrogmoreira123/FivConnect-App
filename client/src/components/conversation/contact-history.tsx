import { ContactHistory } from '@/types';

interface ContactHistoryProps {
  history: ContactHistory[];
}

export default function ContactHistoryComponent({ history }: ContactHistoryProps) {
  return (
    <div className="w-80 border-l border-border p-4">
      <h3 className="font-semibold text-foreground mb-4">Contact History</h3>
      <div className="space-y-4" data-testid="contact-history">
        {history.map((item) => (
          <div key={item.id} className="p-3 bg-muted rounded-lg" data-testid={`history-item-${item.id}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-foreground" data-testid={`text-history-type-${item.id}`}>
                {item.type}
              </span>
              <span className="text-xs text-muted-foreground" data-testid={`text-history-time-${item.id}`}>
                {item.timestamp}
              </span>
            </div>
            <p className="text-sm text-muted-foreground" data-testid={`text-history-description-${item.id}`}>
              {item.description}
            </p>
          </div>
        ))}
        {history.length === 0 && (
          <div className="text-center text-muted-foreground py-8">
            No previous interactions found
          </div>
        )}
      </div>
    </div>
  );
}
