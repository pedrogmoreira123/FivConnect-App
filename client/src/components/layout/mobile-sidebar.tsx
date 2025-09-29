import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { useSettings } from '@/contexts/settings-context';
import { useThemeCustomization } from '@/contexts/theme-customization-context';
import { useT } from '@/hooks/use-translation';
import { motion, PanInfo } from 'framer-motion';
import { 
  BarChart3, 
  MessageCircle, 
  List, 
  Users, 
  Bot, 
  TrendingUp,
  Settings,
  LogOut,
  X,
  AlertCircle,
  Bell,
  Building2
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

interface MobileSidebarProps {
  onClose: () => void;
  isOpen: boolean;
}

export default function MobileSidebar({ onClose, isOpen }: MobileSidebarProps) {
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

  const handleDrag = (event: any, info: PanInfo) => {
    // Close sidebar if dragged to the left by more than 100px with sufficient velocity
    if (info.offset.x < -100 && info.velocity.x < -500) {
      onClose();
    }
  };

  return (
    <motion.div 
      className="h-full bg-primary border-r border-primary-foreground/20 flex flex-col shadow-2xl"
      initial={{ x: -300 }}
      animate={{ x: isOpen ? 0 : -300 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      drag="x"
      dragConstraints={{ left: -300, right: 0 }}
      dragElastic={{ left: 0, right: 0.2 }}
      onDragEnd={handleDrag}
    >
      {/* Header with Close Button */}
      <div className="p-4 border-b border-primary-foreground/20 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {branding.logoUrl ? (
            <img 
              src={branding.logoUrl} 
              alt="Logo" 
              className="h-8 w-auto object-contain"
            />
          ) : (
            <div className="w-8 h-8 bg-primary-foreground rounded-lg flex items-center justify-center">
              <MessageCircle className="h-5 w-5 text-primary" />
            </div>
          )}
          <div>
            <h2 className="text-lg font-semibold text-primary-foreground">
              {branding.companyName}
            </h2>
            <p className="text-xs text-primary-foreground/70">
              {t('navigation.customerService')}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="text-primary-foreground hover:bg-primary-foreground/10"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-6 overflow-y-auto">
        {navigationItems.map((section) => (
          <div key={section.sectionKey}>
            <h3 className="text-xs font-semibold text-primary-foreground/70 uppercase tracking-wider mb-3">
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
                          ? 'bg-primary-foreground/20 text-primary-foreground'
                          : 'text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground'
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
      <div className="p-4 border-t border-primary-foreground/20">
        <div className="mb-3">
          <p className="text-sm font-medium text-primary-foreground">
            {user?.name || 'Usuário'}
          </p>
          <p className="text-xs text-primary-foreground/70">
            {user?.role === 'admin' ? 'Administrador' : 
             user?.role === 'supervisor' ? 'Supervisor' : 'Agente'}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className="w-full justify-start text-primary-foreground hover:bg-primary-foreground/10"
          data-testid="logout-button-mobile"
        >
          <LogOut className="h-4 w-4 mr-2" />
          {t('auth.logout')}
        </Button>
      </div>
    </motion.div>
  );
}