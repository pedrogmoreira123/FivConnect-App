import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useT } from '@/hooks/use-translation';
import { 
  Shield, 
  Users, 
  Key, 
  Globe, 
  Database,
  Settings,
  Eye,
  Edit,
  Trash2,
  Plus,
  UserCheck,
  Lock
} from 'lucide-react';

interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  userCount: number;
  isSystemRole: boolean;
}

interface Permission {
  id: string;
  name: string;
  category: string;
  description: string;
}

interface TenantConfig {
  id: string;
  name: string;
  isolated: boolean;
  customDomain: boolean;
  ssoEnabled: boolean;
  apiAccess: boolean;
}

export default function AccessControl() {
  const { t } = useT();

  const [roles] = useState<Role[]>([
    {
      id: '1',
      name: 'Super Admin',
      description: 'Acesso total ao sistema e backoffice',
      permissions: ['full_access', 'user_management', 'billing_management', 'system_config'],
      userCount: 3,
      isSystemRole: true
    },
    {
      id: '2',
      name: 'Cliente Admin',
      description: 'Administrador da instância do cliente',
      permissions: ['instance_admin', 'user_management', 'reports_access', 'queue_config'],
      userCount: 142,
      isSystemRole: true
    },
    {
      id: '3',
      name: 'Supervisor',
      description: 'Supervisão de equipes e relatórios',
      permissions: ['team_management', 'reports_access', 'conversation_monitor'],
      userCount: 28,
      isSystemRole: true
    },
    {
      id: '4',
      name: 'Agente',
      description: 'Atendimento e gestão de conversas',
      permissions: ['conversation_access', 'basic_reports'],
      userCount: 1674,
      isSystemRole: true
    }
  ]);

  const [permissions] = useState<Permission[]>([
    {
      id: '1',
      name: 'full_access',
      category: 'Sistema',
      description: 'Acesso completo ao sistema'
    },
    {
      id: '2',
      name: 'user_management',
      category: 'Usuários',
      description: 'Criar, editar e excluir usuários'
    },
    {
      id: '3',
      name: 'billing_management',
      category: 'Faturamento',
      description: 'Gerenciar planos e faturamento'
    },
    {
      id: '4',
      name: 'reports_access',
      category: 'Relatórios',
      description: 'Visualizar relatórios avançados'
    },
    {
      id: '5',
      name: 'conversation_access',
      category: 'Conversas',
      description: 'Acessar e gerenciar conversas'
    },
    {
      id: '6',
      name: 'queue_config',
      category: 'Filas',
      description: 'Configurar filas de atendimento'
    }
  ]);

  const [tenantConfig] = useState<TenantConfig>({
    id: '1',
    name: 'Configuração Multi-tenant',
    isolated: true,
    customDomain: true,
    ssoEnabled: false,
    apiAccess: true
  });

  const getPermissionsByCategory = () => {
    const grouped: Record<string, Permission[]> = {};
    permissions.forEach(permission => {
      if (!grouped[permission.category]) {
        grouped[permission.category] = [];
      }
      grouped[permission.category].push(permission);
    });
    return grouped;
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="roles" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="roles">Funções e Permissões</TabsTrigger>
          <TabsTrigger value="tenancy">Multi-tenancy</TabsTrigger>
          <TabsTrigger value="security">Segurança</TabsTrigger>
        </TabsList>

        <TabsContent value="roles" className="space-y-6">
          {/* Roles Management */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Funções do Sistema</h3>
              <p className="text-sm text-muted-foreground">
                Gerencie funções e permissões para diferentes tipos de usuários
              </p>
            </div>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nova Função
            </Button>
          </div>

          <div className="grid gap-4">
            {roles.map((role) => (
              <Card key={role.id}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                        <Shield className="h-5 w-5 text-primary-foreground" />
                      </div>
                      
                      <div>
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className="font-semibold">{role.name}</h4>
                          {role.isSystemRole && (
                            <Badge variant="secondary">Sistema</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{role.description}</p>
                        <div className="flex items-center space-x-4 mt-2 text-sm text-muted-foreground">
                          <span className="flex items-center space-x-1">
                            <Users className="h-3 w-3" />
                            <span>{role.userCount} usuários</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <Key className="h-3 w-3" />
                            <span>{role.permissions.length} permissões</span>
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" disabled={role.isSystemRole}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" disabled={role.isSystemRole}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Permissions Overview */}
          <Card>
            <CardHeader>
              <CardTitle>Permissões Disponíveis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {Object.entries(getPermissionsByCategory()).map(([category, perms]) => (
                  <div key={category}>
                    <h4 className="font-semibold mb-3">{category}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {perms.map((permission) => (
                        <div key={permission.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <p className="font-medium text-sm">{permission.name}</p>
                            <p className="text-xs text-muted-foreground">{permission.description}</p>
                          </div>
                          <Badge variant="outline">{permission.category}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tenancy" className="space-y-6">
          {/* Multi-tenancy Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Globe className="h-5 w-5" />
                <span>Configuração Multi-tenant</span>
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Configure isolamento e recursos para diferentes clientes
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Isolamento Completo</h4>
                  <p className="text-sm text-muted-foreground">
                    Dados completamente isolados entre clientes
                  </p>
                </div>
                <Switch checked={tenantConfig.isolated} />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Domínios Personalizados</h4>
                  <p className="text-sm text-muted-foreground">
                    Permitir domínios customizados para clientes
                  </p>
                </div>
                <Switch checked={tenantConfig.customDomain} />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Single Sign-On (SSO)</h4>
                  <p className="text-sm text-muted-foreground">
                    Integração com provedores de identidade externos
                  </p>
                </div>
                <Switch checked={tenantConfig.ssoEnabled} />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Acesso à API</h4>
                  <p className="text-sm text-muted-foreground">
                    Permitir acesso programático via API
                  </p>
                </div>
                <Switch checked={tenantConfig.apiAccess} />
              </div>
            </CardContent>
          </Card>

          {/* Instance Management */}
          <Card>
            <CardHeader>
              <CardTitle>Gerenciamento de Instâncias</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 border rounded-lg">
                    <Database className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                    <p className="font-semibold">142</p>
                    <p className="text-sm text-muted-foreground">Instâncias Ativas</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <Globe className="h-8 w-8 text-green-500 mx-auto mb-2" />
                    <p className="font-semibold">89</p>
                    <p className="text-sm text-muted-foreground">Domínios Personalizados</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          {/* Security Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Lock className="h-5 w-5" />
                <span>Configurações de Segurança</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Autenticação de Dois Fatores</h4>
                  <p className="text-sm text-muted-foreground">
                    Exigir 2FA para administradores
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Bloqueio por Tentativas</h4>
                  <p className="text-sm text-muted-foreground">
                    Bloquear contas após tentativas inválidas
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Auditoria Completa</h4>
                  <p className="text-sm text-muted-foreground">
                    Registrar todas as ações administrativas
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Criptografia Avançada</h4>
                  <p className="text-sm text-muted-foreground">
                    Criptografia end-to-end para dados sensíveis
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>

          {/* Security Monitoring */}
          <Card>
            <CardHeader>
              <CardTitle>Monitoramento de Segurança</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <UserCheck className="h-8 w-8 text-green-500 mx-auto mb-2" />
                  <p className="font-semibold">99.8%</p>
                  <p className="text-sm text-muted-foreground">Logins Seguros</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <Shield className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                  <p className="font-semibold">23</p>
                  <p className="text-sm text-muted-foreground">Tentativas Bloqueadas</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <Eye className="h-8 w-8 text-purple-500 mx-auto mb-2" />
                  <p className="font-semibold">1,247</p>
                  <p className="text-sm text-muted-foreground">Logs de Auditoria</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}