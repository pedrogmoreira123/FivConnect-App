import { AlertTriangle, Mail, Phone } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface InstanceLockScreenProps {
  lockMessage?: string;
  status: 'suspended' | 'pending_payment';
}

export function InstanceLockScreen({ lockMessage, status }: InstanceLockScreenProps) {
  const isSuspended = status === 'suspended';
  const isPendingPayment = status === 'pending_payment';

  const getTitle = () => {
    if (isSuspended) return "Acesso Suspenso";
    if (isPendingPayment) return "Pagamento Pendente";
    return "Acesso Restrito";
  };

  const getDescription = () => {
    if (isSuspended) return "Esta conta foi temporariamente suspensa";
    if (isPendingPayment) return "Existe um pagamento pendente para esta conta";
    return "O acesso a esta instância foi restringido";
  };

  const getIcon = () => {
    if (isSuspended) return <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />;
    if (isPendingPayment) return <AlertTriangle className="h-16 w-16 text-yellow-500 mx-auto mb-4" />;
    return <AlertTriangle className="h-16 w-16 text-orange-500 mx-auto mb-4" />;
  };

  const handleContactSupport = () => {
    // You can customize these contact methods based on your support channels
    window.open("mailto:support@fi-v.com?subject=Instance Access Issue", "_blank");
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-md mx-auto shadow-2xl">
        <CardHeader className="text-center pb-2">
          {getIcon()}
          <CardTitle className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {getTitle()}
          </CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-400">
            {getDescription()}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {lockMessage && (
            <Alert className={isSuspended ? "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/50" : "border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/50"}>
              <AlertTriangle className={`h-4 w-4 ${isSuspended ? "text-red-600" : "text-yellow-600"}`} />
              <AlertDescription className={isSuspended ? "text-red-800 dark:text-red-200" : "text-yellow-800 dark:text-yellow-200"}>
                {lockMessage}
              </AlertDescription>
            </Alert>
          )}

          <div className="text-center space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {isSuspended && "Para reativar sua conta, entre em contato com o suporte técnico."}
              {isPendingPayment && "Para resolver a situação, entre em contato conosco ou verifique o status do pagamento."}
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button 
                onClick={handleContactSupport}
                className="flex items-center justify-center gap-2"
                data-testid="button-contact-support"
              >
                <Mail className="h-4 w-4" />
                Entrar em Contato
              </Button>
              
              <Button 
                variant="outline" 
                onClick={handleRefresh}
                className="flex items-center justify-center gap-2"
                data-testid="button-refresh"
              >
                <AlertTriangle className="h-4 w-4" />
                Verificar Novamente
              </Button>
            </div>
          </div>

          <div className="border-t pt-4">
            <div className="text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                Precisa de ajuda? Entre em contato:
              </p>
              <div className="flex justify-center items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
                <div className="flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  <span>support@fi-v.com</span>
                </div>
                <div className="flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  <span>(11) 9999-9999</span>
                </div>
              </div>
            </div>
          </div>

          {/* Status indicator */}
          <div className="text-center">
            <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
              isSuspended 
                ? "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200"
                : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200"
            }`}>
              Status: {isSuspended ? "Suspenso" : "Pagamento Pendente"}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}