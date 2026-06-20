import AsyncStorage from '@react-native-async-storage/async-storage';

import { supabase } from './supabase';

export type AuthMode = 'create' | 'login';

const passcodePrefix = 'crewpay.passcode.v1';
const passcodeAttemptsPrefix = 'crewpay.passcode-attempts.v1';
const passcodeLockPrefix = 'crewpay.passcode-lock.v1';
const maxPasscodeAttempts = 5;
const lockDurationMs = 5 * 60 * 1000;

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

export async function saveLocalPasscode(userId: string, passcode: string) {
  if (!/^\d{4}$/.test(passcode)) {
    throw new Error('Passcode must be 4 digits.');
  }

  await AsyncStorage.setItem(secureKey(passcodePrefix, userId), passcode);
  await AsyncStorage.removeItem(secureKey(passcodeAttemptsPrefix, userId));
  await AsyncStorage.removeItem(secureKey(passcodeLockPrefix, userId));
}

export async function hasLocalPasscode(userId: string) {
  const passcode = await AsyncStorage.getItem(secureKey(passcodePrefix, userId));

  return Boolean(passcode);
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
  const lockKey = secureKey(passcodeLockPrefix, userId);
  const attemptsKey = secureKey(passcodeAttemptsPrefix, userId);
  const lockedUntilRaw = await AsyncStorage.getItem(lockKey);
  const lockedUntil = lockedUntilRaw ? Number(lockedUntilRaw) : 0;

  if (lockedUntil > Date.now()) {
    return { attemptsRemaining: 0, lockedUntil, ok: false };
  }

  const storedPasscode = await AsyncStorage.getItem(
    secureKey(passcodePrefix, userId),
  );

  if (storedPasscode && storedPasscode === passcode) {
    await AsyncStorage.removeItem(attemptsKey);
    await AsyncStorage.removeItem(lockKey);
    return { attemptsRemaining: maxPasscodeAttempts, ok: true };
  }

  const previousAttempts = Number(await AsyncStorage.getItem(attemptsKey));
  const attempts = Number.isFinite(previousAttempts) ? previousAttempts + 1 : 1;
  const attemptsRemaining = Math.max(0, maxPasscodeAttempts - attempts);

  await AsyncStorage.setItem(attemptsKey, String(attempts));

  if (attempts >= maxPasscodeAttempts) {
    const nextLockedUntil = Date.now() + lockDurationMs;
    await AsyncStorage.setItem(lockKey, String(nextLockedUntil));
    return { attemptsRemaining: 0, lockedUntil: nextLockedUntil, ok: false };
  }

  return { attemptsRemaining, ok: false };
}
