import React, { useState, useEffect } from 'react';
import { Plus, Trash2, QrCode, Wifi, WifiOff, RefreshCw, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import apiClient from '@/lib/api-client';
import io from 'socket.io-client';

interface WhatsAppConnection {
  id: string;
  companyId: string;
  connectionName: string;
  instanceName: string;
  phone?: string;
  qrcode?: string;
  profilePictureUrl?: string;
  status: 'disconnected' | 'connecting' | 'connected' | 'qr_ready' | 'destroyed';
  isDefault: boolean;
  lastSeen?: string;
  createdAt: string;
  updatedAt: string;
}

interface QRCodeModalProps {
  connection: WhatsAppConnection | null;
  isOpen: boolean;
  onClose: () => void;
}

const QRCodeModal: React.FC<QRCodeModalProps> = ({ connection, isOpen, onClose }) => {
  const { toast } = useToast();
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && connection) {
      fetchQRCode();
    }
  }, [isOpen, connection]);

  const fetchQRCode = async () => {
    if (!connection) return;
    
    setIsLoading(true);
    try {
      console.log('🔍 [FRONTEND] fetchQRCode - Buscando QR Code para:', connection.id);
      const response = await apiClient.get(`/api/whatsapp/connections/${connection.companyId}/${connection.id}/qrcode`);
      console.log('🔍 [FRONTEND] fetchQRCode - Resposta:', response.data);
      
      if (response.data.qrcode) {
        // Se o QR Code já tem o prefixo data:image, usar diretamente
        if (response.data.qrcode.startsWith('data:image')) {
          setQrCode(response.data.qrcode);
        } else {
          // Se é base64 puro, adicionar o prefixo
          setQrCode(`data:image/png;base64,${response.data.qrcode}`);
        }
      } else {
        console.log('⚠️ [FRONTEND] fetchQRCode - QR Code não disponível ainda');
        setQrCode(null);
      }
    } catch (error) {
      console.error('❌ [FRONTEND] fetchQRCode - Erro:', error);
      setQrCode(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Polling para verificar status da conexão
  useEffect(() => {
    if (!isOpen || !connection) return;

    const interval = setInterval(async () => {
      try {
        const response = await apiClient.get(`/api/whatsapp/connections/${connection.companyId}`);
        const connections = response.data;
        const currentConnection = connections.find((c: WhatsAppConnection) => c.id === connection.id);
        
        if (currentConnection && currentConnection.status === 'connected') {
          // Mostrar popup de sucesso
          toast({
            title: "Conectado!",
            description: "WhatsApp conectado com sucesso!",
          });
          
          // Fechar modal quando conectar
          onClose();
        }
      } catch (error) {
        // console.error('Error checking connection status:', error);
      }
    }, 3000); // Verificar a cada 3 segundos

    return () => clearInterval(interval);
  }, [isOpen, connection, onClose]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>QR Code - {connection?.connectionName}</DialogTitle>
          <DialogDescription>
            Escaneie o QR Code com seu WhatsApp para conectar
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center space-y-4">
          {isLoading ? (
            <div className="flex items-center space-x-2">
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span>Carregando QR Code...</span>
            </div>
          ) : qrCode ? (
            <img 
              src={qrCode} 
              alt="QR Code" 
              className="w-64 h-64 border rounded-lg"
            />
          ) : (
            <div className="w-64 h-64 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
              <span className="text-gray-500">QR Code não disponível</span>
            </div>
          )}
          <Button onClick={fetchQRCode} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar QR Code
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const WhatsAppSettings: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [connections, setConnections] = useState<WhatsAppConnection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newConnectionName, setNewConnectionName] = useState('');
  const [selectedConnection, setSelectedConnection] = useState<WhatsAppConnection | null>(null);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);

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

  useEffect(() => {
    if (companyId) {
      fetchConnections();
    }

    // Conectar ao WebSocket
    const socket = io('http://localhost:3000', {
      transports: ['websocket', 'polling'],
      autoConnect: true
    });

    socket.on('connect', () => {
      // console.log('✅ Conectado ao servidor WebSocket!');
      // Executar sincronização automática ao conectar
      syncAllConnections();
    });

    socket.on('connectionUpdate', (data) => {
      // console.log('🔄 Atualização de status recebida:', data);
      if (data.companyId === companyId) {
        setConnections(prev => 
          prev.map(conn => 
            conn.instanceName === data.instanceName ? { 
              ...conn, 
              status: data.status,
              phone: data.phone || conn.phone,
              profilePictureUrl: data.profilePictureUrl || conn.profilePictureUrl,
              updatedAt: new Date().toISOString()
            } : conn
          )
        );
      }
    });

    socket.on('qrcodeUpdate', (data) => {
      // console.log('📱 QR Code atualizado:', data);
      if (data.companyId === companyId) {
        setConnections(prev => 
          prev.map(conn => 
            conn.instanceName === data.instanceName ? { 
              ...conn, 
              qrcode: data.qrcode,
              status: data.qrcode ? 'qr_ready' : 'connecting'
            } : conn
          )
        );
      }
    });

    // Sincronização automática a cada 30 segundos
    const syncInterval = setInterval(() => {
      // console.log('🔄 Executando sincronização automática via intervalo...');
      syncAllConnections();
    }, 30000);

    return () => {
      socket.disconnect();
      clearInterval(syncInterval);
    };
  }, [companyId]);

  const fetchConnections = async () => {
    if (!companyId) return;
    
    setIsLoading(true);
    try {
      const response = await apiClient.get(`/api/whatsapp/connections/${companyId}`);
      setConnections(response.data);
    } catch (error) {
      console.error('Error fetching connections:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar conexões",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const syncAllConnections = async () => {
    if (!companyId) return;
    
    try {
      // console.log('🔄 Executando sincronização automática...');
      const response = await apiClient.post('/api/whatsapp/sync-all');
      
      if (response.data.syncedCount > 0) {
        // console.log(`✅ ${response.data.syncedCount} conexão(ões) sincronizada(s)`);
        
        // Atualizar as conexões com os dados sincronizados
        const updatedConnections = await apiClient.get(`/api/whatsapp/connections/${companyId}`);
        setConnections(updatedConnections.data);
        
        // Mostrar toast de sucesso apenas se houve mudanças
        toast({
          title: "Sincronização Automática",
          description: `${response.data.syncedCount} conexão(ões) atualizada(s)`,
        });
      }
    } catch (error) {
      // console.error('❌ Erro na sincronização automática:', error);
      // Não mostrar toast de erro para não incomodar o usuário
    }
  };

  const createConnection = async () => {
    if (!newConnectionName.trim() || !companyId) {
      console.error('❌ Missing required data:', { newConnectionName, companyId });
      toast({
        title: "Erro",
        description: "Dados necessários não encontrados. Faça login novamente.",
        variant: "destructive"
      });
      return;
    }
    
    const token = localStorage.getItem('authToken');
    console.log('🔍 [FRONTEND] createConnection - Token:', token ? `${token.substring(0, 20)}...` : 'NENHUM');
    
    if (!token) {
      console.log('❌ [FRONTEND] createConnection - Nenhum token encontrado');
      toast({
        title: "Erro",
        description: "Token de autenticação não encontrado. Faça login novamente.",
        variant: "destructive"
      });
      return;
    }
    
    setIsCreating(true);
    try {
      const response = await apiClient.post(`/api/whatsapp/connections/${companyId}`, {
        connectionName: newConnectionName.trim()
      });
      
      const newConnection = response.data;
      setConnections(prev => [newConnection, ...prev]);
      setNewConnectionName('');
      
      // Mostrar QR Code imediatamente
      setSelectedConnection(newConnection);
      setIsQRModalOpen(true);
      
      toast({
        title: "Sucesso",
        description: "Conexão criada com sucesso. Escaneie o QR Code para conectar."
      });
    } catch (error: any) {
      console.error('Error creating connection:', error);
      toast({
        title: "Erro",
        description: error.response?.data?.message || "Erro ao criar conexão",
        variant: "destructive"
      });
    } finally {
      setIsCreating(false);
    }
  };

  const connectConnection = async (connectionId: string) => {
    if (!companyId) return;
    
    try {
      const response = await fetch(`/api/whatsapp/connections/${companyId}/${connectionId}/connect`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      
      if (response.ok) {
        await fetchConnections(); // Refresh connections
        toast({
          title: "Sucesso",
          description: "Conexão iniciada"
        });
      } else {
        const error = await response.json();
        toast({
          title: "Erro",
          description: error.message || "Falha ao conectar",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error connecting:', error);
      toast({
        title: "Erro",
        description: "Erro ao conectar",
        variant: "destructive"
      });
    }
  };

  const disconnectConnection = async (connectionId: string) => {
    if (!companyId) return;
    
    try {
      const response = await fetch(`/api/whatsapp/connections/${companyId}/${connectionId}/disconnect`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      
      if (response.ok) {
        await fetchConnections(); // Refresh connections
        toast({
          title: "Sucesso",
          description: "Desconexão realizada com sucesso"
        });
      } else {
        const error = await response.json();
        toast({
          title: "Erro",
          description: error.message || "Falha ao desconectar",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error disconnecting:', error);
      toast({
        title: "Erro",
        description: "Erro ao desconectar",
        variant: "destructive"
      });
    }
  };

  const deleteConnection = async (connectionId: string) => {
    if (!companyId) return;
    
    if (!confirm('Tem certeza que deseja deletar esta conexão?')) return;
    
    try {
      const response = await fetch(`/api/whatsapp/connections/${companyId}/${connectionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      
      if (response.ok) {
        setConnections(prev => prev.filter(conn => conn.id !== connectionId));
        toast({
          title: "Sucesso",
          description: "Conexão deletada com sucesso"
        });
      } else {
        const error = await response.json();
        toast({
          title: "Erro",
          description: error.message || "Falha ao deletar conexão",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error deleting connection:', error);
      toast({
        title: "Erro",
        description: "Erro ao deletar conexão",
        variant: "destructive"
      });
    }
  };

  const getStatusBadge = (status: string, connection: WhatsAppConnection) => {
    // Determinar status baseado em dados mais específicos
    let actualStatus = status;
    
    // Se tem número de telefone, considerar como conectado
    if (connection.phone && connection.phone !== '-' && status !== 'destroyed') {
      actualStatus = 'connected';
    }
    // Se tem QR code disponível, mostrar como QR Code Pronto (prioridade sobre disconnected)
    else if (connection.qrcode && status !== 'destroyed') {
      actualStatus = 'qr_ready';
    }
    // Se está conectando, manter como conectando
    else if (status === 'connecting') {
      actualStatus = 'connecting';
    }

    const statusConfig = {
      connected: { 
        label: 'Conectado', 
        variant: 'default' as const, 
        icon: Wifi,
        className: 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200'
      },
      connecting: { 
        label: 'Conectando', 
        variant: 'secondary' as const, 
        icon: RefreshCw,
        className: 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200'
      },
      disconnected: { 
        label: 'Desconectado', 
        variant: 'destructive' as const, 
        icon: WifiOff,
        className: 'bg-red-100 text-red-800 border-red-200 hover:bg-red-200'
      },
      qr_ready: { 
        label: 'QR Code Pronto', 
        variant: 'outline' as const, 
        icon: QrCode,
        className: 'bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200'
      },
      destroyed: { 
        label: 'Destruído', 
        variant: 'destructive' as const, 
        icon: Trash2,
        className: 'bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200'
      }
    };
    
    const config = statusConfig[actualStatus as keyof typeof statusConfig] || statusConfig.disconnected;
    const Icon = config.icon;
    
    return (
      <Badge 
        variant={config.variant} 
        className={`flex items-center gap-1 ${config.className}`}
      >
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Configurações WhatsApp</h1>
          <p className="text-muted-foreground">
            Gerencie suas conexões WhatsApp com Evolution API
          </p>
        </div>
        <Button onClick={syncAllConnections} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Sincronizar
        </Button>
      </div>

      {/* Create New Connection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Nova Conexão
          </CardTitle>
          <CardDescription>
            Crie uma nova conexão WhatsApp para sua empresa
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="connectionName">Nome da Conexão</Label>
              <Input
                id="connectionName"
                value={newConnectionName}
                onChange={(e) => setNewConnectionName(e.target.value)}
                placeholder="Ex: WhatsApp Principal"
                disabled={isCreating}
              />
            </div>
            <div className="flex items-end">
              <Button 
                onClick={createConnection} 
                disabled={!newConnectionName.trim() || isCreating}
              >
                {isCreating ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                Criar Conexão
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Connections Table */}
      <Card>
        <CardHeader>
          <CardTitle>Conexões WhatsApp</CardTitle>
          <CardDescription>
            {connections.length} conexão(ões) encontrada(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {connections.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma conexão WhatsApp encontrada</p>
              <p className="text-sm">Crie uma nova conexão para começar</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Número</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Última Atualização</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {connections.map((connection) => (
                  <TableRow key={connection.id}>
                    <TableCell className="font-medium">
                      {connection.connectionName}
                      {connection.isDefault && (
                        <Badge variant="outline" className="ml-2">Padrão</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {connection.phone ? (
                        <span className="text-sm font-mono">
                          {formatPhoneNumber(connection.phone)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(connection.status, connection)}
                    </TableCell>
                    <TableCell>
                      {connection.updatedAt 
                        ? new Date(connection.updatedAt).toLocaleString('pt-BR')
                        : '-'
                      }
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Botão Conectar - apenas quando desconectado */}
                        {connection.status === 'disconnected' && !connection.qrcode && (
                          <Button
                            size="sm"
                            onClick={() => connectConnection(connection.id)}
                          >
                            <Wifi className="h-4 w-4 mr-1" />
                            Conectar
                          </Button>
                        )}
                        
                        {/* Botão QR Code - quando tem QR code disponível OU está conectando, MAS NÃO quando conectado */}
                        {(connection.qrcode || connection.status === 'connecting' || connection.status === 'qr_ready') && 
                         !(connection.status === 'connected' && connection.phone && connection.phone !== '-') && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedConnection(connection);
                              setIsQRModalOpen(true);
                            }}
                          >
                            <QrCode className="h-4 w-4 mr-1" />
                            {connection.qrcode ? 'QR Code Pronto' : 'QR Code'}
                          </Button>
                        )}
                        
                        {/* Botão Reconectar - quando conectado */}
                        {connection.status === 'connected' && connection.phone && connection.phone !== '-' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => connectConnection(connection.id)}
                          >
                            <RefreshCw className="h-4 w-4 mr-1" />
                            Reconectar
                          </Button>
                        )}
                        
                        {/* Botão Desconectar - quando conectado */}
                        {connection.status === 'connected' && connection.phone && connection.phone !== '-' && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => disconnectConnection(connection.id)}
                          >
                            <WifiOff className="h-4 w-4 mr-1" />
                            Desconectar
                          </Button>
                        )}
                        
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteConnection(connection.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Deletar
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

      {/* QR Code Modal */}
      <QRCodeModal
        connection={selectedConnection}
        isOpen={isQRModalOpen}
        onClose={() => {
          setIsQRModalOpen(false);
          setSelectedConnection(null);
        }}
      />
    </div>
  );
};

export default WhatsAppSettings;