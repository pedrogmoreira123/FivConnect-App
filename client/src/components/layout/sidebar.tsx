import { Link, useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { useSettings } from '@/contexts/settings-context';
import { useT } from '@/hooks/use-translation';
import { Button } from '@/components/ui/button';
import { 
  BarChart3, 
  MessageCircle, 
  List, 
  Users, 
  Bot, 
  FileBarChart, 
  Settings,
  LogOut,
  TrendingUp,
  Building2
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
      { nameKey: 'navigation.reports', href: '/reports', icon: FileBarChart },
      { nameKey: 'navigation.enhancedReports', href: '/enhanced-reports', icon: TrendingUp },
      { nameKey: 'navigation.settings', href: '/settings', icon: Settings },
      ...(userRole === 'admin' ? [
        { nameKey: 'navigation.backoffice', href: '/backoffice', icon: Building2 }
      ] : [])
    ]
  }
];

export default function Sidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const { settings } = useSettings();
  const { t } = useT();

  const navigationItems = getNavigationItems(user?.role || 'agent');

  const handleLogout = () => {
    if (window.confirm(t('auth.logoutConfirm'))) {
      logout();
    }
  };

  return (
    <div className="w-64 bg-sidebar border-r border-sidebar-border flex flex-col">
      {/* Company Header */}
      <div className="p-6 border-b border-sidebar-border">
        <h2 className="text-xl font-bold text-sidebar-foreground" data-testid="text-company-name">
          {settings.companyName}
        </h2>
        <p className="text-sm text-muted-foreground">{t('navigation.customerService')}</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 sidebar-nav">
        {navigationItems.map((section) => (
          <div key={section.sectionKey} className="mb-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              {t(section.sectionKey)}
            </p>
            {section.items.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.href || 
                (item.href !== '/' && location.startsWith(item.href));
              const itemName = t(item.nameKey);
              
              return (
                <Link
                  key={item.nameKey}
                  href={item.href}
                  className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive 
                      ? 'active bg-sidebar-primary text-sidebar-primary-foreground' 
                      : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                  }`}
                  data-testid={`link-${(itemName || '').toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <Icon className="mr-3 w-5 h-5" />
                  {itemName}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Profile Section */}
      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center space-x-3 mb-3">
          <div className="w-8 h-8 bg-sidebar-primary rounded-full flex items-center justify-center">
            <span className="text-sidebar-primary-foreground text-sm font-medium" data-testid="text-user-initials">
              {user?.initials}
            </span>
          </div>
          <div>
            <p className="text-sm font-medium text-sidebar-foreground" data-testid="text-user-name">
              {user?.name}
            </p>
            <p className="text-xs text-muted-foreground" data-testid="text-user-role">
              {user?.role === 'admin' ? t('users.admin') : 
               user?.role === 'supervisor' ? t('users.supervisor') : t('users.agent')}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className="w-full justify-start px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-sidebar-accent"
          data-testid="button-logout"
        >
          <LogOut className="mr-2 h-4 w-4" />
          {t('common.logout')}
        </Button>
      </div>
    </div>
  );
}
