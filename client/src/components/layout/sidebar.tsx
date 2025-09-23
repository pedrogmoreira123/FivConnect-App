import { Link, useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { useSettings } from '@/contexts/settings-context';
import { useT } from '@/hooks/use-translation';
import { useFeedbackNotifications } from '@/hooks/use-feedback-notifications';
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
  Building2,
  AlertCircle,
  MessageSquare,
  DollarSign
} from 'lucide-react';

const getNavigationItems = (userRole: string) => [
  {
    sectionKey: 'navigation.main',
    items: [
      { nameKey: 'navigation.dashboard', href: '/', icon: BarChart3 },
      { nameKey: 'navigation.conversations', href: '/conversations', icon: MessageCircle },
      { nameKey: 'navigation.tickets', href: '/tickets', icon: AlertCircle },
      { nameKey: 'navigation.clients', href: '/clients', icon: Users },
      { nameKey: 'navigation.queues', href: '/queues', icon: List },
    ]
  },
  {
    sectionKey: 'navigation.management',
    items: [
      { nameKey: 'navigation.users', href: '/users', icon: Users, adminOnly: true },
      { nameKey: 'navigation.chatBot', href: '/ai-agent', icon: Bot },
      { nameKey: 'navigation.reports', href: '/enhanced-reports', icon: TrendingUp },
      { nameKey: 'navigation.financeiro', href: '/financeiro', icon: DollarSign },
      { nameKey: 'navigation.settings', href: '/settings', icon: Settings },
      // 👇 ADICIONE ESTA LINHA ABAIXO 👇
      { nameKey: 'navigation.admin', href: '/admin', icon: Building2, superadminOnly: true },
    ]
  }
];

export default function Sidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const { settings } = useSettings();
  const { t } = useT();
  const { shouldShowNotifications, pendingCount } = useFeedbackNotifications();

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
      <nav className="flex-1 p-4 space-y-6 sidebar-nav">
        {navigationItems.map((section) => (
          <div key={section.sectionKey}>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              {t(section.sectionKey)}
            </p>
            {section.items
              .filter((item) => {
                // Filter out admin-only items for non-admin/superadmin users
                if ('adminOnly' in item && item.adminOnly && user?.role !== 'admin' && user?.role !== 'superadmin') {
                  return false;
                }
                // Filter out superadmin-only items for non-superadmin users
                if ('superadminOnly' in item && item.superadminOnly && user?.role !== 'superadmin') {
                  return false;
                }
                return true;
              })
              .map((item) => {
              const Icon = item.icon;
              const isActive = location === item.href || 
                (item.href !== '/' && location.startsWith(item.href));
              const itemName = t(item.nameKey);
              
              return (
                <Link
                  key={item.nameKey}
                  href={item.href}
                  className={`flex items-center justify-between px-3 py-3 rounded-lg text-sm font-medium transition-all duration-200 group ${
                    isActive 
                      ? 'active bg-sidebar-primary text-sidebar-primary-foreground shadow-sm' 
                      : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:translate-x-1'
                  }`}
                  data-testid={`link-${(itemName || '').toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <div className="flex items-center">
                    <Icon className={`mr-3 w-5 h-5 transition-transform ${isActive ? 'scale-110' : 'group-hover:scale-105'}`} />
                    {itemName}
                  </div>
                  {item.href === '/feedback' && shouldShowNotifications && pendingCount > 0 && (
                    <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] h-5 flex items-center justify-center">
                      {pendingCount}
                    </span>
                  )}
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
               user?.role === 'supervisor' ? t('users.supervisor') :
               user?.role === 'superadmin' ? 'Superadmin' : t('users.agent')}
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
