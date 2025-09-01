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

// Create audio context for sounds
const createBeepSound = (frequency: number, duration: number, volume: number = 0.3) => {
  if (typeof window === 'undefined' || !window.AudioContext) return null;
  
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(volume, audioContext.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration);

    return { audioContext, oscillator };
  } catch (error) {
    console.warn('Error creating audio context:', error);
    return null;
  }
};

export function useSound(): SoundHook {
  const waitingSoundRef = useRef<{ audioContext: AudioContext, oscillator: OscillatorNode } | null>(null);
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
      // Single beep for conversations (800Hz, 200ms)
      createBeepSound(800, 0.2);
    } else if (type === 'waiting') {
      // Single beep for waiting (600Hz, 300ms)  
      createBeepSound(600, 0.3);
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
      const playConstantSound = () => {
        const result = createBeepSound(400, 0.5, 0.1);
        if (result) {
          waitingSoundRef.current = result;
        }
      };

      // Play immediately and then repeat every 2 seconds
      playConstantSound();
      waitingSoundIntervalRef.current = setInterval(playConstantSound, 2000);
    } else {
      // Play single bip
      createBeepSound(400, 0.2);
    }
  }, [soundSettings]);

  const stopWaitingSound = useCallback(() => {
    if (waitingSoundIntervalRef.current) {
      clearInterval(waitingSoundIntervalRef.current);
      waitingSoundIntervalRef.current = null;
    }

    if (waitingSoundRef.current) {
      try {
        waitingSoundRef.current.oscillator.stop();
        waitingSoundRef.current.audioContext.close();
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