import { useState, useEffect, createContext, useContext } from 'react';

interface User {
  id: string;
  email: string;
  name: string;
  subscription?: {
    status: 'active' | 'canceled' | 'past_due' | 'trialing';
    planId: string;
    currentPeriodEnd: string;
  };
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Mock authentication hook for demo purposes
export const useAuthState = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate checking for existing session
    const checkAuth = async () => {
      try {
        // In a real app, this would check for a valid session/token
        const mockUser: User = {
          id: 'user_123',
          email: 'demo@lexia.be',
          name: 'Demo User',
          subscription: {
            status: 'active',
            planId: 'plan-premium',
            currentPeriodEnd: '2025-06-01T00:00:00Z'
          }
        };
        
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        setUser(mockUser);
      } catch (error) {
        console.error('Auth check failed:', error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email: string, _password: string) => {
    setIsLoading(true);
    try {
      // Simulate login API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const mockUser: User = {
        id: 'user_123',
        email,
        name: 'Demo User'
      };
      
      setUser(mockUser);
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    // In a real app, clear tokens/sessions
  };

  return {
    user,
    isLoading,
    login,
    logout,
    isAuthenticated: !!user
  };
};

export { AuthContext };
export type { User, AuthContextType };
