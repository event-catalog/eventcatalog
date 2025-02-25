import React, { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';

interface Message {
  content: string;
  isUser: boolean;
  timestamp: number;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  lastUpdated: number;
  createdAt: number;
}

interface ChatContextType {
  sessions: ChatSession[];
  currentSession: ChatSession | null;
  createSession: () => void;
  updateSession: (session: ChatSession) => void;
  deleteSession: (id: string) => void;
  addMessageToSession: (sessionId: string, content: string, isUser: boolean) => void;
  setCurrentSession: (session: ChatSession | null) => void;
  isStreaming: boolean;
  setIsStreaming: (isStreaming: boolean) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

const STORAGE_KEY = 'chat_sessions';

export function ChatProvider({ children }: { children: ReactNode }) {
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    }
    return [];
  });
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);

  const createSession = () => {
    const newSession: ChatSession = {
      id: crypto.randomUUID(),
      title: `Chat ${sessions.length + 1}`,
      messages: [],
      lastUpdated: Date.now(),
      createdAt: Date.now(),
    };

    setSessions((prev) => {
      const updated = [newSession, ...prev];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
    setCurrentSession(newSession);
  };

  const updateSession = (session: ChatSession) => {
    setSessions((prev) => {
      const index = prev.findIndex((s) => s.id === session.id);
      if (index === -1) return prev;

      const updated = [...prev];
      updated[index] = {
        ...session,
        lastUpdated: Date.now(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const deleteSession = (id: string) => {
    setSessions((prev) => {
      const updated = prev.filter((session) => session.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
    if (currentSession?.id === id) {
      setCurrentSession(null);
    }
  };

  const addMessageToSession = (sessionId: string, content: string, isUser: boolean) => {
    setSessions((prev) => {
      const index = prev.findIndex((s) => s.id === sessionId);
      if (index === -1) return prev;

      const updated = [...prev];
      const session = { ...updated[index] };
      session.messages.push({
        content,
        isUser,
        timestamp: Date.now(),
      });
      session.lastUpdated = Date.now();
      updated[index] = session;

      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  useEffect(() => {
    if (sessions.length > 0) {
      setCurrentSession(sessions[0]);
    } else {
      createSession();
    }
  }, []);

  return (
    <ChatContext.Provider
      value={{
        sessions,
        currentSession,
        createSession,
        updateSession,
        deleteSession,
        addMessageToSession,
        setCurrentSession,
        isStreaming,
        setIsStreaming,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}
