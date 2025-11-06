import React, { useState, useEffect } from 'react';
import { QrCode, Wifi, WifiOff, RefreshCw, AlertCircle, CheckCircle, Clock, Plus, Trash2, Settings, Zap } from 'lucide-react';
import Lottie from 'lottie-react';
import successAnimation from '@/assets/animations/success.json';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import apiClient from '@/lib/api-client';
import io from 'socket.io-client';

interface ConnectionInfo {
  number?: string;
  name?: string;
  profilePictureUrl?: string;
  lastSeen?: string;
}

interface WhatsAppConnection {
  id: string;
  name: string;
  connectionName: string;
  status: 'disconnected' | 'connecting' | 'connected' | 'qr_ready' | 'destroyed';
  qrcode?: string;
  phone?: string;
  profilePictureUrl?: string;
  lastSeen?: string;
  whapiChannelId?: string;
  providerType: 'evolution' | 'whapi' | 'baileys';
  isDefault: boolean;
  autoAssignEnabled?: boolean;
  createdAt: string;
  currentStatus?: ConnectionInfo;
}

interface ConnectionStatus {
  status: 'CONNECTED' | 'DISCONNECTED' | 'QR_READY' | 'LOADING' | 'ERROR';
  qrCode?: string;
  connectionInfo?: ConnectionInfo;
  isLoading: boolean;
  error?: string | null;
}

interface ChannelLimits {
  limit: number;
  currentUsage: number;
  remaining: number;
  canCreateMore: boolean;
}

