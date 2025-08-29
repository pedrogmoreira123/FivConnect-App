import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useT } from '@/hooks/use-translation';
import { 
  CreditCard, 
  Check, 
  Star, 
  Users, 
  Database, 
  BarChart3, 
  Zap,
  Headphones,
  Globe,
  DollarSign,
  Calendar,
  TrendingUp
} from 'lucide-react';

interface Plan {
  id: string;
  name: string;
  description: string;
  monthlyPrice: number;
  annualPrice: number;
  features: string[];
  maxUsers: number;
  maxQueues: number;
  hasAdvancedReports: boolean;
  hasApiAccess: boolean;
  hasPrioritySupport: boolean;
  isPopular?: boolean;
}

interface BillingStats {
  monthlyRevenue: number;
  annualRevenue: number;
  totalSubscriptions: number;
  churnRate: number;
}

export default function PlansAndBilling() {
  const { t } = useT();
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly');

  const [plans] = useState<Plan[]>([
    {
      id: 'basic',
      name: t('backoffice.plans.basic'),
      description: 'Ideal para pequenas empresas iniciando no atendimento digital',
      monthlyPrice: 79,
      annualPrice: 790,
      maxUsers: 5,
      maxQueues: 2,
      hasAdvancedReports: false,
      hasApiAccess: false,
      hasPrioritySupport: false,
      features: [
        'Até 5 usuários simultâneos',
        '2 filas de atendimento',
        'Relatórios básicos',
        'Chatbot básico',
        'Suporte por email'
      ]
    },
    {
      id: 'professional',
      name: t('backoffice.plans.professional'),
      description: 'Para empresas em crescimento que precisam de mais recursos',
      monthlyPrice: 189,
      annualPrice: 1890,
      maxUsers: 25,
      maxQueues: 10,
      hasAdvancedReports: true,
      hasApiAccess: true,
      hasPrioritySupport: false,
      isPopular: true,
      features: [
        'Até 25 usuários simultâneos',
        '10 filas de atendimento',
        'Relatórios avançados com exportação',
        'Chatbot inteligente',
        'API completa',
        'Suporte prioritário'
      ]
    },
    {
      id: 'enterprise',
      name: t('backoffice.plans.enterprise'),
      description: 'Solução completa para grandes empresas',
      monthlyPrice: 449,
      annualPrice: 4490,
      maxUsers: 100,
      maxQueues: 50,
      hasAdvancedReports: true,
      hasApiAccess: true,
      hasPrioritySupport: true,
      features: [
        'Até 100 usuários simultâneos',
        'Filas ilimitadas',
        'Relatórios personalizados',
        'IA avançada e automações',
        'API premium',
        'Suporte 24/7 dedicado',
        'Customizações sob medida'
      ]
    }
  ]);

  const [billingStats] = useState<BillingStats>({
    monthlyRevenue: 89650,
    annualRevenue: 1075800,
    totalSubscriptions: 142,
    churnRate: 3.2
  });

  const getCurrentPrice = (plan: Plan) => {
    return billingPeriod === 'monthly' ? plan.monthlyPrice : plan.annualPrice;
  };

  const getDiscount = (plan: Plan) => {
    const monthlyTotal = plan.monthlyPrice * 12;
    const annualPrice = plan.annualPrice;
    return Math.round(((monthlyTotal - annualPrice) / monthlyTotal) * 100);
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="plans" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="plans">Planos e Preços</TabsTrigger>
          <TabsTrigger value="billing">Faturamento</TabsTrigger>
        </TabsList>

        <TabsContent value="plans" className="space-y-6">
          {/* Billing Period Toggle */}
          <div className="flex items-center justify-center space-x-4">
            <span className={billingPeriod === 'monthly' ? 'font-medium' : 'text-muted-foreground'}>
              {t('backoffice.plans.monthly')}
            </span>
            <Switch
              checked={billingPeriod === 'annual'}
              onCheckedChange={(checked) => setBillingPeriod(checked ? 'annual' : 'monthly')}
              data-testid="switch-billing-period"
            />
            <span className={billingPeriod === 'annual' ? 'font-medium' : 'text-muted-foreground'}>
              {t('backoffice.plans.annual')}
            </span>
            {billingPeriod === 'annual' && (
              <Badge variant="default" className="bg-green-500">
                Economize até 20%
              </Badge>
            )}
          </div>

          {/* Plans Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <Card key={plan.id} className={`relative ${plan.isPopular ? 'ring-2 ring-primary shadow-lg' : ''}`}>
                {plan.isPopular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground px-3 py-1">
                      <Star className="h-3 w-3 mr-1" />
                      Mais Popular
                    </Badge>
                  </div>
                )}
                
                <CardHeader className="text-center pb-4">
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">{plan.description}</p>
                  
                  <div className="mt-4">
                    <div className="flex items-baseline justify-center">
                      <span className="text-3xl font-bold">R$ {getCurrentPrice(plan)}</span>
                      <span className="text-muted-foreground ml-1">
                        /{billingPeriod === 'monthly' ? 'mês' : 'ano'}
                      </span>
                    </div>
                    {billingPeriod === 'annual' && (
                      <p className="text-sm text-green-600 mt-1">
                        Economia de {getDiscount(plan)}% ao ano
                      </p>
                    )}
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    {plan.features.map((feature, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>
                  
                  <Button className="w-full" variant={plan.isPopular ? 'default' : 'outline'}>
                    Gerenciar Plano
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="billing" className="space-y-6">
          {/* Billing Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-sm font-medium">
                      Receita Mensal
                    </p>
                    <p className="text-2xl font-bold text-foreground">
                      R$ {billingStats.monthlyRevenue.toLocaleString('pt-BR')}
                    </p>
                  </div>
                  <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                    <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-sm font-medium">
                      Receita Anual
                    </p>
                    <p className="text-2xl font-bold text-foreground">
                      R$ {billingStats.annualRevenue.toLocaleString('pt-BR')}
                    </p>
                  </div>
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                    <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-sm font-medium">
                      Assinaturas Ativas
                    </p>
                    <p className="text-2xl font-bold text-foreground">
                      {billingStats.totalSubscriptions}
                    </p>
                  </div>
                  <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
                    <Users className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-sm font-medium">
                      Taxa de Churn
                    </p>
                    <p className="text-2xl font-bold text-foreground">
                      {billingStats.churnRate}%
                    </p>
                  </div>
                  <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Revenue Chart Placeholder */}
          <Card>
            <CardHeader>
              <CardTitle>Evolução da Receita</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="h-64 bg-muted rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Gráfico de receita será implementado aqui</p>
                  <p className="text-sm text-muted-foreground">Integração com dados de faturamento em tempo real</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}