import React, { useState } from 'react';
import {
  Dimensions,
  Platform,
  Pressable,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { palette } from '@/constants/theme';
import { useAppContext } from '@/contexts/AppContext';
import { saveProfileRole } from '@/lib/profile-service';
import type { AccountRole } from '@/types/app';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export function AccountIntroScreen() {
  const insets = useSafeAreaInsets();
  const { user, profile, setProfile, setCurrentScreen } = useAppContext();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 34 + insets.bottom : insets.bottom + 24;

  const widthScale = SCREEN_WIDTH / 590;
  const heightScale = SCREEN_HEIGHT / 1280;
  const scale = Math.min(widthScale, heightScale);
  const s = (v: number) => Math.round(v * scale);
  const y = (v: number) => Math.round(v * heightScale);
  const x = (v: number) => Math.round(v * widthScale);

  const [selectedRole, setSelectedRole] = useState<AccountRole | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleContinue = async () => {
    if (!selectedRole || !user?.email) return;
    setLoading(true);
    setError('');
    try {
      const updated = await saveProfileRole({ email: user.email, role: selectedRole });
      setProfile(updated);
      setCurrentScreen('setup');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: palette.paper, paddingTop: topPad, paddingBottom: bottomPad }}>
      <View style={{ paddingHorizontal: x(36), flex: 1, justifyContent: 'space-between' }}>
        <View style={{ paddingTop: y(40) }}>
          <Text
            style={{
              color: palette.greenDeep,
              fontSize: s(13),
              fontWeight: '700',
              letterSpacing: s(1.4),
              textTransform: 'uppercase',
            }}
          >
            Welcome to CrewPay
          </Text>
          <Text
            style={{
              color: palette.ink,
              fontSize: s(34),
              fontWeight: '900',
              letterSpacing: -s(1.4),
              marginTop: s(8),
              lineHeight: s(40),
            }}
          >
            How will you use CrewPay?
          </Text>
          <Text
            style={{
              color: palette.muted,
              fontSize: s(17),
              marginTop: s(12),
              lineHeight: s(25),
            }}
          >
            Choose your role to set up your account correctly.
          </Text>

          <View style={{ marginTop: y(40), gap: s(14) }}>
            {([
              {
                role: 'crewlead' as AccountRole,
                title: 'Crew Lead',
                desc: 'I post tasks, create teams, and manage payouts.',
              },
              {
                role: 'crewmate' as AccountRole,
                title: 'Crew Mate',
                desc: 'I complete tasks, submit proof, and get paid.',
              },
            ] as const).map(({ role, title, desc }) => {
              const selected = selectedRole === role;
              return (
                <Pressable
                  key={role}
                  onPress={() => setSelectedRole(role)}
                  style={({ pressed }) => ({
                    borderRadius: s(16),
                    borderWidth: selected ? 2.5 : 1.5,
                    borderColor: selected ? palette.greenDeep : palette.rail,
                    backgroundColor: selected ? '#f1fce9' : palette.paper,
                    padding: s(20),
                    opacity: pressed ? 0.9 : 1,
                  })}
                >
                  <Text
                    style={{
                      color: palette.ink,
                      fontSize: s(20),
                      fontWeight: '800',
                      letterSpacing: -0.3,
                    }}
                  >
                    {title}
                  </Text>
                  <Text
                    style={{
                      color: palette.muted,
                      fontSize: s(15),
                      marginTop: s(4),
                    }}
                  >
                    {desc}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {!!error && (
            <Text style={{ color: '#bd2f20', fontSize: s(14), marginTop: s(12) }}>{error}</Text>
          )}
        </View>

        <Pressable
          onPress={handleContinue}
          disabled={!selectedRole || loading}
          style={({ pressed }) => ({
            backgroundColor: selectedRole ? palette.green : palette.rail,
            borderRadius: s(18),
            alignItems: 'center',
            justifyContent: 'center',
            height: y(72),
            opacity: pressed || loading ? 0.85 : 1,
          })}
        >
          <Text
            style={{
              color: selectedRole ? palette.ink : palette.muted,
              fontSize: s(20),
              fontWeight: '800',
            }}
          >
            {loading ? 'Setting up…' : 'Continue'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
