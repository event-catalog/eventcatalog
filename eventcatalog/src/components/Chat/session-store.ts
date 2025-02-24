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

class SessionStore {
  private static instance: SessionStore;
  private readonly STORAGE_KEY = 'chat_sessions';

  private constructor() {
    // Private constructor for singleton pattern
  }

  static getInstance(): SessionStore {
    if (!SessionStore.instance) {
      SessionStore.instance = new SessionStore();
    }
    return SessionStore.instance;
  }

  getAllSessions(): ChatSession[] {
    const sessions = localStorage.getItem(this.STORAGE_KEY);
    return sessions ? JSON.parse(sessions) : [];
  }

  getSession(id: string): ChatSession | null {
    const sessions = this.getAllSessions();
    return sessions.find(session => session.id === id) || null;
  }

  createSession(): ChatSession {
    const sessions = this.getAllSessions();
    const newSession: ChatSession = {
      id: crypto.randomUUID(),
      title: `Chat ${sessions.length + 1}`,
      messages: [],
      lastUpdated: Date.now(),
      createdAt: Date.now()
    };

    sessions.unshift(newSession);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(sessions));
    return newSession;
  }

  updateSession(session: ChatSession): void {
    const sessions = this.getAllSessions();
    const index = sessions.findIndex(s => s.id === session.id);
    
    if (index !== -1) {
      sessions[index] = {
        ...session,
        lastUpdated: Date.now()
      };
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(sessions));
    }
  }

  deleteSession(id: string): void {
    const sessions = this.getAllSessions();
    const filteredSessions = sessions.filter(session => session.id !== id);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filteredSessions));
  }

  addMessageToSession(sessionId: string, content: string, isUser: boolean): void {
    const session = this.getSession(sessionId);
    if (session) {
      session.messages.push({
        content,
        isUser,
        timestamp: Date.now()
      });
      session.lastUpdated = Date.now();
      this.updateSession(session);
    }
  }
}

export const sessionStore = SessionStore.getInstance();