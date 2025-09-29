import { useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { useSettings } from '@/contexts/settings-context';
import { useT } from '@/hooks/use-translation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();
  const { settings } = useSettings();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { t } = useT();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const success = await login(username, password);
      if (success) {
        setLocation('/');
        toast({
          title: t('auth.welcomeBack'),
          description: t('auth.loginSuccess'),
        });
      } else {
        toast({
          variant: "destructive",
          title: t('auth.loginFailed'),
          description: t('auth.invalidCredentials'),
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-accent/5 p-4">
      <Card className="w-full max-w-md shadow-xl border-0 bg-card/95 backdrop-blur-sm">
        <CardContent className="p-8">
          <div className="text-center mb-8">
            <div className="p-6 rounded-2xl bg-primary/10 shadow-sm mb-6 inline-block">
              <img src="/logo.svg" alt="Fi.V App" className="h-16 w-auto" />
            </div>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm font-medium">Usuário</Label>
              <Input
                id="username"
                type="text"
                placeholder="Digite seu nome de usuário"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                data-testid="input-username"
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
