import React, { createContext, useContext, useEffect, useState } from 'react';
import { type User, onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '../firebase/config';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Bypass Firebase auth listener if running in demo mode without real API keys
    if (!import.meta.env.VITE_FIREBASE_API_KEY || import.meta.env.VITE_FIREBASE_API_KEY === 'your_api_key') {
      setLoading(false);
      // Auto-login for convenience during UI testing
      setUser({ uid: 'demo-user', email: 'demo@forestry.org', displayName: 'Nursery Manager' } as User);
      return () => {};
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    console.log("Signing in with Google placeholder - Auto-logging in for demo");
    setUser({ uid: 'demo-user', email: 'demo@forestry.org', displayName: 'Nursery Manager' } as User);
  };

  const logout = async () => {
    if (!import.meta.env.VITE_FIREBASE_API_KEY || import.meta.env.VITE_FIREBASE_API_KEY === 'your_api_key') {
      setUser(null);
      return;
    }
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

