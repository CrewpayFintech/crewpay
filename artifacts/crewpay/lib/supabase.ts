import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

declare const process: {
  env: Record<string, string | undefined>;
};

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables.');
}

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

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    detectSessionInUrl: false,
    persistSession: true,
    storage: supabaseSecureStorage,
  },
});
