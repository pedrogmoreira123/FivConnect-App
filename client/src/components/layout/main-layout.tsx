import { useLocation } from 'wouter';
import Sidebar from './sidebar';
import Header from './header';
import { useT } from '@/hooks/use-translation';

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
  const titleKey = pageTitleKeys[location] || 'navigation.dashboard';
  const title = t(titleKey);

  return (
    <div className="min-h-screen flex bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title={title} />
        <main className="flex-1 overflow-auto" data-testid="main-content">
          {children}
        </main>
      </div>
    </div>
  );
}
