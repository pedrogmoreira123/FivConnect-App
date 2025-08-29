import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import Sidebar from './sidebar';
import MobileSidebar from './mobile-sidebar';
import Header from './header';
import { useT } from '@/hooks/use-translation';
import { useMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Menu } from 'lucide-react';

interface MainLayoutProps {
  children: React.ReactNode;
}

const pageTitleKeys: Record<string, string> = {
  '/': 'navigation.dashboard',
  '/conversations': 'navigation.conversations',
  '/queues': 'queues.title',
  '/users': 'users.title',
  '/ai-agent': 'navigation.aiAgent',
  '/reports': 'navigation.reports',
  '/settings': 'navigation.settings'
};

export default function MainLayout({ children }: MainLayoutProps) {
  const [location] = useLocation();
  const { t } = useT();
  const isMobile = useMobile();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const titleKey = pageTitleKeys[location] || 'navigation.dashboard';
  const title = t(titleKey);

  // Close mobile menu when switching to desktop
  useEffect(() => {
    if (!isMobile) {
      setMobileMenuOpen(false);
    }
  }, [isMobile]);

  return (
    <div className="min-h-screen flex bg-background">
      {/* Desktop Sidebar */}
      {!isMobile && <Sidebar />}
      
      {/* Mobile Sidebar Overlay */}
      {isMobile && mobileMenuOpen && (
        <>
          <div 
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 z-50 w-64 md:hidden">
            <MobileSidebar onClose={() => setMobileMenuOpen(false)} />
          </div>
        </>
      )}

      <div className="flex-1 flex flex-col">
        {/* Mobile Header */}
        {isMobile && (
          <div className="bg-background border-b border-border px-4 py-3 flex items-center justify-between md:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMobileMenuOpen(true)}
              data-testid="button-mobile-menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-semibold truncate">{title}</h1>
            <div className="w-10" /> {/* Spacer for centering */}
          </div>
        )}
        
        {/* Desktop Header */}
        {!isMobile && <Header title={title} />}
        
        <main className="flex-1 overflow-auto" data-testid="main-content">
          <div className="p-3 sm:p-4 md:p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
