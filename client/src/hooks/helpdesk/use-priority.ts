import { useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';

export function usePriority() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const updatePriority = useMutation({
    mutationFn: async ({ ticketId, priority }: { ticketId: string; priority: string }) => {
      const response = await apiClient.patch(`/api/tickets/${ticketId}/priority`, { priority });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      toast({
        title: 'Prioridade atualizada',
        description: 'A prioridade do ticket foi atualizada com sucesso.'
      });
    },
    onError: () => {
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar a prioridade.',
        variant: 'destructive'
      });
    }
  });
  
  return { updatePriority };
}
