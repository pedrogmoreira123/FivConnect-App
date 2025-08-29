import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { useT } from '@/hooks/use-translation';
import { useToast } from '@/hooks/use-toast';
import PlaceholderHelper from '@/components/chatbot/placeholder-helper';
import { AIAgentFeatureGate } from '@/components/feature/feature-gate';
import { 
  Bot, 
  MessageCircle, 
  Clock, 
  Users, 
  Settings2,
  Save 
} from 'lucide-react';

interface ChatbotConfig {
  isEnabled: boolean;
  responseDelay: number;
  greetingMessage: string;
  queueSelectionMessage: string;
  closingMessage: string;
  outsideHoursMessage: string;
  transferMessage: string;
  escalationMessage: string;
  autoCloseAfterHours: number;
  maxMessagesBeforeTransfer: number;
  enableSmartRouting: boolean;
  enableSentimentAnalysis: boolean;
}

export default function EnhancedAIAgentPage() {
  const { t } = useT();
  const { toast } = useToast();
  const [activeTextarea, setActiveTextarea] = useState<string | null>(null);

  const [config, setConfig] = useState<ChatbotConfig>({
    isEnabled: true,
    responseDelay: 3,
    greetingMessage: t('settings.chatbotConfig.greetingPlaceholder'),
    queueSelectionMessage: t('settings.chatbotConfig.queueSelectionPlaceholder'),
    closingMessage: t('settings.chatbotConfig.closingPlaceholder'),
    outsideHoursMessage: t('settings.chatbotConfig.outsideHoursPlaceholder'),
    transferMessage: 'Você está sendo transferido para o agente {{agente}} da fila {{fila}}.',
    escalationMessage: 'Seu atendimento está sendo escalado para um supervisor. Aguarde um momento.',
    autoCloseAfterHours: 24,
    maxMessagesBeforeTransfer: 5,
    enableSmartRouting: true,
    enableSentimentAnalysis: false
  });

  const updateConfig = (updates: Partial<ChatbotConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  const handleSave = () => {
    console.log('Saving Enhanced Chatbot configuration:', config);
    toast({
      title: t('settings.chatbotConfig.title'),
      description: "Configurações do chatbot salvas com sucesso!",
    });
  };

  const insertPlaceholder = (placeholder: string) => {
    if (activeTextarea) {
      const currentValue = config[activeTextarea as keyof ChatbotConfig] as string;
      const textarea = document.getElementById(activeTextarea) as HTMLTextAreaElement;
      
      if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const newValue = currentValue.substring(0, start) + placeholder + currentValue.substring(end);
        
        updateConfig({ [activeTextarea]: newValue } as Partial<ChatbotConfig>);
        
        // Restore cursor position after the inserted placeholder
        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(start + placeholder.length, start + placeholder.length);
        }, 0);
      }
    }
  };

  return (
    <AIAgentFeatureGate>
      <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center space-x-2">
            <Bot className="h-6 w-6" />
            <span>{t('settings.chatbotConfig.title')}</span>
          </h1>
          <p className="text-muted-foreground mt-1">
            Configure mensagens automáticas e comportamento do chatbot
          </p>
        </div>
        <Button onClick={handleSave} data-testid="button-save-chatbot-config">
          <Save className="h-4 w-4 mr-2" />
          {t('common.save')}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Configuration */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status & Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings2 className="h-5 w-5" />
                <span>Configurações Gerais</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Enable/Disable Toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-foreground">{t('settings.chatbotConfig.enableChatbot')}</h3>
                  <p className="text-sm text-muted-foreground">Ativar ou desativar o chatbot automático</p>
                </div>
                <Switch
                  checked={config.isEnabled}
                  onCheckedChange={(checked) => updateConfig({ isEnabled: checked })}
                  data-testid="switch-chatbot-enabled"
                />
              </div>

              <Separator />

              {/* Response Delay */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="responseDelay">{t('settings.chatbotConfig.responseDelay')}</Label>
                  <Input
                    id="responseDelay"
                    type="number"
                    min="1"
                    max="30"
                    value={config.responseDelay}
                    onChange={(e) => updateConfig({ responseDelay: parseInt(e.target.value) || 3 })}
                    data-testid="input-response-delay"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="autoClose">Auto-fechamento (horas)</Label>
                  <Input
                    id="autoClose"
                    type="number"
                    min="1"
                    max="72"
                    value={config.autoCloseAfterHours}
                    onChange={(e) => updateConfig({ autoCloseAfterHours: parseInt(e.target.value) || 24 })}
                    data-testid="input-auto-close"
                  />
                </div>
              </div>

              {/* Advanced Settings */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Roteamento Inteligente</h4>
                    <p className="text-sm text-muted-foreground">Direcionar automaticamente para a fila mais adequada</p>
                  </div>
                  <Switch
                    checked={config.enableSmartRouting}
                    onCheckedChange={(checked) => updateConfig({ enableSmartRouting: checked })}
                    data-testid="switch-smart-routing"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Análise de Sentimento</h4>
                    <p className="text-sm text-muted-foreground">Detectar urgência e escalamento automático</p>
                  </div>
                  <Switch
                    checked={config.enableSentimentAnalysis}
                    onCheckedChange={(checked) => updateConfig({ enableSentimentAnalysis: checked })}
                    data-testid="switch-sentiment-analysis"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Messages Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <MessageCircle className="h-5 w-5" />
                <span>{t('settings.chatbotConfig.defaultMessages')}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="greeting" className="space-y-4">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="greeting">Saudação</TabsTrigger>
                  <TabsTrigger value="queue">Filas</TabsTrigger>
                  <TabsTrigger value="transfer">Transferência</TabsTrigger>
                  <TabsTrigger value="closing">Encerramento</TabsTrigger>
                </TabsList>

                <TabsContent value="greeting" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="greetingMessage">{t('settings.chatbotConfig.greetingMessage')}</Label>
                    <Textarea
                      id="greetingMessage"
                      className="h-24 resize-none"
                      value={config.greetingMessage}
                      onChange={(e) => updateConfig({ greetingMessage: e.target.value })}
                      onFocus={() => setActiveTextarea('greetingMessage')}
                      data-testid="textarea-greeting-message"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="outsideHoursMessage">{t('settings.chatbotConfig.outsideHoursMessage')}</Label>
                    <Textarea
                      id="outsideHoursMessage"
                      className="h-24 resize-none"
                      value={config.outsideHoursMessage}
                      onChange={(e) => updateConfig({ outsideHoursMessage: e.target.value })}
                      onFocus={() => setActiveTextarea('outsideHoursMessage')}
                      data-testid="textarea-outside-hours-message"
                    />
                  </div>
                </TabsContent>

                <TabsContent value="queue" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="queueSelectionMessage">{t('settings.chatbotConfig.queueSelectionMessage')}</Label>
                    <Textarea
                      id="queueSelectionMessage"
                      className="h-24 resize-none"
                      value={config.queueSelectionMessage}
                      onChange={(e) => updateConfig({ queueSelectionMessage: e.target.value })}
                      onFocus={() => setActiveTextarea('queueSelectionMessage')}
                      data-testid="textarea-queue-selection-message"
                    />
                  </div>
                </TabsContent>

                <TabsContent value="transfer" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="transferMessage">Mensagem de Transferência</Label>
                    <Textarea
                      id="transferMessage"
                      className="h-24 resize-none"
                      value={config.transferMessage}
                      onChange={(e) => updateConfig({ transferMessage: e.target.value })}
                      onFocus={() => setActiveTextarea('transferMessage')}
                      data-testid="textarea-transfer-message"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="escalationMessage">Mensagem de Escalamento</Label>
                    <Textarea
                      id="escalationMessage"
                      className="h-24 resize-none"
                      value={config.escalationMessage}
                      onChange={(e) => updateConfig({ escalationMessage: e.target.value })}
                      onFocus={() => setActiveTextarea('escalationMessage')}
                      data-testid="textarea-escalation-message"
                    />
                  </div>
                </TabsContent>

                <TabsContent value="closing" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="closingMessage">{t('settings.chatbotConfig.closingMessage')}</Label>
                    <Textarea
                      id="closingMessage"
                      className="h-24 resize-none"
                      value={config.closingMessage}
                      onChange={(e) => updateConfig({ closingMessage: e.target.value })}
                      onFocus={() => setActiveTextarea('closingMessage')}
                      data-testid="textarea-closing-message"
                    />
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Placeholder Helper Sidebar */}
        <div className="lg:col-span-1">
          <PlaceholderHelper onPlaceholderInsert={insertPlaceholder} />
        </div>
      </div>
      </div>
    </AIAgentFeatureGate>
  );
}