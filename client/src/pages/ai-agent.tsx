import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useT } from '@/hooks/use-translation';
import { useToast } from '@/hooks/use-toast';
import { 
  Bot, 
  Brain,
  MessageCircle, 
  Settings2,
  Save,
  Info
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface AiAgentConfig {
  id?: string;
  mode: 'chatbot' | 'ai_agent';
  isEnabled: boolean;
  // AI Agent specific fields
  geminiApiKey?: string;
  agentPrompt?: string;
  hasApiKey?: boolean;
  // ChatBot specific fields
  welcomeMessage?: string;
  responseDelay?: number;
  // General settings
  updatedAt?: string;
}

export default function AIAgentPage() {
  const { t } = useT();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [config, setConfig] = useState<AiAgentConfig>({
    mode: 'chatbot',
    isEnabled: false,
    welcomeMessage: '',
    responseDelay: 3,
    agentPrompt: '',
    geminiApiKey: ''
  });

  // Fetch current AI agent configuration
  const { data: apiConfig, isLoading } = useQuery({
    queryKey: ['/api', 'ai-agent', 'config'],
    queryFn: async () => {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/ai-agent/config', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        throw new Error('Failed to fetch AI config');
      }
      return response.json();
    },
  });

  // Update local state when API data loads
  useEffect(() => {
    if (apiConfig) {
      setConfig({
        mode: apiConfig.mode || 'chatbot',
        isEnabled: apiConfig.isEnabled || false,
        welcomeMessage: apiConfig.welcomeMessage || '',
        responseDelay: apiConfig.responseDelay || 3,
        agentPrompt: apiConfig.agentPrompt || '',
        geminiApiKey: apiConfig.geminiApiKey || '',
        hasApiKey: apiConfig.hasApiKey || false
      });
    }
  }, [apiConfig]);

  // Save configuration mutation
  const saveConfigMutation = useMutation({
    mutationFn: async (configData: Partial<AiAgentConfig>) => {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/ai-agent/config', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(configData),
      });
      if (!response.ok) {
        throw new Error('Failed to save AI config');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Configuração salva!",
        description: "As configurações de IA foram atualizadas com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api', 'ai-agent', 'config'] });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Erro ao salvar",
        description: "Não foi possível salvar as configurações. Tente novamente.",
      });
    },
  });

  const handleSave = () => {
    // Only send relevant fields based on selected mode
    const dataToSave: Partial<AiAgentConfig> = {
      mode: config.mode,
      isEnabled: config.isEnabled,
    };

    if (config.mode === 'chatbot') {
      dataToSave.welcomeMessage = config.welcomeMessage;
      dataToSave.responseDelay = config.responseDelay;
    } else if (config.mode === 'ai_agent') {
      dataToSave.agentPrompt = config.agentPrompt;
      if (config.geminiApiKey) {
        dataToSave.geminiApiKey = config.geminiApiKey;
      }
    }

    saveConfigMutation.mutate(dataToSave);
  };

  const updateConfig = (updates: Partial<AiAgentConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  const handleModeChange = (newMode: 'chatbot' | 'ai_agent') => {
    updateConfig({ 
      mode: newMode,
      // Disable when switching modes to prevent conflicts
      isEnabled: false
    });
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Bot className="h-8 w-8 animate-spin mx-auto mb-2" />
            <p>Carregando configurações...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center space-x-2">
            <Brain className="h-6 w-6" />
            <span>Configuração de IA</span>
          </h1>
          <p className="text-muted-foreground mt-1">
            Configure o modo de funcionamento da inteligência artificial
          </p>
        </div>
        <Button 
          onClick={handleSave} 
          disabled={saveConfigMutation.isPending}
          data-testid="button-save-ai-config"
        >
          <Save className="h-4 w-4 mr-2" />
          {saveConfigMutation.isPending ? 'Salvando...' : 'Salvar'}
        </Button>
      </div>

      <div className="max-w-4xl space-y-6">
        {/* Mode Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Settings2 className="h-5 w-5" />
              <span>Modo de Operação</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Escolha como a inteligência artificial deve funcionar. Apenas um modo pode estar ativo por vez.
              </p>
              
              <RadioGroup 
                value={config.mode} 
                onValueChange={(value) => handleModeChange(value as 'chatbot' | 'ai_agent')}
                className="space-y-4"
              >
                <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                  <RadioGroupItem value="chatbot" id="chatbot" className="mt-1" />
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <Bot className="h-5 w-5 text-blue-500" />
                      <Label htmlFor="chatbot" className="text-base font-medium cursor-pointer">
                        ChatBot
                      </Label>
                      <Badge variant="secondary">Simples</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Respostas automáticas predefinidas. Ideal para mensagens de boas-vindas e direcionamento básico.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                  <RadioGroupItem value="ai_agent" id="ai_agent" className="mt-1" />
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <Brain className="h-5 w-5 text-purple-500" />
                      <Label htmlFor="ai_agent" className="text-base font-medium cursor-pointer">
                        Agente de IA
                      </Label>
                      <Badge variant="secondary">Avançado</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      IA conversacional avançada usando Google Gemini. Capaz de entender contexto e gerar respostas dinâmicas.
                    </p>
                  </div>
                </div>
              </RadioGroup>
            </div>

            {/* Enable/Disable Toggle */}
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-foreground">
                  {config.mode === 'chatbot' ? 'Ativar ChatBot' : 'Ativar Agente de IA'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {config.mode === 'chatbot' 
                    ? 'Habilitar respostas automáticas simples' 
                    : 'Habilitar inteligência artificial avançada'
                  }
                </p>
              </div>
              <Switch
                checked={config.isEnabled}
                onCheckedChange={(checked) => updateConfig({ isEnabled: checked })}
                data-testid="switch-ai-enabled"
              />
            </div>
          </CardContent>
        </Card>

        {/* Configuration based on selected mode */}
        {config.mode === 'chatbot' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <MessageCircle className="h-5 w-5" />
                <span>Configuração do ChatBot</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Welcome Message */}
              <div className="space-y-2">
                <Label htmlFor="welcomeMessage">Mensagem de Boas-vindas</Label>
                <Textarea
                  id="welcomeMessage"
                  className="h-32 resize-none"
                  placeholder="Digite a mensagem de boas-vindas..."
                  value={config.welcomeMessage}
                  onChange={(e) => updateConfig({ welcomeMessage: e.target.value })}
                  data-testid="textarea-welcome-message"
                />
                <p className="text-xs text-muted-foreground">
                  Você pode usar variáveis como {'{nome}'}, {'{protocolo}'}, {'{data}'} na sua mensagem
                </p>
              </div>

              {/* Response Delay */}
              <div className="space-y-2">
                <Label htmlFor="responseDelay">Atraso da Resposta (segundos)</Label>
                <Input
                  id="responseDelay"
                  type="number"
                  placeholder="3"
                  min="1"
                  max="30"
                  value={config.responseDelay}
                  onChange={(e) => updateConfig({ responseDelay: parseInt(e.target.value) || 3 })}
                  data-testid="input-response-delay"
                />
                <p className="text-xs text-muted-foreground">
                  Tempo de espera antes de enviar respostas automáticas
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {config.mode === 'ai_agent' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Brain className="h-5 w-5" />
                <span>Configuração do Agente de IA</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* API Key Status */}
              <div className="flex items-center space-x-2 p-3 bg-muted rounded-lg">
                <Info className="h-4 w-4 text-blue-500" />
                <span className="text-sm">
                  Status da API: {config.hasApiKey ? (
                    <Badge variant="default" className="ml-1">Configurada</Badge>
                  ) : (
                    <Badge variant="secondary" className="ml-1">Não configurada</Badge>
                  )}
                </span>
              </div>

              {/* Gemini API Key */}
              <div className="space-y-2">
                <Label htmlFor="geminiApiKey">Chave da API Google Gemini</Label>
                <Input
                  id="geminiApiKey"
                  type="password"
                  placeholder={config.hasApiKey ? "••••••••••••••••" : "Digite sua chave da API Gemini"}
                  value={config.geminiApiKey}
                  onChange={(e) => updateConfig({ geminiApiKey: e.target.value })}
                  data-testid="input-gemini-api-key"
                />
                <p className="text-xs text-muted-foreground">
                  Obtenha sua chave em: https://makersuite.google.com/app/apikey
                </p>
              </div>

              {/* Agent Prompt */}
              <div className="space-y-2">
                <Label htmlFor="agentPrompt">Prompt do Agente</Label>
                <Textarea
                  id="agentPrompt"
                  className="h-40 resize-none"
                  placeholder="Você é um assistente virtual especializado em atendimento ao cliente. Seja sempre educado, prestativo e profissional..."
                  value={config.agentPrompt}
                  onChange={(e) => updateConfig({ agentPrompt: e.target.value })}
                  data-testid="textarea-agent-prompt"
                />
                <p className="text-xs text-muted-foreground">
                  Define como o agente de IA deve se comportar e responder aos clientes
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}