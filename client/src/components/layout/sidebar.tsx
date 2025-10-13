import { Link, useLocation } from 'wouter';
import { useState } from 'react';
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
  DollarSign,
  Bell,
  MessageSquare,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

const getNavigationItems = (userRole: string) => {
  const items = [
    {
      sectionKey: 'navigation.main',
      items: [
        { nameKey: 'navigation.dashboard', href: '/', icon: BarChart3 },
        { nameKey: 'navigation.tickets', href: '/tickets', icon: AlertCircle },
        { nameKey: 'navigation.conversations', href: '/conversations', icon: MessageCircle },
        { nameKey: 'navigation.clients', href: '/clients', icon: Users },
        { nameKey: 'navigation.reports', href: '/enhanced-reports', icon: TrendingUp },
      ]
    },
    {
      sectionKey: 'navigation.management',
      items: [
        { nameKey: 'navigation.users', href: '/users', icon: Users, adminOnly: true },
        { nameKey: 'navigation.chatBot', href: '/ai-agent', icon: Bot },
        { nameKey: 'navigation.financeiro', href: '/financeiro', icon: DollarSign },
        { nameKey: 'navigation.whatsappSettings', href: '/whatsapp-settings', icon: MessageSquare },
        { nameKey: 'navigation.settings', href: '/settings', icon: Settings },
      ]
    }
  ];

  // Only add administration section for superadmin users
  if (userRole === 'superadmin') {
    items.push({
      sectionKey: 'navigation.administration',
      items: [
        { nameKey: 'navigation.announcements', href: '/announcements', icon: Bell, superadminOnly: true },
        { nameKey: 'navigation.admin', href: '/admin', icon: Building2, superadminOnly: true },
      ]
    });
  }

  return items;
};

export default function Sidebar() {
  const [location] = useLocation();
  const [isExpanded, setIsExpanded] = useState(true);
  const { user, logout } = useAuth();
  const { settings } = useSettings();
  const { t } = useT();
  const { shouldShowNotifications, pendingCount } = useFeedbackNotifications();

  const companyLogo = (user as any)?.company?.logoUrl as string | undefined;
  const logoSrc = companyLogo || '/logo.svg';

  const navigationItems = getNavigationItems(user?.role || 'agent');

  const handleLogout = () => {
    if (window.confirm(t('auth.logoutConfirm'))) {
      logout();
    }
  };

  return (
    <div className={`bg-sidebar border-r border-sidebar-border flex flex-col transition-all duration-300 ${
      isExpanded ? 'w-80' : 'w-20'
    }`}>
      {/* Company Header */}
      <div className="p-6 border-b border-sidebar-border flex items-center justify-between">
        {isExpanded && (
          <div className="flex items-center justify-center flex-1">
            <img src={logoSrc} alt="Fi.V App" className="h-12 w-auto" />
          </div>
        )}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-2 hover:bg-sidebar-accent rounded-lg transition-colors"
          title={isExpanded ? "Recolher sidebar" : "Expandir sidebar"}
        >
          {isExpanded ? (
            <ChevronLeft className="h-5 w-5" />
          ) : (
            <ChevronRight className="h-5 w-5" />
          )}
        </button>
      </div>

      {/* Navigation */}
      {isExpanded ? (
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
      ) : (
        /* Navigation - Modo Recolhido (apenas ícones) */
        <nav className="flex-1 p-2 space-y-2">
          {navigationItems.map((section) => (
            section.items
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
                
                return (
                  <Link
                    key={item.nameKey}
                    href={item.href}
                    className={`flex items-center justify-center p-3 rounded-lg transition-all ${
                      isActive 
                        ? 'bg-sidebar-primary text-sidebar-primary-foreground' 
                        : 'text-sidebar-foreground hover:bg-sidebar-accent'
                    }`}
                    title={t(item.nameKey)}
                  >
                    <Icon className="w-5 h-5" />
                  </Link>
                );
              })
          ))}
        </nav>
      )}

      {/* Profile Section */}
      <div className="p-4 border-t border-sidebar-border">
        {isExpanded ? (
          <>
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
          </>
        ) : (
          /* Apenas avatar quando recolhido */
          <div className="flex justify-center">
            <div className="w-10 h-10 bg-sidebar-primary rounded-full flex items-center justify-center">
              <span className="text-sidebar-primary-foreground text-sm font-medium">
                {user?.initials}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
