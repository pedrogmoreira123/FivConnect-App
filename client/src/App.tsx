import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/contexts/theme-context";
import { AuthProvider } from "@/contexts/auth-context";
import { SettingsProvider } from "@/contexts/settings-context";
import { ThemeCustomizationProvider } from "@/contexts/theme-customization-context";
import { lazy, Suspense } from "react";
import MainLayout from "@/components/layout/main-layout";
import { useAuth } from "@/hooks/use-auth";
import { useInstanceStatus } from "@/hooks/use-instance-status";
import { InstanceLockScreen } from "@/components/instance/instance-lock-screen";
import { PaymentNotificationBanner } from "@/components/instance/payment-notification-banner";
import { PageLoader } from "@/components/ui/loading-spinner";
import "./lib/i18n"; // Initialize i18n

// Lazy load pages for better performance
const LoginPage = lazy(() => import("@/pages/login"));
const PrimeiroAcessoPage = lazy(() => import("@/pages/primeiro-acesso"));
const DashboardPage = lazy(() => import("@/pages/dashboard"));
const ConversationsPage = lazy(() => import("@/pages/conversations"));
const TicketsPage = lazy(() => import("@/pages/tickets"));
const ClientsPage = lazy(() => import("@/pages/clients"));
const QueuesPage = lazy(() => import("@/pages/queues"));
const UsersPage = lazy(() => import("@/pages/users"));
const AIAgentPage = lazy(() => import("@/pages/ai-agent"));
const ChatbotHubPage = lazy(() => import("@/pages/chatbot-hub"));
const ReportsPage = lazy(() => import("@/pages/reports"));
const EnhancedReportsPage = lazy(() => import("@/pages/enhanced-reports"));
const SettingsPage = lazy(() => import("@/pages/settings"));
const BackofficePage = lazy(() => import("@/pages/backoffice"));
const FeedbackPage = lazy(() => import("@/pages/feedback"));
const FinanceiroPage = lazy(() => import("@/pages/financeiro"));
const AdminPage = lazy(() => import("@/pages/admin"));
const AnnouncementsPage = lazy(() => import("@/pages/announcements"));
const WhatsAppSettingsPage = lazy(() => import("@/pages/whatsapp-settings"));
const NotFound = lazy(() => import("@/pages/not-found"));

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
    return <PageLoader text="Verificando status da instância..." />;
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

// Loading component for Suspense - using imported PageLoader

function Router() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        <Route path="/login" component={LoginPage} />
        <Route path="/primeiro-acesso" component={PrimeiroAcessoPage} />
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
        <Route path="/announcements">
          <ProtectedRoute>
            <AnnouncementsPage />
          </ProtectedRoute>
        </Route>
        <Route path="/whatsapp-settings">
          <ProtectedRoute>
            <WhatsAppSettingsPage />
          </ProtectedRoute>
        </Route>
        
        <Route component={NotFound} />
      </Switch>
    </Suspense>
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
