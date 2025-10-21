import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  History, 
  User, 
  MessageSquare, 
  Settings, 
  Clock, 
  Search,
  Filter,
  Download,
  Eye
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AuditLog {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  userId?: string;
  oldValues?: any;
  newValues?: any;
  metadata?: any;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

interface AuditModalProps {
  children: React.ReactNode;
  entityType?: string;
  entityId?: string;
}

export function AuditModal({ children, entityType, entityId }: AuditModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState({
    entityType: entityType || '',
    action: '',
    limit: 50
  });

  // Buscar logs de auditoria
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['/api/whatsapp/audit/logs', filters],
    queryFn: async () => {
      let url = '/api/whatsapp/audit/logs';
      if (entityType && entityId) {
        url = `/api/whatsapp/audit/logs/entity/${entityType}/${entityId}`;
      }
      const res = await apiClient.get(url, { params: filters });
      return res.data.logs || [];
    },
    enabled: isOpen
  });

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'created': return <User className="h-4 w-4" />;
      case 'updated': return <Settings className="h-4 w-4" />;
      case 'deleted': return <MessageSquare className="h-4 w-4" />;
      case 'assigned': return <User className="h-4 w-4" />;
      default: return <History className="h-4 w-4" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'created': return 'bg-green-100 text-green-800';
      case 'updated': return 'bg-blue-100 text-blue-800';
      case 'deleted': return 'bg-red-100 text-red-800';
      case 'assigned': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getEntityTypeLabel = (entityType: string) => {
    switch (entityType) {
      case 'conversation': return 'Conversa';
      case 'message': return 'Mensagem';
      case 'user': return 'Usuário';
      case 'client': return 'Cliente';
      case 'queue': return 'Fila';
      default: return entityType;
    }
  };

  const formatValue = (value: any) => {
    if (typeof value === 'object' && value !== null) {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  };

  const exportLogs = () => {
    const csvHeader = 'Data,Ação,Entidade,ID,Usuário,IP,Detalhes\n';
    const csvData = logs.map((log: AuditLog) => 
      `"${log.createdAt}","${log.action}","${log.entityType}","${log.entityId}","${log.userId || ''}","${log.ipAddress || ''}","${JSON.stringify(log.metadata || {}).replace(/"/g, '""')}"`
    ).join('\n');
    
    const blob = new Blob([csvHeader + csvData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Histórico de Auditoria
            {entityType && entityId && (
              <Badge variant="outline">
                {getEntityTypeLabel(entityType)}: {entityId}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Filtros */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filtros
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="entityType">Tipo de Entidade</Label>
                  <Select
                    value={filters.entityType}
                    onValueChange={(value) => setFilters({ ...filters, entityType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todos os tipos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todos os tipos</SelectItem>
                      <SelectItem value="conversation">Conversas</SelectItem>
                      <SelectItem value="message">Mensagens</SelectItem>
                      <SelectItem value="user">Usuários</SelectItem>
                      <SelectItem value="client">Clientes</SelectItem>
                      <SelectItem value="queue">Filas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="action">Ação</Label>
                  <Select
                    value={filters.action}
                    onValueChange={(value) => setFilters({ ...filters, action: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todas as ações" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todas as ações</SelectItem>
                      <SelectItem value="created">Criado</SelectItem>
                      <SelectItem value="updated">Atualizado</SelectItem>
                      <SelectItem value="deleted">Deletado</SelectItem>
                      <SelectItem value="assigned">Atribuído</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="limit">Limite de Registros</Label>
                  <Select
                    value={filters.limit.toString()}
                    onValueChange={(value) => setFilters({ ...filters, limit: parseInt(value) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="25">25 registros</SelectItem>
                      <SelectItem value="50">50 registros</SelectItem>
                      <SelectItem value="100">100 registros</SelectItem>
                      <SelectItem value="200">200 registros</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                <Button onClick={exportLogs} variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Exportar CSV
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Lista de Logs */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Registros de Auditoria ({logs.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                {isLoading ? (
                  <div className="text-center py-8">Carregando logs...</div>
                ) : logs.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    Nenhum registro encontrado
                  </div>
                ) : (
                  <div className="space-y-3">
                    {logs.map((log: AuditLog) => (
                      <Card key={log.id} className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0">
                            <div className={`p-2 rounded-full ${getActionColor(log.action)}`}>
                              {getActionIcon(log.action)}
                            </div>
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge className={getActionColor(log.action)}>
                                {log.action}
                              </Badge>
                              <Badge variant="outline">
                                {getEntityTypeLabel(log.entityType)}
                              </Badge>
                              <span className="text-sm text-gray-500">
                                {formatDistanceToNow(new Date(log.createdAt), { 
                                  addSuffix: true, 
                                  locale: ptBR 
                                })}
                              </span>
                            </div>

                            <div className="text-sm text-gray-600 mb-2">
                              <strong>ID:</strong> {log.entityId}
                              {log.userId && (
                                <>
                                  <br />
                                  <strong>Usuário:</strong> {log.userId}
                                </>
                              )}
                              {log.ipAddress && (
                                <>
                                  <br />
                                  <strong>IP:</strong> {log.ipAddress}
                                </>
                              )}
                            </div>

                            {(log.oldValues || log.newValues) && (
                              <details className="mt-2">
                                <summary className="cursor-pointer text-sm font-medium text-blue-600 hover:text-blue-800">
                                  Ver Detalhes
                                </summary>
                                <div className="mt-2 space-y-2">
                                  {log.oldValues && (
                                    <div>
                                      <strong className="text-sm text-red-600">Valores Anteriores:</strong>
                                      <pre className="text-xs bg-red-50 p-2 rounded mt-1 overflow-x-auto">
                                        {formatValue(log.oldValues)}
                                      </pre>
                                    </div>
                                  )}
                                  {log.newValues && (
                                    <div>
                                      <strong className="text-sm text-green-600">Novos Valores:</strong>
                                      <pre className="text-xs bg-green-50 p-2 rounded mt-1 overflow-x-auto">
                                        {formatValue(log.newValues)}
                                      </pre>
                                    </div>
                                  )}
                                  {log.metadata && (
                                    <div>
                                      <strong className="text-sm text-blue-600">Metadados:</strong>
                                      <pre className="text-xs bg-blue-50 p-2 rounded mt-1 overflow-x-auto">
                                        {formatValue(log.metadata)}
                                      </pre>
                                    </div>
                                  )}
                                </div>
                              </details>
                            )}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
