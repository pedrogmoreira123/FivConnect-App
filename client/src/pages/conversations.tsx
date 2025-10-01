import { useEffect, useState, useMemo, useRef } from 'react';
import apiClient from '../lib/api-client';
import { useAuth } from '../hooks/use-auth';
import io from 'socket.io-client';
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
  CheckCircle2,
  RefreshCw,
  Archive,
  Trash2,
  Info,
  ArrowRightLeft,
  Image,
  FileText,
  X,
  Pause,
  Play
} from 'lucide-react';

// Componente de Player de Áudio Moderno - Estilo WhatsApp
const AudioPlayer = ({ src, messageId }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const audioRef = useRef(null);

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

  const handleSeek = (e) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newTime = (clickX / rect.width) * duration;
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (time) => {
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
          className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
              className="h-full bg-green-500 rounded-full transition-all duration-100"
              style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
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
const EmojiPicker = ({ onEmojiSelect, onClose }) => {
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
const TabButton = ({ active, onClick, children, icon: Icon, count }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-1 px-2 py-1.5 rounded text-xs font-medium transition-colors whitespace-nowrap ${
      active 
        ? 'bg-green-500 text-white' 
        : 'text-gray-600 hover:bg-gray-100'
    }`}
  >
    <Icon className="h-3 w-3" />
    <span className="text-xs">{children}</span>
    {count > 0 && (
      <span className="bg-red-500 text-white text-xs rounded-full px-1 py-0.5 min-w-[16px] h-4 flex items-center justify-center">
        {count}
                        </span>
    )}
  </button>
);

// Componente de Lista Unificado - CORRIGIDO: Funciona para conversas e contatos
const UnifiedList = ({ items, onSelect, selectedId, title, emptyMessage, isContacts = false }) => (
  <div className="flex-1 overflow-y-auto">
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
              <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-white">
                  {isContacts ? (item.name?.charAt(0) || 'C') : (item.contact_name?.charAt(0) || 'C')}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate text-sm">
                  {isContacts ? (item.name || 'Cliente') : (item.contact_name || 'Cliente')}
                </p>
                <p className="text-sm text-gray-500 truncate">
                  {isContacts ? item.phone : (item.contact_phone?.replace('@s.whatsapp.net', '') || 'Número não disponível')}
                </p>
                {!isContacts && (
                  <p className="text-xs text-gray-400 truncate mt-1">
                    {item.last_message || 'Nenhuma mensagem ainda'}
                  </p>
                )}
                        </div>
              {!isContacts && (
                <div className="text-xs text-gray-400">
                  {item.updated_at && new Date(item.updated_at).toLocaleTimeString()}
                        </div>
              )}
                    </div>
                  </div>
                ))
              )}
    </div>
  </div>
);


// Componente de Área de Chat
const ChatArea = ({ 
  conversation, 
  messages, 
  onSendMessage, 
  onTakeConversation, 
  onFinishConversation,
  onSendMedia,
  onMessageInput
}) => {
  const [text, setText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState('0:00');
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const [audioLevel, setAudioLevel] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (text.trim()) {
      // Auto-assumir conversa se estiver em espera
      if (conversation && conversation.status === 'waiting') {
        onTakeConversation(conversation.id);
      }
      onSendMessage(text);
      setText('');
    }
  };

  // Função para iniciar gravação de áudio
  const handleStartRecording = async () => {
    try {
      console.log('Iniciando gravação...');
      
      // Solicitar permissão do microfone
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Configurar AudioContext para análise de áudio
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
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
        const audioBlob = new Blob(chunks, { type: 'audio/wav' });
        console.log('Blob criado:', audioBlob.size, 'bytes');
        
        // Atualizar audioChunks imediatamente
        setAudioChunks([audioBlob]);
        console.log('AudioChunks atualizado:', [audioBlob]);
        
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
    
    if (audioChunks.length === 0 || !conversation) {
      console.log('Nenhum áudio gravado ou conversa não selecionada');
      alert('Nenhum áudio gravado. Grave um áudio primeiro.');
      return;
    }

    console.log('Enviando áudio...');

    // Auto-assumir conversa se estiver em espera
    if (conversation.status === 'waiting') {
      onTakeConversation(conversation.id);
    }

    try {
      const audioBlob = audioChunks[0];
      console.log('Áudio blob:', audioBlob, 'size:', audioBlob.size);
      
      if (audioBlob.size === 0) {
        alert('Áudio vazio. Grave novamente.');
        return;
      }
      
      // Criar FormData para envio
      const formData = new FormData();
      formData.append('file', audioBlob, 'audio.wav');
      
      // Enviar áudio via API
      const response = await apiClient.post(`/api/whatsapp/conversations/${conversation.id}/send-media`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      console.log('Resposta da API:', response.data);
      
      // Limpar estado
      setAudioChunks([]);
      setRecordingTime('0:00');
      setIsRecording(false);
      
      console.log('Áudio enviado com sucesso');
      
    } catch (error) {
      console.error('Erro ao enviar áudio:', error);
      alert('Erro ao enviar áudio. Tente novamente.');
    }
  };

  // Função para mudar velocidade (placeholder)
  const handleSpeedChange = () => {
    // Implementar mudança de velocidade se necessário
    console.log('Mudar velocidade de reprodução');
  };

  const handleEmojiSelect = (emoji) => {
    setText(prev => prev + emoji);
    setShowEmojiPicker(false);
  };


  const handleMediaUpload = (mediaType) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = mediaType === 'image' ? 'image/*' : 
                  mediaType === 'video' ? 'video/*' : 
                  mediaType === 'audio' ? 'audio/*' : 
                  '*/*';
    
    input.onchange = async (e) => {
      const file = e.target.files[0];
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

      try {
        console.log('Enviando mídia:', file);
        
        // Criar FormData para envio
        const formData = new FormData();
        formData.append('file', file);
        
        // Enviar mídia via API
        await apiClient.post(`/api/whatsapp/conversations/${conversation.id}/send-media`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        
        console.log('Mídia enviada com sucesso');
        
      } catch (error) {
        console.error('Erro ao enviar mídia:', error);
        alert('Erro ao enviar mídia. Tente novamente.');
      }
    };
    
    input.click();
  };

  const playNotificationSound = () => {
    try {
      // Criar um som de notificação simples
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
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

  const handleTextChange = (e) => {
    const newText = e.target.value;
    setText(newText);
    // Auto-assumir conversa ao começar a digitar
    if (onMessageInput) {
      onMessageInput(newText);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
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
          <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
            <span className="text-sm font-medium text-white">
              {conversation.contact_name?.charAt(0) || 'C'}
                        </span>
                      </div>
          <div>
            <h3 className="font-semibold text-gray-900">
              {conversation.contact_name || 'Cliente'}
                        </h3>
            <p className="text-sm text-gray-500">
              {conversation.contact_phone?.replace('@s.whatsapp.net', '') || 'Número não disponível'}
                        </p>
                      </div>
                    </div>
        <div className="flex items-center gap-2">
          {conversation.status === 'waiting' && (
            <button 
              onClick={() => onTakeConversation(conversation.id)}
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm font-medium"
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
        <div className="p-4 space-y-2">
          {messages.length === 0 ? (
            <div className="text-center py-8">
              <MessageCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Nenhuma mensagem ainda</p>
                </div>
              ) : (
            messages.map(message => (
              <div
                key={message.id}
                className={`flex ${message.direction === 'outgoing' ? 'justify-end' : 'justify-start'} mb-2`}
              >
                <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
                      message.direction === 'outgoing'
                    ? 'bg-green-500 text-white rounded-br-md' 
                    : 'bg-white text-gray-900 rounded-bl-md shadow-sm'
                }`}>
                  {/* Exibir mídia se existir */}
                  {(message.mediaUrl || message.messageType !== 'text') && (
                    <div className="mb-2">
                      {(message.messageType === 'image' || message.messageType === 'imageMessage') && (
                        <img 
                          src={message.mediaUrl} 
                          alt="Imagem" 
                          className="max-w-full h-auto rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => window.open(message.mediaUrl, '_blank')}
                        />
                      )}
                      {(message.messageType === 'video' || message.messageType === 'videoMessage') && (
                        <video 
                          src={message.mediaUrl} 
                          controls 
                          className="max-w-full h-auto rounded-lg"
                          preload="metadata"
                        />
                      )}
                      {(message.messageType === 'audio' || message.messageType === 'audioMessage') && (
                        <AudioPlayer 
                          src={message.mediaUrl}
                          messageId={message.id}
                        />
                      )}
                      {(message.messageType === 'document' || message.messageType === 'documentMessage') && (
                        <div className="flex items-center gap-2 p-2 bg-gray-100 rounded">
                          <FileText className="h-5 w-5" />
                          <a 
                            href={message.mediaUrl} 
                            download 
                            className="text-sm underline hover:text-blue-600"
                          >
                            Documento
                          </a>
                        </div>
                      )}
                    </div>
                  )}

                    {/* Só mostrar texto se não for apenas mídia */}
                    {message.content && 
                     !message.content.includes('[Mídia:') && 
                     !message.content.includes('[Mídia: audio]') && 
                     !message.content.includes('[Mídia: audioMessage]') && 
                     !message.content.includes('[Mídia: image]') && 
                     !message.content.includes('[Mídia: video]') && 
                     !message.content.includes('[Mídia: document]') && 
                     message.content.trim() !== '' && (
                      <p className="text-sm leading-relaxed">{message.content}</p>
                    )}
                  <div className="flex items-center justify-end mt-1">
                    <span className="text-xs opacity-70">
                      {new Date(message.sentAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      {message.direction === 'outgoing' && (
                      <div className="ml-1 flex">
                        {message.status === 'sending' && (
                          <div className="w-3 h-3 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                        )}
                        {message.status === 'sent' && (
                          <CheckCircle2 className="h-3 w-3 text-gray-400" />
                        )}
                        {message.status === 'delivered' && (
                          <>
                            <CheckCircle2 className="h-3 w-3 text-gray-400" />
                            <CheckCircle2 className="h-3 w-3 text-gray-400 -ml-1" />
                          </>
                        )}
                        {message.status === 'read' && (
                          <>
                            <CheckCircle2 className="h-3 w-3 text-blue-500" />
                            <CheckCircle2 className="h-3 w-3 text-blue-500 -ml-1" />
                          </>
                        )}
                        {!message.status && (
                          <CheckCircle2 className="h-3 w-3 text-gray-400" />
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  </div>
                ))
              )}
          <div ref={messagesEndRef} />
                </div>
              </div>

      {/* Área de Input de Mensagem - Layout WhatsApp */}
      <div className="p-3 bg-white border-t relative">
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
              className="p-1.5 bg-green-500 text-white rounded-full hover:bg-green-600 transition-colors"
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
            
            {/* Botão de Envio/Áudio */}
            {text.trim() ? (
              <button
                onClick={handleSend}
                className="p-2 bg-green-500 text-white rounded-full hover:bg-green-600 transition-colors"
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

export default function ConversationsPage() {
  const [activeTab, setActiveTab] = useState('active');
  const [waitingConversations, setWaitingConversations] = useState([]);
  const [activeConversations, setActiveConversations] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [selectedContact, setSelectedContact] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const { user } = useAuth();

  const companyId = useMemo(() => user?.company?.id, [user]);

  // Atualizar título da página com contador de não lidas
  useEffect(() => {
    if (unreadCount > 0) {
      document.title = `(${unreadCount}) FivConnect - Chat`;
    } else {
      document.title = 'FivConnect - Chat';
    }
  }, [unreadCount]);

  useEffect(() => {
    if (!companyId) return;

    // Carregar dados iniciais
    loadConversations();
    loadContacts();

    // Conectar WebSocket
    const socket = io('http://localhost:3000', {
      transports: ['websocket', 'polling'],
      autoConnect: true
    });
    
    socket.on('connect', () => {
      console.log('✅ Conectado ao servidor WebSocket para conversas!');
    });

    socket.on('newConversation', (newConvo) => {
      console.log('[WEBSOCKET] Nova conversa recebida:', newConvo);
      if (newConvo.companyId === companyId) {
        setWaitingConversations(prev => [newConvo, ...prev.filter(c => c.id !== newConvo.id)]);
        // Tocar som de notificação
        playNotificationSound();
      }
    });

    socket.on('newMessage', (message) => {
      console.log('[WEBSOCKET] Nova mensagem recebida:', message);
      
      // ATUALIZAÇÃO EM TEMPO REAL: Adicionar mensagem ao chat se for da conversa selecionada
      if (selectedConversation && message.conversationId === selectedConversation.id) {
        setMessages(prev => [...prev, message]);
      }
      
      // Atualizar última mensagem em todas as listas com contador de não lidas
      const updateLastMessage = (prev) => 
        prev.map(conv => 
          conv.id === message.conversationId 
            ? { 
                ...conv, 
                lastMessage: message.content, 
                updatedAt: new Date().toISOString(),
                unreadCount: message.direction === 'incoming' ? (conv.unreadCount || 0) + 1 : conv.unreadCount
              }
            : conv
        );
      
      setWaitingConversations(updateLastMessage);
      setActiveConversations(updateLastMessage);

      // Atualizar contador global de não lidas
      if (message.direction === 'incoming') {
        setUnreadCount(prev => prev + 1);
      }
    });

    // NOVO: Atualização de status de mensagem (✓, ✓✓, azul)
    socket.on('messageStatus', (data) => {
      console.log('[WEBSOCKET] Status da mensagem atualizado:', data);
      if (selectedConversation && data.conversationId === selectedConversation.id) {
        setMessages(prev => 
          prev.map(msg => 
            msg.id === data.messageId 
              ? { ...msg, status: data.status }
              : msg
          )
        );
      }
    });
    
    socket.on('conversationUpdate', (updatedConvo) => {
      if (updatedConvo.companyId === companyId) {
        setWaitingConversations(prev => prev.filter(c => c.id !== updatedConvo.id));
        if (updatedConvo.assignedAgentId === user.id) {
          setActiveConversations(prev => [updatedConvo, ...prev.filter(c => c.id !== updatedConvo.id)]);
        }
      }
    });

    return () => { socket.disconnect(); };
  }, [companyId, user, selectedConversation]);

  const loadConversations = async () => {
    try {
      // Usar rotas de teste temporariamente
      const [waitingRes, activeRes] = await Promise.all([
        apiClient.get('/api/test/conversations/waiting'),
        apiClient.get('/api/test/conversations/in_progress')
      ]);
      
      // Garantir que sempre temos arrays válidos
      const waitingData = Array.isArray(waitingRes.data) ? waitingRes.data : [];
      const activeData = Array.isArray(activeRes.data) ? activeRes.data : [];
      
      console.log(`[FRONTEND] Carregadas ${waitingData.length} conversas em espera e ${activeData.length} conversas ativas`);
      
      setWaitingConversations(waitingData);
      setActiveConversations(activeData);
    } catch (error) {
      console.error('Erro ao carregar conversas:', error);
      // Garantir que sempre temos arrays
      setWaitingConversations([]);
      setActiveConversations([]);
    }
  };

  const loadContacts = async () => {
    try {
      const response = await apiClient.get(`/api/clients/${companyId}`);
      
      // Garantir que sempre temos um array válido
      const contactsData = Array.isArray(response.data) ? response.data : [];
      setContacts(contactsData);
    } catch (error) {
      console.error('Erro ao carregar contatos:', error);
      // Garantir que sempre temos um array
      setContacts([]);
    }
  };

  const handleSelectConversation = async (conversation) => {
    setSelectedConversation(conversation);
    setSelectedContact(null);
    
    // Marcar conversa como lida
    if (conversation.unreadCount > 0) {
      setUnreadCount(prev => Math.max(0, prev - conversation.unreadCount));
      setWaitingConversations(prev => 
        prev.map(conv => 
          conv.id === conversation.id 
            ? { ...conv, unreadCount: 0 }
            : conv
        )
      );
      setActiveConversations(prev => 
        prev.map(conv => 
          conv.id === conversation.id 
            ? { ...conv, unreadCount: 0 }
            : conv
        )
      );
    }
    
    try {
      // Usar rota de teste temporariamente
      const res = await apiClient.get(`/api/test/messages/${conversation.id}`);
      
      // Garantir que sempre temos um array válido
      const messagesData = Array.isArray(res.data) ? res.data : [];
      console.log(`[FRONTEND] Carregadas ${messagesData.length} mensagens para conversa ${conversation.id}`);
      setMessages(messagesData);
    } catch (error) {
      console.error("Erro ao buscar mensagens:", error);
      setMessages([]);
    }
  };

  const handleSelectContact = (contact) => {
    setSelectedContact(contact);
    setSelectedConversation(null);
    setMessages([]);
  };

  const handleTakeConversation = async (conversationId) => {
    try {
      await apiClient.post(`/api/whatsapp/conversations/${conversationId}/take`);
      await loadConversations();
      console.log(`[FRONTEND] Conversa ${conversationId} assumida com sucesso`);
    } catch (error) {
      console.error("Erro ao assumir conversa:", error);
    }
  };

  // Auto-assumir conversa ao começar a digitar
  const handleMessageInput = (text) => {
    if (selectedConversation && selectedConversation.status === 'waiting' && text.trim()) {
      if (!isTyping) {
        setIsTyping(true);
        handleTakeConversation(selectedConversation.id);
      }
    }
  };

  const handleSendMessage = async (text) => {
    if (!selectedConversation || !text.trim()) return;

    // OPTIMISTIC UI: Criar mensagem temporária imediatamente
    const tempMessage = {
      id: `temp-${Date.now()}`,
      conversationId: selectedConversation.id,
      senderId: user.id,
      content: text,
      messageType: 'text',
      direction: 'outgoing',
      status: 'sending', // Status temporário
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Adicionar mensagem temporária ao chat
    setMessages(prev => [...prev, tempMessage]);

    try {
      // Auto-assumir conversa se estiver em espera
      if (selectedConversation.status === 'waiting') {
        await handleTakeConversation(selectedConversation.id);
      }

      const response = await apiClient.post(`/api/whatsapp/conversations/${selectedConversation.id}/send`, { text });

      // Remover mensagem temporária e adicionar a real
      setMessages(prev => {
        const withoutTemp = prev.filter(msg => msg.id !== tempMessage.id);
        return [...withoutTemp, { ...response.data, status: 'sent' }];
      });

    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
      
      // Remover mensagem temporária em caso de erro
      setMessages(prev => prev.filter(msg => msg.id !== tempMessage.id));
      
      alert('Erro ao enviar mensagem. Tente novamente.');
    }
  };

  const handleSendMedia = async (file) => {
    if (!selectedConversation || !file) return;

    // Determinar tipo de mídia
    const getMediaType = (file) => {
      if (file.type.startsWith('image/')) return 'image';
      if (file.type.startsWith('video/')) return 'video';
      if (file.type.startsWith('audio/')) return 'audio';
      return 'document';
    };

    const mediaType = getMediaType(file);

    // OPTIMISTIC UI: Criar mensagem temporária
    const tempMessage = {
      id: `temp-${Date.now()}`,
      conversationId: selectedConversation.id,
      senderId: user.id,
      content: `[${mediaType} enviando...]`,
      messageType: mediaType,
      direction: 'outgoing',
      status: 'sending',
      mediaUrl: URL.createObjectURL(file), // Preview temporário
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Adicionar mensagem temporária
    setMessages(prev => [...prev, tempMessage]);

    try {
      // Auto-assumir conversa se estiver em espera
      if (selectedConversation.status === 'waiting') {
        await handleTakeConversation(selectedConversation.id);
      }

      const formData = new FormData();
      formData.append('file', file);
      
      const response = await apiClient.post(
        `/api/whatsapp/conversations/${selectedConversation.id}/send-media`, 
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );

      // Remover mensagem temporária e adicionar a real
      setMessages(prev => {
        const withoutTemp = prev.filter(msg => msg.id !== tempMessage.id);
        return [...withoutTemp, { ...response.data, status: 'sent' }];
      });

    } catch (error) {
      console.error("Erro ao enviar mídia:", error);
      
      // Remover mensagem temporária em caso de erro
      setMessages(prev => prev.filter(msg => msg.id !== tempMessage.id));
      
      alert('Erro ao enviar mídia. Tente novamente.');
    }
  };

  const handleFinishConversation = async (conversationId) => {
    try {
      await apiClient.post(`/api/whatsapp/conversations/${conversationId}/finish`);
      await loadConversations();
      setSelectedConversation(null);
      setMessages([]);
    } catch (error) {
      console.error("Erro ao finalizar conversa:", error);
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

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar Esquerda */}
      <div className="w-80 bg-white border-r flex flex-col">
          {/* Header */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold text-gray-800">Chat</h1>
            <div className="flex gap-2">
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
          <div className="flex gap-1 flex-nowrap">
            <TabButton
              active={activeTab === 'active'}
              onClick={() => setActiveTab('active')}
              icon={MessageCircle}
              count={activeConversations.length}
            >
              CONVERSAS
            </TabButton>
            <TabButton
              active={activeTab === 'waiting'}
              onClick={() => setActiveTab('waiting')}
              icon={Clock}
              count={waitingConversations.length}
            >
              ESPERA
            </TabButton>
            <TabButton
              active={activeTab === 'contacts'}
              onClick={() => setActiveTab('contacts')}
              icon={Users}
            >
              CONTATOS
            </TabButton>
            </div>
          </div>
                
        {/* Lista de Conversas/Contatos */}
        <UnifiedList
          items={getCurrentList()}
          onSelect={activeTab === 'contacts' ? handleSelectContact : handleSelectConversation}
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
      />
    </div>
  );
}