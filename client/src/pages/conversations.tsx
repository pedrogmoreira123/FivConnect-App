import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import apiClient from '../lib/api-client';
import { useAuth } from '../hooks/use-auth';
import { useThemeCustomization } from '../contexts/theme-customization-context';
import { useSound } from '../hooks/use-sound';
import io from 'socket.io-client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useQuickReplies } from '@/contexts/quick-replies';
import { WaveformAudioPlayer } from '../components/WaveformAudioPlayer';
import { LoadingSpinner } from '../components/ui/loading-spinner';
import { AutoAssignModal } from '@/components/modals/AutoAssignModal';
import { AuditModal } from '@/components/modals/AuditModal';
import { ExportModal } from '@/components/modals/ExportModal';

// Interfaces e tipos
interface User {
  id: string;
  company?: {
    id: string;
  };
}

interface Conversation {
  id: string;
  contactName?: string;
  contactPhone?: string;
  status: 'waiting' | 'in_progress' | 'finished';
  lastMessage?: string;
  updatedAt?: string;
  unreadCount?: number;
  companyId?: string;
  assignedAgentId?: string;
}

interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  messageType: string;
  direction: 'incoming' | 'outgoing';
  status?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  mediaUrl?: string;
  sentAt: string;
  createdAt: string;
  updatedAt: string;
}

interface Contact {
  id: string;
  name?: string;
  phone?: string;
}

interface AudioPlayerProps {
  src: string;
  messageId: string;
}

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
  onClose: () => void;
}

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  icon: React.ComponentType<{ className?: string }>;
  count?: number;
  onMuteClick?: () => void;
  isMuted?: boolean;
}

interface UnifiedListProps {
  items: Conversation[] | Contact[];
  onSelect: (item: Conversation | Contact) => void;
  selectedId?: string;
  title: string;
  emptyMessage: string;
  isContacts?: boolean;
}

interface ChatAreaProps {
  conversation: Conversation | null;
  messages: Message[];
  onSendMessage: (text: string, quotedMessageId?: string) => void;
  onTakeConversation: (conversationId: string) => void;
  onFinishConversation: (conversationId: string) => void;
  onSendMedia: (file: File, quotedMessageId?: string) => void;
  onMessageInput?: (text: string) => void;
  onImageClick?: (src: string, alt: string) => void;
  currentUser?: User | null;
}

// Função para tocar som de notificação
const playNotificationSound = () => {
  try {
    // Criar um som de notificação simples
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
    oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.2);
  } catch (error) {
    console.log('Não foi possível reproduzir som de notificação:', error);
  }
                };

import { 
  Search, 
  Plus, 
  UserPlus, 
  MessageCircle, 
  Clock, 
  Users, 
  Send,
  Paperclip,
  Smile,
  Mic, 
  Phone, 
  Video, 
  MoreVertical,
  Check,
  CheckCheck,
  XCircle,
  RefreshCw,
  Archive,
  Trash2,
  Info,
  ArrowRightLeft,
  Image,
  FileText,
  X,
  Pause,
  Play,
  Download,
  Eye,
  Reply,
  Volume2,
  VolumeX,
} from 'lucide-react';

// Função para formatar duração
const formatDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// Função para formatar horário da mensagem
const formatMessageTime = (timestamp: string) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
  
  if (diffInHours < 24) {
    return date.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit',
      timeZone: 'America/Sao_Paulo'
    });
  } else if (diffInHours < 48) {
    return 'Ontem';
  } else {
    return date.toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: '2-digit',
      timeZone: 'America/Sao_Paulo'
    });
  }
};

// Função para extrair nome do documento
const getDocumentName = (message: Message) => {
  // Tentar pegar do content primeiro
  if (message.content && !message.content.startsWith('[')) {
    return message.content;
  }
  
  // Extrair do URL
  if (message.mediaUrl) {
    const urlParts = message.mediaUrl.split('/');
    const fileName = urlParts[urlParts.length - 1];
    return decodeURIComponent(fileName);
  }
  
  return 'Documento';
};

// Função para formatar preview da última mensagem
const formatLastMessagePreview = (lastMessage: string) => {
  if (!lastMessage) return 'Nenhuma mensagem ainda.';
  
  // Verificar se é mídia com duração no formato [type:duration]
  const mediaMatch = lastMessage.match(/^\[(\w+):(\d+)\]$/);
  if (mediaMatch) {
    const [, type, duration] = mediaMatch;
    const formattedDuration = formatDuration(parseInt(duration));
    
    switch(type) {
      case 'voice':
      case 'audio':
        return `🎤 Mensagem de Voz ${formattedDuration}`;
      case 'video':
        return `🎥 Vídeo ${formattedDuration}`;
      case 'image':
        return `🖼️ Imagem`;
      case 'document':
        return `📄 Documento`;
      case 'sticker':
        return `🎭 Sticker`;
      default:
        return lastMessage;
    }
  }
  
  // Verificar formatos simples sem duração
  if (lastMessage.startsWith('[')) {
    const simpleMatch = lastMessage.match(/^\[(\w+):?(\d*)\]$/);
    if (simpleMatch) {
      const [, type] = simpleMatch;
      switch(type) {
        case 'image':
          return '🖼️ Imagem';
        case 'document':
          return '📄 Documento';
        case 'sticker':
          return '🎭 Figurinha';
        default:
          return lastMessage;
      }
    }
  }
  
  // Se não for formato de mídia, retornar o texto normal (truncado se necessário)
  return lastMessage.length > 30 ? lastMessage.substring(0, 30) + '...' : lastMessage;
};

// Componente de Player de Áudio Moderno - Estilo WhatsApp
const AudioPlayer = ({ src, messageId }: AudioPlayerProps) => {
  const { branding } = useThemeCustomization();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => {
      setDuration(audio.duration);
      setIsLoading(false);
    };
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };
    const handleLoadStart = () => setIsLoading(true);
    const handleCanPlay = () => setIsLoading(false);
    const handleError = () => {
      setHasError(true);
      setIsLoading(false);
    };

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('loadstart', handleLoadStart);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('loadstart', handleLoadStart);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('error', handleError);
    };
  }, [src]);

  const togglePlayPause = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    try {
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
      } else {
        await audio.play();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('Erro ao reproduzir áudio:', error);
      setHasError(true);
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newTime = (clickX / rect.width) * duration;
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (time: number) => {
    if (!time || isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (hasError) {
    return (
      <div className="bg-gray-100 rounded-lg p-3 w-full">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center">
            <FileText className="h-4 w-4 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-gray-600">Erro ao carregar áudio</p>
            <p className="text-xs text-gray-500">Arquivo não disponível</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 rounded-lg p-3 w-full max-w-sm">
      <audio ref={audioRef} src={src} preload="metadata" />
      
      <div className="flex items-center gap-3">
        {/* Botão Play/Pause */}
        <button
          onClick={togglePlayPause}
          disabled={isLoading}
          className="w-8 h-8 text-white rounded-full flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ 
            backgroundColor: `hsl(${branding.colors.primary})`,
            '--hover-color': `hsl(${branding.colors.primary} / 0.8)`
          } as React.CSSProperties}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = `hsl(${branding.colors.primary} / 0.8)`;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = `hsl(${branding.colors.primary})`;
          }}
        >
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : isPlaying ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4" />
          )}
        </button>

        {/* Barra de Progresso */}
        <div className="flex-1">
          <div 
            className="w-full h-2 bg-gray-200 rounded-full cursor-pointer relative"
            onClick={handleSeek}
          >
            <div 
              className="h-full rounded-full transition-all duration-100"
              style={{ 
                width: `${duration ? (currentTime / duration) * 100 : 0}%`,
                backgroundColor: `hsl(${branding.colors.primary})`
              }}
            />
          </div>
        </div>

        {/* Tempo */}
        <div className="text-xs text-gray-600 min-w-[80px] text-right">
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>
      </div>
    </div>
  );
};

