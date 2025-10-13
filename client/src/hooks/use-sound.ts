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

// Play audio file
const playAudioFile = (src: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const audio = new Audio(src);
    audio.volume = 0.7;
    
    audio.onended = () => resolve();
    audio.onerror = () => reject(new Error('Failed to play audio'));
    
    audio.play().catch(err => {
      console.warn('Erro ao reproduzir som:', err);
      reject(err);
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
    if (type === 'conversation' && (!soundSettings.conversationSound || soundSettings.muteConversations)) {
      return;
    }
    
    if (type === 'waiting' && (!soundSettings.waitingSound || soundSettings.muteWaiting)) {
      return;
    }

    // Play different sounds based on type
    if (type === 'conversation') {
      // Single beep for conversations
      playAudioFile('/sounds/message.mp3').catch(() => {});
    } else if (type === 'waiting') {
      // Single beep for waiting
      playAudioFile('/sounds/beep.mp3').catch(() => {});
    }
  }, [soundSettings]);

  const playWaitingSound = useCallback(() => {
    if (!soundSettings.waitingSound || soundSettings.muteWaiting) {
      return;
    }

    // Stop any existing waiting sound
    stopWaitingSound();

    if (soundSettings.waitingSoundType === 'constant') {
      // Play constant sound for waiting
      const audio = new Audio('/sounds/waiting-loop.mp3');
      audio.loop = true;
      audio.volume = 0.5;
      audio.play().catch(err => console.warn('Erro ao reproduzir som de espera:', err));
      waitingSoundRef.current = audio;
    } else {
      // Play single bip
      playAudioFile('/sounds/beep.mp3').catch(() => {});
    }
  }, [soundSettings]);

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