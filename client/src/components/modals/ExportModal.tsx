import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  Download, 
  FileText, 
  Calendar as CalendarIcon,
  Database,
  MessageSquare,
  Users,
  Settings
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface ExportModalProps {
  children: React.ReactNode;
  conversationId?: string;
}

export function ExportModal({ children, conversationId }: ExportModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [exportType, setExportType] = useState<'conversations' | 'messages'>('conversations');
  const [format, setFormat] = useState<'csv' | 'json'>('csv');
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: undefined,
    to: undefined
  });
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    
    try {
      let url = '';
      const params = new URLSearchParams();
      
      if (exportType === 'conversations') {
        url = '/api/whatsapp/export/conversations';
        params.append('format', format);
        
        if (dateRange.from) {
          params.append('dateFrom', dateRange.from.toISOString());
        }
        if (dateRange.to) {
          params.append('dateTo', dateRange.to.toISOString());
        }
      } else {
        url = '/api/whatsapp/export/messages';
        params.append('format', format);
        
        if (conversationId) {
          params.append('conversationId', conversationId);
        }
      }

      const fullUrl = `${url}?${params.toString()}`;
      
      // Criar link temporário para download
      const link = document.createElement('a');
      link.href = fullUrl;
      link.download = `export-${exportType}-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setIsOpen(false);
    } catch (error) {
      console.error('Erro ao exportar:', error);
      alert('Erro ao exportar dados. Tente novamente.');
    } finally {
      setIsExporting(false);
    }
  };

  const getExportIcon = (type: string) => {
    switch (type) {
      case 'conversations': return <MessageSquare className="h-5 w-5" />;
      case 'messages': return <FileText className="h-5 w-5" />;
      default: return <Database className="h-5 w-5" />;
    }
  };

  const getExportDescription = (type: string) => {
    switch (type) {
      case 'conversations': 
        return 'Exportar lista de conversas com informações de clientes, status e datas';
      case 'messages': 
        return 'Exportar mensagens de uma conversa específica com conteúdo e metadados';
      default: 
        return '';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Exportar Dados
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Tipo de Export */}
          <div>
            <Label className="text-base font-semibold">Tipo de Export</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
              <Card 
                className={`cursor-pointer transition-all ${
                  exportType === 'conversations' 
                    ? 'ring-2 ring-blue-500 bg-blue-50' 
                    : 'hover:bg-gray-50'
                }`}
                onClick={() => setExportType('conversations')}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <MessageSquare className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-medium">Conversas</h3>
                      <p className="text-sm text-gray-600">
                        Lista de conversas com clientes
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card 
                className={`cursor-pointer transition-all ${
                  exportType === 'messages' 
                    ? 'ring-2 ring-green-500 bg-green-50' 
                    : 'hover:bg-gray-50'
                }`}
                onClick={() => setExportType('messages')}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <FileText className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-medium">Mensagens</h3>
                      <p className="text-sm text-gray-600">
                        Mensagens de uma conversa
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Formato */}
          <div>
            <Label htmlFor="format">Formato de Export</Label>
            <Select value={format} onValueChange={(value: 'csv' | 'json') => setFormat(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    CSV (Excel)
                  </div>
                </SelectItem>
                <SelectItem value="json">
                  <div className="flex items-center gap-2">
                    <Database className="h-4 w-4" />
                    JSON (Dados Estruturados)
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Filtros de Data (apenas para conversas) */}
          {exportType === 'conversations' && (
            <div>
              <Label className="text-base font-semibold">Período</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                <div>
                  <Label htmlFor="dateFrom">Data Inicial</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !dateRange.from && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateRange.from ? (
                          format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })
                        ) : (
                          "Selecionar data"
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={dateRange.from}
                        onSelect={(date) => setDateRange({ ...dateRange, from: date })}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <Label htmlFor="dateTo">Data Final</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !dateRange.to && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateRange.to ? (
                          format(dateRange.to, "dd/MM/yyyy", { locale: ptBR })
                        ) : (
                          "Selecionar data"
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={dateRange.to}
                        onSelect={(date) => setDateRange({ ...dateRange, to: date })}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>
          )}

          {/* Informações do Export */}
          <Card className="bg-gray-50">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  {getExportIcon(exportType)}
                </div>
                <div className="flex-1">
                  <h4 className="font-medium mb-1">
                    {exportType === 'conversations' ? 'Export de Conversas' : 'Export de Mensagens'}
                  </h4>
                  <p className="text-sm text-gray-600 mb-2">
                    {getExportDescription(exportType)}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">
                      Formato: {format.toUpperCase()}
                    </Badge>
                    {exportType === 'conversations' && dateRange.from && dateRange.to && (
                      <Badge variant="outline">
                        Período: {format(dateRange.from, "dd/MM", { locale: ptBR })} - {format(dateRange.to, "dd/MM", { locale: ptBR })}
                      </Badge>
                    )}
                    {exportType === 'messages' && conversationId && (
                      <Badge variant="outline">
                        Conversa: {conversationId.slice(0, 8)}...
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Botões de Ação */}
          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleExport}
              disabled={isExporting || (exportType === 'conversations' && !dateRange.from && !dateRange.to)}
              className="flex-1"
            >
              {isExporting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Exportando...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Exportar Dados
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
            >
              Cancelar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}


