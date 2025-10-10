import React from 'react';
import { Message } from './types';
import ImageMessage from './ImageMessage';
import VideoMessage from './VideoMessage';
import AudioMessage from './AudioMessage';
import DocumentMessage from './DocumentMessage';
import StickerMessage from './StickerMessage';
import QuotedMessage from './QuotedMessage';

interface MessageRendererProps {
  message: Message;
  messages: Message[];
}

export default function MessageRenderer({ message, messages }: MessageRendererProps) {
  // Renderizar mensagem de resposta se existir
  const renderQuotedMessage = () => {
    if (message.quotedMessageId) {
      return <QuotedMessage message={message} messages={messages} />;
    }
    return null;
  };

  // Renderizar mídia baseada no tipo
  const renderMedia = () => {
    switch (message.messageType) {
      case 'image':
      case 'gif':
        return (
          <ImageMessage
            mediaUrl={message.mediaUrl}
            caption={message.caption}
            fileName={message.fileName}
            messageId={message.id}
          />
        );
      
      case 'video':
      case 'short_video':
        return (
          <VideoMessage
            mediaUrl={message.mediaUrl}
            caption={message.caption}
            fileName={message.fileName}
            messageId={message.id}
          />
        );
      
      case 'audio':
      case 'voice':
        return (
          <AudioMessage
            mediaUrl={message.mediaUrl}
            fileName={message.fileName}
            messageId={message.id}
          />
        );
      
      case 'document':
        return (
          <DocumentMessage
            mediaUrl={message.mediaUrl}
            caption={message.caption}
            fileName={message.fileName}
            messageId={message.id}
          />
        );
      
      case 'sticker':
        return (
          <StickerMessage
            mediaUrl={message.mediaUrl}
            messageId={message.id}
          />
        );
      
      case 'location':
        return (
          <div className="bg-gray-100 rounded-lg p-3 max-w-xs">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs">📍</span>
              </div>
              <div>
                <p className="font-medium text-sm">{message.metadata?.name || 'Localização'}</p>
                {message.metadata?.address && (
                  <p className="text-xs text-gray-600">{message.metadata.address}</p>
                )}
              </div>
            </div>
          </div>
        );
      
      case 'contact':
        return (
          <div className="bg-gray-100 rounded-lg p-3 max-w-xs">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm">👤</span>
              </div>
              <div>
                <p className="font-medium text-sm">{message.metadata?.contactName}</p>
                <p className="text-xs text-gray-600">{message.metadata?.contactPhone}</p>
              </div>
            </div>
          </div>
        );
      
      case 'reaction':
        return (
          <div className="flex items-center space-x-2">
            <span className="text-2xl">{message.metadata?.emoji}</span>
            <span className="text-sm text-gray-500">reagiu à mensagem</span>
          </div>
        );
      
      default:
        // Fallback para tipos não reconhecidos com mediaUrl
        if (message.mediaUrl) {
          const mediaType = message.metadata?.mediaType || message.messageType;
          if (mediaType?.startsWith('image/') || mediaType === 'gif') {
            return (
              <ImageMessage
                mediaUrl={message.mediaUrl}
                caption={message.caption}
                fileName={message.fileName}
                messageId={message.id}
              />
            );
          } else if (mediaType?.startsWith('video/')) {
            return (
              <VideoMessage
                mediaUrl={message.mediaUrl}
                caption={message.caption}
                fileName={message.fileName}
                messageId={message.id}
              />
            );
          } else if (mediaType?.startsWith('audio/')) {
            return (
              <AudioMessage
                mediaUrl={message.mediaUrl}
                caption={message.caption}
                fileName={message.fileName}
                messageId={message.id}
              />
            );
          }
        }
        return null;
    }
  };

  // Renderizar conteúdo de texto
  const renderTextContent = () => {
    // Não mostrar texto se for apenas mídia sem legenda
    if (message.mediaUrl && !message.caption && !message.content) {
      return null;
    }
    
    // Não mostrar texto se for apenas mídia com placeholder
    if (message.mediaUrl && (
      message.content === '[Imagem]' ||
      message.content === '[Vídeo]' ||
      message.content === '[Áudio]' ||
      message.content === '[Documento]' ||
      message.content === '[Sticker]'
    )) {
      return null;
    }
    
    if (message.content && message.content.trim() !== '') {
      return (
        <p className="text-sm leading-relaxed whitespace-pre-wrap">
          {message.content}
        </p>
      );
    }
    
    return null;
  };

  return (
    <div className="space-y-2">
      {/* Mensagem de resposta */}
      {renderQuotedMessage()}
      
      {/* Mídia */}
      {renderMedia()}
      
      {/* Conteúdo de texto */}
      {renderTextContent()}
    </div>
  );
}
