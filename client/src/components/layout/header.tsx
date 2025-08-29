import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useTheme } from '@/hooks/use-theme';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import ProfileModal from '@/components/modals/profile-modal';
import SettingsModal from '@/components/modals/settings-modal';
import { Moon, Sun, ChevronDown, User, Settings, LogOut, Bell } from 'lucide-react';

interface HeaderProps {
  title: string;
}

export default function Header({ title }: HeaderProps) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isAnnouncementsOpen, setIsAnnouncementsOpen] = useState(false);
  const [hasUnreadAnnouncements, setHasUnreadAnnouncements] = useState(true);

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      logout();
    }
  };

  return (
    <>
      <header className="bg-card border-b border-border px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground" data-testid="text-page-title">
            {title}
          </h1>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Announcements Notification */}
          <DropdownMenu open={isAnnouncementsOpen} onOpenChange={setIsAnnouncementsOpen}>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="relative"
                data-testid="button-announcements"
              >
                <Bell className="h-5 w-5" />
                {hasUnreadAnnouncements && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full flex items-center justify-center">
                    <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                  </div>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <div className="p-4 border-b border-border">
                <h3 className="font-semibold text-foreground">Avisos e Comunicados</h3>
                <p className="text-sm text-muted-foreground">Informações importantes da equipe</p>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {/* Sample announcements */}
                <div className="p-4 border-b border-border hover:bg-accent cursor-pointer">
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                    <div className="flex-1">
                      <h4 className="font-medium text-foreground text-sm">
                        Atualização do Sistema - Versão 2.1.0
                      </h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        Nova versão disponível com melhorias de performance e correção de bugs.
                      </p>
                      <span className="text-xs text-muted-foreground">Há 2 horas</span>
                    </div>
                  </div>
                </div>
                <div className="p-4 border-b border-border hover:bg-accent cursor-pointer">
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                    <div className="flex-1">
                      <h4 className="font-medium text-foreground text-sm">
                        Manutenção Programada
                      </h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        Sistema ficará indisponível das 02:00 às 04:00 para manutenção.
                      </p>
                      <span className="text-xs text-muted-foreground">Ontem</span>
                    </div>
                  </div>
                </div>
                <div className="p-4 border-b border-border hover:bg-accent cursor-pointer">
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                    <div className="flex-1">
                      <h4 className="font-medium text-foreground text-sm">
                        Nova Funcionalidade: Relatórios Avançados
                      </h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        Agora você pode gerar relatórios mais detalhados sobre seus atendimentos.
                      </p>
                      <span className="text-xs text-muted-foreground">2 dias atrás</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-3 border-t border-border">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full"
                  onClick={() => {
                    setHasUnreadAnnouncements(false);
                    setIsAnnouncementsOpen(false);
                  }}
                >
                  Marcar todas como lidas
                </Button>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            data-testid="button-theme-toggle"
          >
            {theme === 'dark' ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </Button>
          
          {/* Profile Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                className="flex items-center space-x-2"
                data-testid="button-profile-dropdown"
              >
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                  <span className="text-primary-foreground text-sm font-medium">
                    {user?.initials}
                  </span>
                </div>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => setIsProfileModalOpen(true)} data-testid="menu-item-profile">
                <User className="mr-2 h-4 w-4" />
                My Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsSettingsModalOpen(true)} data-testid="menu-item-settings">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} data-testid="menu-item-logout">
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <ProfileModal 
        isOpen={isProfileModalOpen} 
        onClose={() => setIsProfileModalOpen(false)} 
      />
      <SettingsModal 
        isOpen={isSettingsModalOpen} 
        onClose={() => setIsSettingsModalOpen(false)} 
      />
    </>
  );
}
