import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useT } from '@/hooks/use-translation';
import { useMobile } from '@/hooks/use-mobile';
import { 
  MessageCircle, 
  Search, 
  MoreVertical,
  Send,
  Paperclip,
  Smile,
  ArrowLeft 
} from 'lucide-react';

// Mock data
const mockConversations = [
  {
    id: '1',
    contactName: 'Pedrito Pão Quente',
    initials: 'PP',
    contactPhone: '551199012500',
    lastMessage: 'Oi',
    timestamp: '28/08/2024 13:08',
    status: 'Atendendo',
    unreadCount: 1,
    bgColor: 'bg-pink-500'
  },
  {
    id: '2',
    contactName: 'Kãitã Sartori',
    initials: 'KS',
    contactPhone: '551129404727',
    lastMessage: 'Lúcas',
    timestamp: '28/08/2024 16:40',
    status: 'Suporte Técnico',
    unreadCount: 0,
    bgColor: 'bg-blue-500'
  },
  {
    id: '3',
    contactName: 'Everton - Impeotto',
    initials: 'EI',
    contactPhone: '551199012500',
    lastMessage: 'Foto',
    timestamp: '28/08/2024 16:44',
    status: 'Atendendo',
    unreadCount: 0,
    bgColor: 'bg-orange-500'
  },
  {
    id: '4',
    contactName: 'Tatiana - Biasa Confeitaria',
    initials: 'TB',
    contactPhone: '551790235576',
    lastMessage: 'conversa iniciada por Guilherme',
    timestamp: '29/08/2024 16:40',
    status: 'Atendendo',
    unreadCount: 0,
    bgColor: 'bg-pink-500'
  },
  {
    id: '5',
    contactName: 'Paulo - PastRão',
    initials: 'PP',
    contactPhone: '555599201585',
    lastMessage: 'Bom dia',
    timestamp: '29/08/2024 10:09',
    status: 'Atendendo',
    unreadCount: 0,
    bgColor: 'bg-pink-500'
  }
];

const mockMessages = [
  {
    id: '1',
    content: 'Olá! Como posso ajudá-lo hoje?',
    direction: 'outgoing' as const,
    timestamp: '14:30',
    status: 'read'
  },
  {
    id: '2', 
    content: 'Oi, gostaria de informações sobre os produtos',
    direction: 'incoming' as const,
    timestamp: '14:32',
    status: 'read'
  },
  {
    id: '3',
    content: 'Claro! Temos várias opções disponíveis. Que tipo de produto você está procurando?',
    direction: 'outgoing' as const,
    timestamp: '14:33',
    status: 'read'
  }
];

export default function ConversationsPage() {
  const { t } = useT();
  const isMobile = useMobile();
  const [selectedConversation, setSelectedConversation] = useState(mockConversations[0]);
  const [messages] = useState(mockMessages);
  const [newMessage, setNewMessage] = useState('');
  const [showChat, setShowChat] = useState(!isMobile);
  const [searchQuery, setSearchQuery] = useState('');

  const handleSelectConversation = (conversation: typeof mockConversations[0]) => {
    setSelectedConversation(conversation);
    if (isMobile) {
      setShowChat(true);
    }
  };

  const handleBackToList = () => {
    setShowChat(false);
  };

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      // Handle send message logic here
      setNewMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const filteredConversations = mockConversations.filter(conv =>
    conv.contactName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.contactPhone.includes(searchQuery)
  );

  return (
    <div className="h-full flex bg-background">
      {/* Contact List - Left Panel */}
      {(!isMobile || !showChat) && (
        <div className="w-full md:w-80 border-r border-border flex flex-col bg-background">
          {/* Header */}
          <div className="p-4 border-b border-border">
            <h1 className="text-xl font-semibold text-foreground mb-3">Chat</h1>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Pesquisar Conversas"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search-conversations"
              />
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-border">
            <button className="flex-1 px-4 py-3 text-sm font-medium text-primary bg-primary/10 border-b-2 border-primary">
              <span className="text-primary">● CONVERSAS</span>
            </button>
            <button className="flex-1 px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground">
              ESPERA
            </button>
            <button className="flex-1 px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground">
              CONTATOS
            </button>
          </div>

          {/* Conversation List */}
          <div className="flex-1 overflow-auto">
            {filteredConversations.map((conversation) => (
              <div
                key={conversation.id}
                onClick={() => handleSelectConversation(conversation)}
                className={`p-4 border-b border-border cursor-pointer hover:bg-accent transition-colors ${
                  selectedConversation.id === conversation.id ? 'bg-accent' : ''
                }`}
                data-testid={`conversation-${conversation.id}`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-12 h-12 ${conversation.bgColor} rounded-full flex items-center justify-center flex-shrink-0`}>
                    <span className="text-white font-semibold text-sm">
                      {conversation.initials}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-semibold text-foreground truncate">
                        {conversation.contactName}
                      </h3>
                      <span className="text-xs text-muted-foreground flex-shrink-0">
                        {conversation.timestamp.split(' ')[1]}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground truncate">
                        {conversation.lastMessage}
                      </p>
                      {conversation.unreadCount > 0 && (
                        <div className="bg-primary text-primary-foreground rounded-full px-2 py-1 text-xs font-medium">
                          {conversation.unreadCount}
                        </div>
                      )}
                    </div>
                    <div className="mt-1">
                      <span className="inline-block bg-yellow-500 text-white text-xs px-2 py-1 rounded">
                        {conversation.status}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Chat Area - Right Panel */}
      {(!isMobile || showChat) && selectedConversation && (
        <div className="flex-1 flex flex-col bg-background">
          {/* Chat Header */}
          <div className="p-4 border-b border-border bg-background">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {isMobile && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleBackToList}
                    data-testid="button-back-to-list"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                )}
                <div className={`w-10 h-10 ${selectedConversation.bgColor} rounded-full flex items-center justify-center`}>
                  <span className="text-white font-semibold text-sm">
                    {selectedConversation.initials}
                  </span>
                </div>
                <div>
                  <h2 className="font-semibold text-foreground">
                    {selectedConversation.contactName}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {selectedConversation.contactPhone}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Button variant="ghost" size="sm" data-testid="button-more-options">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-auto p-4 space-y-4" data-testid="chat-messages">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.direction === 'outgoing' ? 'justify-end' : 'justify-start'}`}
                data-testid={`message-${message.id}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    message.direction === 'outgoing'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-foreground'
                  }`}
                >
                  <p className="text-sm">{message.content}</p>
                  <div className="flex items-center justify-end mt-1 space-x-1">
                    <span className="text-xs opacity-70">{message.timestamp}</span>
                    {message.direction === 'outgoing' && (
                      <div className="text-xs opacity-70">✓✓</div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Message Input */}
          <div className="p-4 border-t border-border bg-background">
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="sm" data-testid="button-emoji">
                <Smile className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="sm" data-testid="button-attachment">
                <Paperclip className="h-5 w-5" />
              </Button>
              <Input
                placeholder="Digite uma mensagem..."
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
      )}

      {/* Empty State - Desktop */}
      {!isMobile && !showChat && (
        <div className="flex-1 flex items-center justify-center bg-background">
          <div className="text-center">
            <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageCircle className="h-12 w-12 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Tudo Tranquilo!
            </h3>
            <p className="text-muted-foreground">
              Que tal começar um atendimento?<br />
              Selecione um contato para iniciar
            </p>
          </div>
        </div>
      )}
    </div>
  );
}