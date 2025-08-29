import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import QueueModal from '@/components/modals/queue-modal';
import { mockQueues } from '@/lib/mock-data';
import { QueueData } from '@/types';
import { Plus, Edit, Trash2 } from 'lucide-react';

export default function QueuesPage() {
  const [queues] = useState<QueueData[]>(mockQueues);
  const [isQueueModalOpen, setIsQueueModalOpen] = useState(false);
  const [selectedQueue, setSelectedQueue] = useState<QueueData | undefined>();

  const handleEditQueue = (queue: QueueData) => {
    setSelectedQueue(queue);
    setIsQueueModalOpen(true);
  };

  const handleDeleteQueue = (queueId: string) => {
    if (window.confirm('Are you sure you want to delete this queue?')) {
      console.log('Delete queue:', queueId);
      // In a real app, this would call the API to delete the queue
    }
  };

  const handleAddQueue = () => {
    setSelectedQueue(undefined);
    setIsQueueModalOpen(true);
  };

  return (
    <>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-foreground">Queue Management</h2>
          <Button onClick={handleAddQueue} data-testid="button-add-queue">
            <Plus className="mr-2 h-4 w-4" />
            Add Queue
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Queue Name</TableHead>
                  <TableHead>Working Hours</TableHead>
                  <TableHead>Active Conversations</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {queues.map((queue) => (
                  <TableRow key={queue.id} data-testid={`queue-row-${queue.id}`}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-foreground" data-testid={`text-queue-name-${queue.id}`}>
                          {queue.name}
                        </p>
                        <p className="text-sm text-muted-foreground" data-testid={`text-queue-description-${queue.id}`}>
                          {queue.description}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-foreground" data-testid={`text-queue-hours-${queue.id}`}>
                      {queue.workingHours}
                    </TableCell>
                    <TableCell className="text-sm text-foreground" data-testid={`text-queue-conversations-${queue.id}`}>
                      {queue.activeConversations}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={queue.isActive ? "default" : "secondary"}
                        data-testid={`badge-queue-status-${queue.id}`}
                      >
                        {queue.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditQueue(queue)}
                          data-testid={`button-edit-queue-${queue.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteQueue(queue.id)}
                          className="text-destructive hover:text-destructive"
                          data-testid={`button-delete-queue-${queue.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <QueueModal
        isOpen={isQueueModalOpen}
        onClose={() => setIsQueueModalOpen(false)}
        queue={selectedQueue}
      />
    </>
  );
}
