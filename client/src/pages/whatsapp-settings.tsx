import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { 
  MessageSquare, 
  QrCode, 
  CheckCircle, 
  AlertCircle, 
  RefreshCw,
  Trash2,
  Wifi,
  WifiOff,
  Smartphone
} from 'lucide-react';

interface WhatsAppStatus {
  connected: boolean;
  qrCode?: string;
  status: 'disconnected' | 'connecting' | 'connected' | 'qr_ready';
  phone?: string;
  name?: string;
}

export default function WhatsAppSettingsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [connectionName, setConnectionName] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);

  // Get tenant ID from user's company
  const tenantId = (user as any)?.company?.id || user?.id;

  // Fetch WhatsApp connection status
  const { data: whatsappStatus, isLoading } = useQuery({
    queryKey: ['whatsapp-status', tenantId],
    queryFn: async () => {
      if (!tenantId) return null;
      const response = await apiRequest('GET', `/api/whatsapp/status/${tenantId}`);
      return response.json();
    },
    enabled: !!tenantId,
    refetchInterval: (data) => {
      // Poll every 5 seconds if not connected
      return data?.status === 'qr_ready' || data?.status === 'connecting' ? 5000 : false;
    }
  });

  // Connect WhatsApp mutation
  const connectMutation = useMutation({
    mutationFn: async (data: { tenantId: string; name: string }) => {
      return await apiRequest('POST', '/api/whatsapp/connect', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-status', tenantId] });
      toast({
        title: "Conexão Iniciada",
        description: "QR Code gerado com sucesso. Escaneie com seu WhatsApp.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro na Conexão",
        description: error.message || "Falha ao conectar WhatsApp",
        variant: "destructive"
      });
    }
  });

  // Disconnect WhatsApp mutation
  const disconnectMutation = useMutation({
    mutationFn: async (tenantId: string) => {
      return await apiRequest('DELETE', `/api/whatsapp/disconnect/${tenantId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-status', tenantId] });
      toast({
        title: "Desconectado",
        description: "WhatsApp foi desconectado com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao Desconectar",
        description: error.message || "Falha ao desconectar WhatsApp",
        variant: "destructive"
      });
    }
  });

  const handleConnect = () => {
    if (!tenantId) {
      toast({
        title: "Erro",
        description: "ID da empresa não encontrado",
        variant: "destructive"
      });
      return;
    }

    connectMutation.mutate({
      tenantId,
      name: connectionName || `WhatsApp ${tenantId}`
    });
  };

  const handleDisconnect = () => {
    if (!tenantId) return;
    
    if (window.confirm('Tem certeza que deseja desconectar o WhatsApp?')) {
      disconnectMutation.mutate(tenantId);
    }
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'connected':
        return {
          icon: CheckCircle,
          color: 'text-green-600',
          bgColor: 'bg-green-100',
          text: 'Conectado',
          description: 'WhatsApp está conectado e funcionando'
        };
      case 'qr_ready':
        return {
          icon: QrCode,
          color: 'text-blue-600',
          bgColor: 'bg-blue-100',
          text: 'Aguardando Scan',
          description: 'Escaneie o QR Code com seu WhatsApp'
        };
      case 'connecting':
        return {
          icon: RefreshCw,
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-100',
          text: 'Conectando',
          description: 'Estabelecendo conexão...'
        };
      default:
        return {
          icon: WifiOff,
          color: 'text-gray-600',
          bgColor: 'bg-gray-100',
          text: 'Desconectado',
          description: 'WhatsApp não está conectado'
        };
    }
  };

  const statusInfo = getStatusInfo(whatsappStatus?.status || 'disconnected');

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Configurações do WhatsApp</h1>
        <p className="text-muted-foreground">
          Conecte seu WhatsApp Business para começar a receber e enviar mensagens
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Connection Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MessageSquare className="h-5 w-5" />
              <span>Status da Conexão</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <>
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${statusInfo.bgColor}`}>
                    <statusInfo.icon className={`h-5 w-5 ${statusInfo.color}`} />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{statusInfo.text}</p>
                    <p className="text-sm text-muted-foreground">{statusInfo.description}</p>
                  </div>
                </div>

                {whatsappStatus?.phone && (
                  <div className="flex items-center space-x-2">
                    <Smartphone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      Conectado como: {whatsappStatus.phone}
                    </span>
                  </div>
                )}

                {whatsappStatus?.name && (
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-muted-foreground">
                      Nome: {whatsappStatus.name}
                    </span>
                  </div>
                )}

                <div className="flex space-x-2">
                  {whatsappStatus?.status === 'disconnected' && (
                    <Button onClick={handleConnect} disabled={connectMutation.isPending}>
                      {connectMutation.isPending ? (
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <QrCode className="h-4 w-4 mr-2" />
                      )}
                      Conectar WhatsApp
                    </Button>
                  )}

                  {whatsappStatus?.status === 'connected' && (
                    <Button 
                      variant="destructive" 
                      onClick={handleDisconnect}
                      disabled={disconnectMutation.isPending}
                    >
                      {disconnectMutation.isPending ? (
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4 mr-2" />
                      )}
                      Desconectar
                    </Button>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* QR Code Display */}
        {whatsappStatus?.qrCode && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <QrCode className="h-5 w-5" />
                <span>QR Code</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <div className="p-4 bg-white rounded-lg border-2 border-dashed border-gray-300">
                <img 
                  src={whatsappStatus.qrCode} 
                  alt="WhatsApp QR Code" 
                  className="mx-auto max-w-full h-auto"
                />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">
                  Escaneie este QR Code com seu WhatsApp
                </p>
                <p className="text-xs text-muted-foreground">
                  1. Abra o WhatsApp no seu celular<br/>
                  2. Toque em Menu ou Configurações<br/>
                  3. Toque em "Dispositivos conectados"<br/>
                  4. Toque em "Conectar um dispositivo"<br/>
                  5. Escaneie este QR Code
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Connection Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Configurações da Conexão</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="connectionName">Nome da Conexão</Label>
              <Input
                id="connectionName"
                value={connectionName}
                onChange={(e) => setConnectionName(e.target.value)}
                placeholder="Ex: WhatsApp Principal"
              />
            </div>

            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="flex items-start space-x-2">
                <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-800 dark:text-blue-200">
                  <p className="font-medium">Importante:</p>
                  <p>Mantenha seu celular conectado à internet para receber mensagens em tempo real.</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Connection Info */}
        <Card>
          <CardHeader>
            <CardTitle>Informações da Conexão</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">ID da Empresa:</span>
              <Badge variant="outline">{tenantId}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Status:</span>
              <Badge variant={whatsappStatus?.status === 'connected' ? 'default' : 'secondary'}>
                {statusInfo.text}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Última Atualização:</span>
              <span className="text-sm text-muted-foreground">
                {new Date().toLocaleTimeString('pt-BR')}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
