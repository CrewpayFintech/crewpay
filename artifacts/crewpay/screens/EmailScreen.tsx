import React, { useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { palette } from '@/constants/theme';
import { checkEmailImage } from '@/constants/onboarding';
import { useAppContext } from '@/contexts/AppContext';
import { sendEmailCode, verifyEmailCode, isValidEmail, normalizeEmail } from '@/lib/auth-service';
import { getMyProfile } from '@/lib/profile-service';
import { hasLocalPasscode } from '@/lib/auth-service';
import type { EmailStep } from '@/types/app';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export function EmailScreen() {
  const insets = useSafeAreaInsets();
  const { setCurrentScreen, setProfile } = useAppContext();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 34 + insets.bottom : insets.bottom + 24;

  const widthScale = SCREEN_WIDTH / 590;
  const heightScale = SCREEN_HEIGHT / 1280;
  const scale = Math.min(widthScale, heightScale);
  const s = (v: number) => Math.round(v * scale);
  const y = (v: number) => Math.round(v * heightScale);
  const x = (v: number) => Math.round(v * widthScale);

  const [step, setStep] = useState<EmailStep>('entry');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [isNewAccount, setIsNewAccount] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSendCode = async () => {
    if (!isValidEmail(email)) {
      setError('Enter a valid email address.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await sendEmailCode(normalizeEmail(email), isNewAccount ? 'create' : 'login');
      setStep('otp');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (code.replace(/\D/g, '').length < 6) {
      setError('Enter the 6-digit code from your email.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const user = await verifyEmailCode(email, code);
      const profile = await getMyProfile();
      setProfile(profile);

      if (profile?.onboarding_completed_at) {
        const hasPasscode = await hasLocalPasscode(user.id);
        setCurrentScreen(hasPasscode ? 'passcode-lock' : 'home');
      } else {
        setCurrentScreen('account-intro');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not verify code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: palette.paper }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingTop: topPad, paddingBottom: bottomPad }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ paddingHorizontal: x(36), paddingTop: y(20) }}>
          <Pressable onPress={() => setCurrentScreen('onboarding')}>
            <Text style={{ color: palette.muted, fontSize: s(16), fontWeight: '500' }}>← Back</Text>
          </Pressable>
        </View>

        {step === 'entry' ? (
          <View style={{ paddingHorizontal: x(36), paddingTop: y(40), flex: 1 }}>
            <Text
              style={{
                color: palette.ink,
                fontSize: s(34),
                fontWeight: '900',
                letterSpacing: -s(1.4),
              }}
            >
              {isNewAccount ? 'Create account' : 'Sign in'}
            </Text>
            <Text
              style={{
                color: palette.muted,
                fontSize: s(17),
                marginTop: s(10),
                lineHeight: s(24),
              }}
            >
              We'll send a verification code to your email.
            </Text>

            <View style={{ marginTop: y(32) }}>
              <Text style={{ color: palette.muted, fontSize: s(14), fontWeight: '600', marginBottom: s(8) }}>
                Email address
              </Text>
              <TextInput
                value={email}
                onChangeText={(v) => { setEmail(v); setError(''); }}
                placeholder="you@example.com"
                placeholderTextColor={palette.muted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                style={{
                  borderColor: error ? '#bd2f20' : palette.rail,
                  borderRadius: s(12),
                  borderWidth: 1.5,
                  color: palette.ink,
                  fontSize: s(18),
                  height: y(58),
                  paddingHorizontal: x(18),
                }}
              />
              {!!error && (
                <Text style={{ color: '#bd2f20', fontSize: s(14), marginTop: s(6) }}>{error}</Text>
              )}
            </View>

            <Pressable
              onPress={handleSendCode}
              disabled={loading}
              style={({ pressed }) => ({
                backgroundColor: palette.green,
                borderRadius: s(18),
                alignItems: 'center',
                justifyContent: 'center',
                height: y(72),
                marginTop: y(28),
                opacity: pressed || loading ? 0.85 : 1,
              })}
            >
              {loading ? (
                <ActivityIndicator color={palette.ink} />
              ) : (
                <Text style={{ color: palette.ink, fontSize: s(19), fontWeight: '800' }}>
                  Send code
                </Text>
              )}
            </Pressable>

            <Pressable
              onPress={() => setIsNewAccount(!isNewAccount)}
              style={{ alignItems: 'center', marginTop: s(20) }}
            >
              <Text style={{ color: palette.muted, fontSize: s(15), fontWeight: '500' }}>
                {isNewAccount ? 'Already have an account? Sign in' : "Don't have an account? Create one"}
              </Text>
            </Pressable>
          </View>
        ) : (
          <View style={{ paddingHorizontal: x(36), paddingTop: y(40), flex: 1 }}>
            <Image
              source={checkEmailImage}
              style={{ width: x(120), height: x(120), borderRadius: x(24), alignSelf: 'center' }}
              resizeMode="cover"
            />
            <Text
              style={{
                color: palette.ink,
                fontSize: s(30),
                fontWeight: '900',
                letterSpacing: -s(1.2),
                marginTop: y(28),
                textAlign: 'center',
              }}
            >
              Check your email
            </Text>
            <Text
              style={{
                color: palette.muted,
                fontSize: s(16),
                marginTop: s(10),
                textAlign: 'center',
                lineHeight: s(23),
              }}
            >
              We sent a 6-digit code to{'\n'}
              <Text style={{ color: palette.ink, fontWeight: '700' }}>{email}</Text>
            </Text>

            <View style={{ marginTop: y(32) }}>
              <TextInput
                value={code}
                onChangeText={(v) => { setCode(v.replace(/\D/g, '').slice(0, 6)); setError(''); }}
                placeholder="000000"
                placeholderTextColor={palette.muted}
                keyboardType="number-pad"
                style={{
                  borderColor: error ? '#bd2f20' : palette.rail,
                  borderRadius: s(12),
                  borderWidth: 1.5,
                  color: palette.ink,
                  fontSize: s(28),
                  fontWeight: '700',
                  height: y(72),
                  letterSpacing: s(6),
                  textAlign: 'center',
                }}
              />
              {!!error && (
                <Text style={{ color: '#bd2f20', fontSize: s(14), marginTop: s(6), textAlign: 'center' }}>
                  {error}
                </Text>
              )}
            </View>

            <Pressable
              onPress={handleVerifyCode}
              disabled={loading}
              style={({ pressed }) => ({
                backgroundColor: palette.green,
                borderRadius: s(18),
                alignItems: 'center',
                justifyContent: 'center',
                height: y(72),
                marginTop: y(24),
                opacity: pressed || loading ? 0.85 : 1,
              })}
            >
              {loading ? (
                <ActivityIndicator color={palette.ink} />
              ) : (
                <Text style={{ color: palette.ink, fontSize: s(19), fontWeight: '800' }}>
                  Verify code
                </Text>
              )}
            </Pressable>

            <Pressable
              onPress={() => { setStep('entry'); setCode(''); setError(''); }}
              style={{ alignItems: 'center', marginTop: s(20) }}
            >
              <Text style={{ color: palette.muted, fontSize: s(15), fontWeight: '500' }}>
                Use a different email
              </Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
