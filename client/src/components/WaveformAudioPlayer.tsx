import { useEffect, useRef, useState } from 'react';
import { Play, Pause, Download, Gauge } from 'lucide-react';

interface WaveformAudioPlayerProps {
  src: string;
  messageId: string;
}

export function WaveformAudioPlayer({ src, messageId }: WaveformAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const animationRef = useRef<number>();

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // Aplicar velocidade de reprodução
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  // Desenhar waveform
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      const width = canvas.width;
      const height = canvas.height;
      const barCount = 40;
      const barWidth = width / barCount;
      const progress = duration > 0 ? currentTime / duration : 0;

      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < barCount; i++) {
        const barHeight = Math.random() * height * 0.8 + height * 0.1;
        const x = i * barWidth;
        const y = (height - barHeight) / 2;

        // Cor baseada no progresso
        if (i / barCount < progress) {
          ctx.fillStyle = isPlaying ? '#10b981' : '#6b7280'; // verde quando tocando, cinza quando pausado
        } else {
          ctx.fillStyle = '#d1d5db'; // cinza claro para parte não tocada
        }

        ctx.fillRect(x + 1, y, barWidth - 2, barHeight);
      }

      if (isPlaying) {
        animationRef.current = requestAnimationFrame(draw);
      }
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, currentTime, duration]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col gap-2 bg-gray-100 rounded-lg p-3 min-w-[300px] max-w-sm">
      {/* Linha 1: Play + Waveform */}
      <div className="flex items-center gap-2">
        <button
          onClick={togglePlay}
          className="w-10 h-10 rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center text-white transition-colors shadow-sm flex-shrink-0"
        >
          {isPlaying ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
        </button>
        <canvas
          ref={canvasRef}
          width={200}
          height={36}
          className="flex-1"
        />
      </div>
      
      {/* Linha 2: Controles */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-white border border-gray-300 rounded-md px-2 py-1">
            <Gauge size={14} className="text-gray-500" />
            <select
              value={playbackRate}
              onChange={(e) => setPlaybackRate(Number(e.target.value))}
              className="text-xs bg-transparent border-none outline-none cursor-pointer font-medium"
              title="Velocidade de reprodução"
            >
              <option value="0.5">0.5x</option>
              <option value="1">1x</option>
              <option value="1.5">1.5x</option>
              <option value="2">2x</option>
            </select>
          </div>
          
          <a
            href={src}
            download
            className="flex items-center gap-1 px-3 py-1 bg-white border border-gray-300 hover:bg-gray-50 rounded-md transition-colors text-xs font-medium text-gray-700"
            title="Baixar áudio"
          >
            <Download size={14} />
            <span>Baixar</span>
          </a>
        </div>
        
        <span className="text-xs text-gray-600 font-mono whitespace-nowrap">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
      </div>
      
      <audio ref={audioRef} src={src} preload="metadata" />
    </div>
  );
}

