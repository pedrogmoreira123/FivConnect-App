import { useState } from "react";
import { AlertTriangle, X, CreditCard, ExternalLink } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface PaymentNotificationBannerProps {
  onDismiss: () => void;
  billingStatus: 'paid' | 'overdue';
}

export function PaymentNotificationBanner({ onDismiss, billingStatus }: PaymentNotificationBannerProps) {
  const [isVisible, setIsVisible] = useState(true);

  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss();
  };

  const handleContactBilling = () => {
    // You can customize this to open your billing portal or contact form
    window.open("mailto:billing@fi-v.com?subject=Payment Issue - Instance Access", "_blank");
  };

  const handleViewInvoices = () => {
    // You can customize this to open your billing portal
    window.open("https://billing.fi-v.com/invoices", "_blank");
  };

  if (!isVisible) return null;

  return (
    <Alert className="mb-4 border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/50 relative">
      <AlertTriangle className="h-4 w-4 text-yellow-600" />
      <AlertDescription className="text-yellow-800 dark:text-yellow-200 pr-16">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="font-semibold mb-1">
              {billingStatus === 'overdue' ? "Pagamento em Atraso" : "Pagamento Pendente"}
            </div>
            <div className="text-sm">
              {billingStatus === 'overdue' 
                ? "Existe uma fatura em atraso. Para garantir a continuidade do serviço, regularize o pagamento o quanto antes."
                : "Existe um pagamento pendente. Por favor, resolva a situação para garantir o funcionamento contínuo do serviço."
              }
            </div>
            <div className="flex gap-2 mt-3">
              <Button 
                size="sm" 
                variant="outline"
                onClick={handleViewInvoices}
                className="bg-yellow-100 border-yellow-300 text-yellow-800 hover:bg-yellow-200 dark:bg-yellow-900/50 dark:border-yellow-700 dark:text-yellow-200 dark:hover:bg-yellow-900/70"
                data-testid="button-view-invoices"
              >
                <CreditCard className="h-3 w-3 mr-1" />
                Ver Faturas
                <ExternalLink className="h-3 w-3 ml-1" />
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={handleContactBilling}
                className="bg-yellow-100 border-yellow-300 text-yellow-800 hover:bg-yellow-200 dark:bg-yellow-900/50 dark:border-yellow-700 dark:text-yellow-200 dark:hover:bg-yellow-900/70"
                data-testid="button-contact-billing"
              >
                Entrar em Contato
              </Button>
            </div>
          </div>
        </div>
      </AlertDescription>
      
      <Button
        size="sm"
        variant="ghost"
        onClick={handleDismiss}
        className="absolute top-2 right-2 h-6 w-6 p-0 text-yellow-600 hover:text-yellow-800 hover:bg-yellow-200 dark:text-yellow-400 dark:hover:text-yellow-200 dark:hover:bg-yellow-900/50"
        data-testid="button-dismiss-banner"
      >
        <X className="h-4 w-4" />
      </Button>
    </Alert>
  );
}