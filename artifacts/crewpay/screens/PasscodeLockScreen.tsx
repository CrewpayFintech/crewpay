import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Platform,
  Pressable,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { palette } from '@/constants/theme';
import { passcodeSecuredImage } from '@/constants/onboarding';
import { useAppContext } from '@/contexts/AppContext';
import { verifyLocalPasscode } from '@/lib/auth-service';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'];

export function PasscodeLockScreen() {
  const insets = useSafeAreaInsets();
  const { user, setCurrentScreen, signOut } = useAppContext();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 34 + insets.bottom : insets.bottom + 24;

  const widthScale = SCREEN_WIDTH / 590;
  const heightScale = SCREEN_HEIGHT / 1280;
  const scale = Math.min(widthScale, heightScale);
  const s = (v: number) => Math.round(v * scale);
  const y = (v: number) => Math.round(v * heightScale);
  const x = (v: number) => Math.round(v * widthScale);

  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const shake = useRef(new Animated.Value(0)).current;

  const doShake = useCallback(() => {
    Animated.sequence([
      Animated.timing(shake, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 8, duration: 50, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -8, duration: 50, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  }, [shake]);

  const handleDigit = useCallback(
    async (digit: string) => {
      if (lockedUntil && Date.now() < lockedUntil) return;
      if (digit === '⌫') {
        setPasscode((p) => p.slice(0, -1));
        return;
      }
      if (passcode.length >= 4) return;

      const next = passcode + digit;
      setPasscode(next);

      if (next.length === 4 && user) {
        const result = await verifyLocalPasscode(user.id, next);
        if (result.ok) {
          setCurrentScreen('home');
        } else {
          doShake();
          setPasscode('');
          if (result.lockedUntil) {
            setLockedUntil(result.lockedUntil);
            setError(`Too many attempts. Try again in 5 minutes.`);
          } else {
            setError(`Incorrect passcode. ${result.attemptsRemaining} attempts remaining.`);
          }
        }
      }
    },
    [passcode, user, lockedUntil, doShake, setCurrentScreen],
  );

  const isLocked = lockedUntil ? Date.now() < lockedUntil : false;
  const hasError = !!error;

  return (
    <View style={{ flex: 1, backgroundColor: palette.paper, paddingTop: topPad, paddingBottom: bottomPad }}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: y(20) }}>
        <Text
          style={{
            color: palette.ink,
            fontSize: s(26),
            fontWeight: '800',
            letterSpacing: -0.6,
          }}
        >
          Enter passcode
        </Text>

        <Animated.View
          style={{
            flexDirection: 'row',
            gap: s(16),
            marginTop: y(36),
            transform: [{ translateX: shake }],
          }}
        >
          {Array.from({ length: 4 }).map((_, i) => {
            const filled = i < passcode.length;
            return (
              <View
                key={i}
                style={{
                  width: s(22),
                  height: s(22),
                  borderRadius: 999,
                  backgroundColor: hasError ? '#bd2f20' : filled ? palette.ink : 'transparent',
                  borderWidth: filled || hasError ? 0 : 1.5,
                  borderColor: hasError ? '#bd2f20' : palette.muted,
                }}
              />
            );
          })}
        </Animated.View>

        {!!error && (
          <Text
            style={{
              color: '#bd2f20',
              fontSize: s(14),
              marginTop: s(14),
              textAlign: 'center',
              paddingHorizontal: x(36),
            }}
          >
            {error}
          </Text>
        )}

        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            width: x(300),
            marginTop: y(48),
            gap: s(10),
          }}
        >
          {DIGITS.map((digit, i) => {
            if (digit === '') {
              return <View key={i} style={{ width: x(86), height: y(80) }} />;
            }
            return (
              <Pressable
                key={i}
                onPress={() => handleDigit(digit)}
                disabled={isLocked}
                style={({ pressed }) => ({
                  width: x(86),
                  height: y(80),
                  borderRadius: s(18),
                  backgroundColor: digit === '⌫' ? 'transparent' : palette.rail,
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: pressed || isLocked ? 0.7 : 1,
                })}
              >
                <Text
                  style={{
                    color: palette.ink,
                    fontSize: digit === '⌫' ? s(22) : s(26),
                    fontWeight: '600',
                  }}
                >
                  {digit}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <Pressable
        onPress={() => signOut()}
        style={{ alignItems: 'center', paddingBottom: s(16) }}
      >
        <Text style={{ color: palette.muted, fontSize: s(15), fontWeight: '500' }}>
          Sign out
        </Text>
      </Pressable>
    </View>
  );
}
