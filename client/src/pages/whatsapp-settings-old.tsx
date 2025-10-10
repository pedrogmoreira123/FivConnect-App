import React, { useState, useEffect } from 'react';
import { QrCode, Wifi, WifiOff, RefreshCw, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
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
  
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    status: 'LOADING',
    isLoading: true,
    error: null
  });

  const companyId = (user as any)?.companyId || (user as any)?.company?.id;

  // Função para formatar número de telefone
  const formatPhoneNumber = (phone: string): string => {
    // Remove @s.whatsapp.net se presente
    const cleanPhone = phone.replace('@s.whatsapp.net', '');
    
    // Se começar com 55 (Brasil)
    if (cleanPhone.startsWith('55')) {
      const number = cleanPhone.substring(2); // Remove o 55
      
      // Se for um número de celular brasileiro (11 dígitos)
      if (number.length === 11) {
        const ddd = number.substring(0, 2);
        const firstPart = number.substring(2, 7);
        const secondPart = number.substring(7);
        return `+55 (${ddd}) ${firstPart.charAt(0)} ${firstPart.substring(1)}-${secondPart}`;
      }
      
      // Se for um número fixo brasileiro (10 dígitos)
      if (number.length === 10) {
        const ddd = number.substring(0, 2);
        const firstPart = number.substring(2, 6);
        const secondPart = number.substring(6);
        return `+55 (${ddd}) ${firstPart}-${secondPart}`;
      }
    }
    
    // Se não conseguir formatar, retorna o número limpo
    return cleanPhone;
  };

  // Buscar status inicial da conexão
  useEffect(() => {
    if (companyId) {
      fetchConnectionStatus();
    }
  }, [companyId]);

  // Configurar WebSocket para atualizações em tempo real
  useEffect(() => {
    if (!companyId) return;

    const socket = io('https://app.fivconnect.net', {
      transports: ['websocket', 'polling'],
      autoConnect: true
    });

    socket.on('connect', () => {
      console.log('✅ Conectado ao servidor WebSocket!');
    });

    socket.on('connectionUpdate', (data) => {
      console.log('🔄 Atualização de status recebida:', data);
      
      setConnectionStatus(prev => ({
        ...prev,
        status: data.connected ? 'CONNECTED' : 'DISCONNECTED',
        connectionInfo: data.connected ? {
          number: data.number,
          name: data.name,
          profilePictureUrl: data.profilePictureUrl,
          lastSeen: new Date().toISOString()
        } : undefined
      }));

      if (data.connected) {
        toast({
          title: "Conectado!",
          description: "WhatsApp conectado com sucesso!",
        });
      }
    });

    socket.on('qrcodeUpdate', (data) => {
      console.log('📱 QR Code atualizado:', data);
      
      setConnectionStatus(prev => ({
        ...prev,
        status: 'QR_READY',
        qrCode: data.qrCode
      }));
    });

    return () => {
      socket.disconnect();
    };
  }, [companyId, toast]);

  const fetchConnectionStatus = async () => {
    if (!companyId) return;
    
    setConnectionStatus(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const response = await apiClient.get('/api/whatsapp/connection/status');
      const data = response.data;
      
      setConnectionStatus({
        status: data.connected ? 'CONNECTED' : 'DISCONNECTED',
        qrCode: data.qrCode || undefined,
        connectionInfo: data.connected ? {
          number: data.number,
          name: data.name,
          profilePictureUrl: data.profilePictureUrl,
          lastSeen: data.lastSeen
        } : undefined,
        isLoading: false,
        error: null
      });
    } catch (error: any) {
      console.error('Error fetching connection status:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        fullError: error
      });
      setConnectionStatus({
        status: 'ERROR',
        isLoading: false,
        error: error.response?.data?.message || error.message || 'Erro ao carregar status da conexão'
      });
    }
  };

  const handleDisconnect = async () => {
    if (!companyId) return;
    
    setConnectionStatus(prev => ({ ...prev, isLoading: true }));
    
    try {
      await apiClient.post('/api/whatsapp/connection/disconnect');
      
      setConnectionStatus(prev => ({
        ...prev,
        status: 'DISCONNECTED',
        connectionInfo: undefined,
        isLoading: false
      }));
      
      toast({
        title: "Desconectado",
        description: "Sessão WhatsApp desconectada com sucesso",
      });
    } catch (error: any) {
      console.error('Error disconnecting:', error);
      setConnectionStatus(prev => ({
        ...prev,
        isLoading: false,
        error: error.response?.data?.message || 'Erro ao desconectar'
      }));
      
      toast({
        title: "Erro",
        description: "Erro ao desconectar sessão",
        variant: "destructive"
      });
    }
  };

  const handleRefreshQRCode = async () => {
    if (!companyId) return;
    
    setConnectionStatus(prev => ({ ...prev, isLoading: true }));
    
    try {
      const response = await apiClient.get('/api/whatsapp/connection/qrcode');
      const data = response.data;
      
      setConnectionStatus(prev => ({
        ...prev,
        status: 'QR_READY',
        qrCode: data.qrCode,
        isLoading: false
      }));
      
      toast({
        title: "QR Code Atualizado",
        description: "Novo QR Code gerado com sucesso",
      });
    } catch (error: any) {
      console.error('Error refreshing QR code:', error);
      setConnectionStatus(prev => ({
        ...prev,
        isLoading: false,
        error: error.response?.data?.message || 'Erro ao gerar QR Code'
      }));
      
      toast({
        title: "Erro",
        description: "Erro ao gerar QR Code",
        variant: "destructive"
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      CONNECTED: { 
        label: '🟢 Conectado', 
        variant: 'default' as const,
        className: 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200'
      },
      DISCONNECTED: { 
        label: '🔴 Desconectado', 
        variant: 'destructive' as const,
        className: 'bg-red-100 text-red-800 border-red-200 hover:bg-red-200'
      },
      QR_READY: { 
        label: '🟡 Aguardando Leitura', 
        variant: 'outline' as const,
        className: 'bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200'
      },
      LOADING: { 
        label: '⏳ Carregando', 
        variant: 'secondary' as const,
        className: 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200'
      },
      ERROR: { 
        label: '❌ Erro', 
        variant: 'destructive' as const,
        className: 'bg-red-100 text-red-800 border-red-200 hover:bg-red-200'
      }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.ERROR;
    
    return (
      <Badge 
        variant={config.variant} 
        className={`flex items-center gap-1 ${config.className}`}
      >
        {config.label}
      </Badge>
    );
  };

  // Renderização de loading
  if (connectionStatus.isLoading && connectionStatus.status === 'LOADING') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Configurações WhatsApp</h1>
            <p className="text-muted-foreground">
              Painel de controle da conexão WhatsApp com Whapi.Cloud
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-4 w-64" />
            <Skeleton className="h-10 w-32" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Renderização de erro
  if (connectionStatus.status === 'ERROR') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Configurações WhatsApp</h1>
            <p className="text-muted-foreground">
              Painel de controle da conexão WhatsApp com Whapi.Cloud
            </p>
          </div>
        </div>

        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {connectionStatus.error || 'Erro ao carregar status da conexão'}
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              Erro na Conexão
            </CardTitle>
            <CardDescription>
              Não foi possível carregar o status da conexão WhatsApp
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={fetchConnectionStatus} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Tentar Novamente
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Configurações WhatsApp</h1>
          <p className="text-muted-foreground">
            Painel de controle da conexão WhatsApp com Whapi.Cloud
          </p>
        </div>
        <Button onClick={fetchConnectionStatus} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar Status
        </Button>
      </div>

      {/* Status da Conexão */}
      {connectionStatus.status === 'CONNECTED' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Conexão WhatsApp
            </CardTitle>
            <CardDescription>
              Sua conexão WhatsApp está ativa e funcionando
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Status:</span>
              {getStatusBadge(connectionStatus.status)}
            </div>
            
            {connectionStatus.connectionInfo?.number && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Número conectado:</span>
                <span className="text-sm font-mono">
                  {formatPhoneNumber(connectionStatus.connectionInfo.number)}
                </span>
              </div>
            )}
            
            {connectionStatus.connectionInfo?.name && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Nome:</span>
                <span className="text-sm">{connectionStatus.connectionInfo.name}</span>
              </div>
            )}
            
            {connectionStatus.connectionInfo?.lastSeen && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Última atividade:</span>
                <span className="text-sm">
                  {new Date(connectionStatus.connectionInfo.lastSeen).toLocaleString('pt-BR')}
                </span>
              </div>
            )}
            
            <div className="flex gap-2 pt-4">
              <Button 
                onClick={handleDisconnect} 
                variant="destructive"
                disabled={connectionStatus.isLoading}
              >
                {connectionStatus.isLoading ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <WifiOff className="h-4 w-4 mr-2" />
                )}
                Desconectar Sessão
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* QR Code para Conexão */}
      {(connectionStatus.status === 'DISCONNECTED' || connectionStatus.status === 'QR_READY') && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              Conectar ao WhatsApp
            </CardTitle>
            <CardDescription>
              Escaneie o QR Code com seu WhatsApp para conectar
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Status:</span>
              {getStatusBadge(connectionStatus.status)}
            </div>
            
            <div className="flex flex-col items-center space-y-4">
              {connectionStatus.isLoading ? (
                <div className="flex items-center space-x-2">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Carregando QR Code...</span>
                </div>
              ) : connectionStatus.qrCode ? (
                <img 
                  src={connectionStatus.qrCode} 
                  alt="QR Code do WhatsApp" 
                  className="w-64 h-64 border rounded-lg"
                />
              ) : (
                <div className="w-64 h-64 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                  <span className="text-gray-500">QR Code não disponível</span>
                </div>
              )}
              
              <Button 
                onClick={handleRefreshQRCode} 
                variant="outline"
                disabled={connectionStatus.isLoading}
              >
                {connectionStatus.isLoading ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Atualizar QR Code
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Informações da Whapi.Cloud */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wifi className="h-5 w-5" />
            Informações da Conexão
          </CardTitle>
          <CardDescription>
            Detalhes sobre a integração com Whapi.Cloud
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Provedor:</span>
            <Badge variant="outline">Whapi.Cloud</Badge>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Canal:</span>
            <span className="text-sm font-mono">CAPTAM-8VAQ8</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Tipo:</span>
            <span className="text-sm">WhatsApp Business API</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WhatsAppSettings;