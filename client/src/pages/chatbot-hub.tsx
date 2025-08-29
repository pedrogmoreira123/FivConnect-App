import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChatbotModal } from '@/components/chatbot/chatbot-modal';
import { useT } from '@/hooks/use-translation';
import { Bot, Brain, MessageCircle, Settings, Zap } from 'lucide-react';

export default function ChatbotHubPage() {
  const { t } = useT();
  const [showModal, setShowModal] = useState(false);

  // Auto-open modal when page loads
  useEffect(() => {
    setShowModal(true);
  }, []);

  return (
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
        <Button onClick={() => setShowModal(true)} data-testid="button-open-chatbot-config">
          <Settings className="h-4 w-4 mr-2" />
          Configurar
        </Button>
      </div>

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
                  <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                  <span className="text-sm">Desativado</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Mensagens hoje</span>
                <span className="text-sm font-medium">0</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Taxa de resolução</span>
                <span className="text-sm font-medium">-</span>
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
                  <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                  <span className="text-sm">Desativado</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Consultas hoje</span>
                <span className="text-sm font-medium">0</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Precisão média</span>
                <span className="text-sm font-medium">-</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Important Notice */}
      <Card className="border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800">
        <CardContent className="p-6">
          <div className="flex items-start space-x-3">
            <Zap className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="space-y-2">
              <h3 className="font-semibold text-amber-900 dark:text-amber-100">
                Exclusividade Mútua
              </h3>
              <p className="text-sm text-amber-800 dark:text-amber-200">
                Por razões de performance e consistência, apenas uma das opções (Chatbot Tradicional ou Agentes de I.A) 
                pode estar ativa por vez. Quando você ativar uma opção, a outra será automaticamente desativada.
              </p>
              <div className="pt-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setShowModal(true)}
                  className="border-amber-300 text-amber-900 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-100 dark:hover:bg-amber-900/40"
                >
                  Configurar Agora
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <ChatbotModal open={showModal} onOpenChange={setShowModal} />
    </div>
  );
}