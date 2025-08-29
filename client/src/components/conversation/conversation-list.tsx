import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ConversationData } from '@/types';

interface ConversationListProps {
  inProgressConversations: ConversationData[];
  queueConversations: ConversationData[];
  onSelectConversation: (conversation: ConversationData) => void;
  selectedConversation?: ConversationData;
}

type TabType = 'inProgress' | 'queue' | 'history';

export default function ConversationList({
  inProgressConversations,
  queueConversations,
  onSelectConversation,
  selectedConversation
}: ConversationListProps) {
  const [activeTab, setActiveTab] = useState<TabType>('inProgress');

  const handleTakeConversation = (conversation: ConversationData) => {
    // Move conversation from queue to in progress
    onSelectConversation(conversation);
  };

  const renderConversationItem = (conversation: ConversationData, showTakeButton = false) => (
    <div
      key={conversation.id}
      className={`p-4 border-b border-border hover:bg-accent cursor-pointer ${
        selectedConversation?.id === conversation.id ? 'bg-accent' : ''
      }`}
      onClick={() => onSelectConversation(conversation)}
      data-testid={`conversation-item-${conversation.id}`}
    >
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
          <span className="text-primary-foreground text-sm font-medium">
            {conversation.initials}
          </span>
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <p className="font-medium text-foreground" data-testid={`text-contact-name-${conversation.id}`}>
              {conversation.contactName}
            </p>
            <div className="flex items-center space-x-2">
              <span className="text-xs text-muted-foreground" data-testid={`text-time-${conversation.id}`}>
                {conversation.time}
              </span>
              {showTakeButton && (
                <Button
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTakeConversation(conversation);
                  }}
                  data-testid={`button-take-${conversation.id}`}
                >
                  Take
                </Button>
              )}
            </div>
          </div>
          <p className="text-sm text-muted-foreground truncate" data-testid={`text-last-message-${conversation.id}`}>
            {conversation.lastMessage}
          </p>
          {showTakeButton && (
            <p className="text-sm text-muted-foreground">Waiting for {conversation.time}</p>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="w-80 border-r border-border flex flex-col">
      {/* Tabs */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab('inProgress')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors conversation-tab ${
            activeTab === 'inProgress' 
              ? 'active text-foreground bg-primary/10 border-b-2 border-primary' 
              : 'text-muted-foreground hover:text-foreground hover:bg-accent'
          }`}
          data-testid="tab-in-progress"
        >
          In Progress ({inProgressConversations.length})
        </button>
        <button
          onClick={() => setActiveTab('queue')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors conversation-tab ${
            activeTab === 'queue' 
              ? 'active text-foreground bg-primary/10 border-b-2 border-primary' 
              : 'text-muted-foreground hover:text-foreground hover:bg-accent'
          }`}
          data-testid="tab-queue"
        >
          Queue ({queueConversations.length})
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors conversation-tab ${
            activeTab === 'history' 
              ? 'active text-foreground bg-primary/10 border-b-2 border-primary' 
              : 'text-muted-foreground hover:text-foreground hover:bg-accent'
          }`}
          data-testid="tab-history"
        >
          History
        </button>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-auto">
        {activeTab === 'inProgress' && (
          <div data-testid="tab-content-in-progress">
            {inProgressConversations.map((conversation) => 
              renderConversationItem(conversation)
            )}
          </div>
        )}

        {activeTab === 'queue' && (
          <div data-testid="tab-content-queue">
            {queueConversations.map((conversation) => 
              renderConversationItem(conversation, true)
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="p-4 text-center text-muted-foreground" data-testid="tab-content-history">
            History conversations (Admin only)
          </div>
        )}
      </div>
    </div>
  );
}
