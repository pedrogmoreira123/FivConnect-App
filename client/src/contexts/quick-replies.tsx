import React, { createContext, useContext, useEffect, useState } from 'react';

type QuickReply = { id: string; shortcut: string; message: string };

type QuickRepliesContextType = {
  quickReplies: QuickReply[];
  setQuickReplies: (replies: QuickReply[]) => void;
};

const QuickRepliesContext = createContext<QuickRepliesContextType | undefined>(undefined);

export function QuickRepliesProvider({ children }: { children: React.ReactNode }) {
  const [quickReplies, setQuickRepliesState] = useState<QuickReply[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('quickReplies');
      if (stored) setQuickRepliesState(JSON.parse(stored));
    } catch {}
  }, []);

  const setQuickReplies = (replies: QuickReply[]) => {
    setQuickRepliesState(replies);
    try { localStorage.setItem('quickReplies', JSON.stringify(replies)); } catch {}
  };

  return (
    <QuickRepliesContext.Provider value={{ quickReplies, setQuickReplies }}>
      {children}
    </QuickRepliesContext.Provider>
  );
}

export function useQuickReplies() {
  const ctx = useContext(QuickRepliesContext);
  if (!ctx) throw new Error('useQuickReplies must be used within QuickRepliesProvider');
  return ctx;
}




