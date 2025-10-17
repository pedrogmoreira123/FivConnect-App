import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { formatDistanceToNow } from 'date-fns';
import { 
  Building2, 
  Users, 
  Plus, 
  Edit, 
  Trash2, 
  UserPlus, 
  Eye,
  Mail,
  Phone,
  Calendar,
  TrendingUp,
  AlertCircle,
  MessageSquare,
  DollarSign,
  Calendar as CalendarIcon,
  Clock
} from 'lucide-react';
import type { Company } from '@shared/schema';
import { CompanyChannelsModal } from '@/components/modals/CompanyChannelsModal';

// Form schemas
const companySchema = z.object({
  name: z.string().min(2, "Company name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  document: z.string().optional(),
  maxUsers: z.number().min(1, "Must allow at least 1 user").default(5),
  maxQueues: z.number().min(1, "Must allow at least 1 queue").default(3),
  status: z.enum(["active", "suspended", "canceled", "trial"]).default("trial"),
});

const userSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["agent", "supervisor", "admin", "superadmin"]).default("agent"),
});

type CompanyForm = z.infer<typeof companySchema>;
type UserForm = z.infer<typeof userSchema>;

interface CompanyWithStats extends Company {
  userCount?: number;
  connectionCount?: number;
}

export default function AdminPanel() {
  const [selectedCompany, setSelectedCompany] = useState<CompanyWithStats | null>(null);
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  
  useEffect(() => {
    document.title = 'FivConnect - Painel Administrativo';
  }, []);
  const [showUsersModal, setShowUsersModal] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [showChannelsModal, setShowChannelsModal] = useState(false);
  const [selectedCompanyForChannels, setSelectedCompanyForChannels] = useState<{id: string, name: string} | null>(null);
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch companies
  const { data: companies = [], isLoading: loadingCompanies } = useQuery<Company[]>({
    queryKey: ['/api/admin/companies'],
    staleTime: 30000,
  });

  // Fetch partner balance
  const { data: partnerBalance, isLoading: loadingBalance, error: balanceError } = useQuery({
    queryKey: ['/api/whatsapp/partner/info'],
    queryFn: () => apiRequest('GET', '/api/whatsapp/partner/info'),
    refetchInterval: 60000, // Refetch every 1 minute
    retry: 2, // Retry failed requests 2 times
    retryDelay: 5000, // Wait 5 seconds between retries
  });

  // Fetch users for selected company
  const { data: companyUsers = [] } = useQuery<any[]>({
    queryKey: ['/api/admin/companies', selectedCompany?.id, 'users'],
    enabled: !!selectedCompany?.id,
    staleTime: 30000,
  });

  // Company form
  const companyForm = useForm<CompanyForm>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      document: '',
      maxUsers: 5,
      maxQueues: 3,
      status: 'trial',
    },
  });

  // User form
  const userForm = useForm<UserForm>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      role: 'agent',
    },
  });

  // Create/Update company mutation
  const companyMutation = useMutation({
    mutationFn: async (data: CompanyForm) => {
      if (editingCompany) {
        return await apiRequest('PUT', `/api/admin/companies/${editingCompany.id}`, data);
      }
      return await apiRequest('POST', '/api/admin/companies', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/companies'] });
      setShowCompanyModal(false);
      setEditingCompany(null);
      companyForm.reset();
      toast({
        title: "Success",
        description: editingCompany ? "Company updated successfully" : "Company created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save company",
        variant: "destructive",
      });
    },
  });

  // Create user mutation
  const userMutation = useMutation({
    mutationFn: async (data: UserForm) => {
      return await apiRequest('POST', '/api/users', { ...data, companyId: selectedCompany?.id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['/api/admin/companies', selectedCompany?.id, 'users'] 
      });
      setShowUserModal(false);
      userForm.reset();
      toast({
        title: "Success",
        description: "User added to company successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add user",
        variant: "destructive",
      });
    },
  });

  // Delete company mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('DELETE', `/api/admin/companies/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/companies'] });
      toast({
        title: "Success",
        description: "Company deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete company",
        variant: "destructive",
      });
    },
  });

  const handleCreateCompany = () => {
    setEditingCompany(null);
    companyForm.reset();
    setShowCompanyModal(true);
  };

  const handleEditCompany = (company: Company) => {
    setEditingCompany(company);
    companyForm.reset({
      name: company.name,
      email: company.email,
      phone: company.phone || '',
      document: company.document || '',
      maxUsers: company.maxUsers || 5,
      maxQueues: company.maxQueues || 3,
      status: company.status,
    });
    setShowCompanyModal(true);
  };

  const handleDeleteCompany = (company: Company) => {
    if (confirm(`Are you sure you want to delete ${company.name}? This action cannot be undone.`)) {
      deleteMutation.mutate(company.id);
    }
  };

  const handleViewUsers = (company: CompanyWithStats) => {
    setSelectedCompany(company);
    setShowUsersModal(true);
  };

  const handleAddUser = (company: CompanyWithStats) => {
    setSelectedCompany(company);
    userForm.reset();
    setShowUserModal(true);
  };

  const handleViewChannels = (company: CompanyWithStats) => {
    setSelectedCompanyForChannels({ id: company.id, name: company.name });
    setShowChannelsModal(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'trial': return 'bg-blue-500';
      case 'suspended': return 'bg-yellow-500';
      case 'canceled': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  if (loadingCompanies) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-muted-foreground">Carregando empresas...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="admin-panel">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Painel do Administrador</h1>
          <p className="text-muted-foreground">Gerencie as empresas e seus usuários</p>
        </div>
        <Button 
          onClick={handleCreateCompany}
          data-testid="button-create-company"
        >
          <Plus className="mr-2 h-4 w-4" />
          Nova Empresa
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <div className="ml-2">
                <p className="text-sm font-medium text-muted-foreground">Total de Empresas</p>
                <p className="text-2xl font-bold">{companies.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <div className="ml-2">
                <p className="text-sm font-medium text-muted-foreground">Ativas</p>
                <p className="text-2xl font-bold text-green-600">
                  {companies.filter((c: Company) => c.status === 'active').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <div className="ml-2">
                <p className="text-sm font-medium text-muted-foreground">Em Teste</p>
                <p className="text-2xl font-bold text-blue-600">
                  {companies.filter((c: Company) => c.status === 'trial').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <div className="ml-2">
                <p className="text-sm font-medium text-muted-foreground">Com Problemas</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {companies.filter((c: Company) => c.status === 'suspended' || c.status === 'canceled').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Partner Balance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Saldo Disponível (Partner)
          </CardTitle>
          <CardDescription>Informações sobre saldo da conta Partner Whapi.Cloud</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingBalance ? (
            <p>Carregando...</p>
          ) : balanceError ? (
            <p className="text-red-600">Erro ao carregar saldo do partner</p>
          ) : (
            <div>
              <p className="text-3xl font-bold">
                {partnerBalance?.data?.balance ?? 0} {partnerBalance?.data?.currency ?? 'BRL'}
              </p>
              <p className="text-sm text-gray-500">
                ID: {partnerBalance?.data?.id || 'N/A'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Companies List */}
      <Card>
        <CardHeader>
          <CardTitle>Empresas</CardTitle>
          <CardDescription>Lista de todas as empresas cadastradas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {companies.map((company: CompanyWithStats) => (
              <div 
                key={company.id} 
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                data-testid={`card-company-${company.id}`}
              >
                {/* Informações da Empresa */}
                <div className="flex items-center space-x-6 flex-1">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium text-gray-900 truncate">{company.name}</h3>
                    <p className="text-sm text-gray-500 truncate">{company.email}</p>
                  </div>
                  
                  {/* Estatísticas */}
                  <div className="flex items-center space-x-6 text-sm">
                    <div className="text-center">
                      <p className="text-xs text-gray-500">Usuários</p>
                      <p className="font-semibold">{company.userCount || 0}/{company.maxUsers}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-500">Conexões</p>
                      <p className="font-semibold">{company.connectionCount || 0}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-500">Filas</p>
                      <p className="font-semibold">0/{company.maxQueues}</p>
                    </div>
                  </div>
                </div>

                {/* Botões de Ação */}
                <div className="flex items-center space-x-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewUsers(company)}
                          data-testid={`button-view-users-${company.id}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Ver Usuários</p>
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleAddUser(company)}
                          data-testid={`button-add-user-${company.id}`}
                        >
                          <UserPlus className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Adicionar Usuário</p>
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewChannels(company)}
                          data-testid={`button-view-channels-${company.id}`}
                        >
                          <MessageSquare className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Ver Canais WhatsApp</p>
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditCompany(company)}
                          data-testid={`button-edit-${company.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Editar Empresa</p>
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteCompany(company)}
                          data-testid={`button-delete-${company.id}`}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Excluir Empresa</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Company Modal */}
      <Dialog open={showCompanyModal} onOpenChange={setShowCompanyModal}>
        <DialogContent className="sm:max-w-[600px]" data-testid="dialog-company-form">
          <DialogHeader>
            <DialogTitle>
              {editingCompany ? 'Editar Empresa' : 'Criar Nova Empresa'}
            </DialogTitle>
            <DialogDescription>
              {editingCompany 
                ? 'Atualize as informações e configurações da empresa' 
                : 'Adicione uma nova empresa ao sistema'
              }
            </DialogDescription>
          </DialogHeader>

          <Form {...companyForm}>
            <form onSubmit={companyForm.handleSubmit((data) => companyMutation.mutate(data))} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={companyForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome da Empresa</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Acme Corp" 
                          {...field} 
                          data-testid="input-company-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={companyForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>E-mail da Empresa</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="contato@acme.com" 
                          type="email" 
                          {...field} 
                          data-testid="input-company-email"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={companyForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefone (Opcional)</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="+55 (11) 99999-9999" 
                          {...field} 
                          data-testid="input-company-phone"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={companyForm.control}
                  name="document"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Documento (Opcional)</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="CNPJ/CPF" 
                          {...field} 
                          data-testid="input-company-document"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={companyForm.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-company-status">
                          <SelectValue placeholder="Selecione o status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="trial">Teste</SelectItem>
                        <SelectItem value="active">Ativa</SelectItem>
                        <SelectItem value="suspended">Suspensa</SelectItem>
                        <SelectItem value="canceled">Cancelada</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={companyForm.control}
                  name="maxUsers"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Máx. Usuários</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="1" 
                          {...field} 
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                          data-testid="input-max-users"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />


                <FormField
                  control={companyForm.control}
                  name="maxQueues"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Máx. Filas</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="1" 
                          {...field} 
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                          data-testid="input-max-queues"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCompanyModal(false)}
                  data-testid="button-cancel-company"
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={companyMutation.isPending}
                  data-testid="button-save-company"
                >
                  {companyMutation.isPending ? 'Salvando...' : (editingCompany ? 'Atualizar' : 'Criar')}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Users Modal */}
      <Dialog open={showUsersModal} onOpenChange={setShowUsersModal}>
        <DialogContent className="sm:max-w-[700px]" data-testid="dialog-company-users">
          <DialogHeader>
            <DialogTitle>Usuários da Empresa - {selectedCompany?.name}</DialogTitle>
            <DialogDescription>
              Gerencie os usuários desta empresa
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {companyUsers.length === 0 ? (
              <div className="text-center py-8">
                <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Nenhum usuário encontrado</p>
                <Button 
                  className="mt-4"
                  onClick={() => {
                    setShowUsersModal(false);
                    handleAddUser(selectedCompany!);
                  }}
                >
                  <UserPlus className="mr-2 h-4 w-4" />
                  Adicionar Primeiro Usuário
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {companyUsers.map((userCompany: any) => (
                  <div 
                    key={userCompany.id} 
                    className="flex items-center justify-between p-3 border rounded-lg"
                    data-testid={`user-item-${userCompany.user.id}`}
                  >
                    <div>
                      <p className="font-medium">{userCompany.user.name}</p>
                      <p className="text-sm text-muted-foreground">{userCompany.user.email}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={userCompany.isOwner ? 'default' : 'secondary'}>
                        {userCompany.role}
                        {userCompany.isOwner && ' (Owner)'}
                      </Badge>
                      <Badge 
                        variant={userCompany.user.isOnline ? 'default' : 'outline'}
                        className={userCompany.user.isOnline ? 'bg-green-500' : ''}
                      >
                        {userCompany.user.isOnline ? 'Online' : 'Offline'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Add User Modal */}
      <Dialog open={showUserModal} onOpenChange={setShowUserModal}>
        <DialogContent className="sm:max-w-[500px]" data-testid="dialog-add-user">
          <DialogHeader>
            <DialogTitle>Adicionar Usuário à {selectedCompany?.name}</DialogTitle>
            <DialogDescription>
              Crie um novo usuário ou adicione um usuário existente a esta empresa
            </DialogDescription>
          </DialogHeader>

          <Form {...userForm}>
            <form onSubmit={userForm.handleSubmit((data) => userMutation.mutate(data))} className="space-y-4">
              <FormField
                control={userForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome Completo</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="João da Silva" 
                        {...field} 
                        data-testid="input-user-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />


              <FormField
                control={userForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>E-mail</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="joao@exemplo.com" 
                        type="email" 
                        {...field} 
                        data-testid="input-user-email"
                      />
                    </FormControl>
                    <FormDescription>
                      Se o usuário já existir, ele será adicionado à empresa
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={userForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Senha</FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder="••••••••" 
                        {...field} 
                        data-testid="input-user-password"
                      />
                    </FormControl>
                    <FormDescription>
                      Usado apenas para novos usuários (ignorado se o usuário existir)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={userForm.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Função</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-user-role">
                          <SelectValue placeholder="Selecione a função" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="agent">Agente</SelectItem>
                        <SelectItem value="supervisor">Supervisor</SelectItem>
                        <SelectItem value="admin">Administrador</SelectItem>
                        <SelectItem value="superadmin">Super Administrador</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowUserModal(false)}
                  data-testid="button-cancel-user"
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={userMutation.isPending}
                  data-testid="button-save-user"
                >
                  {userMutation.isPending ? 'Adicionando...' : 'Adicionar Usuário'}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Company Channels Modal */}
      {selectedCompanyForChannels && (
        <CompanyChannelsModal
          isOpen={showChannelsModal}
          onClose={() => {
            setShowChannelsModal(false);
            setSelectedCompanyForChannels(null);
          }}
          companyId={selectedCompanyForChannels.id}
          companyName={selectedCompanyForChannels.name}
        />
      )}
    </div>
  );
}
