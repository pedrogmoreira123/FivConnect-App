import React, { useState, useRef } from 'react';
import { Download, Play, Pause, Volume2, VolumeX, Maximize2 } from 'lucide-react';

interface VideoMessageProps {
  mediaUrl: string;
  caption?: string;
  fileName?: string;
  messageId: string;
}

export default function VideoMessage({ mediaUrl, caption, fileName, messageId }: VideoMessageProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [showControls, setShowControls] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Usar URL direta sem cache-busting para evitar problemas
  const getVideoUrl = (url: string) => {
    return url; // Usar URL direta do S3
  };

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleMuteToggle = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = mediaUrl;
    link.download = fileName || `video_${messageId}.mp4`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFullscreen = () => {
    if (videoRef.current) {
      if (videoRef.current.requestFullscreen) {
        videoRef.current.requestFullscreen();
      } else if ((videoRef.current as any).webkitRequestFullscreen) {
        (videoRef.current as any).webkitRequestFullscreen();
      } else if ((videoRef.current as any).msRequestFullscreen) {
        (videoRef.current as any).msRequestFullscreen();
      }
    }
  };

  const handleVideoLoad = () => {
    if (videoRef.current) {
      videoRef.current.muted = true; // Iniciar mutado
    }
  };

  const [videoError, setVideoError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [useOriginalUrl, setUseOriginalUrl] = useState(false);

  const handleVideoError = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    console.error('Erro ao carregar vídeo:', e);
    console.error('URL do vídeo:', mediaUrl);
    setVideoError(true);
  };

  if (videoError) {
    return (
      <div className="bg-gray-100 rounded-lg p-4 text-center">
        <p className="text-gray-500 text-sm">Erro ao carregar vídeo</p>
        <button
          onClick={() => {
            setVideoError(false);
            setRetryCount(0);
            if (videoRef.current) {
              videoRef.current.src = getVideoUrl(mediaUrl);
              videoRef.current.load();
            }
          }}
          className="text-blue-500 text-xs mt-2 hover:underline"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div className="relative group">
      <div 
        className="relative bg-black rounded-lg overflow-hidden"
        onMouseEnter={() => setShowControls(true)}
        onMouseLeave={() => setShowControls(false)}
      >
        <video
          ref={videoRef}
          src={mediaUrl}
          className="max-w-full h-auto cursor-pointer"
          onClick={handlePlayPause}
          onLoadedData={handleVideoLoad}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onError={handleVideoError}
          loop={false}
          muted={true}
          preload="metadata"
          crossOrigin="anonymous"
        />
        
        {/* Controles de vídeo */}
        <div className={`absolute inset-0 flex items-center justify-center transition-opacity ${
          showControls || !isPlaying ? 'opacity-100' : 'opacity-0'
        }`}>
          <button
            onClick={handlePlayPause}
            className="bg-black/70 text-white p-4 rounded-full hover:bg-black/90 transition-colors"
          >
            {isPlaying ? <Pause className="h-8 w-8" /> : <Play className="h-8 w-8" />}
          </button>
        </div>
        
        {/* Botão de download no canto superior esquerdo */}
        <button
          onClick={handleDownload}
          className="absolute top-2 left-2 bg-black/70 text-white p-2 rounded-full hover:bg-black/90 transition-colors z-10"
          title="Baixar vídeo"
        >
          <Download className="h-4 w-4" />
        </button>

        {/* Controles inferiores */}
        <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3 transition-opacity ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={handleMuteToggle}
                className="text-white hover:text-gray-300 transition-colors"
              >
                {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
              </button>
            </div>
            
            <button
              onClick={handleFullscreen}
              className="text-white hover:text-gray-300 transition-colors"
              title="Tela cheia"
            >
              <Maximize2 className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
      
      {/* Legenda */}
      {caption && (
        <div className="mt-2 text-sm text-gray-700 bg-white/90 backdrop-blur-sm rounded-lg p-2 shadow-sm">
          {caption}
        </div>
      )}
    </div>
  );
}