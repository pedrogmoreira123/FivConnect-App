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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useT } from '@/hooks/use-translation';
import { useMobile } from '@/hooks/use-mobile';
import { useToast } from '@/hooks/use-toast';
import { 
  Search, 
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
  MessageCircle,
  FileSpreadsheet,
  MessageSquare
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { formatPhoneNumber } from '@/lib/utils';
import { useLocation } from 'wouter';
import { IMaskInput } from 'react-imask';

// Schema de validação para o formulário de cliente
const clientSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  phone: z.string().min(1, 'Telefone é obrigatório'),
  email: z.string().optional(),
  cpf: z.string().optional(),
  company: z.string().optional(),
  address: z.string().optional(),
  status: z.enum(['active', 'inactive']).default('active')
});

type ClientFormData = z.infer<typeof clientSchema>;

interface Client {
  id: string;
  name: string;
  company?: string;
  phone: string;
  email?: string;
  address?: string;
  cpf?: string;
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
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showNewClientModal, setShowNewClientModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  // Query para buscar detalhes do cliente selecionado
  const { data: clientDetails } = useQuery({
    queryKey: ['client-details', selectedClient?.id],
    queryFn: async () => {
      if (!selectedClient?.id) return null;
      const response = await apiRequest('GET', `/api/clients/${selectedClient.id}/details`);
      return response.json();
    },
    enabled: !!selectedClient?.id
  });
  
