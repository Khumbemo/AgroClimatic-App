import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { IS_DEMO } from '../config';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  /** Message from the last failed sign-in, if any. */
  authError: string | null;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const DEMO_USER = { uid: 'demo-user', email: 'demo@forestry.org', displayName: 'Nursery Manager' } as User;

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// The Firebase SDK is only loaded when a real project is configured.
const loadAuth = async () => {
  const [{ getFirebaseAuth }, sdk] = await Promise.all([import('../firebase/config'), import('firebase/auth')]);
  return { auth: getFirebaseAuth(), sdk };
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Demo mode (no Firebase keys) signs in a demo user so the app can be tried without an account.
  const [user, setUser] = useState<User | null>(IS_DEMO ? DEMO_USER : null);
  const [loading, setLoading] = useState(!IS_DEMO);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    if (IS_DEMO) return;
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;
    loadAuth()
      .then(({ auth, sdk }) => {
        if (cancelled) return;
        unsubscribe = sdk.onAuthStateChanged(auth, u => {
          setUser(u);
          setLoading(false);
        });
      })
      .catch(e => {
        setAuthError(`Could not start sign-in: ${(e as Error).message}`);
        setLoading(false);
      });
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

  const signInWithGoogle = async () => {
    setAuthError(null);
    if (IS_DEMO) {
      setUser(DEMO_USER);
      return;
    }
    const { auth, sdk } = await loadAuth();
    const provider = new sdk.GoogleAuthProvider();
    try {
      await sdk.signInWithPopup(auth, provider);
    } catch (e) {
      const code = (e as { code?: string }).code;
      if (code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-this-environment') {
        // Embedded browsers and some WebViews block popups; fall back to a full-page redirect.
        await sdk.signInWithRedirect(auth, provider);
      } else if (code !== 'auth/popup-closed-by-user' && code !== 'auth/cancelled-popup-request') {
        setAuthError((e as Error).message);
      }
    }
  };

  const logout = async () => {
    if (IS_DEMO) {
      setUser(null);
      return;
    }
    const { auth, sdk } = await loadAuth();
    await sdk.signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, loading, authError, signInWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
