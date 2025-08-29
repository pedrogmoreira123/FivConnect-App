import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useT } from '@/hooks/use-translation';
import { useToast } from '@/hooks/use-toast';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Eye, 
  Building2,
  Users,
  Mail,
  Phone,
  Calendar,
  Activity
} from 'lucide-react';

interface Client {
  id: string;
  companyName: string;
  contactEmail: string;
  contactPhone: string;
  plan: 'basic' | 'professional' | 'enterprise';
  activeUsers: number;
  maxUsers: number;
  status: 'active' | 'inactive' | 'suspended';
  createdAt: string;
  lastActivity: string;
  domain: string;
}

export default function ClientManagement() {
  const { t } = useT();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const [clients] = useState<Client[]>([
    {
      id: '1',
      companyName: 'TechCorp Solutions',
      contactEmail: 'admin@techcorp.com.br',
      contactPhone: '+55 11 99999-9999',
      plan: 'enterprise',
      activeUsers: 45,
      maxUsers: 50,
      status: 'active',
      createdAt: '2024-01-15',
      lastActivity: '2024-01-26 14:30',
      domain: 'techcorp.fiv.app'
    },
    {
      id: '2',
      companyName: 'Digital Innovations Ltda',
      contactEmail: 'contato@digitalinnovations.com.br',
      contactPhone: '+55 11 88888-8888',
      plan: 'professional',
      activeUsers: 18,
      maxUsers: 25,
      status: 'active',
      createdAt: '2024-01-10',
      lastActivity: '2024-01-26 09:15',
      domain: 'digitalinnovations.fiv.app'
    },
    {
      id: '3',
      companyName: 'StartupX',
      contactEmail: 'hello@startupx.com.br',
      contactPhone: '+55 11 77777-7777',
      plan: 'basic',
      activeUsers: 5,
      maxUsers: 10,
      status: 'active',
      createdAt: '2024-01-20',
      lastActivity: '2024-01-25 16:45',
      domain: 'startupx.fiv.app'
    },
    {
      id: '4',
      companyName: 'Legacy Corp',
      contactEmail: 'suporte@legacycorp.com.br',
      contactPhone: '+55 11 66666-6666',
      plan: 'professional',
      activeUsers: 12,
      maxUsers: 25,
      status: 'suspended',
      createdAt: '2023-12-01',
      lastActivity: '2024-01-10 11:20',
      domain: 'legacycorp.fiv.app'
    }
  ]);

  const filteredClients = clients.filter(client =>
    client.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.contactEmail.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: Client['status']) => {
    const variants = {
      active: 'default',
      inactive: 'secondary',
      suspended: 'destructive'
    } as const;

    const labels = {
      active: 'Ativo',
      inactive: 'Inativo',
      suspended: 'Suspenso'
    };

    return <Badge variant={variants[status]}>{labels[status]}</Badge>;
  };

  const getPlanBadge = (plan: Client['plan']) => {
    const labels = {
      basic: 'Básico',
      professional: 'Profissional',
      enterprise: 'Empresarial'
    };

    return <Badge variant="outline">{labels[plan]}</Badge>;
  };

  const handleCreateClient = () => {
    // Implementation for creating a new client
    toast({
      title: t('backoffice.clients.clientCreated'),
      description: "Novo cliente foi criado com sucesso!",
    });
    setIsCreateDialogOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder={t('backoffice.clients.searchClients')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-80"
              data-testid="input-search-clients"
            />
          </div>
        </div>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-new-client">
              <Plus className="h-4 w-4 mr-2" />
              {t('backoffice.clients.newClient')}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{t('backoffice.clients.createClient')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="companyName">{t('backoffice.clients.companyName')}</Label>
                  <Input id="companyName" placeholder="Nome da empresa" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="domain">Subdomínio</Label>
                  <Input id="domain" placeholder="exemplo.fiv.app" />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="contactEmail">{t('backoffice.clients.contactEmail')}</Label>
                <Input id="contactEmail" type="email" placeholder="contato@empresa.com.br" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="plan">{t('backoffice.clients.plan')}</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o plano" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="basic">Básico</SelectItem>
                      <SelectItem value="professional">Profissional</SelectItem>
                      <SelectItem value="enterprise">Empresarial</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxUsers">Máximo de Usuários</Label>
                  <Input id="maxUsers" type="number" placeholder="10" />
                </div>
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreateClient}>
                  Criar Cliente
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Clients Table */}
      <div className="grid gap-4">
        {filteredClients.map((client) => (
          <Card key={client.id}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
                    <Building2 className="h-6 w-6 text-primary-foreground" />
                  </div>
                  
                  <div>
                    <div className="flex items-center space-x-2 mb-1">
                      <h3 className="font-semibold text-lg">{client.companyName}</h3>
                      {getStatusBadge(client.status)}
                      {getPlanBadge(client.plan)}
                    </div>
                    
                    <div className="flex items-center space-x-6 text-sm text-muted-foreground">
                      <span className="flex items-center space-x-1">
                        <Mail className="h-3 w-3" />
                        <span>{client.contactEmail}</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <Phone className="h-3 w-3" />
                        <span>{client.contactPhone}</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <Users className="h-3 w-3" />
                        <span>{client.activeUsers}/{client.maxUsers} usuários</span>
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm" data-testid={`button-view-${client.id}`}>
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" data-testid={`button-edit-${client.id}`}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" data-testid={`button-delete-${client.id}`}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Domínio</p>
                  <p className="font-medium">{client.domain}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Criado em</p>
                  <p className="font-medium">{new Date(client.createdAt).toLocaleDateString('pt-BR')}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Última atividade</p>
                  <p className="font-medium">{client.lastActivity}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredClients.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhum cliente encontrado</h3>
            <p className="text-muted-foreground">
              Tente ajustar os filtros de busca ou crie um novo cliente.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}