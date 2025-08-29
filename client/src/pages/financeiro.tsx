import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  CreditCard, 
  DollarSign, 
  FileText, 
  TrendingUp, 
  Calendar,
  ExternalLink,
  Download,
  Package,
  AlertCircle,
  CheckCircle,
  Clock
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Plan {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  billingInterval: string;
  features: string[];
  maxUsers: number;
  maxConversations: number;
  storageLimit: number;
  isActive: boolean;
}

interface Subscription {
  id: string;
  planId: string;
  status: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
}

interface Invoice {
  id: string;
  number: string;
  amount: number;
  currency: string;
  status: string;
  dueDate: string;
  paidAt: string | null;
  description: string;
  invoiceUrl: string | null;
  downloadUrl: string | null;
  createdAt: string;
}

interface Payment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  paymentMethod: string;
  paidAt: string | null;
  createdAt: string;
}

const formatCurrency = (amount: number, currency: string = 'BRL') => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2
  }).format(amount / 100);
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'active':
    case 'paid':
    case 'succeeded':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
    case 'open':
    case 'pending':
    case 'past_due':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
    case 'inactive':
    case 'canceled':
    case 'failed':
    case 'void':
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
  }
};

const getStatusLabel = (status: string) => {
  const labels: { [key: string]: string } = {
    'active': 'Ativo',
    'inactive': 'Inativo',
    'past_due': 'Em Atraso',
    'canceled': 'Cancelado',
    'trialing': 'Período de Teste',
    'open': 'Em Aberto',
    'paid': 'Pago',
    'draft': 'Rascunho',
    'uncollectible': 'Incobrável',
    'void': 'Anulado',
    'pending': 'Pendente',
    'succeeded': 'Bem-sucedido',
    'failed': 'Falhou'
  };
  return labels[status] || status;
};

