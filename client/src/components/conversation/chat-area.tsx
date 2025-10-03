import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ConversationData, MessageData } from '@/types';
import { Smile, Paperclip, Send, Download, FileText, Image, Video, Music, Mic, MicOff, Trash2, Pause, Play, Square } from 'lucide-react';

interface MediaMessage extends MessageData {
  mediaUrl?: string;
  caption?: string;
  fileName?: string;
  fileSize?: number;
}

interface ChatAreaProps {
  conversation?: ConversationData;
  messages: MediaMessage[];
  onSendMessage: (message: string) => void;
  onSendMedia?: (file: File) => void;
}

export default function ChatArea({ conversation, messages, onSendMessage, onSendMedia }: ChatAreaProps) {
  const [newMessage, setNewMessage] = useState('');
  
  // Estados para gravação de áudio - IMPLEMENTAÇÃO CORRIGIDA
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordedAudio, setRecordedAudio] = useState<Blob | null>(null);
  
  // Refs para gravação - IMPLEMENTAÇÃO CORRIGIDA
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

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

  // IMPLEMENTAÇÃO CORRIGIDA - Função para iniciar gravação
  const startRecording = async () => {
    try {
      console.log('🎤 Iniciando gravação...');
      
      // Limpar chunks anteriores
      audioChunksRef.current = [];
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      // Verificar suporte ao MediaRecorder
      if (!MediaRecorder.isTypeSupported('audio/webm')) {
        console.warn('⚠️ audio/webm não suportado, tentando audio/ogg');
      }
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg'
      });
      
      mediaRecorder.ondataavailable = (event) => {
        console.log('🎤 Dados de áudio recebidos:', event.data.size, 'bytes');
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
          console.log('🎤 Chunks acumulados:', audioChunksRef.current.length);
          console.log('🎤 Chunks ref:', audioChunksRef.current);
        }
      };
      
      mediaRecorder.onstop = () => {
        console.log('🎤 Gravação parada, chunks finais:', audioChunksRef.current.length);
        console.log('🎤 Chunks ref final:', audioChunksRef.current);
        
        if (audioChunksRef.current.length > 0) {
          const audioBlob = new Blob(audioChunksRef.current, { 
            type: mediaRecorder.mimeType 
          });
          console.log('🎤 Blob criado:', {
            size: audioBlob.size,
            type: audioBlob.type,
            chunks: audioChunksRef.current.length
          });
          
          setRecordedAudio(audioBlob);
        } else {
          console.error('❌ Nenhum chunk de áudio foi coletado');
          setRecordedAudio(null);
        }
        
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      setRecordingTime(0);
      setRecordedAudio(null);
      
      // Iniciar gravação sem timeslice para coleta contínua
      mediaRecorder.start();
      console.log('🎤 MediaRecorder iniciado sem timeslice');
      
      // Iniciar cronômetro
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
    } catch (error) {
      console.error('❌ Erro ao iniciar gravação:', error);
      alert('Erro ao acessar o microfone. Verifique as permissões.');
    }
  };

  // NOVA IMPLEMENTAÇÃO - Função para parar gravação
  const stopRecording = () => {
    console.log('🎤 Parando gravação...');
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    
    setIsRecording(false);
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  };

  // IMPLEMENTAÇÃO CORRIGIDA - Função para cancelar gravação
  const cancelRecording = () => {
    console.log('🎤 Cancelando gravação...');
    stopRecording();
    setRecordedAudio(null);
    setRecordingTime(0);
    audioChunksRef.current = [];
  };

  // IMPLEMENTAÇÃO CORRIGIDA - Função para enviar áudio
  const sendAudio = async () => {
    console.log('🎤 Tentando enviar áudio...');
    console.log('🎤 recordedAudio:', recordedAudio);
    console.log('🎤 audioChunksRef.current:', audioChunksRef.current);
    console.log('🎤 Chunks length:', audioChunksRef.current.length);
    
    // Verificar se temos chunks no ref
    if (audioChunksRef.current.length === 0) {
      console.error('❌ Nenhum chunk de áudio no ref');
      alert('Nenhum áudio gravado. Grave um áudio primeiro.');
      return;
    }
    
    if (!recordedAudio) {
      console.error('❌ Nenhum áudio gravado no estado');
      alert('Nenhum áudio gravado. Grave um áudio primeiro.');
      return;
    }

    // VALIDAÇÃO CRÍTICA DO BLOB
    console.log('🎤 Validação do Blob:');
    console.log('- Blob é null?', recordedAudio === null);
    console.log('- Tamanho do Blob:', recordedAudio.size);
    console.log('- Tipo do Blob:', recordedAudio.type);
    console.log('- Blob é válido?', recordedAudio.size > 0 && recordedAudio.type.includes('audio'));

    if (recordedAudio.size === 0) {
      console.error('❌ Blob de áudio está vazio');
      alert('Áudio vazio. Grave novamente.');
      return;
    }

    if (!recordedAudio.type.includes('audio')) {
      console.error('❌ Tipo de Blob inválido:', recordedAudio.type);
      alert('Tipo de áudio inválido. Grave novamente.');
      return;
    }

    try {
      const audioFile = new File([recordedAudio], `audio-${Date.now()}.webm`, { 
        type: recordedAudio.type 
      });
      
      console.log('🎤 Arquivo criado:', {
        name: audioFile.name,
        size: audioFile.size,
        type: audioFile.type
      });
      
      if (onSendMedia) {
        console.log('🎤 Enviando arquivo via onSendMedia...');
        await onSendMedia(audioFile);
        console.log('✅ Áudio enviado com sucesso');
      } else {
        console.error('❌ onSendMedia não está definido');
        alert('Função de envio de mídia não está disponível');
      }
      
      // Limpar estado após sucesso
      setRecordedAudio(null);
      setRecordingTime(0);
      audioChunksRef.current = [];
      
    } catch (error) {
      console.error('❌ Erro ao enviar áudio:', error);
      alert('Erro ao enviar áudio: ' + error);
    }
  };

  // Formatar tempo de gravação
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Cleanup ao desmontar
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Função para renderizar mídia baseada no tipo
  const renderMedia = (message: MediaMessage) => {
    if (!message.mediaUrl) return null;

    switch (message.type) {
      case 'image':
        return (
          <div className="mb-2">
            <img 
              src={message.mediaUrl} 
              alt="Imagem" 
              className="max-w-full h-auto rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => window.open(message.mediaUrl, '_blank')}
            />
          </div>
        );
      
      case 'video':
        return (
          <div className="mb-2">
            <video 
              src={message.mediaUrl} 
              controls 
              className="max-w-full h-auto rounded-lg"
              preload="metadata"
            >
              Seu navegador não suporta o elemento de vídeo.
            </video>
          </div>
        );
      
      case 'audio':
        return (
          <div className="mb-2">
            <audio 
              src={message.mediaUrl} 
              controls 
              className="w-full"
              preload="metadata"
            >
              Seu navegador não suporta o elemento de áudio.
            </audio>
          </div>
        );
      
      case 'document':
        return (
          <div className="mb-2 p-3 bg-gray-100 rounded-lg border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                <FileText className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">
                  {message.fileName || 'Documento'}
                </p>
                {message.fileSize && (
                  <p className="text-xs text-gray-500">
                    {(message.fileSize / 1024 / 1024).toFixed(2)} MB
                  </p>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.open(message.mediaUrl, '_blank')}
                className="text-blue-600 hover:text-blue-700"
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  // Função para renderizar legenda condicionalmente - CORRIGIDA
  const renderCaption = (message: MediaMessage) => {
    // Validação mais rigorosa para evitar renderização desnecessária
    if (!message.caption || 
        message.caption.trim() === '' || 
        message.caption === null || 
        message.caption === undefined ||
        message.caption === '[Imagem]' ||
        message.caption === '[Vídeo]' ||
        message.caption === '[Áudio]' ||
        message.caption === '[Documento]' ||
        message.caption.includes('[Mídia:')) {
      return null;
    }
    
    return (
      <p className="text-sm text-gray-700 mt-2">
        {message.caption}
      </p>
    );
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
              {/* Renderizar mídia se existir */}
              {renderMedia(message)}
              
              {/* Renderizar conteúdo de texto se não for apenas mídia */}
              {message.content && 
               !message.content.includes('[Mídia:') && 
               !message.content.includes('[Imagem]') && 
               !message.content.includes('[Vídeo]') && 
               !message.content.includes('[Áudio]') && 
               !message.content.includes('[Documento]') && 
               message.content.trim() !== '' && (
                <p className="text-sm" data-testid={`text-message-content-${message.id}`}>
                  {message.content}
                </p>
              )}
              
              {/* Renderizar legenda condicionalmente */}
              {renderCaption(message)}
              
              <span className="text-xs opacity-70" data-testid={`text-message-time-${message.id}`}>
                {message.timestamp}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Message Input */}
      <div className="p-4 border-t border-border">
        {!isRecording ? (
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
            {newMessage.trim() ? (
              <Button
                onClick={handleSendMessage}
                data-testid="button-send-message"
              >
                <Send className="h-5 w-5" />
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                onClick={startRecording}
                data-testid="button-start-recording"
              >
                <Mic className="h-5 w-5" />
              </Button>
            )}
          </div>
        ) : (
          <div className="bg-gray-50 rounded-lg p-4">
            {/* Interface de Gravação - NOVA IMPLEMENTAÇÃO */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium text-red-600">REC</span>
                </div>
                <span className="text-sm text-gray-600 font-mono">
                  {formatTime(recordingTime)}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={cancelRecording}
                  className="text-red-600 hover:text-red-700"
                  title="Cancelar gravação"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={stopRecording}
                  className="text-gray-600 hover:text-gray-700"
                  title="Parar gravação"
                >
                  <Square className="h-4 w-4" />
                </Button>
                <Button
                  onClick={sendAudio}
                  className="bg-green-500 hover:bg-green-600 text-white"
                  disabled={!recordedAudio}
                  title="Enviar áudio"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            {/* Status da gravação */}
            <div className="mb-3 p-3 bg-white rounded border">
              <div className="flex items-center gap-2">
                <Mic className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600">
                  {isRecording ? 'Gravando...' : recordedAudio ? 'Áudio gravado - Pronto para enviar' : 'Parado'}
                </span>
              </div>
              {recordedAudio && (
                <div className="mt-2 text-xs text-green-600">
                  ✅ Áudio gravado: {Math.round(recordedAudio.size / 1024)} KB
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
