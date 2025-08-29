import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useT } from '@/hooks/use-translation';
import ClientManagement from '@/components/backoffice/client-management';
import PlansAndBilling from '@/components/backoffice/plans-billing';
import AccessControl from '@/components/backoffice/access-control';
import { 
  Building2, 
  Users, 
  CreditCard, 
  Shield, 
  BarChart3,
  Globe,
  Settings
} from 'lucide-react';

interface BackofficeStats {
  totalClients: number;
  activeClients: number;
  totalRevenue: number;
  totalUsers: number;
}

export default function BackofficePage() {
  const { t } = useT();
  
  const [stats] = useState<BackofficeStats>({
    totalClients: 142,
    activeClients: 128,
    totalRevenue: 89650,
    totalUsers: 1847
  });

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center space-x-2">
            <Building2 className="h-6 w-6" />
            <span>{t('backoffice.title')}</span>
          </h1>
          <p className="text-muted-foreground mt-1">
            Painel de administração multi-tenancy para gestão de clientes e planos
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="flex items-center space-x-1">
            <Globe className="h-3 w-3" />
            <span>Multi-Tenant</span>
          </Badge>
          <Badge variant="default">Admin Global</Badge>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm font-medium">
                  Total de Clientes
                </p>
                <p className="text-xl sm:text-2xl font-bold text-foreground" data-testid="text-total-clients">
                  {stats.totalClients}
                </p>
              </div>
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm font-medium">
                  Clientes Ativos
                </p>
                <p className="text-2xl font-bold text-foreground" data-testid="text-active-clients">
                  {stats.activeClients}
                </p>
              </div>
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                <Users className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm font-medium">
                  Receita Mensal
                </p>
                <p className="text-2xl font-bold text-foreground" data-testid="text-total-revenue">
                  R$ {stats.totalRevenue.toLocaleString('pt-BR')}
                </p>
              </div>
              <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
                <CreditCard className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm font-medium">
                  Total de Usuários
                </p>
                <p className="text-2xl font-bold text-foreground" data-testid="text-total-users">
                  {stats.totalUsers}
                </p>
              </div>
              <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center">
                <BarChart3 className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Backoffice Tabs */}
      <Tabs defaultValue="clients" className="space-y-4 sm:space-y-6">
        <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3 h-auto">
          <TabsTrigger value="clients" className="flex items-center justify-center space-x-2 p-2 sm:p-3">
            <Building2 className="h-4 w-4" />
            <span className="text-sm sm:text-base">{t('backoffice.clientManagement')}</span>
          </TabsTrigger>
          <TabsTrigger value="plans" className="flex items-center justify-center space-x-2 p-2 sm:p-3">
            <CreditCard className="h-4 w-4" />
            <span className="text-sm sm:text-base">{t('backoffice.plansAndBilling')}</span>
          </TabsTrigger>
          <TabsTrigger value="access" className="flex items-center justify-center space-x-2 p-2 sm:p-3">
            <Shield className="h-4 w-4" />
            <span className="text-sm sm:text-base">{t('backoffice.accessControl')}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="clients">
          <ClientManagement />
        </TabsContent>

        <TabsContent value="plans">
          <PlansAndBilling />
        </TabsContent>

        <TabsContent value="access">
          <AccessControl />
        </TabsContent>
      </Tabs>
    </div>
  );
}