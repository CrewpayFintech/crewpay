import AsyncStorage from '@react-native-async-storage/async-storage';

import { supabase } from './supabase';

export type AuthMode = 'create' | 'login';

const legacyPasscodePrefix = 'crewpay.passcode.v1';
const legacyPasscodeAttemptsPrefix = 'crewpay.passcode-attempts.v1';
const legacyPasscodeLockPrefix = 'crewpay.passcode-lock.v1';
const maxPasscodeAttempts = 5;

function secureKey(prefix: string, userId: string) {
  return `${prefix}.${userId.replace(/[^A-Za-z0-9._-]/g, '_')}`;
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(email));
}

export function validatePassword(password: string) {
  return (
    password.length >= 9 &&
    /[A-Za-z]/.test(password) &&
    /\d/.test(password)
  );
}

export async function sendEmailCode(email: string, mode: AuthMode) {
  const normalizedEmail = normalizeEmail(email);

  if (!isValidEmail(normalizedEmail)) {
    throw new Error('Enter a valid email address.');
  }

  const result = await supabase.auth.signInWithOtp({
    email: normalizedEmail,
    options: {
      shouldCreateUser: mode === 'create',
    },
  });

  if (result.error) {
    throw new Error(result.error.message);
  }
}

export async function verifyEmailCode(email: string, code: string) {
  const normalizedEmail = normalizeEmail(email);
  const cleanCode = code.replace(/\D/g, '').slice(0, 6);

  if (!isValidEmail(normalizedEmail)) {
    throw new Error('Enter a valid email address.');
  }

  if (cleanCode.length !== 6) {
    throw new Error('Enter the 6-digit code from your email.');
  }

  const result = await supabase.auth.verifyOtp({
    email: normalizedEmail,
    token: cleanCode,
    type: 'email',
  });

  if (result.error || !result.data.user) {
    throw new Error(result.error?.message ?? 'Could not verify this code.');
  }

  return result.data.user;
}

export async function setAccountPassword(password: string) {
  if (!validatePassword(password)) {
    throw new Error('Use at least 9 characters with a letter and a number.');
  }

  const result = await supabase.auth.updateUser({ password });

  if (result.error) {
    throw new Error(result.error.message);
  }
}

export async function getCurrentUser() {
  const result = await supabase.auth.getUser();

  if (result.error) {
    throw new Error(result.error.message);
  }

  return result.data.user;
}

export async function signOut() {
  const result = await supabase.auth.signOut();

  if (result.error) {
    throw new Error(result.error.message);
  }
}

async function clearLegacyPasscode(userId: string) {
  await Promise.all([
    AsyncStorage.removeItem(secureKey(legacyPasscodePrefix, userId)),
    AsyncStorage.removeItem(secureKey(legacyPasscodeAttemptsPrefix, userId)),
    AsyncStorage.removeItem(secureKey(legacyPasscodeLockPrefix, userId)),
  ]);
}

export async function saveLocalPasscode(userId: string, passcode: string) {
  if (!/^\d{4}$/.test(passcode)) {
    throw new Error('Passcode must be 4 digits.');
  }

  const { error } = await supabase.rpc('set_my_passcode', {
    p_passcode: passcode,
  });

  if (error) {
    throw new Error(error.message);
  }

  await clearLegacyPasscode(userId);
}

export async function hasLocalPasscode(userId: string) {
  const { data, error } = await supabase.rpc('has_my_passcode');

  if (error) {
    throw new Error(error.message);
  }

  if (data) {
    await clearLegacyPasscode(userId);
    return true;
  }

  const legacyPasscode = await AsyncStorage.getItem(
    secureKey(legacyPasscodePrefix, userId),
  );

  if (/^\d{4}$/.test(legacyPasscode ?? '')) {
    await saveLocalPasscode(userId, legacyPasscode!);
    return true;
  }

  return false;
}

export type PasscodeVerificationResult = {
  attemptsRemaining: number;
  lockedUntil?: number;
  ok: boolean;
};

export async function verifyLocalPasscode(
  userId: string,
  passcode: string,
): Promise<PasscodeVerificationResult> {
  if (!/^\d{4}$/.test(passcode)) {
    return { attemptsRemaining: 0, ok: false };
  }

  const { data, error } = await supabase.rpc('verify_my_passcode', {
    p_passcode: passcode,
  });

  if (error) {
    throw new Error(error.message);
  }

  const result = Array.isArray(data) ? data[0] : data;
  const lockedUntil = result?.locked_until
    ? Date.parse(result.locked_until)
    : undefined;
  const verification: PasscodeVerificationResult = {
    attemptsRemaining: Number(
      result?.attempts_remaining ?? maxPasscodeAttempts,
    ),
    lockedUntil:
      lockedUntil && Number.isFinite(lockedUntil) ? lockedUntil : undefined,
    ok: Boolean(result?.ok),
  };

  if (verification.ok) {
    await clearLegacyPasscode(userId);
  }

  return verification;
}
