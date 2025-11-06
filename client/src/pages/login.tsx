import { useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { useT } from '@/hooks/use-translation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, Building2, ChevronRight } from 'lucide-react';

interface Company {
  id: string;
  name: string;
  role: string;
  isOwner: boolean;
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [showCompanySelection, setShowCompanySelection] = useState(false);
  const { setUserData } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { t } = useT();

  const handleInitialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Try login without companyId first
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        // Single company or auto-selected - login successful
        setUserData(data.user, data.token);

        // Save last company for this email
        if (data.user.company?.id) {
          localStorage.setItem(`lastCompany_${email}`, data.user.company.id);
        }

        toast({
          title: t('auth.welcomeBack'),
          description: t('auth.loginSuccess'),
        });

        // Redirect after state is updated
        setTimeout(() => setLocation('/'), 100);
      } else if (response.status === 400 && data.requiresCompanySelection) {
        // Multiple companies - fetch list and show selection
        await fetchCompanies();
      } else {
        // Other errors
        toast({
          variant: "destructive",
          title: t('auth.loginFailed'),
          description: data.message || t('auth.invalidCredentials'),
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: t('auth.loginError'),
        description: t('auth.loginErrorDescription'),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCompanies = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        const data = await response.json();
        setCompanies(data.companies);
        setShowCompanySelection(true);

        // Pre-select last accessed company for this email
        const lastCompanyId = localStorage.getItem(`lastCompany_${email}`);
        if (lastCompanyId && data.companies.find((c: Company) => c.id === lastCompanyId)) {
          // User can see it's pre-selected visually
          console.log('Last accessed company:', lastCompanyId);
        }
      } else {
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Não foi possível carregar as empresas.",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao carregar empresas.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompanySelect = async (companyId: string) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, companyId }),
      });

      const data = await response.json();

      if (response.ok) {
        setUserData(data.user, data.token);

        // Save selected company as last accessed for this email
        localStorage.setItem(`lastCompany_${email}`, companyId);

        toast({
          title: t('auth.welcomeBack'),
          description: t('auth.loginSuccess'),
        });

        // Redirect after state is updated
        setTimeout(() => setLocation('/'), 100);
      } else {
        toast({
          variant: "destructive",
          title: t('auth.loginFailed'),
          description: data.message || t('auth.invalidCredentials'),
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: t('auth.loginError'),
        description: t('auth.loginErrorDescription'),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToLogin = () => {
    setShowCompanySelection(false);
    setCompanies([]);
  };

  // Get last accessed company for highlighting
  const lastCompanyId = localStorage.getItem(`lastCompany_${email}`);

  if (showCompanySelection) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-accent/5 p-4">
        <Card className="w-full max-w-md shadow-xl border-0 bg-card/95 backdrop-blur-sm">
          <CardContent className="p-8">
            <div className="text-center mb-8">
              <div className="p-6 rounded-2xl bg-primary/10 shadow-sm mb-6 inline-block">
                <img src="/logo.svg" alt="Fi.V App" className="h-16 w-auto" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">Selecione uma Empresa</h2>
              <p className="text-muted-foreground mt-2 text-sm">
                Você tem acesso a múltiplas empresas. Por favor, selecione uma para continuar.
              </p>
            </div>

            <div className="space-y-3">
              {companies.map((company) => (
                <button
                  key={company.id}
                  onClick={() => handleCompanySelect(company.id)}
                  disabled={isLoading}
                  className={`w-full p-4 border rounded-lg text-left transition-all hover:border-primary hover:bg-primary/5 focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed ${
                    company.id === lastCompanyId ? 'border-primary bg-primary/5' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Building2 className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-medium text-foreground">{company.name}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {company.role === 'admin' && (company.isOwner ? 'Administrador (Proprietário)' : 'Administrador')}
                          {company.role === 'supervisor' && 'Supervisor'}
                          {company.role === 'agent' && 'Agente'}
                        </p>
                        {company.id === lastCompanyId && (
                          <p className="text-xs text-primary mt-1">Último acesso</p>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </button>
              ))}
            </div>

            <Button
              variant="outline"
              className="w-full mt-6"
              onClick={handleBackToLogin}
              disabled={isLoading}
            >
              Voltar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-accent/5 p-4">
      <Card className="w-full max-w-md shadow-xl border-0 bg-card/95 backdrop-blur-sm">
        <CardContent className="p-8">
          <div className="text-center mb-8">
            <div className="p-6 rounded-2xl bg-primary/10 shadow-sm mb-6 inline-block">
              <img src="/logo.svg" alt="Fi.V App" className="h-16 w-auto" />
            </div>
          </div>

          <form onSubmit={handleInitialSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="Digite seu e-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                data-testid="input-email"
                className="h-11 shadow-sm"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">{t('common.password')}</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder={t('auth.passwordPlaceholder')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  data-testid="input-password"
                  className="pr-10 h-11 shadow-sm"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center hover:bg-accent/50 rounded-r-md transition-colors"
                  onClick={() => setShowPassword(!showPassword)}
                  data-testid="button-toggle-password"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-11 shadow-sm"
              disabled={isLoading}
              data-testid="button-signin"
            >
              {isLoading ? "Entrando..." : t('auth.login')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
