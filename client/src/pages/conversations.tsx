import { useState } from 'react';
import { Button } from '@/components/ui/button';
import ConversationList from '@/components/conversation/conversation-list';
import ChatArea from '@/components/conversation/chat-area';
import ContactHistoryComponent from '@/components/conversation/contact-history';
import NewConversationModal from '@/components/modals/new-conversation-modal';
import { 
  mockInProgressConversations, 
  mockQueueConversations, 
  mockMessages,
  mockContactHistory 
} from '@/lib/mock-data';
import { ConversationData, MessageData } from '@/types';
import { Plus } from 'lucide-react';

export default function ConversationsPage() {
  const [selectedConversation, setSelectedConversation] = useState<ConversationData>();
  const [isNewConversationModalOpen, setIsNewConversationModalOpen] = useState(false);
  const [messages] = useState<MessageData[]>(mockMessages);

  const handleSelectConversation = (conversation: ConversationData) => {
    setSelectedConversation(conversation);
  };

  const handleSendMessage = (message: string) => {
    // In a real app, this would send the message via API
    console.log('Sending message:', message);
  };

  return (
    <>
      <div className="h-full flex flex-col">
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-foreground">Conversations</h2>
            <Button
              onClick={() => setIsNewConversationModalOpen(true)}
              data-testid="button-new-conversation"
            >
              <Plus className="mr-2 h-4 w-4" />
              New Conversation
            </Button>
          </div>
        </div>

        <div className="flex-1 flex">
          {/* Left Panel - Conversation List */}
          <ConversationList
            inProgressConversations={mockInProgressConversations}
            queueConversations={mockQueueConversations}
            onSelectConversation={handleSelectConversation}
            selectedConversation={selectedConversation}
          />

          {/* Center Panel - Chat Area */}
          <ChatArea
            conversation={selectedConversation}
            messages={messages}
            onSendMessage={handleSendMessage}
          />

          {/* Right Panel - Contact History */}
          <ContactHistoryComponent history={mockContactHistory} />
        </div>
      </div>

      <NewConversationModal
        isOpen={isNewConversationModalOpen}
        onClose={() => setIsNewConversationModalOpen(false)}
      />
    </>
  );
}
