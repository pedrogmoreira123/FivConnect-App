import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
  AlertCircle
} from 'lucide-react';
import type { Company } from '@shared/schema';

// Form schemas
const companySchema = z.object({
  name: z.string().min(2, "Company name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  document: z.string().optional(),
  maxUsers: z.number().min(1, "Must allow at least 1 user").default(5),
  maxConnections: z.number().min(1, "Must allow at least 1 connection").default(2),
  maxQueues: z.number().min(1, "Must allow at least 1 queue").default(3),
  status: z.enum(["active", "suspended", "canceled", "trial"]).default("trial"),
});

const userSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["owner", "admin", "supervisor", "agent"]).default("agent"),
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
  const [showUsersModal, setShowUsersModal] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch companies
  const { data: companies = [], isLoading: loadingCompanies } = useQuery<Company[]>({
    queryKey: ['/api/admin/companies'],
    staleTime: 30000,
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
      maxConnections: 2,
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
        return await apiRequest(`/api/admin/companies/${editingCompany.id}`, 'PUT', data);
      }
      return await apiRequest('/api/admin/companies', 'POST', data);
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
      return await apiRequest(`/api/admin/companies/${selectedCompany?.id}/users`, 'POST', data);
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
      return await apiRequest(`/api/admin/companies/${id}`, 'DELETE');
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
      maxConnections: company.maxConnections || 2,
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
            <p className="text-muted-foreground">Loading companies...</p>
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
          <h1 className="text-3xl font-bold tracking-tight">Admin Panel</h1>
          <p className="text-muted-foreground">Manage companies and their users</p>
        </div>
        <Button 
          onClick={handleCreateCompany}
          data-testid="button-create-company"
        >
          <Plus className="mr-2 h-4 w-4" />
          New Company
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <div className="ml-2">
                <p className="text-sm font-medium text-muted-foreground">Total Companies</p>
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
                <p className="text-sm font-medium text-muted-foreground">Active</p>
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
                <p className="text-sm font-medium text-muted-foreground">Trial</p>
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
                <p className="text-sm font-medium text-muted-foreground">Issues</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {companies.filter((c: Company) => c.status === 'suspended' || c.status === 'canceled').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Companies Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {companies.map((company: CompanyWithStats) => (
          <Card key={company.id} data-testid={`card-company-${company.id}`}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-base">{company.name}</CardTitle>
                  <div className="flex items-center space-x-2">
                    <Badge 
                      variant="outline" 
                      className={`${getStatusColor(company.status)} text-white border-0`}
                    >
                      {company.status}
                    </Badge>
                  </div>
                </div>
                <div className="flex space-x-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEditCompany(company)}
                    data-testid={`button-edit-${company.id}`}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteCompany(company)}
                    data-testid={`button-delete-${company.id}`}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2 text-sm">
                <div className="flex items-center text-muted-foreground">
                  <Mail className="mr-2 h-3 w-3" />
                  <span className="truncate">{company.email}</span>
                </div>
                {company.phone && (
                  <div className="flex items-center text-muted-foreground">
                    <Phone className="mr-2 h-3 w-3" />
                    <span>{company.phone}</span>
                  </div>
                )}
                <div className="flex items-center text-muted-foreground">
                  <Calendar className="mr-2 h-3 w-3" />
                  <span>Created {formatDistanceToNow(new Date(company.createdAt!))} ago</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2 border-t">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Users</p>
                  <p className="font-semibold">{company.userCount || 0}/{company.maxUsers}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Connections</p>
                  <p className="font-semibold">{company.connectionCount || 0}/{company.maxConnections}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Queues</p>
                  <p className="font-semibold">0/{company.maxQueues}</p>
                </div>
              </div>

              <div className="flex space-x-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => handleViewUsers(company)}
                  data-testid={`button-view-users-${company.id}`}
                >
                  <Eye className="mr-2 h-3 w-3" />
                  Users
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => handleAddUser(company)}
                  data-testid={`button-add-user-${company.id}`}
                >
                  <UserPlus className="mr-2 h-3 w-3" />
                  Add User
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Company Modal */}
      <Dialog open={showCompanyModal} onOpenChange={setShowCompanyModal}>
        <DialogContent className="sm:max-w-[600px]" data-testid="dialog-company-form">
          <DialogHeader>
            <DialogTitle>
              {editingCompany ? 'Edit Company' : 'Create New Company'}
            </DialogTitle>
            <DialogDescription>
              {editingCompany 
                ? 'Update company information and settings' 
                : 'Add a new company to the system'
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
                      <FormLabel>Company Name</FormLabel>
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
                      <FormLabel>Company Email</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="contact@acme.com" 
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
                      <FormLabel>Phone (Optional)</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="+1 (555) 123-4567" 
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
                      <FormLabel>Document (Optional)</FormLabel>
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
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="trial">Trial</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="suspended">Suspended</SelectItem>
                        <SelectItem value="canceled">Canceled</SelectItem>
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
                      <FormLabel>Max Users</FormLabel>
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
                  name="maxConnections"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Connections</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="1" 
                          {...field} 
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                          data-testid="input-max-connections"
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
                      <FormLabel>Max Queues</FormLabel>
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
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={companyMutation.isPending}
                  data-testid="button-save-company"
                >
                  {companyMutation.isPending ? 'Saving...' : (editingCompany ? 'Update' : 'Create')}
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
            <DialogTitle>Company Users - {selectedCompany?.name}</DialogTitle>
            <DialogDescription>
              Manage users for this company
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {companyUsers.length === 0 ? (
              <div className="text-center py-8">
                <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No users found</p>
                <Button 
                  className="mt-4"
                  onClick={() => {
                    setShowUsersModal(false);
                    handleAddUser(selectedCompany!);
                  }}
                >
                  <UserPlus className="mr-2 h-4 w-4" />
                  Add First User
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
            <DialogTitle>Add User to {selectedCompany?.name}</DialogTitle>
            <DialogDescription>
              Create a new user or add an existing user to this company
            </DialogDescription>
          </DialogHeader>

          <Form {...userForm}>
            <form onSubmit={userForm.handleSubmit((data) => userMutation.mutate(data))} className="space-y-4">
              <FormField
                control={userForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="John Doe" 
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
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="john@example.com" 
                        type="email" 
                        {...field} 
                        data-testid="input-user-email"
                      />
                    </FormControl>
                    <FormDescription>
                      If user already exists, they'll be added to the company
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
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder="••••••••" 
                        {...field} 
                        data-testid="input-user-password"
                      />
                    </FormControl>
                    <FormDescription>
                      Only used for new users (ignored if user exists)
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
                    <FormLabel>Role</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-user-role">
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="agent">Agent</SelectItem>
                        <SelectItem value="supervisor">Supervisor</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="owner">Owner</SelectItem>
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
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={userMutation.isPending}
                  data-testid="button-save-user"
                >
                  {userMutation.isPending ? 'Adding...' : 'Add User'}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}