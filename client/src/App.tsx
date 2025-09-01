import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/contexts/theme-context";
import { AuthProvider } from "@/contexts/auth-context";
import { SettingsProvider } from "@/contexts/settings-context";
import { ThemeCustomizationProvider } from "@/contexts/theme-customization-context";
import LoginPage from "@/pages/login";
import DashboardPage from "@/pages/dashboard";
import ConversationsPage from "@/pages/conversations";
import TicketsPage from "@/pages/tickets";
import ClientsPage from "@/pages/clients";
import QueuesPage from "@/pages/queues";
import UsersPage from "@/pages/users";
import AIAgentPage from "@/pages/ai-agent";
import ChatbotHubPage from "@/pages/chatbot-hub";
import ReportsPage from "@/pages/reports";
import EnhancedReportsPage from "@/pages/enhanced-reports";
import SettingsPage from "@/pages/settings";
import BackofficePage from "@/pages/backoffice";
import FeedbackPage from "@/pages/feedback";
import FinanceiroPage from "@/pages/financeiro";
import AdminPage from "@/pages/admin";
import MainLayout from "@/components/layout/main-layout";
import NotFound from "@/pages/not-found";
import { useAuth } from "@/hooks/use-auth";
import { useInstanceStatus } from "@/hooks/use-instance-status";
import { InstanceLockScreen } from "@/components/instance/instance-lock-screen";
import { PaymentNotificationBanner } from "@/components/instance/payment-notification-banner";
import "./lib/i18n"; // Initialize i18n

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const { 
    instanceStatus, 
    isLoading: isStatusLoading, 
    markPaymentNotificationShown,
    hasShownPaymentNotification 
  } = useInstanceStatus();
  
  // First check authentication
  if (!isAuthenticated) {
    return <LoginPage />;
  }
  
  // Show loading while checking instance status
  if (isStatusLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  // Check if instance is suspended - block all access
  if (instanceStatus.status === 'suspended' || instanceStatus.isLocked) {
    return (
      <InstanceLockScreen 
        lockMessage={instanceStatus.lockMessage}
        status={instanceStatus.status === 'active' ? 'suspended' : instanceStatus.status}
      />
    );
  }
  
  // Normal layout with payment notification banner if needed
  return (
    <MainLayout>
      {instanceStatus.status === 'pending_payment' && 
       instanceStatus.needsPaymentNotification && 
       !hasShownPaymentNotification && (
        <div className="px-4 sm:px-6 lg:px-8 pt-4">
          <PaymentNotificationBanner
            billingStatus={instanceStatus.billingStatus}
            onDismiss={markPaymentNotificationShown}
          />
        </div>
      )}
      {children}
    </MainLayout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      <Route path="/">
        <ProtectedRoute>
          <DashboardPage />
        </ProtectedRoute>
      </Route>
      <Route path="/conversations">
        <ProtectedRoute>
          <ConversationsPage />
        </ProtectedRoute>
      </Route>
      <Route path="/tickets">
        <ProtectedRoute>
          <TicketsPage />
        </ProtectedRoute>
      </Route>
      <Route path="/clients">
        <ProtectedRoute>
          <ClientsPage />
        </ProtectedRoute>
      </Route>
      <Route path="/queues">
        <ProtectedRoute>
          <QueuesPage />
        </ProtectedRoute>
      </Route>
      <Route path="/users">
        <ProtectedRoute>
          <UsersPage />
        </ProtectedRoute>
      </Route>
      <Route path="/ai-agent">
        <ProtectedRoute>
          <ChatbotHubPage />
        </ProtectedRoute>
      </Route>
      <Route path="/reports">
        <ProtectedRoute>
          <ReportsPage />
        </ProtectedRoute>
      </Route>
      <Route path="/enhanced-reports">
        <ProtectedRoute>
          <EnhancedReportsPage />
        </ProtectedRoute>
      </Route>
      <Route path="/settings">
        <ProtectedRoute>
          <SettingsPage />
        </ProtectedRoute>
      </Route>
      <Route path="/backoffice">
        <ProtectedRoute>
          <BackofficePage />
        </ProtectedRoute>
      </Route>
      <Route path="/feedback">
        <ProtectedRoute>
          <FeedbackPage />
        </ProtectedRoute>
      </Route>
      <Route path="/financeiro">
        <ProtectedRoute>
          <FinanceiroPage />
        </ProtectedRoute>
      </Route>

      <Route path="/admin">
        <ProtectedRoute>
          <AdminPage />
        </ProtectedRoute>
      </Route>
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <ThemeCustomizationProvider>
            <SettingsProvider>
              <TooltipProvider>
                <Toaster />
                <Router />
              </TooltipProvider>
            </SettingsProvider>
          </ThemeCustomizationProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
