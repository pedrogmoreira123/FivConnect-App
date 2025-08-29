import { useInstanceStatus } from "./use-instance-status";

export type FeatureKey = 'chat' | 'chatbot' | 'ai_agent';

export interface FeatureControlResult {
  isEnabled: (feature: FeatureKey) => boolean;
  getDisabledReason: (feature: FeatureKey) => string | null;
  enabledFeatures: Record<FeatureKey, boolean>;
  isLoading: boolean;
}

export function useFeatureControl(): FeatureControlResult {
  const { instanceStatus, isLoading } = useInstanceStatus();

  const isEnabled = (feature: FeatureKey): boolean => {
    if (isLoading) return false;
    return instanceStatus.enabledFeatures[feature] || false;
  };

  const getDisabledReason = (feature: FeatureKey): string | null => {
    if (isLoading) return "Carregando...";
    
    if (instanceStatus.status === 'suspended') {
      return "Esta funcionalidade está indisponível devido à suspensão da conta.";
    }
    
    if (instanceStatus.status === 'pending_payment') {
      return "Esta funcionalidade pode ser limitada devido ao pagamento pendente.";
    }
    
    if (!instanceStatus.enabledFeatures[feature]) {
      switch (feature) {
        case 'chat':
          return "Funcionalidade de chat não está habilitada para esta instância.";
        case 'chatbot':
          return "Funcionalidade de chatbot não está habilitada para esta instância.";
        case 'ai_agent':
          return "Funcionalidade de agente IA não está habilitada para esta instância. Faça upgrade do seu plano.";
        default:
          return "Esta funcionalidade não está habilitada para esta instância.";
      }
    }
    
    return null;
  };

  return {
    isEnabled,
    getDisabledReason,
    enabledFeatures: instanceStatus.enabledFeatures,
    isLoading,
  };
}