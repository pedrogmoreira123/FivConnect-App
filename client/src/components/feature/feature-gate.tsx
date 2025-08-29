import { ReactNode } from "react";
import { useFeatureControl, type FeatureKey } from "@/hooks/use-feature-control";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Lock, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FeatureGateProps {
  feature: FeatureKey;
  children: ReactNode;
  fallback?: ReactNode;
  showMessage?: boolean;
  allowPartialAccess?: boolean;
  className?: string;
}

export function FeatureGate({
  feature,
  children,
  fallback,
  showMessage = true,
  allowPartialAccess = false,
  className = "",
}: FeatureGateProps) {
  const { isEnabled, getDisabledReason, isLoading } = useFeatureControl();

  // Show loading state
  if (isLoading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
      </div>
    );
  }

  // Feature is enabled - show content
  if (isEnabled(feature)) {
    return <>{children}</>;
  }

  // Feature is disabled
  const disabledReason = getDisabledReason(feature);

  // If partial access is allowed, show children with disabled state
  if (allowPartialAccess) {
    return (
      <div className={`opacity-50 pointer-events-none ${className}`}>
        {children}
        {showMessage && disabledReason && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded">
            <div className="bg-white dark:bg-gray-800 p-3 rounded shadow-lg max-w-xs text-center">
              <Lock className="h-6 w-6 mx-auto mb-2 text-gray-500" />
              <p className="text-sm text-gray-600 dark:text-gray-400">{disabledReason}</p>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Show custom fallback if provided
  if (fallback) {
    return <>{fallback}</>;
  }

  // Show default disabled message
  if (showMessage && disabledReason) {
    return (
      <Alert className={`border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/50 ${className}`}>
        <AlertTriangle className="h-4 w-4 text-orange-600" />
        <AlertDescription className="text-orange-800 dark:text-orange-200">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="font-semibold mb-1">Funcionalidade Indisponível</div>
              <div className="text-sm">{disabledReason}</div>
              {feature === 'ai_agent' && (
                <div className="mt-2">
                  <Button size="sm" variant="outline" className="text-orange-800 border-orange-300">
                    Fazer Upgrade
                  </Button>
                </div>
              )}
            </div>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  // Hide completely
  return null;
}

// Specialized components for specific features
export function ChatFeatureGate({ children, ...props }: Omit<FeatureGateProps, 'feature'>) {
  return (
    <FeatureGate feature="chat" {...props}>
      {children}
    </FeatureGate>
  );
}

export function ChatbotFeatureGate({ children, ...props }: Omit<FeatureGateProps, 'feature'>) {
  return (
    <FeatureGate feature="chatbot" {...props}>
      {children}
    </FeatureGate>
  );
}

export function AIAgentFeatureGate({ children, ...props }: Omit<FeatureGateProps, 'feature'>) {
  return (
    <FeatureGate feature="ai_agent" {...props}>
      {children}
    </FeatureGate>
  );
}