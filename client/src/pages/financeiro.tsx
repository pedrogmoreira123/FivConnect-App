import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
  Clock,
  Plus,
  Edit,
  Trash2
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

// Form schema for plan creation/editing
const planSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  description: z.string().optional(),
  price: z.number().min(0, "Preço deve ser maior que 0"),
  currency: z.string().default("BRL"),
  billingInterval: z.enum(["monthly", "yearly"]).default("monthly"),
  maxUsers: z.number().min(1, "Deve permitir pelo menos 1 usuário").default(1),
  maxConversations: z.number().min(1, "Deve permitir pelo menos 1 conversa").default(100),
  storageLimit: z.number().min(1, "Limite de armazenamento deve ser maior que 0").default(1000),
  features: z.array(z.string()).default([]),
  isActive: z.boolean().default(true)
});

type PlanForm = z.infer<typeof planSchema>;

export default function Financeiro() {
  const [activeTab, setActiveTab] = useState("overview");
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [newFeature, setNewFeature] = useState("");
  
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isSuperAdmin = user?.role === 'superadmin';

  // Fetch current subscription
  const { data: subscription } = useQuery<Subscription>({
    queryKey: ['/api/subscriptions/my'],
  });

  // Fetch available plans
  const { data: plans = [] } = useQuery<Plan[]>({
    queryKey: ['/api/plans/active'],
  });

  // Fetch all plans (for superadmin)
  const { data: allPlans = [] } = useQuery<Plan[]>({
    queryKey: ['/api/admin/plans'],
    enabled: isSuperAdmin,
    staleTime: 30000,
  });

  // Plan form
  const planForm = useForm<PlanForm>({
    resolver: zodResolver(planSchema),
    defaultValues: {
      name: '',
      description: '',
      price: 0,
      currency: 'BRL',
      billingInterval: 'monthly',
      maxUsers: 1,
      maxConversations: 100,
      storageLimit: 1000,
      features: [],
      isActive: true
    },
  });

  // Create/Update plan mutation
  const planMutation = useMutation({
    mutationFn: async (data: PlanForm) => {
      const planData = {
        ...data,
        price: data.price * 100, // Convert to cents
      };
      
      if (editingPlan) {
        return await apiRequest('PUT', `/api/admin/plans/${editingPlan.id}`, planData);
      }
      return await apiRequest('POST', '/api/admin/plans', planData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/plans'] });
      queryClient.invalidateQueries({ queryKey: ['/api/plans/active'] });
      setShowPlanModal(false);
      setEditingPlan(null);
      planForm.reset();
      toast({
        title: "Sucesso",
        description: editingPlan ? "Plano atualizado com sucesso" : "Plano criado com sucesso",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao salvar plano",
        variant: "destructive",
      });
    },
  });

  // Delete plan mutation
  const deletePlanMutation = useMutation({
    mutationFn: async (planId: string) => {
      return await apiRequest('DELETE', `/api/admin/plans/${planId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/plans'] });
      queryClient.invalidateQueries({ queryKey: ['/api/plans/active'] });
      toast({
        title: "Sucesso",
        description: "Plano removido com sucesso",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao remover plano",
        variant: "destructive",
      });
    },
  });

  const handleCreatePlan = () => {
    setEditingPlan(null);
    planForm.reset();
    setShowPlanModal(true);
  };

  const handleEditPlan = (plan: Plan) => {
    setEditingPlan(plan);
    planForm.reset({
      name: plan.name,
      description: plan.description || '',
      price: plan.price / 100, // Convert from cents
      currency: plan.currency,
      billingInterval: plan.billingInterval as 'monthly' | 'yearly',
      maxUsers: plan.maxUsers || 1,
      maxConversations: plan.maxConversations || 100,
      storageLimit: plan.storageLimit || 1000,
      features: plan.features || [],
      isActive: plan.isActive,
    });
    setShowPlanModal(true);
  };

  const handleDeletePlan = (plan: Plan) => {
    if (confirm(`Tem certeza que deseja remover o plano "${plan.name}"? Esta ação não pode ser desfeita.`)) {
      deletePlanMutation.mutate(plan.id);
    }
  };

  const addFeature = () => {
    if (newFeature.trim()) {
      const currentFeatures = planForm.getValues('features');
      planForm.setValue('features', [...currentFeatures, newFeature.trim()]);
      setNewFeature('');
    }
  };

  const removeFeature = (index: number) => {
    const currentFeatures = planForm.getValues('features');
    const updatedFeatures = currentFeatures.filter((_, i) => i !== index);
    planForm.setValue('features', updatedFeatures);
  };

  const displayPlans = isSuperAdmin ? allPlans : plans;

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
        <TabsList className="grid w-full grid-cols-3">
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
            <CardHeader className={isSuperAdmin ? "flex flex-row items-center justify-between" : ""}>
              <div>
                <CardTitle>Planos Disponíveis</CardTitle>
                <CardDescription>
                  Escolha o plano que melhor atende às suas necessidades
                </CardDescription>
              </div>
              {isSuperAdmin && (
                <Button 
                  onClick={handleCreatePlan}
                  className="flex items-center space-x-2"
                  data-testid="button-create-plan"
                >
                  <Plus className="h-4 w-4" />
                  <span>Criar Plano</span>
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {displayPlans.map((plan) => (
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
                      
                      <div className="flex space-x-2">
                        <Button
                          className="flex-1"
                          variant={plan.id === subscription?.planId ? "outline" : "default"}
                          disabled={plan.id === subscription?.planId}
                          data-testid={`button-select-plan-${plan.id}`}
                        >
                          {plan.id === subscription?.planId ? 'Plano Atual' : 'Selecionar Plano'}
                        </Button>
                        {isSuperAdmin && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditPlan(plan)}
                              data-testid={`button-edit-plan-${plan.id}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeletePlan(plan)}
                              data-testid={`button-delete-plan-${plan.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
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

      </Tabs>

      {/* Plan Creation/Edit Modal */}
      {isSuperAdmin && (
        <Dialog open={showPlanModal} onOpenChange={setShowPlanModal}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingPlan ? 'Editar Plano' : 'Criar Novo Plano'}
              </DialogTitle>
              <DialogDescription>
                {editingPlan 
                  ? 'Atualize as informações do plano selecionado'
                  : 'Crie um novo plano de assinatura para seus clientes'
                }
              </DialogDescription>
            </DialogHeader>
            
            <Form {...planForm}>
              <form 
                onSubmit={planForm.handleSubmit((data) => planMutation.mutate(data))}
                className="space-y-6"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={planForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome do Plano *</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: Plano Básico" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={planForm.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Preço (em reais) *</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.01"
                            placeholder="99.90"
                            {...field} 
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={planForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrição</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Descreva os benefícios do plano..."
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={planForm.control}
                    name="billingInterval"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Intervalo de Cobrança *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o intervalo" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="monthly">Mensal</SelectItem>
                            <SelectItem value="yearly">Anual</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={planForm.control}
                    name="currency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Moeda</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione a moeda" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="BRL">BRL (Real)</SelectItem>
                            <SelectItem value="USD">USD (Dólar)</SelectItem>
                            <SelectItem value="EUR">EUR (Euro)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={planForm.control}
                    name="maxUsers"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Máximo de Usuários *</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="1"
                            placeholder="5"
                            {...field} 
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={planForm.control}
                    name="maxConversations"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Máximo de Conversas *</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="1"
                            placeholder="100"
                            {...field} 
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 100)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={planForm.control}
                    name="storageLimit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Armazenamento (MB) *</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="1"
                            placeholder="1000"
                            {...field} 
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 1000)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div>
                  <FormLabel>Recursos Incluídos</FormLabel>
                  <div className="space-y-3 mt-2">
                    {planForm.watch('features').map((feature, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <Input value={feature} readOnly className="flex-1" />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeFeature(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    
                    <div className="flex space-x-2">
                      <Input
                        placeholder="Adicione um novo recurso..."
                        value={newFeature}
                        onChange={(e) => setNewFeature(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addFeature();
                          }
                        }}
                      />
                      <Button type="button" onClick={addFeature} variant="outline">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                <FormField
                  control={planForm.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>
                          Plano Ativo
                        </FormLabel>
                        <FormDescription>
                          Apenas planos ativos ficam visíveis para os usuários
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                <div className="flex justify-end space-x-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      setShowPlanModal(false);
                      setEditingPlan(null);
                      planForm.reset();
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    type="submit"
                    disabled={planMutation.isPending}
                  >
                    {planMutation.isPending 
                      ? (editingPlan ? 'Atualizando...' : 'Criando...') 
                      : (editingPlan ? 'Atualizar Plano' : 'Criar Plano')
                    }
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}