// Componente de Emoji Picker
const EmojiPicker = ({ onEmojiSelect, onClose }: EmojiPickerProps) => {
  const emojis = ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗', '🤔', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🙄', '😯', '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐', '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕', '🤑', '🤠', '😈', '👿', '👹', '👺', '🤡', '💩', '👻', '💀', '☠️', '👽', '👾', '🤖', '🎃', '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿', '😾'];

  return (
    <div className="absolute bottom-full right-0 mb-2 bg-white border rounded-lg shadow-lg p-3 max-w-xs">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium">Emojis</span>
        <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="grid grid-cols-8 gap-1 max-h-32 overflow-y-auto">
        {emojis.map((emoji, index) => (
          <button
            key={index}
            onClick={() => onEmojiSelect(emoji)}
            className="p-1 hover:bg-gray-100 rounded text-lg"
          >
            {emoji}
          </button>
        ))}
              </div>
            </div>
  );
};

// Componente de Aba
const TabButton = ({ active, onClick, children, icon: Icon, count, onMuteClick, isMuted }: TabButtonProps) => {
  const { branding } = useThemeCustomization();
  
  return (
    <div className="flex items-center gap-1 flex-1 min-w-0">
  <button
    onClick={onClick}
        className={`flex items-center justify-center gap-1 px-1.5 py-1.5 rounded text-xs font-medium transition-colors whitespace-nowrap flex-1 min-w-0 ${
      active 
            ? 'text-white' 
        : 'text-gray-600 hover:bg-gray-100'
    }`}
        style={active ? { backgroundColor: `hsl(${branding.colors.primary})` } : undefined}
  >
        <Icon className="h-3.5 w-3.5 flex-shrink-0" />
        <span className="text-[10px] truncate">{children}</span>
    {count && count > 0 && (
          <span className="bg-red-500 text-white text-[10px] rounded-full px-1.5 py-0.5 min-w-[18px] h-4 flex items-center justify-center flex-shrink-0">
        {count}
                        </span>
    )}
  </button>
      {onMuteClick && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onMuteClick();
          }}
          className="p-1 hover:bg-gray-200 rounded transition-colors"
          title={isMuted ? "Ativar som" : "Desativar som"}
        >
          {isMuted ? <VolumeX className="h-3 w-3 text-gray-500" /> : <Volume2 className="h-3 w-3 text-gray-500" />}
        </button>
      )}
    </div>
  );
};

// Componente de Lista Unificado - CORRIGIDO: Funciona para conversas e contatos
const UnifiedList = ({ items, onSelect, selectedId, title, emptyMessage, isContacts = false }: UnifiedListProps) => {
  const { branding } = useThemeCustomization();
  
  return (
  <div className="conversation-list-container flex-1 overflow-y-auto">
    <div className="p-3 border-b bg-gray-50">
      <h3 className="font-semibold text-gray-700 text-sm">{title}</h3>
    </div>
    <div className="space-y-1">
      {!items || items.length === 0 ? (
        <div className="p-4 text-center text-gray-500 text-sm">
          {emptyMessage}
                </div>
              ) : (
        items.map(item => (
          <div
            key={item.id}
            onClick={() => onSelect(item)}
            className={`p-3 cursor-pointer hover:bg-gray-100 border-b ${
              selectedId === item.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
            }`}
          >
            <div className="flex items-center gap-3">
              {(item as any).profilePictureUrl ? (
                <img 
                  src={(item as any).profilePictureUrl} 
                  alt={isContacts ? ((item as Contact).name || 'Cliente') : ((item as Conversation).contactName || 'Cliente')} 
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: `hsl(${branding.colors.primary})` }}
                >
                <span className="text-sm font-medium text-white">
                  {isContacts ? ((item as Contact).name?.charAt(0) || 'C') : ((item as Conversation).contactName?.charAt(0) || 'C')}
                        </span>
                      </div>
              )}
                      <div className="flex items-center justify-between w-full">
                      <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate text-sm">
                  {isContacts ? ((item as Contact).name || 'Cliente') : ((item as Conversation).contactName || 'Cliente')}
                </p>
                <p className="text-sm text-gray-500 truncate">
                            {isContacts ? (item as Contact).phone : formatLastMessagePreview((item as Conversation).lastMessage || '')}
                          </p>
                        </div>
              {!isContacts && (
                          <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                            {/* Badge de mensagens não lidas */}
                            {(item as Conversation).unreadCount && (item as Conversation).unreadCount! > 0 && (
                              <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                                {(item as Conversation).unreadCount}
                              </span>
                            )}
                <div className="text-xs text-gray-400">
                              {(item as Conversation).updatedAt && formatMessageTime((item as Conversation).updatedAt!)}
                            </div>
                        </div>
              )}
                      </div>
                    </div>
                  </div>
                ))
              )}
    </div>
  </div>
);
};


