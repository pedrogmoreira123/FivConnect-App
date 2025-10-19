import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import { Users, Wifi, WifiOff } from 'lucide-react';

export function UsersOnlineReport() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['/api/dashboard/users-online'],
    queryFn: async () => {
      const response = await apiClient.get('/api/dashboard/users-online');
      return response.data;
    },
    refetchInterval: 30000, // Atualizar a cada 30 segundos
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Usuários Online
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p>Carregando...</p>
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
        </CardHeader>
        <CardContent>
          <p className="text-red-600">Erro ao carregar dados</p>
        </CardContent>
      </Card>
    );
  }

  const users = data?.users || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          Usuários Online ({users.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {users.length === 0 ? (
          <p className="text-muted-foreground">Nenhum usuário encontrado</p>
        ) : (
          <div className="space-y-4">
            {users.map((user: any) => (
              <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{user.name}</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Status</p>
                    <Badge 
                      variant={user.isOnline ? "default" : "secondary"}
                      className="flex items-center gap-1"
                    >
                      {user.isOnline ? (
                        <>
                          <Wifi className="w-3 h-3" />
                          Online
                        </>
                      ) : (
                        <>
                          <WifiOff className="w-3 h-3" />
                          Offline
                        </>
                      )}
                    </Badge>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Tempo no Status</p>
                    <p className="text-sm font-medium">{user.timeInCurrentStatus}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Chamados Abertos</p>
                    <p className="text-sm font-medium">{user.openTickets || 0}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
