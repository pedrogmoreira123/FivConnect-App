import { useRef } from 'react';
import { useSound } from './use-sound';

export function useNotificationSound() {
  const { soundSettings } = useSound();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  const playSound = (type: 'conversation' | 'waiting') => {
    try {
      if (type === 'conversation' && soundSettings.conversationSound && !soundSettings.muteConversations) {
        const audio = new Audio('/sounds/message.mp3');
        audio.play().catch(err => console.log('Erro ao reproduzir som de mensagem:', err));
      }
      
      if (type === 'waiting' && soundSettings.waitingSound && !soundSettings.muteWaiting) {
        if (soundSettings.waitingSoundType === 'beep') {
          const audio = new Audio('/sounds/beep.mp3');
          audio.play().catch(err => console.log('Erro ao reproduzir bip:', err));
        } else {
          // Continuous loop
          if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
          }
          
          audioRef.current = new Audio('/sounds/waiting-loop.mp3');
          audioRef.current.loop = true;
          audioRef.current.play().catch(err => console.log('Erro ao reproduzir som contínuo:', err));
        }
      }
    } catch (error) {
      console.log('Não foi possível reproduzir som de notificação:', error);
    }
  };
  
  const stopSound = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
  };
  
  return { playSound, stopSound };
}


import { useSound } from './use-sound';

export function useNotificationSound() {
  const { soundSettings } = useSound();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  const playSound = (type: 'conversation' | 'waiting') => {
    try {
      if (type === 'conversation' && soundSettings.conversationSound && !soundSettings.muteConversations) {
        const audio = new Audio('/sounds/message.mp3');
        audio.play().catch(err => console.log('Erro ao reproduzir som de mensagem:', err));
      }
      
      if (type === 'waiting' && soundSettings.waitingSound && !soundSettings.muteWaiting) {
        if (soundSettings.waitingSoundType === 'beep') {
          const audio = new Audio('/sounds/beep.mp3');
          audio.play().catch(err => console.log('Erro ao reproduzir bip:', err));
        } else {
          // Continuous loop
          if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
          }
          
          audioRef.current = new Audio('/sounds/waiting-loop.mp3');
          audioRef.current.loop = true;
          audioRef.current.play().catch(err => console.log('Erro ao reproduzir som contínuo:', err));
        }
      }
    } catch (error) {
      console.log('Não foi possível reproduzir som de notificação:', error);
    }
  };
  
  const stopSound = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
  };
  
  return { playSound, stopSound };
}

