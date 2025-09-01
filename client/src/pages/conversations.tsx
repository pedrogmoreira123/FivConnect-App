import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useT } from '@/hooks/use-translation';
import { useMobile } from '@/hooks/use-mobile';
import { useSound } from '@/hooks/use-sound';
import { 
  MessageCircle, 
  Search, 
  MoreVertical,
  Send,
  Paperclip,
  Smile,
  ArrowLeft,
  Clock,
  Users,
  Plus,
  Volume2,
  VolumeX
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
    bgColor: 'bg-pink-500',
    type: 'active'
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
    bgColor: 'bg-blue-500',
    type: 'active'
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
    bgColor: 'bg-orange-500',
    type: 'active'
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
    bgColor: 'bg-pink-500',
    type: 'active'
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
    bgColor: 'bg-pink-500',
    type: 'active'
  }
];

const mockWaitingConversations = [
  {
    id: '6',
    contactName: 'Ana Silva',
    initials: 'AS',
    contactPhone: '551187654321',
    lastMessage: 'Aguardando atendimento...',
    timestamp: '29/08/2024 15:30',
    status: 'Em Espera',
    unreadCount: 2,
    bgColor: 'bg-amber-500',
    type: 'waiting'
  },
  {
    id: '7',
    contactName: 'Carlos Santos',
    initials: 'CS',
    contactPhone: '551198765432',
    lastMessage: 'Preciso de ajuda urgente',
    timestamp: '29/08/2024 14:45',
    status: 'Em Espera',
    unreadCount: 1,
    bgColor: 'bg-red-500',
    type: 'waiting'
  }
];