  // Form setup with react-hook-form
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting }
  } = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: '',
      phone: '',
      email: '',
      cpf: '',
      company: '',
      address: '',
      status: 'active'
    }
  });

  const { data: clients = [], isLoading } = useQuery<Client[]>({
    queryKey: ['/api/clients', searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) {
        params.append('search', searchQuery);
      }
      const response = await apiRequest('GET', `/api/clients?${params.toString()}`);
      return response.json();
    },
    staleTime: 30000,
  });

  const createClient = useMutation({
    mutationFn: async (payload: ClientFormData) => {
      const res = await apiRequest('POST', '/api/clients', payload);
      return res.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      toast({ title: 'Cliente criado!', description: `${variables.name} foi adicionado com sucesso.` });
      reset();
      setShowNewClientModal(false);
    },
    onError: (e: any) => {
      toast({ title: 'Erro', description: e.message || 'Falha ao criar cliente', variant: 'destructive' });
    }
  });

  const importWhatsAppContacts = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('GET', '/api/whatsapp/import-contacts');
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      toast({ 
        title: 'Contatos importados!', 
        description: `${data.importedCount} contatos foram importados do WhatsApp.` 
      });
    },
    onError: (e: any) => {
      toast({ title: 'Erro', description: e.message || 'Falha ao importar contatos', variant: 'destructive' });
    }
  });

  const updateClient = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ClientFormData }) => {
      const res = await apiRequest('PUT', `/api/clients/${id}`, data);
      return res.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      queryClient.invalidateQueries({ queryKey: ['client-details', variables.id] });
      // Update selectedClient if it's the one being edited
      if (selectedClient?.id === variables.id) {
        setSelectedClient(prev => prev ? { ...prev, ...data } : null);
      }
      toast({ title: 'Cliente atualizado!', description: 'Dados do cliente foram atualizados com sucesso.' });
      setEditingClient(null);
      setShowNewClientModal(false);
      reset();
    },
    onError: (e: any) => {
      toast({ title: 'Erro', description: e.message || 'Falha ao atualizar cliente', variant: 'destructive' });
    }
  });

  const createOrFindConversation = useMutation({
    mutationFn: async (clientId: string) => {
      const res = await apiRequest('POST', `/api/whatsapp/conversations/create-or-find`, { clientId });
      return res.json();
    },
    onSuccess: (data) => {
      setLocation(`/conversations?conversation=${data.conversationId}`);
    },
    onError: (e: any) => {
      toast({ title: 'Erro', description: e.message || 'Falha ao iniciar conversa', variant: 'destructive' });
    }
  });

  // O filtro agora é feito no backend
  const filteredClients = clients;

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

  const handleCreateClient = (data: ClientFormData) => {
    console.log('📝 Dados do formulário:', data);
    if (editingClient) {
      console.log('✏️ Editando cliente:', editingClient.id, 'com dados:', data);
      updateClient.mutate({ id: editingClient.id, data });
    } else {
      console.log('➕ Criando novo cliente com dados:', data);
      createClient.mutate(data);
    }
  };

  const handleEditClient = (client: Client) => {
    setEditingClient(client);
    reset({
      name: client.name,
      phone: client.phone,
      email: client.email || '',
      cpf: client.cpf || '',
      company: client.company || '',
      address: client.address || '',
      status: client.status
    });
    setShowNewClientModal(true);
  };

  const handleChatWithClient = (client: Client) => {
    createOrFindConversation.mutate(client.id);
  };

  const handleExportExcel = async () => {
    try {
      const response = await apiRequest('GET', '/api/clients/export/excel');
      const blob = await response.blob();
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `clientes_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Exportação concluída!",
        description: "Arquivo Excel foi baixado com sucesso.",
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
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await apiRequest('POST', '/api/clients/import/excel', formData);
      const result = await response.json();
      
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      
      toast({
        title: "Importação concluída!",
        description: `${result.importedCount} cliente(s) foram importados com sucesso.`,
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
              {/* Botão Novo Cliente */}
              <Dialog open={showNewClientModal} onOpenChange={setShowNewClientModal}>
                <DialogTrigger asChild>
                  <Button size="sm" data-testid="button-new-client">
                    <Plus className="h-4 w-4 mr-2" />
                    Novo
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-lg">
                  <DialogHeader>
                    <DialogTitle>{editingClient ? 'Editar Cliente' : 'Cadastrar Novo Cliente'}</DialogTitle>
                  </DialogHeader>
                  
                  <form onSubmit={handleSubmit(handleCreateClient)} className="space-y-4">
                    {/* Nome */}
                    <div className="space-y-2">
                      <Label htmlFor="name">Nome Completo *</Label>
                      <Input
                        id="name"
                        placeholder="Ex: João Silva"
                        {...register('name')}
                      />
                      {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
                    </div>

                    {/* Telefone */}
                    <div className="space-y-2">
                      <Label htmlFor="phone">Telefone *</Label>
                      <Input
                        id="phone"
                        placeholder="+55 (11) 99999-9999"
                        {...register('phone')}
                        className="w-full"
                        onChange={(e) => {
                          let value = e.target.value.replace(/\D/g, '');
                          if (value.length > 0) {
                            if (value.length <= 2) {
                              value = `+55 (${value}`;
                            } else if (value.length <= 4) {
                              value = `+55 (${value.substring(2)})`;
                            } else if (value.length <= 9) {
                              value = `+55 (${value.substring(2, 4)}) ${value.substring(4)}`;
                            } else {
                              value = `+55 (${value.substring(2, 4)}) ${value.substring(4, 9)}-${value.substring(9, 13)}`;
                            }
                          }
                          setValue('phone', value);
                        }}
                      />
                      {errors.phone && <p className="text-sm text-red-500">{errors.phone.message}</p>}
                    </div>

                    {/* Email */}
                    <div className="space-y-2">
                      <Label htmlFor="email">E-mail</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="joao@exemplo.com"
                        {...register('email')}
                      />
                      {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
                    </div>

                    {/* CPF/CNPJ */}
                    <div className="space-y-2">
                      <Label htmlFor="cpf">CPF/CNPJ</Label>
                      <Input
                        id="cpf"
                        placeholder="000.000.000-00 ou 00.000.000/0000-00"
                        {...register('cpf')}
                        className="w-full"
                        onChange={(e) => {
                          let value = e.target.value.replace(/\D/g, '');
                          if (value.length > 0) {
                            if (value.length <= 11) {
                              // CPF: 000.000.000-00
                              value = value.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
                            } else {
                              // CNPJ: 00.000.000/0000-00
                              value = value.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
                            }
                          }
                          setValue('cpf', value);
                        }}
                      />
                      {errors.cpf && <p className="text-sm text-red-500">{errors.cpf.message}</p>}
                    </div>

                    {/* Empresa */}
                    <div className="space-y-2">
                      <Label htmlFor="company">Empresa</Label>
                      <Input
                        id="company"
                        placeholder="Ex: Silva Comércio LTDA"
                        {...register('company')}
                      />
                    </div>

                    {/* Endereço */}
                    <div className="space-y-2">
                      <Label htmlFor="address">Endereço</Label>
                      <Input
                        id="address"
                        placeholder="Rua, número, bairro, cidade - UF"
                        {...register('address')}
                      />
                    </div>

                    {/* Status */}
                    <div className="space-y-2">
                      <Label htmlFor="status">Status</Label>
                      <Select value={watch('status')} onValueChange={(value) => setValue('status', value as 'active' | 'inactive')}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Ativo</SelectItem>
                          <SelectItem value="inactive">Inativo</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex justify-end space-x-2">
                      <Button type="button" variant="outline" onClick={() => setShowNewClientModal(false)}>
                        Cancelar
                      </Button>
                      <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? (editingClient ? 'Atualizando...' : 'Cadastrando...') : (editingClient ? 'Atualizar Cliente' : 'Cadastrar Cliente')}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
              
              {/* Dropdown Menu com opções de importação/exportação */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleExportExcel}>
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Exportar para Excel
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <label htmlFor="import-excel" className="cursor-pointer">
                      <Upload className="h-4 w-4 mr-2" />
                      Importar do Excel
                    </label>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => importWhatsAppContacts.mutate()}>
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Importar contatos do WhatsApp
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              
              {/* Input hidden para importação de Excel */}
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleImportExcel}
                className="hidden"
                id="import-excel"
              />
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
          ) : filteredClients.length === 0 ? (
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <User className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Nenhum cliente encontrado
                </h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery ? 'Nenhum cliente corresponde à sua busca.' : 'Comece cadastrando seu primeiro cliente.'}
                </p>
                <Button onClick={() => setShowNewClientModal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Cadastrar Cliente
                </Button>
              </div>
            </div>
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
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground truncate">
                      {client.name}
                    </h3>
                    <p className="text-sm text-muted-foreground truncate">
                      {formatPhoneNumber(client.phone)}
                    </p>
                    <div className="flex items-center justify-between mt-1">
                      <Badge variant={client.status === 'active' ? 'default' : 'secondary'}>
                        {client.status === 'active' ? 'Ativo' : 'Inativo'}
                      </Badge>
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
                    {formatPhoneNumber(selectedClient.phone)}
                  </span>
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
                      <p className="text-sm text-muted-foreground">{formatPhoneNumber(selectedClient.phone)}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-foreground">E-mail</p>
                      <p className="text-sm text-muted-foreground">{clientDetails?.client?.email || 'Não informado'}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <MapPin className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-foreground">Endereço</p>
                      <p className="text-sm text-muted-foreground">{clientDetails?.client?.address || 'Não informado'}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-foreground">Última Atividade</p>
                      <p className="text-sm text-muted-foreground">
                        {clientDetails?.lastMessage ? 
                          `${clientDetails.lastMessage.content.substring(0, 50)}...` : 
                          'Nenhuma atividade recente'
                        }
                      </p>
                    </div>
                  </div>
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
                    <p className="text-2xl font-bold text-primary">{clientDetails?.statistics?.totalTickets || 0}</p>
                    <p className="text-sm text-muted-foreground">Total de Tickets</p>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <p className="text-2xl font-bold text-green-600">
                      {clientDetails?.statistics?.completedTickets || 0}
                    </p>
                    <p className="text-sm text-muted-foreground">Resolvidos</p>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <p className="text-2xl font-bold text-blue-600">
                      {clientDetails?.statistics?.totalMessages || 0}
                    </p>
                    <p className="text-sm text-muted-foreground">Mensagens</p>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <p className="text-2xl font-bold text-yellow-600">
                      {clientDetails?.statistics?.completionRate || 0}%
                    </p>
                    <p className="text-sm text-muted-foreground">Taxa de Conclusão</p>
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
              Cadastrar Cliente
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}