import React, { useState, useEffect } from 'react';
import { QrCode, Wifi, WifiOff, RefreshCw, AlertCircle, CheckCircle, Clock, Plus, Trash2, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

const WhatsAppSettings: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [connections, setConnections] = useState<WhatsAppConnection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newConnectionName, setNewConnectionName] = useState('');
  const [socket, setSocket] = useState<any>(null);

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

    const newSocket = io('https://app.fivconnect.net', {
      transports: ['websocket', 'polling'],
      autoConnect: true
    });

    newSocket.on('connect', () => {
      console.log('✅ Conectado ao servidor WebSocket!');
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
            lastSeen: new Date().toISOString()
          };
        }
        return conn;
      }));

      if (data.connected) {
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
      setConnections(response.data.connections || []);
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

  useEffect(() => {
    fetchConnections();
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
        toast({
          title: "Sucesso!",
          description: "Conexão WhatsApp criada com sucesso!",
        });
        
        setShowCreateDialog(false);
        setNewConnectionName('');
        await fetchConnections(); // Recarregar lista
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
    if (!confirm('Tem certeza que deseja deletar esta conexão?')) return;
    
    try {
      const response = await apiClient.delete(`/api/whatsapp/connections/${connectionId}`);
      
      if (response.data.success) {
        toast({
          title: "Sucesso!",
          description: "Conexão deletada com sucesso!",
        });
        await fetchConnections(); // Recarregar lista
      }
    } catch (error: any) {
      console.error('Error deleting connection:', error);
      toast({
        title: "Erro",
        description: "Erro ao deletar conexão",
        variant: "destructive"
      });
    }
  };

  // Obter QR Code
  const handleGetQRCode = async (connectionId: string) => {
    try {
      const response = await apiClient.get(`/api/whatsapp/connections/${connectionId}/qrcode`);
      
      if (response.data.success) {
        await fetchConnections(); // Recarregar para atualizar QR Code
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
            <Button>
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
      </div>

      {/* Connections List */}
      {connections.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <WifiOff className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma conexão encontrada</h3>
            <p className="text-muted-foreground text-center mb-4">
              Crie sua primeira conexão WhatsApp para começar a usar o sistema.
            </p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Criar Primeira Conexão
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
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
                    <CardDescription>
                      {connection.connectionName} • {connection.providerType.toUpperCase()}
                      {connection.whapiChannelId && (
                        <span className="ml-2 text-xs">ID: {connection.whapiChannelId}</span>
                      )}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(connection.status)}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteConnection(connection.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {connection.status === 'qr_ready' && connection.qrcode ? (
                  <div className="space-y-4">
                    <Alert>
                      <QrCode className="h-4 w-4" />
                      <AlertDescription>
                        Escaneie o QR Code abaixo com seu WhatsApp para conectar
                      </AlertDescription>
                    </Alert>
                    <div className="flex justify-center">
                      <img 
                        src={`data:image/png;base64,${connection.qrcode}`} 
                        alt="QR Code WhatsApp" 
                        className="border rounded-lg"
                      />
                    </div>
                    <div className="text-center">
                      <Button 
                        variant="outline" 
                        onClick={() => handleGetQRCode(connection.id)}
                      >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Atualizar QR Code
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
                    <Alert variant="destructive">
                      <WifiOff className="h-4 w-4" />
                      <AlertDescription>
                        WhatsApp desconectado. Clique em "Obter QR Code" para reconectar.
                      </AlertDescription>
                    </Alert>
                    <div className="text-center">
                      <Button onClick={() => handleGetQRCode(connection.id)}>
                        <QrCode className="w-4 h-4 mr-2" />
                        Obter QR Code
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

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Sobre as Conexões WhatsApp
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">
            • Cada empresa pode ter múltiplas conexões WhatsApp
          </p>
          <p className="text-sm text-muted-foreground">
            • O processo de criação é totalmente automatizado via Whapi.Cloud
          </p>
          <p className="text-sm text-muted-foreground">
            • A primeira conexão criada será definida como padrão
          </p>
          <p className="text-sm text-muted-foreground">
            • As conexões são isoladas por empresa (multi-tenant)
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default WhatsAppSettings;
