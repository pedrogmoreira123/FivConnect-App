import React, { useState } from 'react';
import { Download, Eye, X } from 'lucide-react';

interface StickerMessageProps {
  mediaUrl: string;
  messageId: string;
}

export default function StickerMessage({ mediaUrl, messageId }: StickerMessageProps) {
  const [showModal, setShowModal] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Adicionar cache-busting para evitar problemas de cache
  const getStickerUrl = (url: string) => {
    if (!url) return url;
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}t=${Date.now()}`;
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = mediaUrl;
    link.download = `sticker_${messageId}.webp`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImageError = () => {
    setImageError(true);
  };

  if (imageError) {
    return (
      <div className="bg-gray-100 rounded-lg p-4 text-center">
        <p className="text-gray-500 text-sm">Erro ao carregar sticker</p>
        <button
          onClick={() => setImageError(false)}
          className="text-blue-500 text-xs mt-2 hover:underline"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="relative group">
        <img 
          src={getStickerUrl(mediaUrl)} 
          alt="Sticker" 
          className="max-w-48 h-auto rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
          onClick={() => setShowModal(true)}
          onError={handleImageError}
        />
        
        {/* Botões de ação */}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
          <button
            onClick={() => setShowModal(true)}
            className="bg-black/70 text-white p-2 rounded-full hover:bg-black/90 transition-colors"
            title="Visualizar sticker"
          >
            <Eye className="h-4 w-4" />
          </button>
          <button
            onClick={handleDownload}
            className="bg-black/70 text-white p-2 rounded-full hover:bg-black/90 transition-colors"
            title="Baixar sticker"
          >
            <Download className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Modal de visualização */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
          <div className="relative max-w-2xl max-h-[90vh] p-4">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-2 right-2 bg-black/70 text-white p-2 rounded-full hover:bg-black/90 transition-colors z-10"
            >
              <X className="h-6 w-6" />
            </button>
            <img 
              src={getStickerUrl(mediaUrl)} 
              alt="Sticker" 
              className="max-w-full max-h-full object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </>
  );
}
