import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import {
  Bot,
  Brain,
  MessageCircle,
  Settings2,
  Save,
  Info,
  Zap,
  Clock,
  MessageSquare,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Edit,
  Phone
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface SimpleBotConfig {
  welcomeMessage?: string;
  queueSelectionMessage?: string;
  outsideHoursMessage?: string;
  closingMessage?: string;
  transferMessage?: string;
  responseDelay?: number;
}

interface AiAgentConfig {
  provider?: 'gemini' | 'openai' | 'custom';
  apiKey?: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  contextMemory?: boolean;
  hasApiKey?: boolean;
}

interface TriggerRules {
  autoReplyEnabled?: boolean;
  businessHoursOnly?: boolean;
  maxMessagesBeforeTransfer?: number;
  transferToHumanKeywords?: string[];
}

interface ChatbotConfig {
  id?: string;
  companyId?: string;
  name?: string;
  whatsappConnectionId?: string | null;
  mode: 'simple_bot' | 'ai_agent' | 'disabled';
  isEnabled: boolean;
  simpleBotConfig?: SimpleBotConfig;
  aiAgentConfig?: AiAgentConfig;
  triggerRules?: TriggerRules;
}

interface WhatsAppConnection {
  id: string;
  name: string;
  phone: string;
  provider: string;
  status: string;
}

export default function AIAgentPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<string | null>(null);
  const [selectedChatbot, setSelectedChatbot] = useState<ChatbotConfig | null>(null);

  // Form state for create/edit
  const [formData, setFormData] = useState<ChatbotConfig>({
    name: '',
    whatsappConnectionId: null,
    mode: 'simple_bot',
    isEnabled: false,
    simpleBotConfig: {
      welcomeMessage: 'Olá! Como posso ajudar você hoje?',
      queueSelectionMessage: 'Por favor, escolha uma das opções:\n\n1️⃣ Suporte Técnico\n2️⃣ Vendas\n3️⃣ Financeiro',
      outsideHoursMessage: 'No momento estamos fora do horário de atendimento.',
      closingMessage: 'Obrigado pelo contato!',
      transferMessage: 'Vou transferir você para um atendente.',
      responseDelay: 3
    },
    aiAgentConfig: {
      provider: 'gemini',
      systemPrompt: 'Você é um assistente virtual prestativo e educado.',
      temperature: 0.7,
      maxTokens: 150,
      contextMemory: true
    },
    triggerRules: {
      autoReplyEnabled: true,
      businessHoursOnly: false,
      maxMessagesBeforeTransfer: 5,
      transferToHumanKeywords: ['atendente', 'humano', 'pessoa']
    }
  });

  // Fetch all chatbots
  const { data: chatbots = [], isLoading } = useQuery<ChatbotConfig[]>({
    queryKey: ['/api/chatbot/configs'],
    queryFn: async () => {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/chatbot/configs', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch chatbots');
      return response.json();
    },
  });

  // Fetch WhatsApp connections
  const { data: connections = [] } = useQuery<WhatsAppConnection[]>({
    queryKey: ['/api/whatsapp/connections'],
    queryFn: async () => {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/whatsapp/connections', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) return [];
      return response.json();
    },
  });

  // Create chatbot mutation
  const createMutation = useMutation({
    mutationFn: async (data: ChatbotConfig) => {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/chatbot/configs', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create chatbot');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "✅ Chatbot criado!",
        description: "O chatbot foi criado com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/chatbot/configs'] });
      setIsCreateDialogOpen(false);
      resetForm();
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "❌ Erro ao criar",
        description: "Não foi possível criar o chatbot.",
      });
    },
  });

  // Update chatbot mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ChatbotConfig }) => {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/chatbot/configs/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update chatbot');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "✅ Atualizado!",
        description: "Configurações atualizadas com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/chatbot/configs'] });
      setIsEditDialogOpen(false);
      setSelectedChatbot(null);
      resetForm();
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "❌ Erro ao atualizar",
        description: "Não foi possível atualizar o chatbot.",
      });
    },
  });

  // Delete chatbot mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/chatbot/configs/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to delete chatbot');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "✅ Deletado!",
        description: "Chatbot removido com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/chatbot/configs'] });
      setDeleteDialogOpen(null);
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "❌ Erro ao deletar",
        description: "Não foi possível deletar o chatbot.",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      whatsappConnectionId: null,
      mode: 'simple_bot',
      isEnabled: false,
      simpleBotConfig: {
        welcomeMessage: 'Olá! Como posso ajudar você hoje?',
        queueSelectionMessage: 'Por favor, escolha uma das opções:\n\n1️⃣ Suporte Técnico\n2️⃣ Vendas\n3️⃣ Financeiro',
        outsideHoursMessage: 'No momento estamos fora do horário de atendimento.',
        closingMessage: 'Obrigado pelo contato!',
        transferMessage: 'Vou transferir você para um atendente.',
        responseDelay: 3
      },
      aiAgentConfig: {
        provider: 'gemini',
        systemPrompt: 'Você é um assistente virtual prestativo e educado.',
        temperature: 0.7,
        maxTokens: 150,
        contextMemory: true
      },
      triggerRules: {
        autoReplyEnabled: true,
        businessHoursOnly: false,
        maxMessagesBeforeTransfer: 5,
        transferToHumanKeywords: ['atendente', 'humano', 'pessoa']
      }
    });
  };

  const handleEdit = (chatbot: ChatbotConfig) => {
    setSelectedChatbot(chatbot);
    setFormData(chatbot);
    setIsEditDialogOpen(true);
  };

  const handleCreate = () => {
    if (!formData.name || formData.name.trim() === '') {
      toast({
        variant: "destructive",
        title: "❌ Nome obrigatório",
        description: "Por favor, informe um nome para o chatbot.",
      });
      return;
    }
    createMutation.mutate(formData);
  };

  const handleUpdate = () => {
    if (!selectedChatbot?.id) return;
    updateMutation.mutate({ id: selectedChatbot.id, data: formData });
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  const getChannelName = (connectionId: string | null | undefined) => {
    if (!connectionId) return 'Nenhum canal vinculado';
    const connection = connections.find(c => c.id === connectionId);
    return connection ? `${connection.name} (${connection.phone})` : 'Canal não encontrado';
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Bot className="h-8 w-8 animate-spin mx-auto mb-2" />
            <p>Carregando chatbots...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center space-x-2">
            <Brain className="h-6 w-6" />
            <span>Gerenciamento de Chatbots</span>
          </h1>
          <p className="text-muted-foreground mt-1">
            Crie e gerencie múltiplos chatbots para diferentes canais WhatsApp
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-green-600 hover:bg-green-700" onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Criar Novo Chatbot
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Criar Novo Chatbot</DialogTitle>
              <DialogDescription>
                Configure um novo chatbot para automatizar o atendimento
              </DialogDescription>
            </DialogHeader>
            <ChatbotForm
              formData={formData}
              setFormData={setFormData}
              connections={connections}
              mode="create"
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleCreate}
                disabled={createMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                {createMutation.isPending ? 'Criando...' : 'Criar Chatbot'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Chatbots List */}
      {chatbots.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Bot className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhum chatbot configurado</h3>
            <p className="text-muted-foreground text-center mb-4">
              Crie seu primeiro chatbot para começar a automatizar o atendimento
            </p>
            <Button
              onClick={() => setIsCreateDialogOpen(true)}
              className="bg-green-600 hover:bg-green-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Criar Primeiro Chatbot
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {chatbots.map((chatbot) => (
            <Card key={chatbot.id} className="relative">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="flex items-center space-x-2">
                      {chatbot.mode === 'simple_bot' ? (
                        <MessageCircle className="h-5 w-5 text-blue-500" />
                      ) : chatbot.mode === 'ai_agent' ? (
                        <Brain className="h-5 w-5 text-purple-500" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-gray-500" />
                      )}
                      <span className="truncate">{chatbot.name || 'Sem nome'}</span>
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {chatbot.mode === 'simple_bot' && 'Chatbot Tradicional'}
                      {chatbot.mode === 'ai_agent' && 'Agente de IA'}
                      {chatbot.mode === 'disabled' && 'Desativado'}
                    </CardDescription>
                  </div>
                  <Badge
                    variant={chatbot.isEnabled ? "default" : "secondary"}
                    className={chatbot.isEnabled ? "bg-green-600" : ""}
                  >
                    {chatbot.isEnabled ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <span className="text-muted-foreground break-all">
                      {getChannelName(chatbot.whatsappConnectionId)}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Tipo</span>
                    <Badge variant="outline">
                      {chatbot.mode === 'simple_bot' && 'Bot Tradicional'}
                      {chatbot.mode === 'ai_agent' && 'IA Avançada'}
                      {chatbot.mode === 'disabled' && 'Desativado'}
                    </Badge>
                  </div>
                  {chatbot.mode === 'ai_agent' && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">API Key</span>
                      <Badge variant={chatbot.aiAgentConfig?.hasApiKey ? "default" : "secondary"}>
                        {chatbot.aiAgentConfig?.hasApiKey ? '✅ Configurada' : '⚠️ Não configurada'}
                      </Badge>
                    </div>
                  )}
                </div>
              </CardContent>
              <CardFooter className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => handleEdit(chatbot)}
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Editar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-600 hover:bg-red-50 hover:text-red-700"
                  onClick={() => setDeleteDialogOpen(chatbot.id || null)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Chatbot</DialogTitle>
            <DialogDescription>
              Atualize as configurações do chatbot
            </DialogDescription>
          </DialogHeader>
          <ChatbotForm
            formData={formData}
            setFormData={setFormData}
            connections={connections}
            mode="edit"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleUpdate}
              disabled={updateMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {updateMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteDialogOpen} onOpenChange={() => setDeleteDialogOpen(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O chatbot será permanentemente removido.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteDialogOpen && handleDelete(deleteDialogOpen)}
              className="bg-red-600 hover:bg-red-700"
            >
              Deletar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Chatbot Configuration Form Component
function ChatbotForm({
  formData,
  setFormData,
  connections,
  mode
}: {
  formData: ChatbotConfig;
  setFormData: (data: ChatbotConfig) => void;
  connections: WhatsAppConnection[];
  mode: 'create' | 'edit';
}) {
  const updateField = (field: keyof ChatbotConfig, value: any) => {
    setFormData({ ...formData, [field]: value });
  };

  const updateSimpleBotConfig = (updates: Partial<SimpleBotConfig>) => {
    setFormData({
      ...formData,
      simpleBotConfig: { ...formData.simpleBotConfig, ...updates }
    });
  };

  const updateAiAgentConfig = (updates: Partial<AiAgentConfig>) => {
    setFormData({
      ...formData,
      aiAgentConfig: { ...formData.aiAgentConfig, ...updates }
    });
  };

  return (
    <div className="space-y-6">
      {/* Basic Info */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="chatbotName">Nome do Chatbot *</Label>
          <Input
            id="chatbotName"
            placeholder="Ex: Bot Atendimento, IA Vendas, etc."
            value={formData.name || ''}
            onChange={(e) => updateField('name', e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="channel">Canal WhatsApp (opcional)</Label>
          <Select
            value={formData.whatsappConnectionId || 'none'}
            onValueChange={(value) => updateField('whatsappConnectionId', value === 'none' ? null : value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione um canal" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Nenhum canal vinculado</SelectItem>
              {connections.map((conn) => (
                <SelectItem key={conn.id} value={conn.id}>
                  {conn.name} ({conn.phone})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Vincule este chatbot a um canal WhatsApp específico
          </p>
        </div>
      </div>

      <Separator />

      {/* Type Selection */}
      <div className="space-y-4">
        <Label>Tipo de Automação *</Label>
        <RadioGroup
          value={formData.mode}
          onValueChange={(value) => updateField('mode', value as 'simple_bot' | 'ai_agent' | 'disabled')}
        >
          <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer">
            <RadioGroupItem value="simple_bot" id="type_simple_bot" className="mt-1" />
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <MessageCircle className="h-5 w-5 text-blue-500" />
                <Label htmlFor="type_simple_bot" className="text-base font-medium cursor-pointer">
                  Chatbot Tradicional
                </Label>
              </div>
              <p className="text-sm text-muted-foreground">
                Respostas automáticas predefinidas baseadas em regras
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer">
            <RadioGroupItem value="ai_agent" id="type_ai_agent" className="mt-1" />
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <Brain className="h-5 w-5 text-purple-500" />
                <Label htmlFor="type_ai_agent" className="text-base font-medium cursor-pointer">
                  Agente de Inteligência Artificial
                </Label>
              </div>
              <p className="text-sm text-muted-foreground">
                Assistente conversacional avançado usando IA (Google Gemini)
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer">
            <RadioGroupItem value="disabled" id="type_disabled" className="mt-1" />
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <AlertCircle className="h-5 w-5 text-gray-500" />
                <Label htmlFor="type_disabled" className="text-base font-medium cursor-pointer">
                  Desativado
                </Label>
              </div>
              <p className="text-sm text-muted-foreground">
                Atendimento manual apenas, sem automação
              </p>
            </div>
          </div>
        </RadioGroup>
      </div>

      {/* Enable/Disable */}
      {formData.mode !== 'disabled' && (
        <>
          <Separator />
          <div className="flex items-center justify-between p-4 bg-accent/30 rounded-lg">
            <div>
              <h3 className="font-medium">Ativar Chatbot</h3>
              <p className="text-sm text-muted-foreground">
                Habilitar este chatbot para responder automaticamente
              </p>
            </div>
            <Switch
              checked={formData.isEnabled}
              onCheckedChange={(checked) => updateField('isEnabled', checked)}
              className="data-[state=checked]:bg-green-600"
            />
          </div>
        </>
      )}

      {/* Configuration based on type */}
      {formData.mode === 'simple_bot' && (
        <>
          <Separator />
          <div className="space-y-4">
            <h3 className="font-medium flex items-center gap-2">
              <Settings2 className="h-4 w-4" />
              Configurações do Bot Tradicional
            </h3>

            <div className="space-y-2">
              <Label>Mensagem de Boas-vindas</Label>
              <Textarea
                className="h-20 resize-none"
                value={formData.simpleBotConfig?.welcomeMessage || ''}
                onChange={(e) => updateSimpleBotConfig({ welcomeMessage: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Mensagem de Seleção de Fila</Label>
              <Textarea
                className="h-20 resize-none"
                value={formData.simpleBotConfig?.queueSelectionMessage || ''}
                onChange={(e) => updateSimpleBotConfig({ queueSelectionMessage: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Atraso da Resposta (segundos)</Label>
              <Input
                type="number"
                min="1"
                max="30"
                value={formData.simpleBotConfig?.responseDelay || 3}
                onChange={(e) => updateSimpleBotConfig({ responseDelay: parseInt(e.target.value) || 3 })}
              />
            </div>
          </div>
        </>
      )}

      {formData.mode === 'ai_agent' && (
        <>
          <Separator />
          <div className="space-y-4">
            <h3 className="font-medium flex items-center gap-2">
              <Brain className="h-4 w-4" />
              Configurações do Agente de IA
            </h3>

            {formData.aiAgentConfig?.hasApiKey && (
              <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800 dark:text-green-200">
                  API Key configurada e pronta para uso
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label>Chave da API Google Gemini</Label>
              <Input
                type="password"
                placeholder={formData.aiAgentConfig?.hasApiKey ? "••••••••••••••••" : "Digite sua chave da API"}
                value={formData.aiAgentConfig?.apiKey || ''}
                onChange={(e) => updateAiAgentConfig({ apiKey: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Obtenha em: <a href="https://makersuite.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">https://makersuite.google.com/app/apikey</a>
              </p>
            </div>

            <div className="space-y-2">
              <Label>Prompt do Sistema (Personalidade)</Label>
              <Textarea
                className="h-24 resize-none"
                value={formData.aiAgentConfig?.systemPrompt || ''}
                onChange={(e) => updateAiAgentConfig({ systemPrompt: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Criatividade (0.0 - 1.0)</Label>
                <Input
                  type="number"
                  min="0"
                  max="1"
                  step="0.1"
                  value={formData.aiAgentConfig?.temperature || 0.7}
                  onChange={(e) => updateAiAgentConfig({ temperature: parseFloat(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>Tamanho Máximo</Label>
                <Input
                  type="number"
                  min="50"
                  max="500"
                  value={formData.aiAgentConfig?.maxTokens || 150}
                  onChange={(e) => updateAiAgentConfig({ maxTokens: parseInt(e.target.value) })}
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-accent/30 rounded-lg">
              <div>
                <h4 className="font-medium">Memória de Contexto</h4>
                <p className="text-sm text-muted-foreground">
                  Permite que o agente lembre conversas anteriores
                </p>
              </div>
              <Switch
                checked={formData.aiAgentConfig?.contextMemory || false}
                onCheckedChange={(checked) => updateAiAgentConfig({ contextMemory: checked })}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
