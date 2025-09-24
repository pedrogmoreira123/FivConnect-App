import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import QueueModal from '@/components/modals/queue-modal';
import { QueueData } from '@/types';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2 } from 'lucide-react';

export default function QueuesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isQueueModalOpen, setIsQueueModalOpen] = useState(false);
  const [selectedQueue, setSelectedQueue] = useState<QueueData | undefined>();

  // Fetch queues data
  const { data: queues = [], isLoading } = useQuery({
    queryKey: ['queues'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/queues');
      return response.json();
    }
  });

  // Create/Update queue mutation
  const queueMutation = useMutation({
    mutationFn: async (data: QueueData) => {
      if (selectedQueue) {
        return await apiRequest('PUT', `/api/queues/${selectedQueue.id}`, data);
      } else {
        return await apiRequest('POST', '/api/queues', data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['queues'] });
      setIsQueueModalOpen(false);
      setSelectedQueue(undefined);
      toast({
        title: "Sucesso",
        description: selectedQueue ? "Fila atualizada com sucesso!" : "Fila criada com sucesso!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Falha ao salvar fila",
        variant: "destructive"
      });
    }
  });

  // Delete queue mutation
  const deleteMutation = useMutation({
    mutationFn: async (queueId: string) => {
      return await apiRequest('DELETE', `/api/queues/${queueId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['queues'] });
      toast({
        title: "Sucesso",
        description: "Fila excluída com sucesso!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Falha ao excluir fila",
        variant: "destructive"
      });
    }
  });

  const handleEditQueue = (queue: QueueData) => {
    setSelectedQueue(queue);
    setIsQueueModalOpen(true);
  };

  const handleDeleteQueue = (queueId: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta fila?')) {
      deleteMutation.mutate(queueId);
    }
  };

  const handleAddQueue = () => {
    setSelectedQueue(undefined);
    setIsQueueModalOpen(true);
  };

  return (
    <>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-foreground">Gestão de Filas</h2>
          <Button onClick={handleAddQueue} data-testid="button-add-queue">
            <Plus className="mr-2 h-4 w-4" />
            Adicionar Fila
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome da Fila</TableHead>
                  <TableHead>Horário de Funcionamento</TableHead>
                  <TableHead>Conversas Ativas</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {queues.map((queue) => (
                  <TableRow key={queue.id} data-testid={`queue-row-${queue.id}`}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-foreground" data-testid={`text-queue-name-${queue.id}`}>
                          {queue.name}
                        </p>
                        <p className="text-sm text-muted-foreground" data-testid={`text-queue-description-${queue.id}`}>
                          {queue.description}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-foreground" data-testid={`text-queue-hours-${queue.id}`}>
                      {queue.workingHours}
                    </TableCell>
                    <TableCell className="text-sm text-foreground" data-testid={`text-queue-conversations-${queue.id}`}>
                      {queue.activeConversations}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={queue.isActive ? "default" : "secondary"}
                        data-testid={`badge-queue-status-${queue.id}`}
                      >
                        {queue.isActive ? 'Ativa' : 'Inativa'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditQueue(queue)}
                          data-testid={`button-edit-queue-${queue.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteQueue(queue.id)}
                          className="text-destructive hover:text-destructive"
                          data-testid={`button-delete-queue-${queue.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

        <QueueModal
          isOpen={isQueueModalOpen}
          onClose={() => {
            setIsQueueModalOpen(false);
            setSelectedQueue(undefined);
          }}
          queue={selectedQueue}
          onSave={(data) => queueMutation.mutate(data)}
        />
    </>
  );
}
