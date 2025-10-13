export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  messageType: 'text' | 'image' | 'video' | 'audio' | 'voice' | 'document' | 'sticker' | 'location' | 'contact' | 'reaction' | 'gif' | 'short_video' | 'link_preview' | 'poll' | 'interactive';
  direction: 'incoming' | 'outgoing';
  status?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  mediaUrl?: string;
  caption?: string;
  fileName?: string;
  quotedMessageId?: string;
  metadata?: {
    whapiMessageId?: string;
    originalMessageId?: string;
    emoji?: string;
    latitude?: number;
    longitude?: number;
    address?: string;
    name?: string;
    contactName?: string;
    contactPhone?: string;
  };
  sentAt: string;
  createdAt: string;
  updatedAt: string;
}
