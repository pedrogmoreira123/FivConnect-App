import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { useSettings } from '@/contexts/settings-context';
import { useThemeCustomization } from '@/contexts/theme-customization-context';
import { useT } from '@/hooks/use-translation';
import { 
  BarChart3, 
  MessageCircle, 
  List, 
  Users, 
  Bot, 
  TrendingUp,
  Settings,
  LogOut,
  X
} from 'lucide-react';

const getNavigationItems = (userRole: string) => [
  {
    sectionKey: 'navigation.main',
    items: [
      { nameKey: 'navigation.dashboard', href: '/', icon: BarChart3 },
      { nameKey: 'navigation.conversations', href: '/conversations', icon: MessageCircle },
      { nameKey: 'navigation.queues', href: '/queues', icon: List },
    ]
  },
  {
    sectionKey: 'navigation.management',
    items: [
      { nameKey: 'navigation.users', href: '/users', icon: Users },
      { nameKey: 'navigation.aiAgent', href: '/ai-agent', icon: Bot },
      { nameKey: 'navigation.reports', href: '/enhanced-reports', icon: TrendingUp },
      { nameKey: 'navigation.settings', href: '/settings', icon: Settings },
    ]
  }
];

interface MobileSidebarProps {
  onClose: () => void;
}

export default function MobileSidebar({ onClose }: MobileSidebarProps) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const { settings } = useSettings();
  const { branding } = useThemeCustomization();
  const { t } = useT();

  const navigationItems = getNavigationItems(user?.role || 'agent');

  const handleLogout = () => {
    if (window.confirm(t('auth.logoutConfirm'))) {
      logout();
    }
  };

  const handleLinkClick = () => {
    // Close sidebar when navigating on mobile
    onClose();
  };

  return (
    <div className="h-full bg-sidebar border-r border-sidebar-border flex flex-col">
      {/* Header with Close Button */}
      <div className="p-4 border-b border-sidebar-border flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {branding.logoUrl ? (
            <img 
              src={branding.logoUrl} 
              alt="Logo" 
              className="h-8 w-auto object-contain"
            />
          ) : (
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <MessageCircle className="h-5 w-5 text-primary-foreground" />
            </div>
          )}
          <div>
            <h2 className="text-lg font-semibold text-sidebar-foreground">
              {branding.companyName}
            </h2>
            <p className="text-xs text-sidebar-foreground/70">
              {t('navigation.customerService')}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="text-sidebar-foreground hover:bg-sidebar-accent"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-6 overflow-y-auto">
        {navigationItems.map((section) => (
          <div key={section.sectionKey}>
            <h3 className="text-xs font-semibold text-sidebar-foreground/70 uppercase tracking-wider mb-3">
              {t(section.sectionKey)}
            </h3>
            <div className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = location === item.href;
                
                return (
                  <Link key={item.href} href={item.href} onClick={handleLinkClick}>
                    <div
                      className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                          : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                      }`}
                      data-testid={`nav-mobile-${item.href}`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{t(item.nameKey)}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User Info & Logout */}
      <div className="p-4 border-t border-sidebar-border">
        <div className="mb-3">
          <p className="text-sm font-medium text-sidebar-foreground">
            {user?.name || 'Usuário'}
          </p>
          <p className="text-xs text-sidebar-foreground/70">
            {user?.role === 'admin' ? 'Administrador' : 
             user?.role === 'supervisor' ? 'Supervisor' : 'Agente'}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent"
          data-testid="logout-button-mobile"
        >
          <LogOut className="h-4 w-4 mr-2" />
          {t('auth.logout')}
        </Button>
      </div>
    </div>
  );
}