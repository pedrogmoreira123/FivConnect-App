import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useT } from '@/hooks/use-translation';
import { Bot, Brain, MessageCircle, Zap } from 'lucide-react';

interface ChatbotModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ChatbotModal({ open, onOpenChange }: ChatbotModalProps) {
  const { t } = useT();
  const [selectedOption, setSelectedOption] = useState<'chatbot' | 'ai-agents' | null>(null);

  const handleOptionSelect = (option: 'chatbot' | 'ai-agents') => {
    setSelectedOption(option);
  };

  const handleBack = () => {
    setSelectedOption(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Bot className="h-5 w-5" />
            <span>Automação & Inteligência Artificial</span>
          </DialogTitle>
        </DialogHeader>

        {!selectedOption ? (
          // Option Selection Screen
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
            <Card 
              className="cursor-pointer transition-all hover:shadow-lg hover:scale-105 border-2 hover:border-primary"
              onClick={() => handleOptionSelect('chatbot')}
              data-testid="card-chatbot-option"
            >
              <CardHeader className="text-center">
                <div className="mx-auto w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mb-4">
                  <MessageCircle className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                </div>
                <CardTitle className="text-xl">Chatbot Tradicional</CardTitle>
              </CardHeader>
              <CardContent className="text-center space-y-3">
                <p className="text-muted-foreground">
                  Configure respostas automáticas e fluxos de atendimento baseados em regras pré-definidas.
                </p>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>Respostas programadas</span>
                  </div>
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>Fluxos de atendimento</span>
                  </div>
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>Seleção de filas</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card 
              className="cursor-pointer transition-all hover:shadow-lg hover:scale-105 border-2 hover:border-primary"
              onClick={() => handleOptionSelect('ai-agents')}
              data-testid="card-ai-agents-option"
            >
              <CardHeader className="text-center">
                <div className="mx-auto w-16 h-16 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center mb-4">
                  <Brain className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                </div>
                <CardTitle className="text-xl">Agentes de I.A</CardTitle>
              </CardHeader>
              <CardContent className="text-center space-y-3">
                <p className="text-muted-foreground">
                  Configure assistentes inteligentes com prompts personalizados para respostas mais naturais.
                </p>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    <span>Prompts personalizados</span>
                  </div>
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    <span>Respostas inteligentes</span>
                  </div>
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    <span>Aprendizado contínuo</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : selectedOption === 'chatbot' ? (
          // Chatbot Configuration (import existing content)
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Button variant="ghost" onClick={handleBack} data-testid="button-back-to-options">
                ← Voltar às opções
              </Button>
              <div className="flex items-center space-x-2">
                <MessageCircle className="h-5 w-5 text-blue-600" />
                <span className="font-semibold">Chatbot Tradicional</span>
              </div>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-center text-muted-foreground">
                Esta seção conterá toda a configuração do chatbot tradicional.
                Funcionalidade será movida da página atual para cá.
              </p>
            </div>
          </div>
        ) : (
          // AI Agents Configuration (new feature)
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Button variant="ghost" onClick={handleBack} data-testid="button-back-to-options">
                ← Voltar às opções
              </Button>
              <div className="flex items-center space-x-2">
                <Brain className="h-5 w-5 text-purple-600" />
                <span className="font-semibold">Agentes de I.A</span>
              </div>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-center text-muted-foreground">
                Aqui será implementada a nova funcionalidade de Agentes de I.A
                com configuração de prompts personalizados.
              </p>
            </div>
          </div>
        )}

        {/* Mutual Exclusivity Warning */}
        {selectedOption && (
          <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <div className="flex items-center space-x-2">
              <Zap className="h-4 w-4 text-amber-600" />
              <p className="text-sm text-amber-800 dark:text-amber-200">
                <strong>Importante:</strong> Apenas uma opção pode estar ativa por vez. 
                Ativar {selectedOption === 'chatbot' ? 'Chatbot' : 'Agentes de I.A'} desativará automaticamente a outra opção.
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}