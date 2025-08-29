import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ConversationData, MessageData } from '@/types';
import { Smile, Paperclip, Send } from 'lucide-react';

interface ChatAreaProps {
  conversation?: ConversationData;
  messages: MessageData[];
  onSendMessage: (message: string) => void;
}

export default function ChatArea({ conversation, messages, onSendMessage }: ChatAreaProps) {
  const [newMessage, setNewMessage] = useState('');

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      onSendMessage(newMessage);
      setNewMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        Select a conversation to start chatting
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Chat Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
            <span className="text-primary-foreground text-sm font-medium">
              {conversation.initials}
            </span>
          </div>
          <div>
            <p className="font-medium text-foreground" data-testid="text-selected-contact-name">
              {conversation.contactName}
            </p>
            <p className="text-sm text-muted-foreground" data-testid="text-selected-contact-phone">
              {conversation.contactPhone}
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-auto p-4 space-y-4" data-testid="chat-messages">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.direction === 'outgoing' ? 'justify-end' : ''}`}
            data-testid={`message-${message.id}`}
          >
            <div
              className={`chat-message max-w-xs px-4 py-2 rounded-lg ${
                message.direction === 'outgoing' ? 'sent' : 'received'
              }`}
            >
              <p className="text-sm" data-testid={`text-message-content-${message.id}`}>
                {message.content}
              </p>
              <span className="text-xs opacity-70" data-testid={`text-message-time-${message.id}`}>
                {message.timestamp}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Message Input */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="icon"
            data-testid="button-emoji"
          >
            <Smile className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            data-testid="button-attachment"
          >
            <Paperclip className="h-5 w-5" />
          </Button>
          <Input
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1"
            data-testid="input-message"
          />
          <Button
            onClick={handleSendMessage}
            disabled={!newMessage.trim()}
            data-testid="button-send-message"
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