const mockContacts = [
  {
    id: '8',
    contactName: 'Maria Oliveira',
    initials: 'MO',
    contactPhone: '551123456789',
    lastMessage: '',
    timestamp: '',
    status: 'Inativo',
    unreadCount: 0,
    bgColor: 'bg-gray-500',
    type: 'contact'
  },
  {
    id: '9',
    contactName: 'João Pereira',
    initials: 'JP',
    contactPhone: '551987654321',
    lastMessage: '',
    timestamp: '',
    status: 'Inativo',
    unreadCount: 0,
    bgColor: 'bg-gray-500',
    type: 'contact'
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
  const [activeTab, setActiveTab] = useState('conversations');
  
  const { 
    playNotificationSound, 
    playWaitingSound, 
    stopWaitingSound, 
    soundSettings,
    updateSoundSettings 
  } = useSound();

  const handleSelectConversation = (conversation: typeof mockConversations[0]) => {
    setSelectedConversation(conversation);
    if (isMobile) {
      setShowChat(true);
    }
    
    // Play notification sound for new conversation
    playNotificationSound('conversation');
  };

  const handleBackToList = () => {
    setShowChat(false);
  };

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      // Handle send message logic here
      setNewMessage('');
      // Play notification sound for sent message
      playNotificationSound('conversation');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getFilteredData = () => {
    let data = [];
    switch (activeTab) {
      case 'conversations':
        data = mockConversations;
        break;
      case 'waiting':
        data = mockWaitingConversations;
        break;
      case 'contacts':
        data = mockContacts;
        break;
      default:
        data = mockConversations;
    }
    
    return data.filter(item =>
      item.contactName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.contactPhone.includes(searchQuery)
    );
  };
  
  const filteredData = getFilteredData();

  return (
    <div className="h-full flex bg-background">
      {/* Contact List - Left Panel */}
      {(!isMobile || !showChat) && (
        <div className="w-full md:w-80 border-r border-border flex flex-col bg-background">
          {/* Header */}
          <div className="p-3 sm:p-4 border-b border-border">
            <div className="flex items-center justify-between mb-3">
              <h1 className="text-base sm:text-lg font-semibold text-foreground">Chat</h1>
              <div className="flex items-center space-x-2">
                <Button
                  variant={soundSettings.muteConversations ? "destructive" : "ghost"}
                  size="sm"
                  onClick={() => updateSoundSettings({ muteConversations: !soundSettings.muteConversations })}
                  title={soundSettings.muteConversations ? "Som de conversas mutado" : "Mutar som de conversas"}
                  data-testid="button-mute-conversations"
                >
                  {soundSettings.muteConversations ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </Button>
                <Button
                  variant={soundSettings.muteWaiting ? "destructive" : "ghost"}
                  size="sm"
                  onClick={() => updateSoundSettings({ muteWaiting: !soundSettings.muteWaiting })}
                  title={soundSettings.muteWaiting ? "Som de espera mutado" : "Mutar som de espera"}
                  data-testid="button-mute-waiting"
                >
                  {soundSettings.muteWaiting ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                  <Clock className="h-3 w-3 ml-1" />
                </Button>
              </div>
            </div>
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
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-muted/20 h-auto">
              <TabsTrigger value="conversations" className="text-xs font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground p-1.5 sm:p-2">
                <MessageCircle className="h-3 w-3 mr-1" />
                <span className="hidden sm:inline text-xs">CONVERSAS</span>
                <span className="sm:hidden text-xs">CONV</span>
                {mockConversations.length > 0 && (
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {mockConversations.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="waiting" className="text-xs font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground p-1.5 sm:p-2">
                <Clock className="h-3 w-3 mr-1" />
                <span className="hidden sm:inline text-xs">ESPERA</span>
                <span className="sm:hidden text-xs">ESP</span>
                {mockWaitingConversations.length > 0 && (
                  <Badge variant="destructive" className="ml-1 text-xs">
                    {mockWaitingConversations.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="contacts" className="text-xs font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground p-1.5 sm:p-2">
                <Users className="h-3 w-3 mr-1" />
                <span className="hidden sm:inline text-xs">CONTATOS</span>
                <span className="sm:hidden text-xs">CONT</span>
                {mockContacts.length > 0 && (
                  <Badge variant="outline" className="ml-1 text-xs">
                    {mockContacts.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {/* Content based on active tab */}
            <TabsContent value="conversations" className="flex-1 overflow-auto mt-0">
              {filteredData.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-center">
                  <MessageCircle className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Nenhuma conversa ativa</p>
                </div>
              ) : (
                filteredData.map((conversation) => (
                  <div
                    key={conversation.id}
                    onClick={() => handleSelectConversation(conversation)}
                    className={`p-3 border-b border-border cursor-pointer hover:bg-accent transition-colors ${
                      selectedConversation.id === conversation.id ? 'bg-accent' : ''
                    }`}
                    data-testid={`conversation-${conversation.id}`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 ${conversation.bgColor} rounded-full flex items-center justify-center flex-shrink-0`}>
                        <span className="text-white font-medium text-xs">
                          {conversation.initials}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-medium text-sm text-foreground truncate">
                            {conversation.contactName}
                          </h3>
                          <span className="text-xs text-muted-foreground flex-shrink-0">
                            {conversation.timestamp.split(' ')[1] || ''}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-muted-foreground truncate">
                            {conversation.lastMessage || 'Sem mensagens'}
                          </p>
                          {conversation.unreadCount > 0 && (
                            <div className="bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-xs font-medium">
                              {conversation.unreadCount}
                            </div>
                          )}
                        </div>
                        <div className="mt-1">
                          <Badge variant={conversation.status === 'Atendendo' ? 'default' : 'secondary'} className="text-xs px-2 py-0.5">
                            {conversation.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </TabsContent>
            
            <TabsContent value="waiting" className="flex-1 overflow-auto mt-0">
              {filteredData.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-center">
                  <Clock className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Nenhuma conversa em espera</p>
                </div>
              ) : (
                filteredData.map((conversation) => (
                  <div
                    key={conversation.id}
                    onClick={() => handleSelectConversation(conversation)}
                    className={`p-3 border-b border-border cursor-pointer hover:bg-accent transition-colors ${
                      selectedConversation.id === conversation.id ? 'bg-accent' : ''
                    }`}
                    data-testid={`waiting-${conversation.id}`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 ${conversation.bgColor} rounded-full flex items-center justify-center flex-shrink-0 relative`}>
                        <span className="text-white font-medium text-xs">
                          {conversation.initials}
                        </span>
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-amber-500 rounded-full flex items-center justify-center">
                          <Clock className="h-2 w-2 text-white" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-medium text-sm text-foreground truncate">
                            {conversation.contactName}
                          </h3>
                          <span className="text-xs text-muted-foreground flex-shrink-0">
                            {conversation.timestamp.split(' ')[1]}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-muted-foreground truncate">
                            {conversation.lastMessage}
                          </p>
                          {conversation.unreadCount > 0 && (
                            <div className="bg-amber-500 text-white rounded-full px-2 py-0.5 text-xs font-medium">
                              {conversation.unreadCount}
                            </div>
                          )}
                        </div>
                        <div className="mt-1">
                          <Badge variant="outline" className="text-xs border-amber-500 text-amber-600 px-2 py-0.5">
                            {conversation.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </TabsContent>
            
            <TabsContent value="contacts" className="flex-1 overflow-auto mt-0">
              <div className="p-3 border-b border-border">
                <Button size="sm" className="w-full" data-testid="button-new-contact">
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Contato
                </Button>
              </div>
              {filteredData.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-center">
                  <Users className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Nenhum contato encontrado</p>
                </div>
              ) : (
                filteredData.map((contact) => (
                  <div
                    key={contact.id}
                    className="p-3 border-b border-border hover:bg-accent transition-colors cursor-pointer"
                    data-testid={`contact-${contact.id}`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 ${contact.bgColor} rounded-full flex items-center justify-center flex-shrink-0`}>
                        <span className="text-white font-medium text-xs">
                          {contact.initials}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-sm text-foreground truncate">
                          {contact.contactName}
                        </h3>
                        <p className="text-xs text-muted-foreground truncate">
                          {contact.contactPhone}
                        </p>
                        <Badge variant="outline" className="text-xs mt-1 px-2 py-0.5">
                          {contact.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </TabsContent>
          </Tabs>
        </div>
      )}

      {/* Chat Area - Right Panel */}
      {(!isMobile || showChat) && selectedConversation && (
        <div className="flex-1 flex flex-col bg-background">
          {/* Chat Header */}
          <div className="p-3 sm:p-4 border-b border-border bg-background">
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
          <div className="flex-1 overflow-auto p-3 sm:p-4 space-y-3 sm:space-y-4" data-testid="chat-messages">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.direction === 'outgoing' ? 'justify-end' : 'justify-start'}`}
                data-testid={`message-${message.id}`}
              >
                <div
                  className={`max-w-[85%] sm:max-w-xs lg:max-w-md px-3 sm:px-4 py-2 rounded-lg ${
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
          <div className="p-3 sm:p-4 border-t border-border bg-background">
            <div className="flex items-center space-x-1 sm:space-x-2">
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