// Componente de Área de Chat
const ChatArea = ({ 
  conversation, 
  messages, 
  onSendMessage, 
  onTakeConversation, 
  onFinishConversation,
  onSendMedia,
  onMessageInput,
  onImageClick,
  currentUser
}: ChatAreaProps) => {
  const { branding } = useThemeCustomization();
  const { quickReplies } = useQuickReplies();
  const [text, setText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [filteredReplies, setFilteredReplies] = useState<any[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState('0:00');
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const [audioLevel, setAudioLevel] = useState(0);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const previousMessagesLength = useRef<number>(-1);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    // Scroll sempre que a quantidade mudar (inclusive primeira carga)
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "auto" });
    }
    previousMessagesLength.current = messages.length;
  }, [messages.length]);

  const handleSend = () => {
    if (text.trim()) {
      // Auto-assumir conversa se estiver em espera
      if (conversation && conversation.status === 'waiting') {
        onTakeConversation(conversation.id);
      }
      onSendMessage(text, replyingTo?.id);
      setText('');
      setReplyingTo(null); // Limpar resposta após envio
    }
  };

  // Função para iniciar gravação de áudio
  const handleStartRecording = async () => {
    try {
      console.log('Iniciando gravação...');
      
      // Solicitar permissão do microfone
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Configurar AudioContext para análise de áudio
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);
      
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      
      // Configurar MediaRecorder
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      
      recorder.ondataavailable = (event) => {
        console.log('Dados de áudio recebidos:', event.data.size, 'bytes');
        if (event.data.size > 0) {
          chunks.push(event.data);
          console.log('Chunk adicionado, total de chunks:', chunks.length);
        }
      };
      
      recorder.onstop = () => {
        console.log('Gravação parada, chunks:', chunks.length);
          const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        console.log('Blob criado:', audioBlob.size, 'bytes');
        
        // Atualizar audioChunks com os chunks originais, não o blob final
          setAudioChunks(chunks);
        console.log('AudioChunks atualizado com', chunks.length, 'chunks');
        
        stream.getTracks().forEach(track => track.stop());
        
        // Fechar AudioContext apenas se não estiver fechado
        if (audioContext && audioContext.state !== 'closed') {
          audioContext.close();
        }
      };
      
      setMediaRecorder(recorder);
      setAudioChunks([]);
      setIsRecording(true);
      setRecordingTime('0:00');
      
      // Iniciar gravação
      recorder.start();
      console.log('MediaRecorder iniciado, estado:', recorder.state);
      
      // Iniciar timer
      let seconds = 0;
      recordingIntervalRef.current = setInterval(() => {
        seconds++;
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        setRecordingTime(`${mins}:${secs.toString().padStart(2, '0')}`);
      }, 1000);
      
      // Iniciar análise de áudio para waveform
      const updateAudioLevel = () => {
        if (analyser && isRecording) {
          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          analyser.getByteFrequencyData(dataArray);
          
          const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
          setAudioLevel(average);
          
          animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
        }
      };
      
      updateAudioLevel();
      
      console.log('Gravação iniciada com sucesso');
      
    } catch (error) {
      console.error('Erro ao acessar microfone:', error);
      alert('Não foi possível acessar o microfone. Verifique as permissões.');
    }
  };

  // Função para parar gravação
  const handleStopRecording = () => {
    console.log('Parando gravação...');
    
    if (mediaRecorder && (mediaRecorder.state === 'recording' || mediaRecorder.state === 'paused')) {
      mediaRecorder.stop();
      console.log('MediaRecorder parado');
    }
    
    setIsRecording(false);
    setAudioLevel(0);
    
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
    }
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
    }
    
    console.log('Gravação parada');
  };

  // Função para pausar gravação
  const handlePauseRecording = () => {
    if (mediaRecorder) {
      if (mediaRecorder.state === 'recording') {
        mediaRecorder.pause();
        console.log('Gravação pausada');
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      } else if (mediaRecorder.state === 'paused') {
        mediaRecorder.resume();
        console.log('Gravação retomada');
        
        // Reiniciar análise de áudio
        if (analyserRef.current) {
          const updateAudioLevel = () => {
            if (analyserRef.current && isRecording) {
              const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
              analyserRef.current.getByteFrequencyData(dataArray);
              
              const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
              setAudioLevel(average);
              
              animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
            }
          };
          updateAudioLevel();
        }
      }
    }
  };

  // Função para enviar gravação
  const handleSendRecording = async () => {
    console.log('Tentando enviar áudio...');
    console.log('audioChunks:', audioChunks);
    console.log('conversation:', conversation);
    
    if (!conversation) {
      console.log('Conversa não selecionada');
      alert('Selecione uma conversa primeiro.');
      return;
    }

    if (audioChunks.length === 0) {
      console.log('Nenhum áudio gravado');
      alert('Nenhum áudio gravado. Grave um áudio primeiro.');
      return;
    }

    console.log('Enviando áudio...');

    // Auto-assumir conversa se estiver em espera
    if (conversation && conversation.status === 'waiting') {
      onTakeConversation(conversation.id);
    }

    try {
      // Criar Blob a partir de todos os chunks
      const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
      console.log('🎤 Blob criado:', audioBlob.size, 'bytes');
      
      if (!audioBlob || audioBlob.size === 0) {
        alert('Áudio vazio. Grave novamente.');
        return;
      }
      
      // Criar FormData para envio
      const formData = new FormData();
      formData.append('file', audioBlob, `audio-${Date.now()}.webm`);
      
      console.log('🎤 Enviando áudio:', {
        blobSize: audioBlob.size,
        blobType: audioBlob.type,
        formDataKeys: Array.from(formData.keys())
      });
      
      // Verificar se o FormData tem o arquivo
      formData.forEach((value, key) => {
        console.log('🎤 FormData entry:', key, value);
      });
      
      // Enviar áudio via API
      const response = await apiClient.post(`/api/whatsapp/conversations/${conversation.id}/send-media`, formData, {
        headers: { 
          'Accept': 'application/json'
        }
      });
      
      console.log('✅ Resposta da API:', response.data);
      
      // Limpar estado apenas após sucesso
      setAudioChunks([]);
      setRecordingTime('0:00');
      setIsRecording(false);
      setReplyingTo(null); // Limpar resposta após envio
      
      console.log('✅ Áudio enviado com sucesso');
      
    } catch (error) {
      console.error('❌ Erro ao enviar áudio:', error);
      alert('Erro ao enviar áudio. Tente novamente.');
    }
  };

  // Função para mudar velocidade (placeholder)
  const handleSpeedChange = () => {
    // Implementar mudança de velocidade se necessário
    console.log('Mudar velocidade de reprodução');
  };

  const handleEmojiSelect = (emoji: string) => {
    setText(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  const handleReplyClick = (message: Message) => {
    setReplyingTo(message);
  };

  const handleCancelReply = () => {
    setReplyingTo(null);
  };

  const handleReplyToMessage = (message: Message) => {
    setReplyingTo(message);
  };


  const handleMediaUpload = (mediaType: string) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = mediaType === 'image' ? 'image/*' : 
                  mediaType === 'video' ? 'video/*' : 
                  mediaType === 'audio' ? 'audio/*' : 
                  '*/*';
    
    input.onchange = async (e: Event) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];
      if (!file) return;

      // Verificar tamanho do arquivo (200MB)
      const maxSize = 200 * 1024 * 1024; // 200MB
      if (file.size > maxSize) {
        alert('Arquivo muito grande. Tamanho máximo: 200MB');
        return;
      }

      // Auto-assumir conversa se estiver em espera
      if (conversation && conversation.status === 'waiting') {
        onTakeConversation(conversation.id);
      }

      // Criar URL local para preview imediato
      const localUrl = URL.createObjectURL(file);
      
      // Criar mensagem otimista
      const optimisticMessage: Message = {
        id: `temp_${Date.now()}`,
        conversationId: conversation!.id,
        senderId: currentUser?.id || '',
        content: '',
        messageType: file.type.startsWith('image/') ? 'image' : 
                     file.type.startsWith('video/') ? 'video' : 
                     file.type.startsWith('audio/') ? 'audio' : 'document',
        direction: 'outgoing',
        mediaUrl: localUrl,
        status: 'sending',
        sentAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Enviar mídia via função do componente pai
      try {
        await onSendMedia(file, replyingTo?.id);
        setReplyingTo(null); // Limpar resposta após envio
      } catch (error) {
        console.error('Erro ao enviar mídia:', error);
        alert('Erro ao enviar mídia. Tente novamente.');
      } finally {
        // Limpar URL local após um tempo
        setTimeout(() => URL.revokeObjectURL(localUrl), 5000);
      }
    };
    
    input.click();
  };


  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newText = e.target.value;
    setText(newText);
    // Quick replies trigger '/'
    if (newText.startsWith('/')) {
      const search = newText.slice(1).toLowerCase();
      const filtered = (quickReplies || []).filter((r: any) => r.shortcut?.toLowerCase().includes(search));
      setFilteredReplies(filtered);
      setShowQuickReplies(true);
    } else {
      setShowQuickReplies(false);
    }
    // Auto-assumir conversa ao começar a digitar
    if (onMessageInput) {
      onMessageInput(newText);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onSendMedia(file);
    }
  };

  if (!conversation) {
  return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <MessageCircle className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-500 mb-2">Selecione uma conversa</h3>
          <p className="text-gray-400">Escolha uma conversa para começar o atendimento</p>
              </div>
                </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-white">
      {/* Top Bar do Chat */}
      <div className="p-4 border-b bg-white flex items-center justify-between">
        <div className="flex items-center gap-3">
          {(conversation as any).profilePictureUrl ? (
            <img 
              src={(conversation as any).profilePictureUrl} 
              alt={conversation.contactName || 'Cliente'} 
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ backgroundColor: `hsl(${branding.colors.primary})` }}
            >
            <span className="text-sm font-medium text-white">
              {conversation.contactName?.charAt(0) || 'C'}
                        </span>
                      </div>
          )}
          <div>
            <h3 className="font-semibold text-gray-900">
              {conversation.contactName || 'Cliente'}
                        </h3>
            <p className="text-sm text-gray-500">
              {conversation.contactPhone?.replace('@s.whatsapp.net', '') || 'Número não disponível'}
                        </p>
                      </div>
                    </div>
        <div className="flex items-center gap-2">
          {conversation.status === 'waiting' && (
            <button 
              onClick={() => onTakeConversation(conversation.id)}
              className="px-4 py-2 text-white rounded-lg text-sm font-medium transition-colors"
              style={{ 
                backgroundColor: `hsl(${branding.colors.primary})`
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = `hsl(${branding.colors.primary} / 0.8)`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = `hsl(${branding.colors.primary})`;
              }}
            >
              Iniciar Chat
            </button>
          )}
          {conversation.status === 'in_progress' && (
              <button 
                onClick={() => onFinishConversation(conversation.id)}
                className="px-3 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm"
              >
                Finalizar Conversa
              </button>
          )}
          <button className="p-2 hover:bg-gray-100 rounded-lg">
                  <MoreVertical className="h-4 w-4" />
          </button>
            </div>
          </div>

      {/* Área de Mensagens - Layout WhatsApp */}
      <div className="flex-1 overflow-y-auto bg-gray-100">
        <div className="min-h-full flex flex-col justify-end p-4 space-y-2">
          {/* Debug logs removidos para evitar erros de tipo */}
          {messages.length === 0 ? (
            <div className="text-center py-8">
              <MessageCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Nenhuma mensagem ainda</p>
                </div>
              ) : (
            messages.map(message => (
              <div
                key={message.id}
                className={`flex items-start gap-2 group relative mb-2 ${
                  message.direction === 'outgoing' ? 'justify-end' : 'justify-start'
                }`}
              >
                {/* Botão de resposta - FORA da bolha */}
                {message.direction === 'incoming' && (
                  <button
                    onClick={() => handleReplyToMessage(message)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-full bg-gray-100 hover:bg-gray-200 mt-1"
                    title="Responder"
                  >
                    <Reply className="h-4 w-4 text-gray-600" />
                  </button>
                )}
                
                {/* Bolha da mensagem */}
                <div 
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl relative ${
                      message.direction === 'outgoing'
                    ? 'bg-green-500 text-white rounded-br-md' 
                    : 'bg-white text-gray-900 rounded-bl-md shadow-sm'
                }`}
                >
                  {/* Exibir mídia se existir */}
                  {(message.mediaUrl || message.messageType !== 'text') && (
                    <div className="mb-2">
                      {(message.messageType === 'image' || message.messageType === 'imageMessage') && (
                        <img 
                          src={message.mediaUrl} 
                          alt="Imagem" 
                          className="max-w-md max-h-96 object-contain rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => onImageClick?.(message.mediaUrl || '', 'Imagem')}
                        />
                      )}
                      {(message.messageType === 'video' || message.messageType === 'videoMessage') && (
                        <video 
                          src={message.mediaUrl} 
                          controls 
                          className="max-w-xl max-h-[28rem] object-contain rounded-lg"
                          preload="metadata"
                        />
                      )}
                      {(message.messageType === 'audio' || message.messageType === 'audioMessage' || message.messageType === 'voice') && message.mediaUrl && (
                        <WaveformAudioPlayer 
                          src={message.mediaUrl}
                          messageId={message.id}
                        />
                      )}
                      {(message.messageType === 'sticker' || message.messageType === 'stickerMessage') && message.mediaUrl && (
                        <img 
                          src={message.mediaUrl} 
                          alt="Sticker" 
                          className="max-w-[200px] max-h-[200px] object-contain"
                        />
                      )}
                      {(message.messageType === 'document' || message.messageType === 'documentMessage') && (
                        <div className="flex items-center gap-2 p-3 bg-gray-100 rounded-lg">
                          <FileText className="h-6 w-6 text-gray-600" />
                          <div className="flex-1">
                            <a 
                              href={message.mediaUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline font-medium"
                            >
                              📄 {getDocumentName(message)}
                            </a>
                            <div className="text-xs text-gray-500 mt-1">
                              Clique para abrir
                            </div>
                          </div>
                          <a 
                            href={message.mediaUrl} 
                            download
                            className="p-1 hover:bg-gray-200 rounded"
                            title="Baixar documento"
                          >
                            <Download className="h-4 w-4 text-gray-600" />
                          </a>
                        </div>
                      )}
                    </div>
                  )}

                    {/* SEMPRE mostrar texto se existir e não for placeholder */}
                    {message.content && 
                     !message.content.startsWith('[Mídia') && 
                     !message.content.match(/^\[(\w+):(\d+)\]$/) && 
                     message.content.trim() !== '' && (
                      <p className="text-sm leading-relaxed mt-2">{message.content}</p>
                    )}
                  <div className="flex items-center justify-end mt-1">
                    <span className="text-xs opacity-70">
                      {new Date(message.sentAt || message.createdAt).toLocaleTimeString('pt-BR', { 
                          hour: '2-digit', 
                          minute: '2-digit',
                          timeZone: 'America/Sao_Paulo'
                      })}
                        </span>
                      {message.direction === 'outgoing' && (
                      <div className="ml-1 flex items-center gap-0.5">
                        {message.status === 'sending' && (
                          <div className="w-3 h-3 border-2 border-gray-300 border-t-white rounded-full animate-spin" />
                        )}
                        {message.status === 'sent' && (
                          <Check className="h-3 w-3 text-gray-400" />
                        )}
                        {message.status === 'delivered' && (
                          <CheckCheck className="h-3 w-3 text-gray-400" />
                        )}
                        {message.status === 'read' && (
                          <CheckCheck className="h-3 w-3 text-blue-500" />
                        )}
                        {message.status === 'failed' && (
                          <XCircle className="h-3 w-3 text-red-500" />
                        )}
                        {!message.status && (
                          <Check className="h-3 w-3 text-gray-400" />
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Botão de resposta para mensagens enviadas */}
                  {message.direction === 'outgoing' && (
                    <button
                      onClick={() => handleReplyToMessage(message)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-full bg-gray-100 hover:bg-gray-200 mt-1"
                      title="Responder"
                    >
                      <Reply className="h-4 w-4 text-gray-600" />
                    </button>
                  )}
                  </div>
                ))
              )}
          <div ref={messagesEndRef} />
                </div>
              </div>

      {/* Área de Input de Mensagem - Layout WhatsApp */}
      <div className="p-3 bg-white border-t relative">
        {/* Interface de Resposta */}
        {replyingTo && (
          <div className="mb-3 p-3 bg-gray-100 rounded-lg border-l-4 border-l-blue-500">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="text-xs text-gray-500 mb-1">
                  Respondendo para {replyingTo.direction === 'outgoing' ? 'você' : 'cliente'}
                </div>
                <div className="text-sm text-gray-700 truncate">
                  {replyingTo.content || `[${replyingTo.messageType}]`}
                </div>
              </div>
              <button
                onClick={handleCancelReply}
                className="ml-2 p-1 hover:bg-gray-200 rounded-full transition-colors"
                title="Cancelar resposta"
              >
                <X className="h-4 w-4 text-gray-500" />
              </button>
            </div>
          </div>
        )}

        {/* Emoji Picker */}
        {showEmojiPicker && (
          <EmojiPicker 
            onEmojiSelect={handleEmojiSelect}
            onClose={() => setShowEmojiPicker(false)}
          />
        )}
        
        {/* Interface de Gravação de Áudio - Layout Compacto */}
        {isRecording ? (
          <div className="bg-gray-100 rounded-full px-3 py-1.5 flex items-center gap-2 w-1/2 ml-auto">
            {/* Botão de Deletar */}
            <button
              onClick={handleStopRecording}
              className="p-1 hover:bg-gray-200 rounded-full transition-colors"
              title="Cancelar gravação"
            >
              <Trash2 className="h-3 w-3 text-gray-600" />
            </button>
            
            {/* Indicador de Gravação */}
              <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-gray-700 text-xs font-medium">{recordingTime}</span>
            </div>
            
            {/* Waveform Real - Ocupa todo espaço disponível */}
            <div className="flex items-center gap-0.5 flex-1 min-w-0">
              {Array.from({ length: 20 }, (_, i) => {
                const height = audioLevel > 0 ? Math.min((audioLevel / 10) * (15 + i), 25) : 3;
                return (
                  <div
                    key={i}
                    className="bg-gray-500 rounded-full transition-all duration-75"
                    style={{
                      width: '1px',
                      height: `${height}px`,
                    }}
                  ></div>
                );
              })}
            </div>
            
            {/* Botão de Pausar */}
            <button
              onClick={handlePauseRecording}
              className="p-1 hover:bg-gray-200 rounded-full transition-colors"
              title="Pausar gravação"
            >
              <Pause className="h-3 w-3 text-gray-600" />
            </button>
            
            {/* Botão de Enviar */}
            <button
              onClick={handleSendRecording}
              className="p-1.5 text-white rounded-full transition-colors"
              style={{ backgroundColor: `hsl(${branding.colors.primary})` }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = `hsl(${branding.colors.primary} / 0.8)`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = `hsl(${branding.colors.primary})`;
              }}
              title="Enviar áudio"
            >
              <Send className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 bg-gray-100 rounded-full px-4 py-2">
            {/* Botão de Imagem */}
                          <button
              onClick={() => handleMediaUpload('image')}
              className="p-2 hover:bg-gray-200 rounded-full transition-colors"
              title="Enviar foto"
            >
              <Image className="h-5 w-5 text-gray-600" />
                          </button>
            
            {/* Botão de Vídeo */}
            <button
              onClick={() => handleMediaUpload('video')}
              className="p-2 hover:bg-gray-200 rounded-full transition-colors"
              title="Enviar vídeo"
            >
              <Video className="h-5 w-5 text-gray-600" />
            </button>
            
            {/* Botão de Documento */}
            <button
              onClick={() => handleMediaUpload('document')}
              className="p-2 hover:bg-gray-200 rounded-full transition-colors"
              title="Enviar documento"
            >
              <FileText className="h-5 w-5 text-gray-600" />
            </button>
            
            {/* Botão de Emoji */}
            <button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="p-2 hover:bg-gray-200 rounded-full transition-colors"
              title="Emojis"
            >
              <Smile className="h-5 w-5 text-gray-600" />
            </button>
            
            {/* Input de Texto */}
                  <input
              type="text"
              placeholder="Digite uma mensagem"
              className="flex-1 bg-transparent border-none outline-none text-gray-800 placeholder-gray-500"
              value={text}
              onChange={handleTextChange}
              onKeyPress={handleKeyPress}
            />
            
        {/* Quick Replies Preview */}
        {showQuickReplies && filteredReplies?.length > 0 && (
          <div className="absolute bottom-full left-0 w-full bg-white border rounded-lg shadow-lg mb-2 z-20">
            {filteredReplies.map((reply: any) => (
              <button
                key={reply.id}
                onClick={() => {
                  setText(reply.message);
                  setShowQuickReplies(false);
                }}
                className="w-full p-2 hover:bg-gray-100 text-left"
              >
                <div className="font-mono text-sm text-blue-600">/{reply.shortcut}</div>
                <div className="text-xs text-gray-600 truncate">{reply.message}</div>
              </button>
            ))}
          </div>
        )}
            
            
            {/* Botão de Envio/Áudio */}
            {text.trim() ? (
              <button
                onClick={handleSend}
                className="p-2 text-white rounded-full transition-colors"
                style={{ backgroundColor: `hsl(${branding.colors.primary})` }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = `hsl(${branding.colors.primary} / 0.8)`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = `hsl(${branding.colors.primary})`;
                }}
                title="Enviar mensagem"
              >
                <Send className="h-5 w-5" />
              </button>
            ) : (
              <button 
                onClick={handleStartRecording}
                className="p-2 hover:bg-gray-200 text-gray-600 rounded-full transition-colors"
                title="Enviar áudio"
              >
                <Mic className="h-5 w-5" />
              </button>
            )}
                </div>
        )}
        
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
          onChange={handleFileUpload}
          className="hidden"
                  />
                </div>
              </div>
  );
};

// Função debounce para evitar múltiplas chamadas rápidas
const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: number | undefined;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = window.setTimeout(() => func(...args), wait);
  };
};

export default function ConversationsPage() {
  const { branding } = useThemeCustomization();
  const { playNotificationSound, playWaitingSound, stopWaitingSound, soundSettings, updateSoundSettings } = useSound();

  // Notificações Desktop
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  
  useEffect(() => {
    // Solicitar permissão para notificações
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
      if (Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
          setNotificationPermission(permission);
        });
      }
    }
  }, []);

  const showDesktopNotification = (title: string, body: string, icon?: string) => {
    if (notificationPermission === 'granted') {
      const notification = new Notification(title, {
        body,
        icon: icon || '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'fivconnect-message',
        requireInteraction: false,
        silent: false
      });

      // Fechar notificação após 5 segundos
      setTimeout(() => {
        notification.close();
      }, 5000);

      // Focar na janela quando clicar na notificação
      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    }
  };
  const [activeTab, setActiveTab] = useState('active');
  const queryClient = useQueryClient();

  // Implementar debounce para invalidações
  const debouncedInvalidate = useCallback(
    debounce(() => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    }, 500),
    [queryClient]
  );
  const { data: waitingConversations = [] } = useQuery({
    queryKey: ['conversations', 'waiting'],
    queryFn: async () => {
      const res = await apiClient.get('/api/whatsapp/conversations?status=waiting');
      return Array.isArray(res.data) ? res.data : [];
    },
    staleTime: 0, // Sempre buscar dados frescos
  });
  const { data: activeConversations = [] } = useQuery({
    queryKey: ['conversations', 'in_progress'],
    queryFn: async () => {
      const res = await apiClient.get('/api/whatsapp/conversations?status=in_progress');
      return Array.isArray(res.data) ? res.data : [];
    },
    staleTime: 0, // Sempre buscar dados frescos
  });
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const { data: messages = [] } = ((): any => {
    const conversationId = selectedConversation?.id;
    // Simple adapter to keep current component shape while transitioning
    const query = useQuery({
      queryKey: ['messages', conversationId],
      queryFn: async () => {
        if (!conversationId) return [] as Message[];
        const res = await apiClient.get(`/api/whatsapp/conversations/${conversationId}/messages`);
        const arr = Array.isArray(res.data) ? res.data : [];
        return arr.sort((a: any, b: any) => new Date(a.sentAt || a.createdAt).getTime() - new Date(b.sentAt || b.createdAt).getTime());
      },
      enabled: !!conversationId,
      refetchInterval: false,
      staleTime: Infinity,
    });
    return { data: query.data || [] };
  })();
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [filteredReplies, setFilteredReplies] = useState<any[]>([]);
  const { quickReplies } = useQuickReplies();
  const [unreadCount, setUnreadCount] = useState(0);
  const [imagePopup, setImagePopup] = useState<{ src: string; alt: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth() as { user: User | null };
  const selectedConversationRef = useRef<string | null>(null);
  const socketRef = useRef<any>(null);
  const lastJoinedConversationRef = useRef<string | null>(null);

  // Calcular mensagens não respondidas
  const unreadConversations = useMemo(() => {
    return activeConversations.filter(conv => 
      conv.unreadCount && conv.unreadCount > 0
    );
  }, [activeConversations]);

  const totalUnread = useMemo(() => {
    return unreadConversations.reduce((acc, conv) => acc + (conv.unreadCount || 0), 0);
  }, [unreadConversations]);

  const totalPending = waitingConversations.length + totalUnread;

  const companyId = useMemo(() => user?.company?.id, [user]);

  // Atualizar título da página com contador de não lidas
  useEffect(() => {
    if (totalPending > 0) {
      document.title = `(${totalPending}) FivConnect - Chat`;
    } else {
      document.title = 'FivConnect - Chat';
    }
  }, [totalPending]);

  // Monitorar conversas em espera para tocar som
  const prevWaitingCountRef = useRef(0);

  useEffect(() => {
    const currentCount = waitingConversations.length;
    const prevCount = prevWaitingCountRef.current;
    
    console.log(`🔔 Conversas em espera: ${currentCount} (anterior: ${prevCount})`);
    console.log(`🔔 Settings: muteWaiting=${soundSettings.muteWaiting}, waitingSound=${soundSettings.waitingSound}, type=${soundSettings.waitingSoundType}`);
    
    if (currentCount > 0 && soundSettings.waitingSound && !soundSettings.muteWaiting) {
      // Tocar som continuamente enquanto houver conversas em espera
      console.log('🔔 Tentando iniciar/manter som de espera...');
      playWaitingSound();
    } else {
      // Parar som quando não houver mais conversas em espera ou estiver mutado
      console.log('🔔 Parando som de espera (count=0 ou mutado)');
      stopWaitingSound();
    }
    
    prevWaitingCountRef.current = currentCount;
  }, [waitingConversations.length, soundSettings.muteWaiting, soundSettings.waitingSound, soundSettings.waitingSoundType, playWaitingSound, stopWaitingSound]);

  // Quick replies agora vêm do contexto useQuickReplies

  useEffect(() => {
    console.log('🔍 [DEBUG] useEffect principal executado. companyId:', companyId, 'user:', user?.id, 'selectedConversation:', selectedConversation?.id);
    if (!companyId) return;

    // Carregar dados iniciais
    loadContacts();

    // Configurar WebSocket
    const socket = io(window.location.origin, {
      auth: {
        token: localStorage.getItem('authToken') || 'debug-token'
      },
      transports: ['polling'], // Usar apenas polling para evitar erros de WebSocket
      timeout: 20000,
      forceNew: true,
      autoConnect: true
    });
    socketRef.current = socket;

    // Eventos WebSocket
    socket.on('connect', () => {
      console.log('🔌 WebSocket conectado');
    });

    socket.on('disconnect', () => {
      console.log('🔌 WebSocket desconectado');
    });

    socket.on('newMessage', (messageData) => {
      console.log('[WS] newMessage recebida:', { 
        timestamp: new Date().toISOString(),
        conversationId: messageData.conversationId,
        hasContent: !!messageData.content,
        direction: messageData.direction
      });
      
      // Verificar se a mensagem pertence à conversa ATUALMENTE selecionada
      if (selectedConversationRef.current && messageData.conversationId === selectedConversationRef.current) {
        queryClient.setQueryData(['messages', selectedConversationRef.current], (prev: any = []) => {
          const exists = prev.some((m: any) => m.id === messageData.id);
          if (exists) return prev;
          const next = [...prev, messageData];
          return next.sort((a: any, b: any) => new Date(a.sentAt || a.createdAt).getTime() - new Date(b.sentAt || b.createdAt).getTime());
        });
        
        // Tocar som de notificação para mensagens recebidas na conversa aberta
        if (messageData.direction === 'incoming' && !soundSettings.muteConversations) {
          console.log('🔔 Tocando som de notificação para conversa aberta');
          playNotificationSound('conversation');
        }
      } else if (messageData.direction === 'incoming') {
        // Notificação desktop para mensagens de conversas não selecionadas
        const isPageVisible = !document.hidden;
        if (!isPageVisible || !selectedConversationRef.current) {
          showDesktopNotification(
            'Nova mensagem recebida',
            messageData.content || 'Mensagem de mídia',
            '/favicon.ico'
          );
        }
        
        // Tocar som de notificação para mensagens recebidas
        if (!soundSettings.muteConversations) {
          playNotificationSound('conversation');
        }
      }
      
      // Usar debouncedInvalidate para evitar múltiplas invalidações
      debouncedInvalidate();
    });

    // Adicionar listener para conversationUpdate
    socket.on('conversationUpdate', (conversationData) => {
      console.log('[WS] conversationUpdate recebida:', {
        timestamp: new Date().toISOString(),
        conversationId: conversationData.id,
        status: conversationData.status,
        lastMessage: conversationData.lastMessage
      });
      
      // Usar debouncedInvalidate para evitar múltiplas invalidações
      debouncedInvalidate();
      
      // Atualizar conversa específica no cache
      ['waiting', 'in_progress'].forEach(status => {
        queryClient.setQueryData(['conversations', status], (prev: any = []) => {
          const exists = prev.find((c: any) => c.id === conversationData.id);
          if (exists) {
            return prev.map((c: any) => 
              c.id === conversationData.id 
                ? { ...c, ...conversationData }
                : c
            );
          }
          return status === conversationData.status ? [conversationData, ...prev] : prev;
        });
      });
    });

    socket.on('messageStatusUpdate', (data) => {
      console.log('📊 Atualização de status da mensagem:', data);
      
      // Atualizar status da mensagem via queryClient
      queryClient.setQueryData(['messages', data.conversationId], (prev: any = []) => 
        prev.map((msg: any) => 
          msg.id === data.messageId 
            ? { ...msg, status: data.status, isRead: data.status === 'read' }
            : msg
        )
      );
      
      // Invalidar queries de conversas para atualizar
      if (data.conversationId) {
        queryClient.invalidateQueries({ queryKey: ['conversations'] });
      }
    });

    socket.on('newConversation', (conversation) => {
      console.log('🔍 [DEBUG] newConversation listener executado:', conversation);
      console.log('💬 Nova conversa criada:', conversation);
      loadConversationsDebounced();
      
      // Tocar som para conversas em espera
      if (conversation.status === 'waiting') {
        playWaitingSound();
      }
    });

    socket.on('conversationUpdate', (conversation) => {
      console.log('🔍 [DEBUG] conversationUpdate listener executado:', conversation);
      console.log('🔄 Conversa atualizada:', conversation);
      loadConversationsDebounced();
    });

    socket.on('connectionUpdate', (data) => {
      console.log('🔗 Atualização de conexão:', data);
    });

    socket.on('qrcodeUpdate', (data) => {
      console.log('📱 QR Code atualizado:', data);
    });

    // Polling de mensagens removido - usando apenas WebSocket para melhor performance

    // Sincronização de mensagens removida - usando apenas WebSocket para melhor performance

    // Polling para conversas
    const pollConversations = async () => {
      try {
        // Salvar posição do scroll
        const conversationList = document.querySelector('.conversation-list-container');
        const scrollPosition = conversationList?.scrollTop || 0;
        
        await loadConversations();
        
        // Restaurar posição do scroll
        requestAnimationFrame(() => {
          if (conversationList) {
            conversationList.scrollTop = scrollPosition;
          }
        });
      } catch (error) {
        console.error('❌ Erro no polling de conversas:', error);
      }
    };

    // Polling desativado - apenas WebSocket
    // pollConversations();
    // const conversationsInterval = setInterval(pollConversations, 30000);

    return () => {
      // clearInterval(conversationsInterval);
      socket.disconnect();
      console.log('🔄 WebSocket e polling interrompidos');
    };
  }, [companyId, user, selectedConversation]);

  // Entrar/sair das rooms de conversa conforme seleção
  useEffect(() => {
    const socket = socketRef.current;
    const newId = selectedConversation?.id || null;
    if (!socket) return;
    if (lastJoinedConversationRef.current && lastJoinedConversationRef.current !== newId) {
      socket.emit('leaveConversation', lastJoinedConversationRef.current);
    }
    if (newId) {
      socket.emit('joinConversation', newId);
    }
    lastJoinedConversationRef.current = newId;
  }, [selectedConversation?.id]);

  // Auto-scroll para a última mensagem sempre que a lista mudar
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    try {
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto', block: 'end' });
    } catch {}
  }, [messages.length, selectedConversation?.id]);

  const loadConversations = async () => {
    try {
      setIsLoading(true);
      // Agora as listas estão sob React Query; apenas invalida para refetch manual quando necessário
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['conversations', 'waiting'] }),
        queryClient.invalidateQueries({ queryKey: ['conversations', 'in_progress'] }),
      ]);
    } catch (error) {
      console.error('Erro ao carregar conversas:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Versão debounced para evitar múltiplas chamadas rápidas
  const loadConversationsDebounced = useMemo(
    () => debounce(loadConversations, 300),
    []
  );

  const loadContacts = async () => {
    try {
      console.log('🔍 Carregando contatos para empresa:', companyId);
      const response = await apiClient.get('/api/clients');
      
      // Garantir que sempre temos um array válido
      const contactsData = Array.isArray(response.data) ? response.data : [];
      console.log('🔍 Contatos carregados:', contactsData.length);
      setContacts(contactsData);
    } catch (error) {
      console.error('Erro ao carregar contatos:', error);
      // Garantir que sempre temos um array
      setContacts([]);
    }
  };

  const handleSelectConversation = async (conversation: Conversation) => {
    console.log(`[Conversations] Selecionando conversa: ${conversation.id}, status: ${conversation.status}`);
    
    setSelectedConversation(conversation);
    selectedConversationRef.current = conversation.id;
    setSelectedContact(null);
    
    // Marcar conversa como lida
    if (conversation.unreadCount && conversation.unreadCount > 0) {
      setUnreadCount(prev => Math.max(0, prev - (conversation.unreadCount || 0)));
      // Invalidar queries para atualizar contadores
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    }
    
    try {
      console.log(`[Conversations] Carregando mensagens para conversa: ${conversation.id}, status: ${conversation.status}`);
      // Usar rota de teste temporariamente
      // Com React Query, invalidar e deixar a query recarregar
      await queryClient.invalidateQueries({ queryKey: ['messages', conversation.id] });
      
      // Marcar mensagens incoming como lidas
      try {
        await apiClient.post(`/api/whatsapp/conversations/${conversation.id}/mark-all-read`);
        console.log(`[FRONTEND] ✅ Mensagens marcadas como lidas para conversa ${conversation.id}`);
      } catch (markError) {
        console.error(`[FRONTEND] Erro ao marcar mensagens como lidas:`, markError);
        // Não falhar a seleção se houver erro na marcação
      }
    } catch (error) {
      console.error("Erro ao buscar mensagens:", error);
    }
  };

  const handleSelectContact = (contact: Contact) => {
    setSelectedContact(contact);
    setSelectedConversation(null);
  };

  const startConversationMutation = useMutation({
    mutationFn: async (conversationId: string) => {
      return apiClient.post(`/api/whatsapp/conversations/${conversationId}/start`);
    },
    onSuccess: (_res, conversationId: string) => {
      queryClient.invalidateQueries({ queryKey: ['conversations', 'waiting'] });
      queryClient.invalidateQueries({ queryKey: ['conversations', 'in_progress'] });
      // também pode atualizar item específico se houver cache normalizado
      console.log(`[FRONTEND] Conversa ${conversationId} iniciada com sucesso`);
    }
  });

  const handleTakeConversation = async (conversationId: string) => {
    try {
      await startConversationMutation.mutateAsync(conversationId);
    } catch (error) {
      console.error("Erro ao iniciar conversa:", error);
    }
  };

  // Auto-assumir conversa ao começar a digitar
  const handleMessageInput = (text: string) => {
    if (selectedConversation && selectedConversation.status === 'waiting' && text.trim()) {
      if (!isTyping) {
        setIsTyping(true);
        handleTakeConversation(selectedConversation.id);
      }
    }
  };

  const handleSendMessage = async (text: string, quotedMessageId?: string) => {
    if (!selectedConversation || !text.trim()) return;

    // OPTIMISTIC UI: Criar mensagem temporária imediatamente
    const tempMessage: Message = {
      id: `temp-${Date.now()}`,
      conversationId: selectedConversation.id,
      senderId: user!.id,
      content: text,
      messageType: 'text',
      direction: 'outgoing',
      status: 'sending', // Status temporário
      sentAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Adicionar mensagem temporária ao cache da conversa atual
    queryClient.setQueryData(['messages', selectedConversation.id], (prev: any = []) => [...prev, tempMessage]);

    try {
      // Auto-assumir conversa se estiver em espera
      if (selectedConversation.status === 'waiting') {
        await handleTakeConversation(selectedConversation.id);
      }

      const payload: any = { text };
      if (quotedMessageId) {
        payload.quotedMessageId = quotedMessageId;
      }

      const response = await apiClient.post(`/api/whatsapp/conversations/${selectedConversation.id}/send`, payload);
      const real = (response as any)?.data?.message ?? (response as any)?.data ?? response;
      const normalized = {
        status: 'sent',
        sentAt: real?.sentAt ?? new Date().toISOString(),
        createdAt: real?.createdAt ?? new Date().toISOString(),
        ...real,
      };
      // Remover temporária e adicionar a real no cache
      queryClient.setQueryData(['messages', selectedConversation.id], (prev: any = []) => {
        const withoutTemp = prev.filter((m: any) => m.id !== tempMessage.id);
        return [...withoutTemp, normalized];
      });

    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
      
      // Remover mensagem temporária em caso de erro
      queryClient.setQueryData(['messages', selectedConversation.id], (prev: any = []) => prev.filter((m: any) => m.id !== tempMessage.id));
      
      alert('Erro ao enviar mensagem. Tente novamente.');
    }
  };

  const handleSendMedia = async (file: File, quotedMessageId?: string) => {
    if (!selectedConversation || !file) return;

    // Determinar tipo de mídia
    const getMediaType = (file: File) => {
      if (file.type.startsWith('image/')) return 'image';
      if (file.type.startsWith('video/')) return 'video';
      if (file.type.startsWith('audio/')) return 'audio';
      return 'document';
    };

    const mediaType = getMediaType(file);

    // OPTIMISTIC UI: Criar mensagem temporária
    const tempMessage: Message = {
      id: `temp-${Date.now()}`,
      conversationId: selectedConversation.id,
      senderId: user!.id,
      content: `[${mediaType} enviando...]`,
      messageType: mediaType,
      direction: 'outgoing',
      status: 'sending',
      mediaUrl: URL.createObjectURL(file), // Preview temporário
      sentAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Adicionar mensagem temporária ao cache
    queryClient.setQueryData(['messages', selectedConversation.id], (prev: any = []) => [...prev, tempMessage]);

    try {
      // Auto-assumir conversa se estiver em espera
      if (selectedConversation.status === 'waiting') {
        await handleTakeConversation(selectedConversation.id);
      }

      const formData = new FormData();
      formData.append('file', file);
      if (quotedMessageId) {
        formData.append('quotedMessageId', quotedMessageId);
      }
      
      const response = await apiClient.post(
        `/api/whatsapp/conversations/${selectedConversation.id}/send-media`, 
        formData,
        {
          headers: {
            // NÃO definir Content-Type - axios define automaticamente para FormData
          }
        }
      );

      const real = (response as any)?.data?.message ?? (response as any)?.data ?? response;
      const normalized = {
        status: 'sent',
        sentAt: real?.sentAt ?? new Date().toISOString(),
        createdAt: real?.createdAt ?? new Date().toISOString(),
        ...real,
      };
      // Remover mensagem temporária e adicionar a real no cache
      queryClient.setQueryData(['messages', selectedConversation.id], (prev: any = []) => {
        const withoutTemp = prev.filter((m: any) => m.id !== tempMessage.id);
        return [...withoutTemp, normalized];
      });

    } catch (error: any) {
      console.error("❌ Erro ao enviar mídia:", error);
      console.error("Detalhes:", error.response?.data);
      
      // Remover mensagem temporária em caso de erro
      queryClient.setQueryData(['messages', selectedConversation.id], (prev: any = []) => prev.filter((m: any) => m.id !== tempMessage.id));
      
      const errorMessage = error.response?.data?.message || 'Falha ao enviar mídia';
      alert(`Erro: ${errorMessage}`);
    }
  };

  const handleFinishConversation = async (conversationId: string) => {
    try {
      console.log('[Conversations] Finalizando conversa:', conversationId);
      
      await apiClient.post(`/api/whatsapp/conversations/${conversationId}/finish`);
      
      console.log('[Conversations] Conversa finalizada com sucesso');
      
      // Limpar estado local imediatamente
      setSelectedConversation(null);
      selectedConversationRef.current = null;
      
      // Recarregar conversas para atualizar lista
      await loadConversations();
      
    } catch (error) {
      console.error("[Conversations] Erro ao finalizar conversa:", error);
      alert('Erro ao finalizar conversa. Tente novamente.');
    }
  };

  const getCurrentList = () => {
    switch (activeTab) {
      case 'waiting':
        return waitingConversations;
      case 'active':
        return activeConversations;
      case 'contacts':
        return contacts;
      default:
        return [];
    }
  };

  const getCurrentTitle = () => {
    switch (activeTab) {
      case 'waiting':
        return 'Em Espera';
      case 'active':
        return 'Conversas Ativas';
      case 'contacts':
        return 'Contatos';
      default:
        return '';
    }
  };

  const getEmptyMessage = () => {
    switch (activeTab) {
      case 'waiting':
        return 'Nenhuma conversa em espera';
      case 'active':
        return 'Nenhuma conversa ativa';
      case 'contacts':
        return 'Nenhum contato encontrado';
      default:
        return '';
    }
  };

  // Mostrar loading durante carregamento inicial
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" text="Carregando conversas..." />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar Esquerda */}
        <div className="w-96 bg-white border-r flex flex-col">
          {/* Header */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold text-gray-800">Chat</h1>
            <div className="flex gap-2">
              {/* Sprint 3 - Auto-assign */}
              <AutoAssignModal>
                <button className="p-2 hover:bg-gray-100 rounded-lg" title="Auto-assign Inteligente">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </button>
              </AutoAssignModal>

              {/* Sprint 3 - Auditoria */}
              <AuditModal>
                <button className="p-2 hover:bg-gray-100 rounded-lg" title="Histórico de Auditoria">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>
              </AuditModal>

              {/* Sprint 3 - Export */}
              <ExportModal>
                <button className="p-2 hover:bg-gray-100 rounded-lg" title="Exportar Dados">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </button>
              </ExportModal>

              <button className="p-2 hover:bg-gray-100 rounded-lg">
                <MessageCircle className="h-4 w-4" />
              </button>
              <button className="p-2 hover:bg-gray-100 rounded-lg">
                <UserPlus className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Barra de Pesquisa */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Pesquisar Conversas"
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
        </div>
                  </div>
                  
        {/* Abas */}
        <div className="p-4 border-b">
          <div className="flex gap-2 w-full">
            <TabButton
              active={activeTab === 'active'}
              onClick={() => setActiveTab('active')}
              icon={MessageCircle}
              count={totalUnread}
              onMuteClick={() => updateSoundSettings({ muteConversations: !soundSettings.muteConversations })}
              isMuted={soundSettings.muteConversations}
            >
              CONVERSAS
            </TabButton>
            <TabButton
              active={activeTab === 'waiting'}
              onClick={() => setActiveTab('waiting')}
              icon={Clock}
              count={waitingConversations.length}
              onMuteClick={() => updateSoundSettings({ muteWaiting: !soundSettings.muteWaiting })}
              isMuted={soundSettings.muteWaiting}
            >
              ESPERA
            </TabButton>
            <TabButton
              active={activeTab === 'contacts'}
              onClick={() => setActiveTab('contacts')}
              icon={Users}
              count={0}
            >
              CONTATOS
            </TabButton>
            </div>
          </div>
                
        {/* Lista de Conversas/Contatos */}
        <UnifiedList
          items={getCurrentList()}
          onSelect={(item) => {
            if (activeTab === 'contacts') {
              handleSelectContact(item as Contact);
            } else {
              handleSelectConversation(item as Conversation);
            }
          }}
          selectedId={activeTab === 'contacts' ? selectedContact?.id : selectedConversation?.id}
          title={getCurrentTitle()}
          emptyMessage={getEmptyMessage()}
          isContacts={activeTab === 'contacts'}
                  />
        </div>
                
      {/* Área Principal do Chat */}
      <ChatArea
        conversation={selectedConversation}
        messages={messages}
        onSendMessage={handleSendMessage}
        onTakeConversation={handleTakeConversation}
        onFinishConversation={handleFinishConversation}
        onSendMedia={handleSendMedia}
        onMessageInput={handleMessageInput}
        onImageClick={(src, alt) => setImagePopup({ src, alt })}
        currentUser={user}
      />
      
      {/* Popup de Imagem */}
      {imagePopup && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="relative max-w-4xl max-h-[90vh] flex flex-col">
            {/* Imagem */}
            <div className="relative bg-black rounded-t-lg overflow-hidden">
            <img
              src={imagePopup.src}
              alt={imagePopup.alt}
                className="max-w-full max-h-[70vh] object-contain"
            />
            </div>
            
            {/* Botões abaixo da imagem */}
            <div className="bg-gray-800 p-4 rounded-b-lg flex gap-3 justify-center">
              <button
                onClick={() => {
                  const link = document.createElement('a');
                  link.href = imagePopup.src;
                  link.download = `imagem-${Date.now()}.jpg`;
                  link.click();
                }}
                className="px-4 py-2 text-white rounded-lg flex items-center gap-2 transition-colors"
                style={{ backgroundColor: `hsl(${branding.colors.primary})` }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = `hsl(${branding.colors.primary} / 0.8)`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = `hsl(${branding.colors.primary})`;
                }}
              >
                <Download className="h-4 w-4" />
                Download
              </button>
              <button
                onClick={() => window.open(imagePopup.src, '_blank')}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg flex items-center gap-2"
              >
                <Eye className="h-4 w-4" />
                Abrir em Nova Aba
              </button>
              <button
                onClick={() => setImagePopup(null)}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg flex items-center gap-2"
              >
                <X className="h-4 w-4" />
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}