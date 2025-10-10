import React from 'react';
import { Message } from './types';

interface QuotedMessageProps {
  message: Message;
  messages: Message[];
}

export default function QuotedMessage({ message, messages }: QuotedMessageProps) {
  const quotedMessage = messages.find(m => m.id === message.quotedMessageId);
  
  if (!quotedMessage) {
    return (
      <div className="bg-gray-100 rounded-lg p-2 mb-2 border-l-4 border-l-gray-400">
        <div className="text-xs text-gray-500 mb-1">Mensagem original não encontrada</div>
        <div className="text-sm text-gray-700 italic">[Mensagem removida ou não disponível]</div>
      </div>
    );
  }
  
  const getMessagePreview = (msg: Message) => {
    switch (msg.messageType) {
      case 'image':
        return '📷 [Imagem]';
      case 'video':
        return '🎥 [Vídeo]';
      case 'audio':
        return '🎵 [Áudio]';
      case 'document':
        return '📄 [Documento]';
      case 'sticker':
        return '😊 [Sticker]';
      case 'contact':
        return '👤 [Contato]';
      case 'location':
        return '📍 [Localização]';
      case 'poll':
        return '📊 [Enquete]';
      case 'reaction':
        return '👍 [Reação]';
      default:
        return msg.content || '[Mensagem]';
    }
  };
  
  return (
    <div className="bg-gray-100 rounded-lg p-2 mb-2 border-l-4 border-l-blue-500">
      <div className="text-xs text-gray-500 mb-1">
        {quotedMessage.direction === 'outgoing' ? 'Você' : 'Cliente'}
      </div>
      <div className="text-sm text-gray-700 truncate">
        {getMessagePreview(quotedMessage)}
      </div>
    </div>
  );
}
