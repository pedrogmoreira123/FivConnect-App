import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { QueueData } from '@/types';

interface QueueModalProps {
  isOpen: boolean;
  onClose: () => void;
  queue?: QueueData;
}

export default function QueueModal({ isOpen, onClose, queue }: QueueModalProps) {
  const [queueName, setQueueName] = useState('');
  const [workingDays, setWorkingDays] = useState('monday');
  const [workingHours, setWorkingHours] = useState('09:00-18:00');
  const [messageInsideHours, setMessageInsideHours] = useState('');
  const [messageOutsideHours, setMessageOutsideHours] = useState('');

  useEffect(() => {
    if (queue) {
      setQueueName(queue.name);
      setWorkingDays('monday');
      setWorkingHours('09:00-18:00');
      setMessageInsideHours('');
      setMessageOutsideHours('');
    } else {
      setQueueName('');
      setWorkingDays('monday');
      setWorkingHours('09:00-18:00');
      setMessageInsideHours('');
      setMessageOutsideHours('');
    }
  }, [queue, isOpen]);

  const handleSave = () => {
    const queueData = {
      name: queueName,
      workingDays,
      workingHours,
      messageInsideHours,
      messageOutsideHours
    };
    
    console.log(queue ? 'Updating queue:' : 'Creating queue:', queueData);
    // In a real app, this would call the API to save the queue
    onClose();
  };

  const handleClose = () => {
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[525px]" data-testid="modal-queue">
        <DialogHeader>
          <DialogTitle>{queue ? 'Edit Queue' : 'Add Queue'}</DialogTitle>
          <DialogDescription>
            Configure queue settings including working hours and messages.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="queueName">Queue Name</Label>
            <Input
              id="queueName"
              placeholder="Enter queue name"
              value={queueName}
              onChange={(e) => setQueueName(e.target.value)}
              data-testid="input-queue-name"
            />
          </div>
          
          <div className="space-y-2">
            <Label>Working Hours</Label>
            <div className="grid grid-cols-2 gap-3">
              <Select value={workingDays} onValueChange={setWorkingDays}>
                <SelectTrigger data-testid="select-working-days">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monday">Monday</SelectItem>
                  <SelectItem value="tuesday">Tuesday</SelectItem>
                  <SelectItem value="wednesday">Wednesday</SelectItem>
                  <SelectItem value="thursday">Thursday</SelectItem>
                  <SelectItem value="friday">Friday</SelectItem>
                  <SelectItem value="saturday">Saturday</SelectItem>
                  <SelectItem value="sunday">Sunday</SelectItem>
                </SelectContent>
              </Select>
              <Select value={workingHours} onValueChange={setWorkingHours}>
                <SelectTrigger data-testid="select-working-hours">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="09:00-18:00">09:00 - 18:00</SelectItem>
                  <SelectItem value="08:00-17:00">08:00 - 17:00</SelectItem>
                  <SelectItem value="24-hours">24 Hours</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="messageInsideHours">Message (Inside Hours)</Label>
            <Textarea
              id="messageInsideHours"
              className="h-20 resize-none"
              placeholder="Message for inside working hours"
              value={messageInsideHours}
              onChange={(e) => setMessageInsideHours(e.target.value)}
              data-testid="textarea-message-inside-hours"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="messageOutsideHours">Message (Outside Hours)</Label>
            <Textarea
              id="messageOutsideHours"
              className="h-20 resize-none"
              placeholder="Message for outside working hours"
              value={messageOutsideHours}
              onChange={(e) => setMessageOutsideHours(e.target.value)}
              data-testid="textarea-message-outside-hours"
            />
          </div>
        </div>
        
        <div className="flex justify-end space-x-3">
          <Button variant="outline" onClick={handleClose} data-testid="button-cancel-queue">
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!queueName}
            data-testid="button-save-queue"
          >
            Save Queue
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
