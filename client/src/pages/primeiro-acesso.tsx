import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, EyeOff, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface InviteValidation {
  valid: boolean;
  company: {
    id: string;
    name: string;
    contactName: string;
    contactEmail: string;
  };
  email: string;
}

export default function PrimeiroAcessoPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // URL token
  const [token, setToken] = useState<string | null>(null);

  // Validation state
  const [isValidating, setIsValidating] = useState(true);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [inviteData, setInviteData] = useState<InviteValidation | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Extract token from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get('token');

    if (!urlToken) {
      setValidationError('Token de convite não encontrado na URL');
      setIsValidating(false);
      return;
    }

    setToken(urlToken);
  }, []);

  // Validate token
  useEffect(() => {
    if (!token) return;

    const validateToken = async () => {
      try {
        const response = await fetch(`/api/invite/validate/${token}`);
        const data = await response.json();

        if (!response.ok) {
          setValidationError(data.message || 'Token de convite inválido ou expirado');
          setIsValidating(false);
          return;
        }

        setInviteData(data);
        setName(data.company.contactName || '');
        setIsValidating(false);
      } catch (error) {
        console.error('Error validating token:', error);
        setValidationError('Erro ao validar convite. Tente novamente mais tarde.');
        setIsValidating(false);
      }
    };

    validateToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validations
    if (!name.trim()) {
      toast({
        variant: 'destructive',
        title: 'Erro de validação',
        description: 'Por favor, informe seu nome completo',
      });
      return;
    }

    if (password.length < 6) {
      toast({
        variant: 'destructive',
        title: 'Senha muito curta',
        description: 'A senha deve ter no mínimo 6 caracteres',
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        variant: 'destructive',
        title: 'Senhas não conferem',
        description: 'As senhas digitadas não são iguais',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/invite/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          name: name.trim(),
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast({
          variant: 'destructive',
          title: 'Erro ao finalizar cadastro',
          description: data.message || 'Ocorreu um erro. Tente novamente.',
        });
        setIsSubmitting(false);
        return;
      }

      // Success!
      toast({
        title: 'Cadastro finalizado com sucesso!',
        description: 'Você será redirecionado para o login.',
      });

      // Redirect to login after 2 seconds
      setTimeout(() => {
        setLocation('/login');
      }, 2000);

    } catch (error) {
      console.error('Error completing invite:', error);
      toast({
        variant: 'destructive',
        title: 'Erro inesperado',
        description: 'Não foi possível finalizar o cadastro. Tente novamente.',
      });
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-accent/5 p-4">
        <Card className="w-full max-w-md shadow-xl border-0 bg-card/95 backdrop-blur-sm">
          <CardContent className="p-12 text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Validando convite...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (validationError || !inviteData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-accent/5 p-4">
        <Card className="w-full max-w-md shadow-xl border-0 bg-card/95 backdrop-blur-sm">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto mb-4 p-3 rounded-full bg-destructive/10 w-fit">
              <XCircle className="h-12 w-12 text-destructive" />
            </div>
            <CardTitle className="text-2xl">Convite Inválido</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertDescription>
                {validationError || 'Não foi possível validar o convite'}
              </AlertDescription>
            </Alert>
            <p className="text-sm text-muted-foreground text-center">
              Possíveis motivos:
            </p>
            <ul className="text-sm text-muted-foreground space-y-1 ml-4">
              <li>• O convite expirou (válido por 7 dias)</li>
              <li>• O convite já foi utilizado</li>
              <li>• O link está incorreto ou incompleto</li>
            </ul>
            <p className="text-sm text-muted-foreground text-center mt-4">
              Entre em contato com o administrador do sistema para solicitar um novo convite.
            </p>
            <Button
              variant="outline"
              className="w-full mt-4"
              onClick={() => setLocation('/login')}
            >
              Ir para o Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state - show form
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-accent/5 p-4">
      <Card className="w-full max-w-md shadow-xl border-0 bg-card/95 backdrop-blur-sm">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-4 p-3 rounded-full bg-primary/10 w-fit">
            <CheckCircle2 className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-2xl">Bem-vindo à FivConnect!</CardTitle>
          <CardDescription className="text-base mt-2">
            Complete seu cadastro para acessar o sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Company info */}
          <Alert className="bg-primary/5 border-primary/20">
            <AlertDescription>
              <div className="space-y-1">
                <p className="font-semibold text-foreground">Empresa: {inviteData.company.name}</p>
                <p className="text-sm text-muted-foreground">Email: {inviteData.email}</p>
              </div>
            </AlertDescription>
          </Alert>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium">
                Nome Completo *
              </Label>
              <Input
                id="name"
                type="text"
                placeholder="Digite seu nome completo"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="h-11 shadow-sm"
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">
                Senha *
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Mínimo 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="pr-10 h-11 shadow-sm"
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center hover:bg-accent/50 rounded-r-md transition-colors"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm font-medium">
                Confirmar Senha *
              </Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Digite a senha novamente"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  className="pr-10 h-11 shadow-sm"
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center hover:bg-accent/50 rounded-r-md transition-colors"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  tabIndex={-1}
                >
                  {showConfirmPassword ? (
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
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Finalizando cadastro...
                </>
              ) : (
                'Finalizar Cadastro'
              )}
            </Button>
          </form>

          <p className="text-xs text-muted-foreground text-center">
            Ao finalizar o cadastro, você poderá acessar o sistema com o email{' '}
            <span className="font-medium text-foreground">{inviteData.email}</span> e a senha cadastrada.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
