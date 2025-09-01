export default function LandingPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="max-w-md w-full space-y-8 p-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Fi.V App
          </h1>
          <p className="text-muted-foreground mb-8">
            Plataforma de atendimento ao cliente via WhatsApp
          </p>
          
          <div className="space-y-4">
            <a
              href="/api/login"
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors"
              data-testid="button-login"
            >
              Fazer Login
            </a>
            
            <p className="text-xs text-muted-foreground">
              Faça login com sua conta Replit para acessar o sistema
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}