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
import UserModal from '@/components/modals/user-modal';
import { UserRole } from '@/types';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

function mapApiErrorToMessage(e: any): string {
  const message = e?.message || '';
  if (message.startsWith('403')) return 'Você não tem permissão para executar esta ação.';
  if (message.startsWith('409')) return 'O e-mail informado já está cadastrado.';
  if (message.startsWith('400')) return 'Por favor, verifique os dados informados no formulário.';
  return 'Ocorreu um erro. Tente novamente.';
}

export default function UsersPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: users = [], isLoading } = useQuery<UserRole[]>({
    queryKey: ['/api/users'],
    staleTime: 30000,
  });

  const createUser = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest('POST', '/api/users', data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({ title: 'Usuário criado', description: 'O usuário foi criado com sucesso.' });
    },
    onError: (e: any) => {
      toast({ title: 'Erro ao criar usuário', description: mapApiErrorToMessage(e), variant: 'destructive' });
    }
  });

  const updateUser = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await apiRequest('PUT', `/api/users/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({ title: 'Usuário atualizado', description: 'As informações do usuário foram atualizadas.' });
    },
    onError: (e: any) => {
      toast({ title: 'Erro ao atualizar', description: mapApiErrorToMessage(e), variant: 'destructive' });
    }
  });

  const deleteUser = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest('DELETE', `/api/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({ title: 'Usuário excluído', description: 'O usuário foi removido.' });
    },
    onError: (e: any) => {
      toast({ title: 'Erro ao excluir', description: mapApiErrorToMessage(e), variant: 'destructive' });
    }
  });

  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserRole | undefined>();

  const handleEditUser = (user: UserRole) => {
    setSelectedUser(user);
    setIsUserModalOpen(true);
  };

  const handleDeleteUser = (userId: string) => {
    if (window.confirm('Tem certeza que deseja excluir este usuário?')) {
      deleteUser.mutate(userId);
    }
  };

  const handleAddUser = () => {
    setSelectedUser(undefined);
    setIsUserModalOpen(true);
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin':
        return 'default';
      case 'supervisor':
        return 'secondary';
      case 'agent':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Administrador';
      case 'supervisor':
        return 'Supervisor';
      case 'agent':
        return 'Agente';
      default:
        return role;
    }
  };

  return (
    <>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-foreground">Gestão de Usuários</h2>
          <Button onClick={handleAddUser} data-testid="button-add-user">
            <Plus className="mr-2 h-4 w-4" />
            Adicionar Usuário
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6">Carregando usuários...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>E-mail</TableHead>
                    <TableHead>Função</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id} data-testid={`user-row-${user.id}`}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                            <span className="text-primary-foreground text-sm font-medium">
                              {user.initials}
                            </span>
                          </div>
                          <p className="font-medium text-foreground" data-testid={`text-user-name-${user.id}`}>
                            {user.name}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-foreground" data-testid={`text-user-email-${user.id}`}>
                        {user.email}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={getRoleBadgeVariant(user.role)}
                          data-testid={`badge-user-role-${user.id}`}
                        >
                          {getRoleDisplayName(user.role)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={user.isOnline ? "default" : "secondary"}
                          className={user.isOnline ? "bg-green-100 text-green-800" : ""}
                          data-testid={`badge-user-status-${user.id}`}
                        >
                          {user.isOnline ? 'Online' : 'Offline'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditUser(user)}
                            data-testid={`button-edit-user-${user.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteUser(user.id)}
                            className="text-destructive hover:text-destructive"
                            data-testid={`button-delete-user-${user.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <UserModal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        user={selectedUser}
        onSave={(data) => {
          if (selectedUser) {
            updateUser.mutate({ id: selectedUser.id, data });
          } else {
            createUser.mutate(data);
          }
        }}
      />
    </>
  );
}
