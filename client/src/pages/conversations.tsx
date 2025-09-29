import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useT } from '@/hooks/use-translation';
import { useMobile } from '@/hooks/use-mobile';
import { useSound } from '@/hooks/use-sound';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
  VolumeX,
  Zap,
  X,
  FileImage,
  File,
  CheckCircle2,
  Circle
} from 'lucide-react';

// Real data integration
export default function ConversationsPage() {
  const { t } = useT();
  const isMobile = useMobile();
  const queryClient = useQueryClient();
  // Fetch real conversations data
  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ['conversations'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/conversations');
      return response.json();
    }
  });

  // State for UI
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('active');
  const [newMessage, setNewMessage] = useState('');
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  // Filter conversations based on search and tab
  const filteredConversations = conversations.filter(conv => {
    const matchesSearch = conv.contactName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         conv.contactPhone.includes(searchTerm);
    const matchesTab = activeTab === 'active' ? conv.type === 'active' :
                      activeTab === 'waiting' ? conv.type === 'waiting' :
                      activeTab === 'contacts' ? conv.type === 'contact' : true;
    return matchesSearch && matchesTab;
  });

  // Fetch messages for selected conversation
  const { data: messages = [] } = useQuery({
    queryKey: ['messages', selectedConversation?.id],
    queryFn: async () => {
      if (!selectedConversation?.id) return [];
      const response = await apiRequest('GET', `/api/conversations/${selectedConversation.id}/messages`);
      return response.json();
    },
    enabled: !!selectedConversation?.id
  });
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [fileUpload, setFileUpload] = useState<File | null>(null);
  
  const { 
    playNotificationSound, 
    playWaitingSound, 
    stopWaitingSound, 
    soundSettings,
    updateSoundSettings 
  } = useSound();

  // Fetch quick replies
  const { data: quickReplies = [] } = useQuery({
    queryKey: ['/api/quick-replies'],
    queryFn: async () => {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/quick-replies', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch quick replies');
      return response.json();
    },
  });

  const handleSelectConversation = (conversation: any) => {
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

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    try {
      // Send message via WhatsApp API
      const response = await apiRequest('POST', `/api/conversations/${selectedConversation.id}/send-message`, {
        text: newMessage.trim(),
        to: selectedConversation.contactPhone
      });

      if (response.ok) {
        // Clear input and close quick replies
        setNewMessage('');
        setShowQuickReplies(false);
        
        // Play notification sound for sent message
        playNotificationSound('conversation');
        
        // Refresh messages to show the sent message
        queryClient.invalidateQueries({ queryKey: ['messages', selectedConversation.id] });
      } else {
        throw new Error('Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      // You could add a toast notification here for user feedback
    }
  };

  const handleQuickReply = (message: string) => {
    setNewMessage(message);
    setShowQuickReplies(false);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setFileUpload(file);
      // Handle file upload logic here
      console.log('File selected:', file.name);
    }
  };

  const toggleMessageRead = (messageId: string) => {
    // Toggle message read/unread status
    console.log('Toggle message read status:', messageId);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    } else if (e.key === '/' && newMessage === '') {
      e.preventDefault();
      setShowQuickReplies(true);
    } else if (e.key === 'Escape') {
      setShowQuickReplies(false);
    }
  };

  // Close quick replies when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      if (showQuickReplies) {
        setShowQuickReplies(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showQuickReplies]);

  const getFilteredData = () => {
    let data = [];
    switch (activeTab) {
      case 'conversations':
        data = conversations;
        break;
      case 'waiting':
        data = conversations.filter(conv => conv.type === 'waiting');
        break;
      case 'contacts':
        data = conversations.filter(conv => conv.type === 'contact');
        break;
      default:
        data = conversations;
    }
    
    return data.filter(item =>
      item.contactName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.contactPhone.includes(searchTerm)
    );
  };
  
  const filteredData = getFilteredData();

  return (
    <div className="h-screen flex bg-background overflow-hidden">
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
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
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
                {conversations.length > 0 && (
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {conversations.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="waiting" className="text-xs font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground p-1.5 sm:p-2">
                <Clock className="h-3 w-3 mr-1" />
                <span className="hidden sm:inline text-xs">ESPERA</span>
                <span className="sm:hidden text-xs">ESP</span>
                {conversations.filter(conv => conv.type === 'waiting').length > 0 && (
                  <Badge variant="destructive" className="ml-1 text-xs">
                    {conversations.filter(conv => conv.type === 'waiting').length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="contacts" className="text-xs font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground p-1.5 sm:p-2">
                <Users className="h-3 w-3 mr-1" />
                <span className="hidden sm:inline text-xs">CONTATOS</span>
                <span className="sm:hidden text-xs">CONT</span>
                {conversations.filter(conv => conv.type === 'contact').length > 0 && (
                  <Badge variant="outline" className="ml-1 text-xs">
                    {conversations.filter(conv => conv.type === 'contact').length}
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
        <div className="flex-1 flex flex-col bg-background h-full">
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
          <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-4 space-y-3 sm:space-y-4 min-h-0" data-testid="chat-messages">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.direction === 'outgoing' ? 'justify-end' : 'justify-start'} group`}
                data-testid={`message-${message.id}`}
              >
                <div className={`relative max-w-[85%] sm:max-w-xs lg:max-w-md`}>
                  <div
                    className={`px-3 sm:px-4 py-3 rounded-2xl shadow-sm transition-all duration-200 group-hover:shadow-md ${
                      message.direction === 'outgoing'
                        ? 'bg-primary text-primary-foreground rounded-br-md'
                        : 'bg-card text-card-foreground border border-border rounded-bl-md'
                    }`}
                  >
                    <p className="text-sm leading-relaxed">{message.content}</p>
                    <div className="flex items-center justify-end mt-2 space-x-2">
                      <span className="text-xs opacity-70">{message.timestamp}</span>
                      {message.direction === 'outgoing' && (
                        <div className="flex items-center space-x-1">
                          {message.status === 'read' ? (
                            <CheckCircle2 className="h-3 w-3 opacity-70" />
                          ) : (
                            <Circle className="h-3 w-3 opacity-70" />
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Message actions - visible on hover */}
                  <div className={`absolute top-0 ${message.direction === 'outgoing' ? 'left-0 -translate-x-full' : 'right-0 translate-x-full'} opacity-0 group-hover:opacity-100 transition-opacity`}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 ml-2"
                      onClick={() => toggleMessageRead(message.id)}
                    >
                      {message.status === 'read' ? <CheckCircle2 className="h-3 w-3" /> : <Circle className="h-3 w-3" />}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Message Input */}
          <div className="flex-shrink-0 border-t border-border bg-background relative">
            {/* Quick replies dropdown */}
            {showQuickReplies && quickReplies.length > 0 && (
              <div className="absolute bottom-full left-0 right-0 z-10 mb-1">
                <Card className="mx-3 sm:mx-4 shadow-lg">
                  <CardContent className="p-2">
                    <div className="flex items-center justify-between mb-2 px-2">
                      <div className="flex items-center space-x-2">
                        <Zap className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium">Respostas Rápidas</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => setShowQuickReplies(false)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                    <ScrollArea className="max-h-32">
                      <div className="space-y-1">
                        {quickReplies.slice(0, 5).map((reply: any) => (
                          <button
                            key={reply.id}
                            onClick={() => handleQuickReply(reply.message)}
                            className="w-full text-left p-2 rounded-md hover:bg-accent transition-colors"
                          >
                            <div className="flex items-center space-x-2">
                              <Badge variant="secondary" className="text-xs font-mono">/{reply.shortcut}</Badge>
                              <span className="text-sm truncate">{reply.message}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>
            )}
            
            {/* Input area */}
            <div className="p-3 sm:p-4">
              {/* File preview */}
              {fileUpload && (
                <div className="mb-3 p-3 bg-accent rounded-lg flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {fileUpload.type.startsWith('image/') ? (
                      <FileImage className="h-4 w-4 text-primary" />
                    ) : (
                      <File className="h-4 w-4 text-primary" />
                    )}
                    <span className="text-sm font-medium">{fileUpload.name}</span>
                    <span className="text-xs text-muted-foreground">({(fileUpload.size / 1024).toFixed(1)} KB)</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => setFileUpload(null)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
              
              {/* Input row */}
              <div className="flex items-end space-x-2 w-full">
                <div className="flex space-x-1 flex-shrink-0">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-10 w-10 p-0 touch-manipulation min-h-[48px] sm:min-h-[unset] sm:h-10 sm:w-10" 
                    data-testid="button-emoji"
                  >
                    <Smile className="h-4 w-4 sm:h-5 sm:w-5" />
                  </Button>
                  
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-10 w-10 p-0 touch-manipulation min-h-[48px] sm:min-h-[unset] sm:h-10 sm:w-10" 
                    data-testid="button-attachment"
                    onClick={() => document.getElementById('file-input')?.click()}
                  >
                    <Paperclip className="h-4 w-4 sm:h-5 sm:w-5" />
                  </Button>
                  <input
                    id="file-input"
                    type="file"
                    className="hidden"
                    accept="image/*,audio/*,video/*,.pdf,.doc,.docx"
                    onChange={handleFileUpload}
                  />
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-10 w-10 p-0 touch-manipulation min-h-[48px] sm:min-h-[unset] sm:h-10 sm:w-10"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowQuickReplies(!showQuickReplies);
                    }}
                    data-testid="button-quick-replies"
                  >
                    <Zap className="h-4 w-4 sm:h-5 sm:w-5" />
                  </Button>
                </div>
                
                <div className="flex-1 min-w-0">
                  <Input
                    placeholder="Digite uma mensagem ou / para respostas rápidas..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="min-h-[48px] sm:min-h-[unset]"
                    data-testid="input-message"
                  />
                </div>
                
                <Button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() && !fileUpload}
                  className="h-10 w-10 p-0 flex-shrink-0 touch-manipulation min-h-[48px] sm:min-h-[unset] sm:h-10 sm:w-10"
                  data-testid="button-send-message"
                >
                  <Send className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
              </div>
              
              {/* Helper text */}
              {newMessage === '' && (
                <p className="text-xs text-muted-foreground mt-2 px-1">
                  Digite "/" para respostas rápidas
                </p>
              )}
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