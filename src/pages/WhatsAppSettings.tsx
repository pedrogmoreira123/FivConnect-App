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
import { useAuth } from '@/hooks/useAuth';

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
      const response = await fetch(`/api/whatsapp/connections/${connection.companyId}/${connection.id}/qrcode`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setQrCode(data.qrcode);
      }
    } catch (error) {
      console.error('Error fetching QR code:', error);
    } finally {
      setIsLoading(false);
    }
  };

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

  const companyId = user?.companyId || user?.company?.id;

  useEffect(() => {
    if (companyId) {
      fetchConnections();
    }
  }, [companyId]);

  const fetchConnections = async () => {
    if (!companyId) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`/api/whatsapp/connections/${companyId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setConnections(data);
      } else {
        toast({
          title: "Erro",
          description: "Falha ao carregar conexões WhatsApp",
          variant: "destructive"
        });
      }
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

  const createConnection = async () => {
    if (!newConnectionName.trim() || !companyId) return;
    
    setIsCreating(true);
    try {
      const response = await fetch(`/api/whatsapp/connections/${companyId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          connectionName: newConnectionName.trim()
        })
      });
      
      if (response.ok) {
        const newConnection = await response.json();
        setConnections(prev => [newConnection, ...prev]);
        setNewConnectionName('');
        toast({
          title: "Sucesso",
          description: "Conexão criada com sucesso"
        });
      } else {
        const error = await response.json();
        toast({
          title: "Erro",
          description: error.message || "Falha ao criar conexão",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error creating connection:', error);
      toast({
        title: "Erro",
        description: "Erro ao criar conexão",
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
          'Authorization': `Bearer ${localStorage.getItem('token')}`
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

  const deleteConnection = async (connectionId: string) => {
    if (!companyId) return;
    
    if (!confirm('Tem certeza que deseja deletar esta conexão?')) return;
    
    try {
      const response = await fetch(`/api/whatsapp/connections/${companyId}/${connectionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
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

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      connected: { label: 'Conectado', variant: 'default' as const, icon: Wifi },
      connecting: { label: 'Conectando', variant: 'secondary' as const, icon: RefreshCw },
      disconnected: { label: 'Desconectado', variant: 'destructive' as const, icon: WifiOff },
      qr_ready: { label: 'QR Code Pronto', variant: 'outline' as const, icon: QrCode },
      destroyed: { label: 'Destruído', variant: 'destructive' as const, icon: Trash2 }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.disconnected;
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
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
        <Button onClick={fetchConnections} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
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
                      {connection.phone || '-'}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(connection.status)}
                    </TableCell>
                    <TableCell>
                      {connection.updatedAt 
                        ? new Date(connection.updatedAt).toLocaleString('pt-BR')
                        : '-'
                      }
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {connection.status === 'disconnected' && (
                          <Button
                            size="sm"
                            onClick={() => connectConnection(connection.id)}
                          >
                            <Wifi className="h-4 w-4 mr-1" />
                            Conectar
                          </Button>
                        )}
                        
                        {(connection.status === 'connecting' || connection.status === 'qr_ready') && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedConnection(connection);
                              setIsQRModalOpen(true);
                            }}
                          >
                            <QrCode className="h-4 w-4 mr-1" />
                            QR Code
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
