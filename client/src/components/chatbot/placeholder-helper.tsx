import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useT } from '@/hooks/use-translation';
import { Copy, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PlaceholderHelperProps {
  onPlaceholderInsert?: (placeholder: string) => void;
}

export default function PlaceholderHelper({ onPlaceholderInsert }: PlaceholderHelperProps) {
  const { t } = useT();
  const { toast } = useToast();

  const availablePlaceholders = [
    {
      key: '{{nome_cliente}}',
      description: t('settings.chatbotConfig.customerName'),
      example: 'Maria Silva'
    },
    {
      key: '{{nome_empresa}}',
      description: t('settings.chatbotConfig.companyName'),
      example: 'TechCorp Ltda'
    },
    {
      key: '{{protocolo}}',
      description: t('settings.chatbotConfig.protocolId'),
      example: '#TC-2024-001'
    },
    {
      key: '{{data_abertura}}',
      description: t('settings.chatbotConfig.openingDate'),
      example: '26/01/2024 14:30'
    },
    {
      key: '{{fila}}',
      description: 'Nome da fila/departamento',
      example: 'Suporte Técnico'
    },
    {
      key: '{{agente}}',
      description: 'Nome do agente responsável',
      example: 'João Santos'
    },
    {
      key: '{{horario_atendimento}}',
      description: 'Horário de funcionamento da fila',
      example: 'Segunda a Sexta, 9h às 18h'
    }
  ];

  const copyToClipboard = (placeholder: string) => {
    navigator.clipboard.writeText(placeholder);
    toast({
      title: "Copiado!",
      description: `Placeholder ${placeholder} copiado para a área de transferência.`,
    });
  };

  const insertPlaceholder = (placeholder: string) => {
    if (onPlaceholderInsert) {
      onPlaceholderInsert(placeholder);
    } else {
      copyToClipboard(placeholder);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Info className="h-5 w-5" />
          <span>{t('settings.chatbotConfig.dynamicPlaceholders')}</span>
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {t('settings.chatbotConfig.availablePlaceholders')}
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {availablePlaceholders.map((placeholder, index) => (
            <div 
              key={index}
              className="flex items-center justify-between p-3 border rounded-lg"
              data-testid={`placeholder-${index}`}
            >
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <Badge variant="secondary" className="font-mono text-xs">
                    {placeholder.key}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-1">
                  {placeholder.description}
                </p>
                <p className="text-xs text-muted-foreground italic">
                  Exemplo: {placeholder.example}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => insertPlaceholder(placeholder.key)}
                className="ml-4"
                data-testid={`button-copy-${index}`}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
        
        <div className="mt-6 p-4 bg-muted rounded-lg">
          <h4 className="font-semibold mb-2">Exemplos de Uso:</h4>
          <div className="space-y-2 text-sm">
            <p><strong>Saudação:</strong> "Olá {`{{nome_cliente}}`}, bem-vindo à {`{{nome_empresa}}`}!"</p>
            <p><strong>Transferência:</strong> "Você está sendo transferido para a fila {`{{fila}}`}."</p>
            <p><strong>Protocolo:</strong> "Seu protocolo de atendimento é {`{{protocolo}}`}."</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}