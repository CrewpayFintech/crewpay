import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

function toSecureStoreKey(key: string) {
  return key.replace(/[^A-Za-z0-9._-]/g, (character) => {
    return `_${character.charCodeAt(0).toString(16)}_`;
  });
}

const supabaseSecureStorage = {
  getItem: async (key: string) => {
    try {
      return await AsyncStorage.getItem(toSecureStoreKey(key));
    } catch {
      return null;
    }
  },
  removeItem: async (key: string) => {
    try {
      await AsyncStorage.removeItem(toSecureStoreKey(key));
    } catch {
      // A failed delete should not block the app from starting.
    }
  },
  setItem: async (key: string, value: string) => {
    await AsyncStorage.setItem(toSecureStoreKey(key), value);
  },
};

let _supabase: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (_supabase) return _supabase;

  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Supabase is not configured. Please set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in your environment secrets.',
    );
  }

  _supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      detectSessionInUrl: false,
      persistSession: true,
      storage: supabaseSecureStorage,
    },
  });

  return _supabase;
}

// Convenience proxy that lets existing code use `supabase.from(...)` etc.
// It throws a helpful error if Supabase isn't configured yet.
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return (getSupabase() as unknown as Record<string | symbol, unknown>)[prop];
  },
});
