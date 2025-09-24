import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bell, Calendar, User } from 'lucide-react';

interface Announcement {
  id: string;
  title: string;
  content: string;
  authorId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  author?: {
    name: string;
  };
}

export default function AnnouncementsCard() {
  const { data: announcements = [], isLoading } = useQuery({
    queryKey: ['announcements'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/announcements');
      return response.json();
    }
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Bell className="h-5 w-5" />
            <span>Avisos</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (announcements.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Bell className="h-5 w-5" />
            <span>Avisos</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-muted-foreground">
            <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nenhum aviso ativo</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Bell className="h-5 w-5" />
          <span>Avisos</span>
          <Badge variant="secondary" className="ml-auto">
            {announcements.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {announcements.slice(0, 3).map((announcement: Announcement) => (
            <div key={announcement.id} className="border-l-4 border-l-primary pl-4 py-2">
              <h4 className="font-semibold text-foreground text-sm mb-1">
                {announcement.title}
              </h4>
              <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                {announcement.content}
              </p>
              <div className="flex items-center space-x-3 text-xs text-muted-foreground">
                <div className="flex items-center space-x-1">
                  <User className="h-3 w-3" />
                  <span>{announcement.author?.name || 'Sistema'}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Calendar className="h-3 w-3" />
                  <span>{new Date(announcement.createdAt).toLocaleDateString('pt-BR')}</span>
                </div>
              </div>
            </div>
          ))}
          {announcements.length > 3 && (
            <p className="text-xs text-muted-foreground text-center">
              +{announcements.length - 3} avisos adicionais
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
