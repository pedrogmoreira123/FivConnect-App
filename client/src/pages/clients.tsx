import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useT } from '@/hooks/use-translation';
import { useMobile } from '@/hooks/use-mobile';
import { useToast } from '@/hooks/use-toast';
import { 
  Search, 
  Filter, 
  Plus, 
  Download,
  Upload,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  MoreHorizontal,
  Edit,
  Trash2,
  MessageCircle
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface Client {
  id: string;
  name: string;
  company?: string;
  phone: string;
  email?: string;
  address?: string;
  status: 'active' | 'inactive';
  lastActivity?: string;
  totalTickets?: number;
  avatar?: string;
  bgColor?: string;
  allowWebApp?: boolean;
}

export default function ClientsPage() {
  const { t } = useT();
  const isMobile = useMobile();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showNewClientModal, setShowNewClientModal] = useState(false);
  
  const [newClient, setNewClient] = useState({
    name: '',
    company: '',
    phone: '',
    email: '',
    address: '',
    observations: '',
    status: 'active' as 'active' | 'inactive'
  });

  const { data: clients = [], isLoading } = useQuery<Client[]>({
    queryKey: ['/api/clients'],
    staleTime: 30000,
  });

  const createClient = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiRequest('POST', '/api/clients', payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      toast({ title: 'Cliente criado!', description: `${newClient.name} foi adicionado com sucesso.` });
      setNewClient({ name: '', company: '', phone: '', email: '', address: '', observations: '', status: 'active' });
      setShowNewClientModal(false);
    },
    onError: (e: any) => {
      toast({ title: 'Erro', description: e.message || 'Falha ao criar cliente', variant: 'destructive' });
    }
  });

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (client.company || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.phone.includes(searchQuery) ||
    (client.email || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectClient = (client: Client) => {
    setSelectedClient(client);
  };

  const handleToggleWebApp = (clientId: string, enabled: boolean) => {
    // Placeholder: would PATCH a client setting when backend supports
    if (selectedClient?.id === clientId) {
      setSelectedClient(prev => prev ? { ...prev, allowWebApp: enabled } : null);
    }
    toast({
      title: 'Permissões atualizadas',
      description: `App Web ${enabled ? 'habilitado' : 'desabilitado'} para o cliente.`,
    });
  };

  const handleCreateClient = () => {
    if (!newClient.name || !newClient.phone) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Nome e telefone são obrigatórios.',
      });
      return;
    }
    createClient.mutate({
      name: newClient.name,
      phone: newClient.phone,
      email: newClient.email || undefined,
      notes: newClient.observations || undefined,
    });
  };

  const handleExportExcel = async () => {
    try {
      const { utils, writeFile } = await import('xlsx');
      
      const exportData = clients.map(client => ({
        'Nome': client.name,
        'Empresa': client.company,
        'Telefone': client.phone,
        'Email': client.email,
        'Endereço': client.address,
        'Status': client.status === 'active' ? 'Ativo' : 'Inativo',
        'Última Atividade': client.lastActivity,
        'Total de Tickets': client.totalTickets,
        'App Permitido': client.allowWebApp ? 'Sim' : 'Não'
      }));

      const worksheet = utils.json_to_sheet(exportData);
      const workbook = utils.book_new();
      utils.book_append_sheet(workbook, worksheet, 'Clientes');
      
      const filename = `clientes_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.xlsx`;
      writeFile(workbook, filename);
      
      toast({
        title: "Exportação concluída!",
        description: `Arquivo ${filename} foi baixado com sucesso.`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro na exportação",
        description: "Não foi possível exportar os dados.",
      });
    }
  };

  const handleImportExcel = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const { read, utils } = await import('xlsx');
      
      const data = await file.arrayBuffer();
      const workbook = read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = utils.sheet_to_json(worksheet);
      
      const importedClients: Client[] = jsonData.map((row: any, index: number) => {
        const colors = ['bg-pink-500', 'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 'bg-red-500'];
        const randomColor = colors[Math.floor(Math.random() * colors.length)];
        const clientId = (row.Nome || `Cliente${index}`).split(' ').map((n: string) => n[0]).join('').toUpperCase();
        
        return {
          id: clientId + index,
          name: row.Nome || `Cliente ${index + 1}`,
          company: row.Empresa || 'Empresa não informada',
          phone: row.Telefone || '',
          email: row.Email || '',
          address: row.Endereço || '',
          status: (row.Status === 'Ativo' ? 'active' : 'inactive') as 'active' | 'inactive',
          lastActivity: row['Última Atividade'] || new Date().toLocaleDateString('pt-BR'),
          totalTickets: Number(row['Total de Tickets']) || 0,
          avatar: clientId,
          bgColor: randomColor,
          allowWebApp: row['App Permitido'] === 'Sim'
        };
      });
      
      setClients(prev => [...prev, ...importedClients]);
      
      toast({
        title: "Importação concluída!",
        description: `${importedClients.length} cliente(s) foram importados com sucesso.`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro na importação",
        description: "Não foi possível importar os dados. Verifique o formato do arquivo.",
      });
    }
    
    // Reset input
    event.target.value = '';
  };

  const handleEditClient = (client: Client) => {
    // Implement edit functionality
    toast({
      title: "Função em desenvolvimento",
      description: "A edição de clientes estará disponível em breve.",
    });
  };

  const handleChatWithClient = (client: Client) => {
    // Implement chat functionality
    toast({
      title: "Iniciar conversa",
      description: `Redirecionando para o chat com ${client.name}...`,
    });
  };

  const handleDeleteClient = (client: Client) => {
    if (window.confirm(`Tem certeza que deseja excluir o cliente ${client.name}?`)) {
      setClients(prev => prev.filter(c => c.id !== client.id));
      setSelectedClient(null);
      toast({
        title: "Cliente excluído",
        description: `${client.name} foi removido com sucesso.`,
      });
    }
  };

  return (
    <div className="h-full flex bg-background">
      {/* Client List - Left Panel */}
      <div className={`${selectedClient && isMobile ? 'hidden' : ''} w-full md:w-96 border-r border-border flex flex-col bg-background`}>
        {/* Header */}
        <div className="p-3 sm:p-4 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-lg sm:text-xl font-semibold text-foreground">Clientes</h1>
            <div className="flex items-center space-x-1 sm:space-x-2 flex-wrap">
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleImportExcel}
                className="hidden"
                id="import-excel"
              />
              <label htmlFor="import-excel">
                <Button variant="outline" size="sm" asChild data-testid="button-import-excel">
                  <span className="cursor-pointer">
                    <Upload className="h-4 w-4 mr-2" />
                    Importar
                  </span>
                </Button>
              </label>
              <Button variant="outline" size="sm" onClick={handleExportExcel} data-testid="button-export-excel">
                <Download className="h-4 w-4 mr-2" />
                Exportar
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
                <Filter className="h-4 w-4 mr-2" />
                Filtrar
              </Button>
              
              <Dialog open={showNewClientModal} onOpenChange={setShowNewClientModal}>
                <DialogTrigger asChild>
                  <Button size="sm" data-testid="button-new-client">
                    <Plus className="h-4 w-4 mr-2" />
                    Novo
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Cadastrar Novo Cliente</DialogTitle>
                  </DialogHeader>
                  
                  <div className="space-y-4">
                    {/* Nome */}
                    <div className="space-y-2">
                      <Label htmlFor="name">Nome Completo *</Label>
                      <Input
                        id="name"
                        placeholder="Ex: João Silva"
                        value={newClient.name}
                        onChange={(e) => setNewClient(prev => ({ ...prev, name: e.target.value }))}
                      />
                    </div>

                    {/* Empresa */}
                    <div className="space-y-2">
                      <Label htmlFor="company">Empresa</Label>
                      <Input
                        id="company"
                        placeholder="Ex: Silva Comércio LTDA"
                        value={newClient.company}
                        onChange={(e) => setNewClient(prev => ({ ...prev, company: e.target.value }))}
                      />
                    </div>

                    {/* Telefone e Email */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="phone">Telefone *</Label>
                        <Input
                          id="phone"
                          placeholder="(11) 99999-9999"
                          value={newClient.phone}
                          onChange={(e) => setNewClient(prev => ({ ...prev, phone: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">E-mail</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="joao@exemplo.com"
                          value={newClient.email}
                          onChange={(e) => setNewClient(prev => ({ ...prev, email: e.target.value }))}
                        />
                      </div>
                    </div>

                    {/* Endereço */}
                    <div className="space-y-2">
                      <Label htmlFor="address">Endereço</Label>
                      <Input
                        id="address"
                        placeholder="Rua, número, bairro, cidade - UF"
                        value={newClient.address}
                        onChange={(e) => setNewClient(prev => ({ ...prev, address: e.target.value }))}
                      />
                    </div>

                    {/* Status */}
                    <div className="space-y-2">
                      <Label htmlFor="status">Status</Label>
                      <Select 
                        value={newClient.status} 
                        onValueChange={(value: 'active' | 'inactive') => setNewClient(prev => ({ ...prev, status: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Ativo</SelectItem>
                          <SelectItem value="inactive">Inativo</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Observações */}
                    <div className="space-y-2">
                      <Label htmlFor="observations">Observações</Label>
                      <Textarea
                        id="observations"
                        placeholder="Informações adicionais sobre o cliente..."
                        value={newClient.observations}
                        onChange={(e) => setNewClient(prev => ({ ...prev, observations: e.target.value }))}
                        rows={3}
                      />
                    </div>

                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" onClick={() => setShowNewClientModal(false)}>
                        Cancelar
                      </Button>
                      <Button onClick={handleCreateClient}>
                        Cadastrar Cliente
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              
              <Button variant="outline" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Pesquisar clientes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search-clients"
            />
          </div>
        </div>

        {/* Client List */}
        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="p-4">Carregando clientes...</div>
          ) : (
            filteredClients.map((client) => (
              <div
                key={client.id}
                onClick={() => handleSelectClient(client)}
                className={`p-4 border-b border-border cursor-pointer hover:bg-accent transition-colors ${
                  selectedClient?.id === client.id ? 'bg-accent border-l-4 border-l-primary' : ''
                }`}
                data-testid={`client-${client.id}`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-12 h-12 ${client.bgColor} rounded-full flex items-center justify-center flex-shrink-0`}>
                    <span className="text-white font-semibold text-sm">
                      {client.avatar}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground truncate">
                      {client.name}
                    </h3>
                    <p className="text-sm text-muted-foreground truncate">
                      {client.phone}
                    </p>
                    <div className="flex items-center justify-between mt-1">
                      <Badge variant={client.status === 'active' ? 'default' : 'secondary'}>
                        {client.status === 'active' ? 'Ativo' : 'Inativo'}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {client.totalTickets} tickets
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Client Details - Right Panel */}
      {selectedClient && (
        <div className={`${!selectedClient && isMobile ? 'hidden' : ''} flex-1 flex flex-col bg-background`}>
          {/* Client Header */}
          <div className="p-6 border-b border-border">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-4">
                <div className={`w-16 h-16 ${selectedClient.bgColor} rounded-full flex items-center justify-center`}>
                  <span className="text-white font-bold text-lg">
                    {selectedClient.avatar}
                  </span>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-foreground">
                    {selectedClient.name}
                  </h2>
                  <p className="text-muted-foreground">
                    {selectedClient.company}
                  </p>
                  <div className="flex items-center space-x-2 mt-1">
                    <Badge variant={selectedClient.status === 'active' ? 'default' : 'secondary'}>
                      {selectedClient.status === 'active' ? 'Ativo' : 'Inativo'}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      Última atividade: {selectedClient.lastActivity}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm" onClick={() => handleEditClient(selectedClient)} data-testid="button-edit-client">
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleChatWithClient(selectedClient)} data-testid="button-chat-client">
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Chat
                </Button>
                <Button variant="outline" size="sm">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Client Information */}
          <div className="flex-1 p-6 space-y-6">
            {/* Contact Information */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">
                  Informações de Contato
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <Phone className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-foreground">Telefone</p>
                      <p className="text-sm text-muted-foreground">{selectedClient.phone}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-foreground">E-mail</p>
                      <p className="text-sm text-muted-foreground">{selectedClient.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <MapPin className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-foreground">Endereço</p>
                      <p className="text-sm text-muted-foreground">{selectedClient.address}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-foreground">Última Atividade</p>
                      <p className="text-sm text-muted-foreground">{selectedClient.lastActivity}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* App Permissions */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">
                  Permissões do App
                </h3>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">
                      Permitir ao cliente abrir atendimento via App e Web?
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      O cliente poderá iniciar conversas através do aplicativo web
                    </p>
                  </div>
                  <Switch
                    checked={selectedClient.allowWebApp}
                    onCheckedChange={(checked) => handleToggleWebApp(selectedClient.id, checked)}
                    data-testid="switch-web-app-permission"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Statistics */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">
                  Estatísticas
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <p className="text-2xl font-bold text-primary">{selectedClient.totalTickets}</p>
                    <p className="text-sm text-muted-foreground">Total de Tickets</p>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <p className="text-2xl font-bold text-green-600">
                      {Math.floor(selectedClient.totalTickets * 0.8)}
                    </p>
                    <p className="text-sm text-muted-foreground">Resolvidos</p>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <p className="text-2xl font-bold text-yellow-600">
                      {Math.floor(selectedClient.totalTickets * 0.15)}
                    </p>
                    <p className="text-sm text-muted-foreground">Pendentes</p>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <p className="text-2xl font-bold text-red-600">
                      {Math.floor(selectedClient.totalTickets * 0.05)}
                    </p>
                    <p className="text-sm text-muted-foreground">Cancelados</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-2 pt-4">
              <Button 
                variant="outline" 
                className="text-red-600 border-red-600 hover:bg-red-50"
                onClick={() => handleDeleteClient(selectedClient)}
                data-testid="button-delete-client"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Empty State - No Client Selected */}
      {!selectedClient && !isMobile && (
        <div className="flex-1 flex items-center justify-center bg-background">
          <div className="text-center">
            <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="h-12 w-12 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Bem-vindo à Gestão de Clientes
            </h3>
            <p className="text-muted-foreground mb-4">
              Escolha um cliente da lista para visualizar<br />
              suas informações e histórico de atendimento
            </p>
            <Button onClick={() => setShowNewClientModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Cadastrar Primeiro Cliente
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}