import { useState } from 'react';
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

interface NewConversationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NewConversationModal({ isOpen, onClose }: NewConversationModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');

  const handleStartConversation = () => {
    if (contactName && contactPhone) {
      console.log('Starting conversation with:', { contactName, contactPhone });
      // In a real app, this would call the API to create a new conversation
      onClose();
      // Reset form
      setSearchTerm('');
      setContactName('');
      setContactPhone('');
    }
  };

  const handleClose = () => {
    onClose();
    // Reset form
    setSearchTerm('');
    setContactName('');
    setContactPhone('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]" data-testid="modal-new-conversation">
        <DialogHeader>
          <DialogTitle>New Conversation</DialogTitle>
          <DialogDescription>
            Search for an existing contact or add a new one to start a conversation.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="search">Search Existing Contact</Label>
            <Input
              id="search"
              placeholder="Search by name or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              data-testid="input-search-contact"
            />
          </div>
          
          <div className="text-center text-muted-foreground">or</div>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="contactName">Add New Contact</Label>
              <Input
                id="contactName"
                placeholder="Contact name"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                data-testid="input-contact-name"
              />
            </div>
            <div className="space-y-2">
              <Input
                placeholder="Phone number"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                data-testid="input-contact-phone"
              />
            </div>
          </div>
        </div>
        
        <div className="flex justify-end space-x-3">
          <Button variant="outline" onClick={handleClose} data-testid="button-cancel-conversation">
            Cancel
          </Button>
          <Button
            onClick={handleStartConversation}
            disabled={!contactName || !contactPhone}
            data-testid="button-start-conversation"
          >
            Start Conversation
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
