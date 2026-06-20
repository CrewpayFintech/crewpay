import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { AppState } from 'react-native';
import type { User } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';
import {
  getCurrentUser,
  hasLocalPasscode,
  signOut as signOutUser,
} from '@/lib/auth-service';
import { getMyProfile, type ProfileRecord } from '@/lib/profile-service';
import type { AppScreen } from '@/types/app';

type AppContextValue = {
  currentScreen: AppScreen;
  setCurrentScreen: (screen: AppScreen) => void;
  user: User | null;
  profile: ProfileRecord | null;
  setProfile: (profile: ProfileRecord | null) => void;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('onboarding');
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileRecord | null>(null);
  const appStateRef = useRef(AppState.currentState);

  const refreshProfile = useCallback(async () => {
    try {
      const p = await getMyProfile();
      setProfile(p);
    } catch {
      setProfile(null);
    }
  }, []);

  const signOut = useCallback(async () => {
    await signOutUser();
    setUser(null);
    setProfile(null);
    setCurrentScreen('onboarding');
  }, []);

  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const currentUser = session?.user ?? null;

        if (!mounted) return;

        setUser(currentUser);

        if (currentUser) {
          const p = await getMyProfile();
          if (!mounted) return;
          setProfile(p);

          if (p?.onboarding_completed_at) {
            const hasPasscode = await hasLocalPasscode(currentUser.id);
            setCurrentScreen(hasPasscode ? 'passcode-lock' : 'home');
          } else {
            setCurrentScreen('account-intro');
          }
        } else {
          setCurrentScreen('onboarding');
        }
      } catch {
        if (mounted) {
          setCurrentScreen('onboarding');
        }
      }
    };

    initialize();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        const currentUser = session?.user ?? null;
        setUser(currentUser);

        if (event === 'SIGNED_OUT') {
          setProfile(null);
          setCurrentScreen('onboarding');
        } else if (currentUser && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
          try {
            const p = await getMyProfile();
            if (!mounted) return;
            setProfile(p);
          } catch {
            // ignore
          }
        }
      },
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      appStateRef.current = nextState;
    });

    return () => sub.remove();
  }, []);

  return (
    <AppContext.Provider
      value={{
        currentScreen,
        setCurrentScreen,
        user,
        profile,
        setProfile,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used within AppProvider');
  return ctx;
}