const WhatsAppSettings: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  useEffect(() => {
    document.title = 'FivConnect - Conexões Whatsapp';
  }, []);
  
  const [connections, setConnections] = useState<WhatsAppConnection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newConnectionName, setNewConnectionName] = useState('');
  const [socket, setSocket] = useState<any>(null);
  const [limits, setLimits] = useState<ChannelLimits | null>(null);
  const [qrCodeDialog, setQrCodeDialog] = useState(false);
  const [currentQRConnection, setCurrentQRConnection] = useState<WhatsAppConnection | null>(null);
  const [connectionSuccess, setConnectionSuccess] = useState(false);

  const companyId = (user as any)?.companyId || (user as any)?.company?.id;

  // Função para formatar número de telefone
  const formatPhoneNumber = (phone: string): string => {
    const cleanPhone = phone.replace('@s.whatsapp.net', '');
    
    if (cleanPhone.startsWith('55')) {
      const number = cleanPhone.substring(2);
      
      if (number.length === 11) {
        return `+55 (${number.substring(0, 2)}) ${number.substring(2, 7)}-${number.substring(7)}`;
      } else if (number.length === 10) {
        return `+55 (${number.substring(0, 2)}) ${number.substring(2, 6)}-${number.substring(6)}`;
      }
    }
    
    return cleanPhone;
  };

  // Função para obter status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'connected':
        return <Badge className="bg-green-100 text-green-800 border-green-200"><CheckCircle className="w-3 h-3 mr-1" />Conectado</Badge>;
      case 'qr_ready':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200"><QrCode className="w-3 h-3 mr-1" />QR Code</Badge>;
      case 'connecting':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200"><RefreshCw className="w-3 h-3 mr-1 animate-spin" />Conectando</Badge>;
      case 'disconnected':
        return <Badge className="bg-gray-100 text-gray-800 border-gray-200"><WifiOff className="w-3 h-3 mr-1" />Desconectado</Badge>;
      default:
        return <Badge className="bg-red-100 text-red-800 border-red-200"><AlertCircle className="w-3 h-3 mr-1" />Erro</Badge>;
    }
  };

  // Configurar WebSocket
  useEffect(() => {
    if (!companyId) return;

    // Obter token JWT do localStorage
    const token = localStorage.getItem('authToken');

    if (!token) {
      console.warn('⚠️ Token JWT não encontrado, WebSocket não será conectado');
      return;
    }

    const newSocket = io(window.location.origin, {
      auth: {
        token: token
      },
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    newSocket.on('connect', () => {
      console.log('✅ WebSocket conectado');
    });

    newSocket.on('connect_error', (error) => {
      console.warn('⚠️ Erro de conexão WebSocket (tentando reconectar):', error.message);
      // Silent retry - não mostrar erro ao usuário
    });

    newSocket.on('disconnect', (reason) => {
      console.log('WebSocket desconectado:', reason);
      if (reason === 'io server disconnect') {
        // Reconectar manualmente se o servidor desconectou
        newSocket.connect();
      }
    });

    newSocket.on('whatsappStatusUpdate', (data) => {
      console.log('🔄 Atualização de status WhatsApp recebida:', data);

      // Atualizar a conexão específica
      setConnections(prevConnections =>
        prevConnections.map(conn =>
          conn.id === data.connectionId
            ? {
                ...conn,
                status: data.status,
                phone: data.connectionData?.phone || conn.phone,
                name: data.connectionData?.name || conn.name,
                profilePictureUrl: data.connectionData?.profilePictureUrl || conn.profilePictureUrl,
                lastSeen: data.connectionData?.lastSeen || conn.lastSeen,
                qrcode: data.status === 'connected' ? undefined : conn.qrcode // Limpar QR Code quando conectado
              }
            : conn
        )
      );

      // Se conectou, atualizar dialog para mostrar animação
      if (data.status === 'connected') {
        console.log('🔍 DEBUG whatsappStatusUpdate:');
        console.log('  - qrCodeDialog:', qrCodeDialog);
        console.log('  - currentQRConnection:', currentQRConnection);
        console.log('  - data.connectionId:', data.connectionId);

        // CENÁRIO 1: Dialog está aberto E é a mesma conexão - atualizar com animação
        if (qrCodeDialog && currentQRConnection && currentQRConnection.id === data.connectionId) {
          console.log('✅ CENÁRIO 1: Dialog aberto - mostrando animação!');

          setCurrentQRConnection(prev => prev ? {
            ...prev,
            phone: data.connectionData?.phone || prev.phone,
            name: data.connectionData?.name || prev.name,
            status: 'connected'
          } : null);

          setConnectionSuccess(true);

          setTimeout(() => {
            setQrCodeDialog(false);
            setCurrentQRConnection(null);
            setConnectionSuccess(false);
          }, 3000);
        }
        // CENÁRIO 2: Dialog fechado - REABRIR automaticamente com animação
        else {
          console.log('✅ CENÁRIO 2: Dialog fechado - reabrindo com animação!');

          // CORREÇÃO: Usar callback para acessar estado atual de connections
          setConnections(prevConnections => {
            console.log('  - prevConnections.length:', prevConnections.length);
            const connectedConnection = prevConnections.find(c => c.id === data.connectionId);
            console.log('  - connectedConnection found:', !!connectedConnection);

            if (connectedConnection) {
              // Usar queueMicrotask para atualizar estados fora do setter
              queueMicrotask(() => {
                setCurrentQRConnection({
                  ...connectedConnection,
                  phone: data.connectionData?.phone || connectedConnection.phone,
                  name: data.connectionData?.name || connectedConnection.name,
                  status: 'connected'
                });

                setConnectionSuccess(true);  // Mostrar animação de sucesso
                setQrCodeDialog(true);        // Reabrir dialog

                console.log('🎬 Dialog reabrindo com animação Lottie!');

                // Fechar automaticamente após 3 segundos
                setTimeout(() => {
                  setQrCodeDialog(false);
                  setCurrentQRConnection(null);
                  setConnectionSuccess(false);
                  console.log('🔒 Dialog fechado automaticamente');
                }, 3000);
              });
            } else {
              // Fallback: apenas mostrar toast se não encontrou a conexão
              console.warn('⚠️ Conexão não encontrada em prevConnections');
              toast({
                title: "🎉 WhatsApp Conectado!",
                description: `Seu WhatsApp foi conectado com sucesso!`,
                variant: "default",
              });
            }

            // Retornar estado sem modificação
            return prevConnections;
          });
        }
      }
    });

    newSocket.on('connectionUpdate', (data) => {
      console.log('🔄 Atualização de status recebida:', data);

      setConnections(prev => prev.map(conn => {
        if (conn.whapiChannelId === data.channelId) {
          return {
            ...conn,
            status: data.connected ? 'connected' : 'disconnected',
            phone: data.number,
            name: data.name,
            profilePictureUrl: data.profilePictureUrl,
            lastSeen: new Date().toISOString(),
            qrcode: data.connected ? undefined : conn.qrcode // Limpar QR Code quando conectado
          };
        }
        return conn;
      }));

      if (data.connected) {
        // CENÁRIO 1: Popup já está aberto - atualizar com dados de conexão
        if (qrCodeDialog && currentQRConnection && currentQRConnection.whapiChannelId === data.channelId) {
          // Atualizar a conexão atual com os dados do WhatsApp
          setCurrentQRConnection(prev => prev ? {
            ...prev,
            phone: data.number,
            name: data.name,
            status: 'connected'
          } : null);

          setConnectionSuccess(true);
          // Fechar automaticamente após 3 segundos
          setTimeout(() => {
            setQrCodeDialog(false);
            setCurrentQRConnection(null);
            setConnectionSuccess(false);
          }, 3000);
        }
        // CENÁRIO 2: Popup foi fechado - REABRIR automaticamente com mensagem de sucesso
        else {
          // Buscar conexão na lista pelo channelId
          const connectedConnection = connections.find(c => c.whapiChannelId === data.channelId);

          if (connectedConnection) {
            console.log('🎉 Reabrindo popup com mensagem de sucesso!');

            // Reabrir popup com dados da conexão
            setCurrentQRConnection({
              ...connectedConnection,
              phone: data.number,
              name: data.name,
              status: 'connected'
            });

            setConnectionSuccess(true);  // Mostrar tela de "Parabéns!"
            setQrCodeDialog(true);        // Abrir popup

            // Fechar automaticamente após 3 segundos
            setTimeout(() => {
              setQrCodeDialog(false);
              setCurrentQRConnection(null);
              setConnectionSuccess(false);
            }, 3000);
          }
        }

        toast({
          title: "Conectado!",
          description: "WhatsApp conectado com sucesso!",
        });
      }
    });

    newSocket.on('qrcodeUpdate', (data) => {
      console.log('📱 QR Code atualizado:', data);
      
      setConnections(prev => prev.map(conn => {
        if (conn.whapiChannelId === data.channelId) {
          return {
            ...conn,
            status: 'qr_ready',
            qrcode: data.qrCode
          };
        }
        return conn;
      }));
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [companyId, toast]);

  // Carregar conexões
  const fetchConnections = async () => {
    if (!companyId) return;
    
    setIsLoading(true);
    try {
      const response = await apiClient.get('/api/whatsapp/connections');
      console.log('Frontend - Resposta da API:', response.data);
      setConnections(response.data || []);
    } catch (error: any) {
      console.error('Error fetching connections:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        fullError: error
      });
      toast({
        title: "Erro",
        description: "Erro ao carregar conexões WhatsApp",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLimits = async () => {
    if (!companyId) return;
    
    try {
      const response = await apiClient.get('/api/whatsapp/connections/limits');
      setLimits(response.data.limits);
    } catch (error: any) {
      console.error('Error fetching limits:', error);
    }
  };

  useEffect(() => {
    fetchConnections();
    fetchLimits();
  }, [companyId]);

  // Criar nova conexão
  const handleCreateConnection = async () => {
    if (!companyId || !newConnectionName.trim()) return;

    setIsCreating(true);
    try {
      const response = await apiClient.post('/api/whatsapp/connections', {
        connectionName: newConnectionName.trim()
      });

      if (response.data.success) {
        setShowCreateDialog(false);
        setNewConnectionName('');
        await fetchConnections(); // Recarregar lista
        await fetchLimits(); // Recarregar limites

        // Se o QR Code já foi gerado na criação, abrir o dialog automaticamente
        if (response.data.connection.qrCode) {
          const newConnection = response.data.connection;
          setCurrentQRConnection({
            id: newConnection.id,
            name: newConnection.name,
            connectionName: newConnection.name,
            status: 'qr_ready',
            qrcode: newConnection.qrCode,
            whapiChannelId: newConnection.channelId,
            providerType: 'whapi',
            isDefault: false,
            createdAt: newConnection.createdAt
          } as WhatsAppConnection);
          setConnectionSuccess(false);
          setQrCodeDialog(true);

          toast({
            title: "🎉 Canal Criado!",
            description: "QR Code gerado! Escaneie com seu WhatsApp.",
          });
        } else {
          toast({
            title: "🎉 Canal Criado!",
            description: "Aguarde alguns segundos e clique em 'Gerar QR Code'.",
          });
        }
      }
    } catch (error: any) {
      console.error('Error creating connection:', error);
      toast({
        title: "Erro",
        description: error.response?.data?.message || "Erro ao criar conexão WhatsApp",
        variant: "destructive"
      });
    } finally {
      setIsCreating(false);
    }
  };

  // Deletar conexão
  const handleDeleteConnection = async (connectionId: string) => {
    if (!confirm('Tem certeza que deseja excluir este canal WhatsApp?')) return;

    try {
      const response = await apiClient.delete(`/api/whatsapp/connections/${connectionId}`);

      if (response.data.success) {
        toast({
          title: "Canal Removido",
          description: "O canal WhatsApp foi excluído com sucesso.",
        });
        await fetchConnections(); // Recarregar lista
        await fetchLimits(); // Recarregar limites
      }
    } catch (error: any) {
      console.error('Error deleting connection:', error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o canal.",
        variant: "destructive"
      });
    }
  };

  // Obter QR Code
  const handleGetQRCode = async (connectionId: string) => {
    try {
      console.log('Frontend - Solicitando QR Code para:', connectionId);
      const response = await apiClient.get(`/api/whatsapp/connections/${connectionId}/qrcode`);
      console.log('Frontend - Resposta do QR Code:', response.data);

      if (response.data.success && response.data.qrCode) {
        // Atualizar o QR code na conexão específica
        setConnections(prevConnections =>
          prevConnections.map(conn =>
            conn.id === connectionId
              ? { ...conn, qrcode: response.data.qrCode, status: 'qr_ready' }
              : conn
          )
        );

        // Buscar a conexão atualizada e abrir o dialog
        const updatedConnection = connections.find(c => c.id === connectionId);
        if (updatedConnection) {
          setCurrentQRConnection({
            ...updatedConnection,
            qrcode: response.data.qrCode,
            status: 'qr_ready'
          });
          setConnectionSuccess(false);
          setQrCodeDialog(true);
        }
      } else {
        toast({
          title: "Aviso",
          description: "QR Code não disponível no momento",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error('Error getting QR code:', error);
      toast({
        title: "Erro",
        description: "Erro ao obter QR Code",
        variant: "destructive"
      });
    }
  };

  // Atualizar configuração de Auto Assign
  const handleToggleAutoAssign = async (connectionId: string, enabled: boolean) => {
    try {
      const response = await apiClient.patch(`/api/whatsapp/connections/${connectionId}/auto-assign`, {
        autoAssignEnabled: enabled
      });

      if (response.data.success) {
        // Atualizar estado local
        setConnections(prevConnections =>
          prevConnections.map(conn =>
            conn.id === connectionId
              ? { ...conn, autoAssignEnabled: enabled }
              : conn
          )
        );

        toast({
          title: "Sucesso!",
          description: `Atribuição automática ${enabled ? 'ativada' : 'desativada'} com sucesso!`,
        });
      }
    } catch (error: any) {
      console.error('Error toggling auto assign:', error);
      toast({
        title: "Erro",
        description: "Erro ao alterar configuração de atribuição automática",
        variant: "destructive"
      });
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Configurações WhatsApp</h1>
            <p className="text-muted-foreground">Gerencie suas conexões WhatsApp</p>
          </div>
        </div>
        
        <div className="grid gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Configurações WhatsApp</h1>
          <p className="text-muted-foreground">Gerencie suas conexões WhatsApp</p>
        </div>
        
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button disabled={limits && !limits.canCreateMore}>
              <Plus className="w-4 h-4 mr-2" />
              Nova Conexão
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Nova Conexão WhatsApp</DialogTitle>
              <DialogDescription>
                Crie uma nova conexão WhatsApp para sua empresa. O processo é totalmente automatizado.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="connectionName">Nome da Conexão</Label>
                <Input
                  id="connectionName"
                  placeholder="Ex: WhatsApp Principal"
                  value={newConnectionName}
                  onChange={(e) => setNewConnectionName(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleCreateConnection} 
                disabled={isCreating || !newConnectionName.trim()}
              >
                {isCreating ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Criando...
                  </>
                ) : (
                  'Criar Conexão'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog do QR Code */}
        <Dialog open={qrCodeDialog} onOpenChange={(open) => {
          setQrCodeDialog(open);
          if (!open) {
            setCurrentQRConnection(null);
            setConnectionSuccess(false);
          }
        }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <QrCode className="w-5 h-5" />
                {connectionSuccess ? 'Conectado com Sucesso!' : 'Conectar WhatsApp'}
              </DialogTitle>
              <DialogDescription>
                {connectionSuccess
                  ? 'Seu WhatsApp foi conectado com sucesso!'
                  : 'Escaneie o QR Code com seu WhatsApp'}
              </DialogDescription>
            </DialogHeader>

            {connectionSuccess ? (
              <div className="py-8 text-center space-y-4">
                <div className="flex justify-center">
                  <Lottie
                    animationData={successAnimation}
                    loop={false}
                    style={{ width: 200, height: 200 }}
                  />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold text-green-600">Parabéns!</h3>
                  <p className="text-muted-foreground">
                    WhatsApp conectado com sucesso!
                  </p>
                  {currentQRConnection?.phone && (
                    <p className="text-sm font-medium">
                      Número: {formatPhoneNumber(currentQRConnection.phone)}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {currentQRConnection?.qrcode ? (
                  <>
                    <Alert>
                      <QrCode className="h-4 w-4" />
                      <AlertDescription>
                        <div className="text-sm space-y-1">
                          <p className="font-semibold">Como conectar:</p>
                          <ol className="list-decimal list-inside space-y-1 mt-2">
                            <li>Abra o WhatsApp no seu celular</li>
                            <li>Toque em Mais opções → Aparelhos conectados</li>
                            <li>Toque em "Conectar um aparelho"</li>
                            <li>Aponte seu celular para este QR Code</li>
                          </ol>
                        </div>
                      </AlertDescription>
                    </Alert>

                    <div className="flex justify-center p-6 bg-muted/30 rounded-lg">
                      <img
                        src={`data:image/png;base64,${currentQRConnection.qrcode}`}
                        alt="QR Code WhatsApp"
                        className="border-4 border-white rounded-lg shadow-lg w-64 h-64"
                      />
                    </div>

                    <div className="text-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => currentQRConnection && handleGetQRCode(currentQRConnection.id)}
                      >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Atualizar QR Code
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <RefreshCw className="w-8 h-8 mx-auto animate-spin text-muted-foreground" />
                    <p className="mt-4 text-sm text-muted-foreground">Carregando QR Code...</p>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* Limite de Canais Alert */}
      {limits && !limits.canCreateMore && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Você atingiu o seu limite de canais ({limits.currentUsage}/{limits.limit}). 
            Para adicionar mais conexões, por favor, entre em contato com o suporte.
          </AlertDescription>
        </Alert>
      )}

      {/* Connections List */}
      {connections.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <WifiOff className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma conexão encontrada</h3>
            <p className="text-muted-foreground text-center mb-4">
              Crie sua primeira conexão WhatsApp para começar a usar o sistema.
            </p>
            <Button 
              onClick={() => setShowCreateDialog(true)}
              disabled={limits && !limits.canCreateMore}
            >
              <Plus className="w-4 h-4 mr-2" />
              Criar Primeira Conexão
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
          {connections.map((connection) => (
            <Card key={connection.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {connection.name}
                      {connection.isDefault && (
                        <Badge variant="secondary">Padrão</Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-1">
                      {getStatusBadge(connection.status)}
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteConnection(connection.id)}
                    title="Excluir canal"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {/* Auto Assign Configuration */}
                <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Zap className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <Label htmlFor={`auto-assign-${connection.id}`} className="text-base font-semibold cursor-pointer">
                          Atribuição Automática Inteligente
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Distribui conversas automaticamente para os agentes disponíveis
                        </p>
                      </div>
                    </div>
                    <Switch
                      id={`auto-assign-${connection.id}`}
                      checked={connection.autoAssignEnabled || false}
                      onCheckedChange={(checked) => handleToggleAutoAssign(connection.id, checked)}
                    />
                  </div>
                </div>

                {connection.status === 'qr_ready' ? (
                  <div className="space-y-4">
                    <Alert>
                      <QrCode className="h-4 w-4" />
                      <AlertDescription>
                        {connection.qrcode
                          ? 'QR Code disponível! Clique no botão abaixo para visualizar.'
                          : 'Canal pronto. Gere o QR Code para conectar seu WhatsApp.'}
                      </AlertDescription>
                    </Alert>
                    <div className="text-center">
                      <Button onClick={() => handleGetQRCode(connection.id)}>
                        <QrCode className="w-4 h-4 mr-2" />
                        {connection.qrcode ? 'Ver QR Code' : 'Gerar QR Code'}
                      </Button>
                    </div>
                  </div>
                ) : connection.status === 'connected' ? (
                  <div className="space-y-4">
                    <Alert>
                      <CheckCircle className="h-4 w-4" />
                      <AlertDescription>
                        WhatsApp conectado com sucesso!
                      </AlertDescription>
                    </Alert>
                    {connection.phone && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Wifi className="w-4 h-4 text-green-600" />
                          <span className="font-medium">Número:</span>
                          <span>{formatPhoneNumber(connection.phone)}</span>
                        </div>
                        {connection.name && (
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Nome:</span>
                            <span>{connection.name}</span>
                          </div>
                        )}
                        {connection.lastSeen && (
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            <span className="text-sm text-muted-foreground">
                              Última vez online: {new Date(connection.lastSeen).toLocaleString()}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : connection.status === 'disconnected' ? (
                  <div className="space-y-4">
                    <Alert>
                      <WifiOff className="h-4 w-4" />
                      <AlertDescription>
                        Canal aguardando conexão. Gere o QR Code para conectar seu WhatsApp.
                      </AlertDescription>
                    </Alert>
                    <div className="text-center">
                      <Button onClick={() => handleGetQRCode(connection.id)}>
                        <QrCode className="w-4 h-4 mr-2" />
                        Gerar QR Code
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Alert>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <AlertDescription>
                        Conectando ao WhatsApp...
                      </AlertDescription>
                    </Alert>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default WhatsAppSettings;
