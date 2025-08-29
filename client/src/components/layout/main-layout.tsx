import { useLocation } from 'wouter';
import Sidebar from './sidebar';
import Header from './header';

interface MainLayoutProps {
  children: React.ReactNode;
}

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/conversations': 'Conversations',
  '/queues': 'Queue Management',
  '/users': 'User Management',
  '/ai-agent': 'A.I. Agent',
  '/reports': 'Reports',
  '/settings': 'Settings'
};

export default function MainLayout({ children }: MainLayoutProps) {
  const [location] = useLocation();
  const title = pageTitles[location] || 'Dashboard';

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
