import { useCallback, useRef, useState, useEffect } from 'react';

interface SoundSettings {
  conversationSound: boolean;
  waitingSound: boolean;
  waitingSoundType: 'constant' | 'bip';
  muteConversations: boolean;
  muteWaiting: boolean;
}

interface SoundHook {
  playNotificationSound: (type: 'conversation' | 'waiting') => void;
  playWaitingSound: () => void;
  stopWaitingSound: () => void;
  soundSettings: SoundSettings;
  updateSoundSettings: (settings: Partial<SoundSettings>) => void;
}

// Generate beep sound programmatically
const createBeepSound = (frequency: number = 800, duration: number = 200): Promise<void> => {
  return new Promise((resolve) => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = frequency;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration / 1000);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + duration / 1000);
      
      oscillator.onended = () => resolve();
    } catch (error) {
      console.warn('Erro ao criar som programático:', error);
      resolve();
    }
  });
};

// Play audio file with fallback
const playAudioFile = (src: string, fallbackFrequency: number = 800): Promise<void> => {
  return new Promise((resolve) => {
    const audio = new Audio(src);
    audio.volume = 0.7;
    
    audio.onended = () => resolve();
    audio.onerror = () => {
      console.warn('Erro ao reproduzir arquivo de som, usando fallback:', src);
      createBeepSound(fallbackFrequency).then(resolve);
    };
    
    audio.play().catch(err => {
      console.warn('Erro ao reproduzir som:', err);
      createBeepSound(fallbackFrequency).then(resolve);
    });
  });
};

export function useSound(): SoundHook {
  const waitingSoundRef = useRef<HTMLAudioElement | null>(null);
  const waitingSoundIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Get settings from localStorage
  const getStoredSettings = (): SoundSettings => {
    try {
      const stored = localStorage.getItem('soundSettings');
      return stored ? JSON.parse(stored) : {
        conversationSound: true,
        waitingSound: true,
        waitingSoundType: 'bip',
        muteConversations: false,
        muteWaiting: false,
      };
    } catch {
      return {
        conversationSound: true,
        waitingSound: true,
        waitingSoundType: 'bip',
        muteConversations: false,
        muteWaiting: false,
      };
    }
  };

  const [soundSettings, setSoundSettings] = useState<SoundSettings>(getStoredSettings);

  const playNotificationSound = useCallback((type: 'conversation' | 'waiting') => {
    console.log('🔔 playNotificationSound chamado:', { 
      type, 
      conversationSound: soundSettings.conversationSound, 
      muteConversations: soundSettings.muteConversations 
    });

    if (type === 'conversation' && (!soundSettings.conversationSound || soundSettings.muteConversations)) {
      return;
    }
    
    if (type === 'waiting' && (!soundSettings.waitingSound || soundSettings.muteWaiting)) {
      return;
    }

    // Play different sounds based on type
    if (type === 'conversation') {
      // Single beep for conversations (higher frequency)
      playAudioFile('/sounds/message.mp3', 1000).catch(() => {});
    } else if (type === 'waiting') {
      // Single beep for waiting (lower frequency)
      playAudioFile('/sounds/beep.mp3', 600).catch(() => {});
    }
  }, [soundSettings]);

  const playWaitingSound = useCallback(() => {
    console.log('🔔 playWaitingSound chamado:', { 
      waitingSound: soundSettings.waitingSound, 
      muteWaiting: soundSettings.muteWaiting, 
      waitingSoundType: soundSettings.waitingSoundType,
      alreadyPlaying: !!(waitingSoundRef.current || waitingSoundIntervalRef.current),
      audioPaused: waitingSoundRef.current?.paused
    });

    // Se estiver mutado ou desabilitado, parar som
    if (!soundSettings.waitingSound || soundSettings.muteWaiting) {
      stopWaitingSound();
      return;
    }

    // Verificar se o som está REALMENTE tocando (não apenas a ref existe)
    const isReallyPlaying = waitingSoundRef.current && !waitingSoundRef.current.paused;
    const hasInterval = !!waitingSoundIntervalRef.current;
    
    if (isReallyPlaying || hasInterval) {
      console.log('🔔 Som de espera já está tocando ativamente, mantendo...');
      return;
    }

    // Se chegou aqui, precisa iniciar o som
    console.log('🔔 Iniciando som de espera...');
    
    // Limpar qualquer referência antiga
    stopWaitingSound();

    if (soundSettings.waitingSoundType === 'constant') {
      // Play constant sound for waiting
      const audio = new Audio('/sounds/waiting-loop.mp3');
      audio.loop = true;
      audio.volume = 0.5;
      
      audio.onerror = () => {
        console.warn('Erro ao reproduzir som de espera em loop, usando fallback');
        const interval = setInterval(() => {
          createBeepSound(600, 300).catch(() => {});
        }, 2000);
        waitingSoundIntervalRef.current = interval;
      };
      
      audio.play().then(() => {
        console.log('🔔 Som de espera iniciado com sucesso');
        waitingSoundRef.current = audio;
      }).catch(err => {
        console.warn('Erro ao reproduzir som de espera:', err);
        const interval = setInterval(() => {
          createBeepSound(600, 300).catch(() => {});
        }, 2000);
        waitingSoundIntervalRef.current = interval;
      });
    } else {
      // Play single bip
      playAudioFile('/sounds/beep.mp3', 600).catch(() => {});
    }
  }, [soundSettings.waitingSound, soundSettings.muteWaiting, soundSettings.waitingSoundType]);

  const stopWaitingSound = useCallback(() => {
    if (waitingSoundIntervalRef.current) {
      clearInterval(waitingSoundIntervalRef.current);
      waitingSoundIntervalRef.current = null;
    }

    if (waitingSoundRef.current) {
      try {
        waitingSoundRef.current.pause();
        waitingSoundRef.current.currentTime = 0;
      } catch (error) {
        // Ignore errors when stopping sounds
      }
      waitingSoundRef.current = null;
    }
  }, []);

  const updateSoundSettings = useCallback((newSettings: Partial<SoundSettings>) => {
    const updatedSettings = { ...soundSettings, ...newSettings };
    setSoundSettings(updatedSettings);
    
    // Save to localStorage
    try {
      localStorage.setItem('soundSettings', JSON.stringify(updatedSettings));
    } catch (error) {
      console.warn('Failed to save sound settings:', error);
    }

    // Stop waiting sound if muted
    if (newSettings.muteWaiting || newSettings.waitingSound === false) {
      stopWaitingSound();
    }
  }, [soundSettings, stopWaitingSound]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopWaitingSound();
    };
  }, [stopWaitingSound]);

  return {
    playNotificationSound,
    playWaitingSound,
    stopWaitingSound,
    soundSettings,
    updateSoundSettings,
  };
}