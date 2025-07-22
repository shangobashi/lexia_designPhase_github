// Guest session management for free tier access

interface GuestSession {
  id: string;
  queriesUsed: number;
  maxQueries: number;
  createdAt: string;
  lastUsed: string;
}

const GUEST_SESSION_KEY = 'lexia_guest_session';
const MAX_GUEST_QUERIES = 10;

export function getGuestSession(): GuestSession {
  const stored = localStorage.getItem(GUEST_SESSION_KEY);
  
  if (stored) {
    try {
      const session = JSON.parse(stored) as GuestSession;
      
      // Check if session is from today (reset daily)
      const today = new Date().toDateString();
      const sessionDate = new Date(session.createdAt).toDateString();
      
      if (today === sessionDate) {
        return session;
      }
    } catch (error) {
      console.warn('Invalid guest session data:', error);
    }
  }
  
  // Create new session
  const newSession: GuestSession = {
    id: `guest_${Date.now()}_${Math.random().toString(36).substring(2)}`,
    queriesUsed: 0,
    maxQueries: MAX_GUEST_QUERIES,
    createdAt: new Date().toISOString(),
    lastUsed: new Date().toISOString()
  };
  
  localStorage.setItem(GUEST_SESSION_KEY, JSON.stringify(newSession));
  return newSession;
}

export function useGuestQuery(): { success: boolean; queriesRemaining: number } {
  const session = getGuestSession();
  
  if (session.queriesUsed >= session.maxQueries) {
    return { success: false, queriesRemaining: 0 };
  }
  
  session.queriesUsed += 1;
  session.lastUsed = new Date().toISOString();
  
  localStorage.setItem(GUEST_SESSION_KEY, JSON.stringify(session));
  
  return {
    success: true,
    queriesRemaining: session.maxQueries - session.queriesUsed
  };
}

export function getGuestQueriesRemaining(): number {
  const session = getGuestSession();
  return Math.max(0, session.maxQueries - session.queriesUsed);
}

export function clearGuestSession(): void {
  localStorage.removeItem(GUEST_SESSION_KEY);
}