export default function Financeiro() {
  const [activeTab, setActiveTab] = useState("overview");

  // Fetch current subscription
  const { data: subscription } = useQuery<Subscription>({
    queryKey: ['/api/subscriptions/my'],
  });

  // Fetch available plans
  const { data: plans = [] } = useQuery<Plan[]>({
    queryKey: ['/api/plans/active'],
  });

  // Fetch open invoices
  const { data: openInvoices = [] } = useQuery<Invoice[]>({
    queryKey: ['/api/invoices/my/open'],
  });

  // Fetch current plan details
  const currentPlan = plans.find(plan => plan.id === subscription?.planId);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center space-x-2">
            <DollarSign className="h-6 w-6" />
            <span>Financeiro</span>
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie planos, faturas e pagamentos
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center space-x-2" data-testid="tab-overview">
            <TrendingUp className="h-4 w-4" />
            <span>Visão Geral</span>
          </TabsTrigger>
          <TabsTrigger value="plans" className="flex items-center space-x-2" data-testid="tab-plans">
            <Package className="h-4 w-4" />
            <span>Planos</span>
          </TabsTrigger>
          <TabsTrigger value="invoices" className="flex items-center space-x-2" data-testid="tab-invoices">
            <FileText className="h-4 w-4" />
            <span>Faturas</span>
          </TabsTrigger>
          <TabsTrigger value="payments" className="flex items-center space-x-2" data-testid="tab-payments">
            <CreditCard className="h-4 w-4" />
            <span>Pagamentos</span>
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Current Plan Card */}
            <Card data-testid="card-current-plan">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Plano Atual</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-plan-name">
                  {currentPlan?.name || 'Nenhum Plano'}
                </div>
                <div className="flex items-center space-x-2 mt-2">
                  {subscription?.status && (
                    <Badge 
                      className={getStatusColor(subscription.status)}
                      data-testid="badge-plan-status"
                    >
                      {getStatusLabel(subscription.status)}
                    </Badge>
                  )}
                  {currentPlan && (
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(currentPlan.price, currentPlan.currency)}/
                      {currentPlan.billingInterval === 'monthly' ? 'mês' : 'ano'}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Open Invoices Card */}
            <Card data-testid="card-open-invoices">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Faturas em Aberto</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-open-invoices-count">
                  {openInvoices.length}
                </div>
                {openInvoices.length > 0 && (
                  <div className="mt-2">
                    <div className="text-xs text-muted-foreground">
                      Total: {formatCurrency(
                        openInvoices.reduce((sum, invoice) => sum + invoice.amount, 0)
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Next Payment Card */}
            <Card data-testid="card-next-payment">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Próximo Pagamento</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {subscription?.currentPeriodEnd ? (
                  <>
                    <div className="text-2xl font-bold" data-testid="text-next-payment-date">
                      {formatDistanceToNow(new Date(subscription.currentPeriodEnd), {
                        addSuffix: true,
                        locale: ptBR
                      })}
                    </div>
                    {currentPlan && (
                      <p className="text-xs text-muted-foreground mt-2">
                        {formatCurrency(currentPlan.price, currentPlan.currency)}
                      </p>
                    )}
                  </>
                ) : (
                  <div className="text-2xl font-bold text-muted-foreground">
                    N/A
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Subscription Details */}
          {subscription && currentPlan && (
            <Card>
              <CardHeader>
                <CardTitle>Detalhes da Assinatura</CardTitle>
                <CardDescription>
                  Informações sobre seu plano atual e período de cobrança
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium mb-2">Informações do Plano</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Nome:</span>
                        <span className="font-medium">{currentPlan.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Preço:</span>
                        <span className="font-medium">
                          {formatCurrency(currentPlan.price, currentPlan.currency)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Cobrança:</span>
                        <span className="font-medium">
                          {currentPlan.billingInterval === 'monthly' ? 'Mensal' : 'Anual'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Limites</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Usuários:</span>
                        <span className="font-medium">{currentPlan.maxUsers}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Conversas:</span>
                        <span className="font-medium">{currentPlan.maxConversations}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Armazenamento:</span>
                        <span className="font-medium">{currentPlan.storageLimit}MB</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                <div>
                  <h4 className="font-medium mb-2">Funcionalidades Incluídas</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {currentPlan.features.map((feature, index) => (
                      <div key={index} className="flex items-center space-x-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Plans Tab */}
        <TabsContent value="plans" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Planos Disponíveis</CardTitle>
              <CardDescription>
                Escolha o plano que melhor atende às suas necessidades
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {plans.map((plan) => (
                  <Card key={plan.id} className={`relative ${
                    plan.id === subscription?.planId ? 'border-primary' : ''
                  }`} data-testid={`card-plan-${plan.id}`}>
                    {plan.id === subscription?.planId && (
                      <Badge className="absolute -top-2 left-4 bg-primary text-primary-foreground">
                        Plano Atual
                      </Badge>
                    )}
                    <CardHeader>
                      <CardTitle className="text-lg">{plan.name}</CardTitle>
                      <CardDescription>{plan.description}</CardDescription>
                      <div className="text-2xl font-bold">
                        {formatCurrency(plan.price, plan.currency)}
                        <span className="text-sm font-normal text-muted-foreground">
                          /{plan.billingInterval === 'monthly' ? 'mês' : 'ano'}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Usuários:</span>
                          <span className="font-medium">{plan.maxUsers}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Conversas:</span>
                          <span className="font-medium">{plan.maxConversations}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Armazenamento:</span>
                          <span className="font-medium">{plan.storageLimit}MB</span>
                        </div>
                      </div>
                      
                      <Separator />
                      
                      <div className="space-y-2">
                        {plan.features.map((feature, index) => (
                          <div key={index} className="flex items-center space-x-2 text-sm">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span>{feature}</span>
                          </div>
                        ))}
                      </div>
                      
                      <Button
                        className="w-full"
                        variant={plan.id === subscription?.planId ? "outline" : "default"}
                        disabled={plan.id === subscription?.planId}
                        data-testid={`button-select-plan-${plan.id}`}
                      >
                        {plan.id === subscription?.planId ? 'Plano Atual' : 'Selecionar Plano'}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Invoices Tab */}
        <TabsContent value="invoices" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Faturas em Aberto</CardTitle>
              <CardDescription>
                Faturas pendentes de pagamento
              </CardDescription>
            </CardHeader>
            <CardContent>
              {openInvoices.length > 0 ? (
                <div className="space-y-4">
                  {openInvoices.map((invoice) => (
                    <Card key={invoice.id} data-testid={`card-invoice-${invoice.id}`}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <h4 className="font-medium" data-testid={`text-invoice-number-${invoice.id}`}>
                                Fatura #{invoice.number || invoice.id.slice(0, 8)}
                              </h4>
                              <Badge 
                                className={getStatusColor(invoice.status)}
                                data-testid={`badge-invoice-status-${invoice.id}`}
                              >
                                {getStatusLabel(invoice.status)}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {invoice.description}
                            </p>
                            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                              <span>
                                Vencimento: {new Date(invoice.dueDate).toLocaleDateString('pt-BR')}
                              </span>
                              <span>
                                Criada: {formatDistanceToNow(new Date(invoice.createdAt), {
                                  addSuffix: true,
                                  locale: ptBR
                                })}
                              </span>
                            </div>
                          </div>
                          <div className="text-right space-y-2">
                            <div className="text-2xl font-bold" data-testid={`text-invoice-amount-${invoice.id}`}>
                              {formatCurrency(invoice.amount, invoice.currency)}
                            </div>
                            <div className="flex space-x-2">
                              {invoice.invoiceUrl && (
                                <Button size="sm" variant="outline" asChild>
                                  <a href={invoice.invoiceUrl} target="_blank" rel="noopener noreferrer">
                                    <ExternalLink className="h-4 w-4 mr-1" />
                                    Ver
                                  </a>
                                </Button>
                              )}
                              {invoice.downloadUrl && (
                                <Button size="sm" variant="outline" asChild>
                                  <a href={invoice.downloadUrl} download>
                                    <Download className="h-4 w-4 mr-1" />
                                    PDF
                                  </a>
                                </Button>
                              )}
                              <Button size="sm" data-testid={`button-pay-invoice-${invoice.id}`}>
                                <CreditCard className="h-4 w-4 mr-1" />
                                Pagar
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">Nenhuma fatura em aberto</h3>
                  <p className="text-muted-foreground">
                    Todas as suas faturas estão pagas ou não há faturas pendentes.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Gerenciamento de Pagamentos</CardTitle>
              <CardDescription>
                Configure métodos de pagamento e visualize o histórico
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Gerenciamento de Pagamentos</h3>
                <p className="text-muted-foreground mb-4">
                  Esta seção estará disponível em breve com integração completa do Stripe.
                </p>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center justify-center space-x-2">
                    <Clock className="h-4 w-4" />
                    <span>Métodos de pagamento</span>
                  </div>
                  <div className="flex items-center justify-center space-x-2">
                    <Clock className="h-4 w-4" />
                    <span>Histórico de transações</span>
                  </div>
                  <div className="flex items-center justify-center space-x-2">
                    <Clock className="h-4 w-4" />
                    <span>Cobrança automática</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}