import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useTheme } from '@/hooks/use-theme';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import ProfileModal from '@/components/modals/profile-modal';
import SettingsModal from '@/components/modals/settings-modal';
import { ChevronDown, User, Settings, LogOut, Bell, Calendar, User as UserIcon, LucideIcon } from 'lucide-react';

interface HeaderProps {
  title: string;
  icon?: LucideIcon;
}

interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: 'low' | 'medium' | 'high';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  author?: {
    name: string;
  };
}

export default function Header({ title, icon: Icon }: HeaderProps) {
  const { user, logout } = useAuth();
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isAnnouncementsOpen, setIsAnnouncementsOpen] = useState(false);
  const [hasUnreadAnnouncements, setHasUnreadAnnouncements] = useState(false);

  // Fetch announcements
  const { data: announcements = [] } = useQuery({
    queryKey: ['announcements'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/announcements');
      return response.json();
    }
  });

  // Check for unread announcements
  useEffect(() => {
    const hasUnread = announcements.some((announcement: Announcement) => 
      announcement.isActive && 
      new Date(announcement.createdAt) > new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
    );
    setHasUnreadAnnouncements(hasUnread);
  }, [announcements]);

  const handleLogout = () => {
    if (window.confirm('Tem certeza que deseja sair?')) {
      logout();
    }
  };

  const companyLogo = (user as any)?.company?.logoUrl as string | undefined;
  const logoSrc = companyLogo || '/logo.svg';
  const [logoSrcState, setLogoSrcState] = useState(logoSrc);

  // Update logo when user changes
  useEffect(() => {
    setLogoSrcState(logoSrc);
  }, [logoSrc]);

  return (
    <>
      <header className="bg-card/95 backdrop-blur-sm border-b border-border/50 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center space-x-4">
          {/* Page Title with Icon */}
          <div className="flex items-center gap-3">
            {Icon && (
              <div className="p-2 bg-primary/10 rounded-lg transition-all duration-200 hover:bg-primary/20 hover:scale-110">
                <Icon className="h-5 w-5 text-primary" />
              </div>
            )}
            <h1 className="text-xl font-semibold text-foreground" data-testid="text-page-title">
              {title}
            </h1>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Announcements Notification */}
          <DropdownMenu open={isAnnouncementsOpen} onOpenChange={setIsAnnouncementsOpen}>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="relative hover:bg-accent/50 transition-colors"
                data-testid="button-announcements"
              >
                <Bell className="h-5 w-5" />
                {hasUnreadAnnouncements && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full flex items-center justify-center shadow-sm">
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
                {announcements.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">
                    <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Nenhum aviso ativo</p>
                  </div>
                ) : (
                  announcements
                    .filter((announcement: Announcement) => announcement.isActive)
                    .slice(0, 5)
                    .map((announcement: Announcement) => {
                      const getPriorityColor = (priority: string) => {
                        switch (priority) {
                          case 'high': return 'bg-red-500';
                          case 'medium': return 'bg-yellow-500';
                          case 'low': return 'bg-green-500';
                          default: return 'bg-blue-500';
                        }
                      };

                      const getTimeAgo = (date: string) => {
                        const now = new Date();
                        const announcementDate = new Date(date);
                        const diffInHours = Math.floor((now.getTime() - announcementDate.getTime()) / (1000 * 60 * 60));
                        
                        if (diffInHours < 1) return 'Agora';
                        if (diffInHours < 24) return `Há ${diffInHours}h`;
                        const diffInDays = Math.floor(diffInHours / 24);
                        if (diffInDays < 7) return `Há ${diffInDays} dias`;
                        return announcementDate.toLocaleDateString('pt-BR');
                      };

                      return (
                        <div key={announcement.id} className="p-4 border-b border-border hover:bg-accent cursor-pointer">
                          <div className="flex items-start space-x-3">
                            <div className={`w-2 h-2 ${getPriorityColor(announcement.priority)} rounded-full mt-2 flex-shrink-0`}></div>
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-1">
                                <h4 className="font-medium text-foreground text-sm">
                                  {announcement.title}
                                </h4>
                                <Badge variant={announcement.priority === 'high' ? 'destructive' : announcement.priority === 'medium' ? 'default' : 'secondary'} className="text-xs">
                                  {announcement.priority === 'high' ? 'Alta' : announcement.priority === 'medium' ? 'Média' : 'Baixa'}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                {announcement.content}
                              </p>
                              <div className="flex items-center space-x-3 mt-2">
                                <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                                  <UserIcon className="h-3 w-3" />
                                  <span>{announcement.author?.name || 'Sistema'}</span>
                                </div>
                                <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                                  <Calendar className="h-3 w-3" />
                                  <span>{getTimeAgo(announcement.createdAt)}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                )}
              </div>
              {announcements.length > 0 && (
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
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Profile Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                className="flex items-center space-x-2 hover:bg-accent/50 transition-colors rounded-lg"
                data-testid="button-profile-dropdown"
              >
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center shadow-sm">
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
                Meu Perfil
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsSettingsModalOpen(true)} data-testid="menu-item-settings">
                <Settings className="mr-2 h-4 w-4" />
                Configurações
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} data-testid="menu-item-logout">
                <LogOut className="mr-2 h-4 w-4" />
                Sair
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
