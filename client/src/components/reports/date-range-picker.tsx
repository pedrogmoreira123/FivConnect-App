import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, RefreshCw } from 'lucide-react';
import { useT } from '@/hooks/use-translation';

interface DateRangePickerProps {
  onDateRangeChange: (dateRange: { from: string; to: string; period: string }) => void;
}

export default function DateRangePicker({ onDateRangeChange }: DateRangePickerProps) {
  const { t } = useT();
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [period, setPeriod] = useState('weekly');

  const handleGenerateReport = () => {
    onDateRangeChange({
      from: fromDate,
      to: toDate,
      period
    });
  };

  const setQuickDateRange = (days: number) => {
    const today = new Date();
    const pastDate = new Date(today.getTime() - (days * 24 * 60 * 60 * 1000));
    
    setFromDate(pastDate.toISOString().split('T')[0]);
    setToDate(today.toISOString().split('T')[0]);
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-col space-y-4 md:flex-row md:space-y-0 md:space-x-4 md:items-end">
          <div className="flex-1">
            <Label htmlFor="from-date">{t('reports.from')}</Label>
            <Input
              id="from-date"
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              data-testid="input-from-date"
            />
          </div>
          
          <div className="flex-1">
            <Label htmlFor="to-date">{t('reports.to')}</Label>
            <Input
              id="to-date"
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              data-testid="input-to-date"
            />
          </div>
          
          <div className="flex-1">
            <Label>{t('reports.period.daily')}</Label>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger data-testid="select-period">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">{t('reports.period.daily')}</SelectItem>
                <SelectItem value="weekly">{t('reports.period.weekly')}</SelectItem>
                <SelectItem value="monthly">{t('reports.period.monthly')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setQuickDateRange(7)}
              data-testid="button-last-7-days"
            >
              Últimos 7 dias
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setQuickDateRange(30)}
              data-testid="button-last-30-days"
            >
              Últimos 30 dias
            </Button>
          </div>
          
          <Button
            onClick={handleGenerateReport}
            className="flex items-center space-x-2"
            data-testid="button-generate-report"
          >
            <RefreshCw className="h-4 w-4" />
            <span>{t('reports.generateReport')}</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}