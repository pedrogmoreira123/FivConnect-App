import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { apiRequest } from '@/lib/queryClient';
import { Users, Wifi, WifiOff } from 'lucide-react';

interface UserOnlineData {
  id: string;
  name: string;
  email: string;
  isOnline: boolean;
  lastSeen: string;
  tempoNoStatus: string;
  chamadosAbertos: number;
}

export function UsersOnlineReport() {
  const { data: usersData, isLoading, error } = useQuery({
    queryKey: ['/api/dashboard/users-online'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/dashboard/users-online');
      return response.json();
    },
    refetchInterval: 30000 // Atualizar a cada 30s
  });

  const getStatusBadge = (isOnline: boolean) => {
    if (isOnline) {
      return (
        <Badge className="bg-green-100 text-green-800 border-green-200">
          <Wifi className="w-3 h-3 mr-1" />
          Online
        </Badge>
      );
    } else {
      return (
        <Badge variant="secondary" className="bg-gray-100 text-gray-800 border-gray-200">
          <WifiOff className="w-3 h-3 mr-1" />
          Offline
        </Badge>
      );
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Usuários Online
          </CardTitle>
          <CardDescription>Status dos usuários da empresa</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Carregando usuários...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Usuários Online
          </CardTitle>
          <CardDescription>Status dos usuários da empresa</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-red-600">Erro ao carregar dados dos usuários</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const users: UserOnlineData[] = usersData?.data || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          Usuários Online
        </CardTitle>
        <CardDescription>
          Status dos usuários da empresa • {users.filter(u => u.isOnline).length} online de {users.length} total
        </CardDescription>
      </CardHeader>
      <CardContent>
        {users.length === 0 ? (
          <div className="text-center py-8">
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Nenhum usuário encontrado</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Tempo no Status</TableHead>
                  <TableHead>Chamados Abertos</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell className="text-muted-foreground">{user.email}</TableCell>
                    <TableCell>{getStatusBadge(user.isOnline)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {user.tempoNoStatus}
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.chamadosAbertos > 0 ? 'default' : 'outline'}>
                        {user.chamadosAbertos}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

