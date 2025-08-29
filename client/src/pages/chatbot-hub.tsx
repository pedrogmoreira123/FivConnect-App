import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from '@/components/ui/tooltip';
import { useT } from '@/hooks/use-translation';
import { useToast } from '@/hooks/use-toast';
import { 
  Bot, 
  Brain, 
  MessageCircle, 
  Zap, 
  HelpCircle, 
  Save,
  Settings,
  Info
} from 'lucide-react';

export default function ChatbotHubPage() {
  const { t } = useT();
  const { toast } = useToast();
  const [selectedOption, setSelectedOption] = useState<'chatbot' | 'ai-agents' | null>(null);
  
  // Chatbot settings
  const [chatbotSettings, setChatbotSettings] = useState({
    welcomeMessage: 'Olá, {{nome_cliente}}, Seja Bem-Vindo(a) à {{nome_empresa}}.\n📞protocolo de atendimento: *#{{protocolo}}#*\nAbertura: *{{data_abertura}}*',
    departmentMessage: 'Eu sou a 🤖 *JÚLIA*, assistente virtual da {{nome_empresa}}.\n\nPara iniciar seu atendimento *digite o número* da opção desejada:',
    queueMessage: 'Eu sou a 🤖 *JÚLIA*, assistente virtual da {{nome_empresa}}.\n\nJá estou lhe encaminhando para um dos nossos atendentes.',
    finalizationMessage: 'Agradecemos o seu contato!\n\n*Pedimos por gentileza que não responda essa mensagem.*',
    offlineMessage: 'Infelizmente, não estamos online no momento.\nEntraremos em contato o mais rápido possível.',
    autoReply: true,
    workingHours: true,
    transferToAgent: true
  });

  // AI Agents settings
  const [aiAgentsSettings, setAiAgentsSettings] = useState({
    customPrompt: '',
    temperature: 0.7,
    maxTokens: 150,
    contextMemory: true
  });

  const handleOptionChange = (option: 'chatbot' | 'ai-agents') => {
    if (selectedOption === option) {
      setSelectedOption(null); // Deselect if clicking on already selected
    } else {
      setSelectedOption(option);
    }
  };

  const handleSave = () => {
    toast({
      title: "Configurações salvas!",
      description: `${selectedOption === 'chatbot' ? 'Chatbot Tradicional' : 'Agentes de I.A'} configurado com sucesso.`,
    });
  };

  return (
    <TooltipProvider>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center space-x-2">
              <Bot className="h-6 w-6" />
              <span>Automação & I.A</span>
            </h1>
            <p className="text-muted-foreground mt-1">
              Configure chatbots e agentes inteligentes para automatizar o atendimento
            </p>
          </div>
        </div>

        {/* Selection Options */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Settings className="h-5 w-5" />
              <span>Escolha o Tipo de Automação</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Chatbot Option */}
              <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                <Checkbox
                  id="chatbot-option"
                  checked={selectedOption === 'chatbot'}
                  onCheckedChange={() => handleOptionChange('chatbot')}
                  data-testid="checkbox-chatbot"
                />
                <div className="flex-1 space-y-2">
                  <div className="flex items-center space-x-2">
                    <MessageCircle className="h-5 w-5 text-blue-600" />
                    <Label htmlFor="chatbot-option" className="text-base font-medium cursor-pointer">
                      Chatbot Tradicional
                    </Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>Sistema de respostas automáticas baseado em regras pré-definidas. Ideal para FAQs, direcionamento de filas e respostas padronizadas. Funciona com fluxos de conversação estruturados.</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Configure respostas automáticas e fluxos de atendimento baseados em regras pré-definidas.
                  </p>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">
                      Respostas programadas
                    </span>
                    <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">
                      Fluxos de atendimento
                    </span>
                  </div>
                </div>
              </div>

              {/* AI Agents Option */}
              <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                <Checkbox
                  id="ai-agents-option"
                  checked={selectedOption === 'ai-agents'}
                  onCheckedChange={() => handleOptionChange('ai-agents')}
                  data-testid="checkbox-ai-agents"
                />
                <div className="flex-1 space-y-2">
                  <div className="flex items-center space-x-2">
                    <Brain className="h-5 w-5 text-purple-600" />
                    <Label htmlFor="ai-agents-option" className="text-base font-medium cursor-pointer">
                      Agentes de I.A
                    </Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>Assistentes inteligentes que usam IA para compreender contexto e gerar respostas naturais. Personalizáveis através de prompts e capazes de aprender com as conversas.</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Configure assistentes inteligentes com prompts personalizados para respostas mais naturais.
                  </p>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded">
                      Prompts personalizados
                    </span>
                    <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded">
                      Respostas inteligentes
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Mutual Exclusivity Warning */}
            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <div className="flex items-start space-x-2">
                <Zap className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                    Exclusividade Mútua
                  </p>
                  <p className="text-xs text-amber-800 dark:text-amber-200">
                    Por razões de performance e consistência, apenas uma das opções pode estar ativa por vez. 
                    Selecionar uma opção automaticamente desseleciona a outra.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Configuration Sections */}
        {selectedOption === 'chatbot' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <MessageCircle className="h-5 w-5 text-blue-600" />
                <span>Configuração do Chatbot Tradicional</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-6">
                {/* Mensagem Bem-Vindo */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Label htmlFor="welcome-message" className="text-base font-medium">Mensagem Bem-Vindo</Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Primeira mensagem enviada quando o cliente inicia uma conversa</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Textarea
                    id="welcome-message"
                    value={chatbotSettings.welcomeMessage}
                    onChange={(e) => setChatbotSettings(prev => ({ ...prev, welcomeMessage: e.target.value }))}
                    placeholder="Olá, {{nome_cliente}}, Seja Bem-Vindo(a) à {{nome_empresa}}."
                    className="min-h-[100px] font-mono text-sm"
                    data-testid="textarea-welcome-message"
                  />
                  <p className="text-xs text-muted-foreground">
                    Placeholders disponíveis: <code>{'{{nome_cliente}}'}</code>, <code>{'{{nome_empresa}}'}</code>, <code>{'{{protocolo}}'}</code>, <code>{'{{data_abertura}}'}</code>
                  </p>
                </div>

                <Separator />

                {/* Mensagem Escolha Departamento */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Label htmlFor="department-message" className="text-base font-medium">Mensagem Escolha Departamento</Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Mensagem para apresentar opções de departamentos disponíveis</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Textarea
                    id="department-message"
                    value={chatbotSettings.departmentMessage}
                    onChange={(e) => setChatbotSettings(prev => ({ ...prev, departmentMessage: e.target.value }))}
                    placeholder="Escolha uma das opções abaixo:"
                    className="min-h-[100px] font-mono text-sm"
                    data-testid="textarea-department-message"
                  />
                  <p className="text-xs text-muted-foreground">
                    Placeholders disponíveis: <code>{'{{nome_empresa}}'}</code>, <code>{'{{departamento}}'}</code>
                  </p>
                </div>

                <Separator />

                {/* Mensagem Fila Atendimento */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Label htmlFor="queue-message" className="text-base font-medium">Mensagem Fila Atendimento</Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Mensagem exibida quando o cliente é direcionado para fila de atendimento</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Textarea
                    id="queue-message"
                    value={chatbotSettings.queueMessage}
                    onChange={(e) => setChatbotSettings(prev => ({ ...prev, queueMessage: e.target.value }))}
                    placeholder="Aguarde, você será atendido em breve."
                    className="min-h-[100px] font-mono text-sm"
                    data-testid="textarea-queue-message"
                  />
                  <p className="text-xs text-muted-foreground">
                    Placeholders disponíveis: <code>{'{{nome_empresa}}'}</code>, <code>{'{{nome_agente}}'}</code>
                  </p>
                </div>

                <Separator />

                {/* Mensagem Finalização Chamado */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Label htmlFor="finalization-message" className="text-base font-medium">Mensagem Finalização Chamado</Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Mensagem de agradecimento enviada ao finalizar o atendimento</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Textarea
                    id="finalization-message"
                    value={chatbotSettings.finalizationMessage}
                    onChange={(e) => setChatbotSettings(prev => ({ ...prev, finalizationMessage: e.target.value }))}
                    placeholder="Agradecemos o seu contato!"
                    className="min-h-[100px] font-mono text-sm"
                    data-testid="textarea-finalization-message"
                  />
                  <p className="text-xs text-muted-foreground">
                    Placeholders disponíveis: <code>{'{{nome_cliente}}'}</code>, <code>{'{{protocolo}}'}</code>
                  </p>
                </div>

                <Separator />

                {/* Mensagem Fora Horário Operação */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Label htmlFor="offline-message" className="text-base font-medium">Mensagem Fora Horário Operação</Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Mensagem exibida quando o atendimento está fora do horário comercial</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Textarea
                    id="offline-message"
                    value={chatbotSettings.offlineMessage}
                    onChange={(e) => setChatbotSettings(prev => ({ ...prev, offlineMessage: e.target.value }))}
                    placeholder="Não estamos online no momento."
                    className="min-h-[100px] font-mono text-sm"
                    data-testid="textarea-offline-message"
                  />
                  <p className="text-xs text-muted-foreground">
                    Placeholders disponíveis: <code>{'{{data_hora}}'}</code>, <code>{'{{nome_empresa}}'}</code>
                  </p>
                </div>

                <Separator />

                {/* Configuration Options */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Resposta Automática</h4>
                      <p className="text-sm text-muted-foreground">
                        Enviar respostas automáticas para mensagens comuns
                      </p>
                    </div>
                    <Switch
                      checked={chatbotSettings.autoReply}
                      onCheckedChange={(value) => setChatbotSettings(prev => ({ ...prev, autoReply: value }))}
                      data-testid="switch-auto-reply"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Horário Comercial</h4>
                      <p className="text-sm text-muted-foreground">
                        Aplicar regras de horário de funcionamento
                      </p>
                    </div>
                    <Switch
                      checked={chatbotSettings.workingHours}
                      onCheckedChange={(value) => setChatbotSettings(prev => ({ ...prev, workingHours: value }))}
                      data-testid="switch-working-hours"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Transferir para Agente</h4>
                      <p className="text-sm text-muted-foreground">
                        Permitir transferência para atendimento humano
                      </p>
                    </div>
                    <Switch
                      checked={chatbotSettings.transferToAgent}
                      onCheckedChange={(value) => setChatbotSettings(prev => ({ ...prev, transferToAgent: value }))}
                      data-testid="switch-transfer-agent"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700" data-testid="button-save-chatbot">
                  <Save className="h-4 w-4 mr-2" />
                  Salvar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {selectedOption === 'ai-agents' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Brain className="h-5 w-5 text-purple-600" />
                <span>Configuração dos Agentes de I.A</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Label htmlFor="custom-prompt">Prompt Personalizado</Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-sm">
                        <p>Define como o agente de IA deve se comportar e responder. Seja específico sobre o tom, conhecimento e limitações do assistente.</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Textarea
                    id="custom-prompt"
                    value={aiAgentsSettings.customPrompt}
                    onChange={(e) => setAiAgentsSettings(prev => ({ ...prev, customPrompt: e.target.value }))}
                    placeholder="Você é um assistente de atendimento ao cliente especializado em... Sempre responda de forma educada e profissional..."
                    className="min-h-[120px]"
                    data-testid="textarea-custom-prompt"
                  />
                  <p className="text-xs text-muted-foreground">
                    Este prompt define como o agente de IA deve se comportar e responder aos clientes.
                  </p>
                </div>

                <Separator />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="temperature">Criatividade (Temperature)</Label>
                    <Input
                      id="temperature"
                      type="number"
                      min="0"
                      max="1"
                      step="0.1"
                      value={aiAgentsSettings.temperature}
                      onChange={(e) => setAiAgentsSettings(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))}
                      data-testid="input-temperature"
                    />
                    <p className="text-xs text-muted-foreground">
                      0.0 = Mais conservador, 1.0 = Mais criativo
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="max-tokens">Tamanho Máximo da Resposta</Label>
                    <Input
                      id="max-tokens"
                      type="number"
                      min="50"
                      max="500"
                      value={aiAgentsSettings.maxTokens}
                      onChange={(e) => setAiAgentsSettings(prev => ({ ...prev, maxTokens: parseInt(e.target.value) }))}
                      data-testid="input-max-tokens"
                    />
                    <p className="text-xs text-muted-foreground">
                      Quantidade máxima de palavras por resposta
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Memória de Contexto</h4>
                    <p className="text-sm text-muted-foreground">
                      Permitir que o agente lembre de conversas anteriores
                    </p>
                  </div>
                  <Switch
                    checked={aiAgentsSettings.contextMemory}
                    onCheckedChange={(value) => setAiAgentsSettings(prev => ({ ...prev, contextMemory: value }))}
                    data-testid="switch-context-memory"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700" data-testid="button-save-ai-agents">
                  <Save className="h-4 w-4 mr-2" />
                  Salvar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <MessageCircle className="h-5 w-5 text-blue-600" />
                <span>Chatbot Tradicional</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${selectedOption === 'chatbot' ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                    <span className="text-sm">{selectedOption === 'chatbot' ? 'Ativo' : 'Desativado'}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Mensagens hoje</span>
                  <span className="text-sm font-medium">{selectedOption === 'chatbot' ? '24' : '0'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Taxa de resolução</span>
                  <span className="text-sm font-medium">{selectedOption === 'chatbot' ? '78%' : '-'}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Brain className="h-5 w-5 text-purple-600" />
                <span>Agentes de I.A</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${selectedOption === 'ai-agents' ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                    <span className="text-sm">{selectedOption === 'ai-agents' ? 'Ativo' : 'Desativado'}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Consultas hoje</span>
                  <span className="text-sm font-medium">{selectedOption === 'ai-agents' ? '15' : '0'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Precisão média</span>
                  <span className="text-sm font-medium">{selectedOption === 'ai-agents' ? '92%' : '-'}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </TooltipProvider>
  );
}