import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/contexts/theme-context";
import { AuthProvider } from "@/contexts/auth-context";
import { SettingsProvider } from "@/contexts/settings-context";
import LoginPage from "@/pages/login";
import DashboardPage from "@/pages/dashboard";
import ConversationsPage from "@/pages/conversations";
import QueuesPage from "@/pages/queues";
import UsersPage from "@/pages/users";
import AIAgentPage from "@/pages/ai-agent";
import EnhancedAIAgentPage from "@/pages/enhanced-ai-agent";
import ReportsPage from "@/pages/reports";
import EnhancedReportsPage from "@/pages/enhanced-reports";
import SettingsPage from "@/pages/settings";
import BackofficePage from "@/pages/backoffice";
import MainLayout from "@/components/layout/main-layout";
import NotFound from "@/pages/not-found";
import { useAuth } from "@/hooks/use-auth";
import "./lib/i18n"; // Initialize i18n

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  
  if (!isAuthenticated) {
    return <LoginPage />;
  }
  
  return <MainLayout>{children}</MainLayout>;
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
          <EnhancedAIAgentPage />
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
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <SettingsProvider>
            <TooltipProvider>
              <Toaster />
              <Router />
            </TooltipProvider>
          </SettingsProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
