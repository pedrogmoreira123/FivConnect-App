import React from 'react';
import { Download, FileText } from 'lucide-react';

interface DocumentMessageProps {
  mediaUrl: string;
  caption?: string;
  fileName?: string;
  messageId: string;
}

export default function DocumentMessage({ mediaUrl, caption, fileName, messageId }: DocumentMessageProps) {
  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = mediaUrl;
    link.download = fileName || `documento_${messageId}`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-gray-100 rounded-lg p-4 max-w-xs">
      <div className="flex items-center space-x-3">
        <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
          <FileText className="h-6 w-6 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">
            {fileName || 'Documento'}
          </p>
          <p className="text-xs text-gray-500">
            Clique para baixar
          </p>
        </div>
        <button
          onClick={handleDownload}
          className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
          title="Baixar documento"
        >
          <Download className="h-4 w-4" />
        </button>
      </div>
      
      {/* Legenda */}
      {caption && (
        <div className="mt-3 text-sm text-gray-700 bg-white/90 backdrop-blur-sm rounded-lg p-2 shadow-sm">
          {caption}
        </div>
      )}
    </div>
  );
}
