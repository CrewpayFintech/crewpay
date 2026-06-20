import React, { useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
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
import { useAppContext } from '@/contexts/AppContext';
import {
  setAccountPassword,
  saveLocalPasscode,
  validatePassword,
} from '@/lib/auth-service';
import {
  saveProfileDetails,
  saveProfileAddress,
  markOnboardingComplete,
} from '@/lib/profile-service';
import { saveBankAccount, nigerianBanks } from '@/lib/bank-service';
import { countries, defaultCountry, months } from '@/constants/onboarding';
import type { SetupStep, CountryOption } from '@/types/app';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export function SetupScreen() {
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

  const isCrewMate = profile?.account_role === 'crewmate';
  const steps: SetupStep[] = isCrewMate
    ? ['country', 'password', 'confirmPassword', 'passcode', 'confirmPasscode', 'profile', 'address', 'bankDetails', 'complete']
    : ['country', 'password', 'confirmPassword', 'passcode', 'confirmPasscode', 'profile', 'address', 'complete'];

  const [step, setStep] = useState<SetupStep>('country');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [country, setCountry] = useState<CountryOption>(defaultCountry!);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passcode, setPasscode] = useState('');
  const [confirmPasscode, setConfirmPasscode] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dob, setDob] = useState('');
  const [homeAddress, setHomeAddress] = useState('');
  const [city, setCity] = useState('');
  const [postcode, setPostcode] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');

  const goNext = async () => {
    setError('');
    const idx = steps.indexOf(step);
    const next = steps[idx + 1];

    if (step === 'password') {
      if (!validatePassword(password)) {
        setError('Use at least 9 characters with a letter and a number.');
        return;
      }
    }

    if (step === 'confirmPassword') {
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
      setLoading(true);
      try {
        await setAccountPassword(password);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not set password.');
        setLoading(false);
        return;
      }
      setLoading(false);
    }

    if (step === 'passcode') {
      if (!/^\d{4}$/.test(passcode)) {
        setError('Passcode must be 4 digits.');
        return;
      }
    }

    if (step === 'confirmPasscode') {
      if (passcode !== confirmPasscode) {
        setError('Passcodes do not match.');
        return;
      }
    }

    if (step === 'profile') {
      if (!firstName.trim() || !lastName.trim()) {
        setError('Please enter your full name.');
        return;
      }
      setLoading(true);
      try {
        const updated = await saveProfileDetails({
          countryCode: country.code,
          countryName: country.name,
          dateOfBirth: dob,
          email: user?.email ?? '',
          firstName,
          lastName,
          role: profile?.account_role ?? 'crewmate',
        });
        setProfile(updated);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not save profile.');
        setLoading(false);
        return;
      }
      setLoading(false);
    }

    if (step === 'address') {
      if (!homeAddress.trim() || !city.trim()) {
        setError('Please enter your address and city.');
        return;
      }
      setLoading(true);
      try {
        await saveProfileAddress({
          city,
          countryCode: country.code,
          countryName: country.name,
          homeAddress,
          postcode,
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not save address.');
        setLoading(false);
        return;
      }
      setLoading(false);
    }

    if (step === 'bankDetails') {
      if (!bankName || !accountNumber || !accountName) {
        setError('Please fill in all bank details.');
        return;
      }
      setLoading(true);
      try {
        const bank = nigerianBanks.find((b) => b.name === bankName);
        await saveBankAccount({
          accountName,
          accountNumber,
          bankCode: bank?.code ?? '',
          bankName,
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not save bank details.');
        setLoading(false);
        return;
      }
      setLoading(false);
    }

    if (step === 'address' && !isCrewMate) {
      setLoading(true);
      try {
        if (user) await saveLocalPasscode(user.id, passcode);
        const updated = await markOnboardingComplete();
        setProfile(updated);
        setCurrentScreen('home');
        return;
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not complete setup.');
        setLoading(false);
        return;
      }
    }

    if (step === 'bankDetails') {
      setLoading(true);
      try {
        if (user) await saveLocalPasscode(user.id, passcode);
        const updated = await markOnboardingComplete();
        setProfile(updated);
        setCurrentScreen('home');
        return;
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not complete setup.');
        setLoading(false);
        return;
      }
    }

    if (next) setStep(next);
  };

  const goPrev = () => {
    const idx = steps.indexOf(step);
    if (idx > 0) setStep(steps[idx - 1]!);
  };

  const stepTitles: Record<SetupStep, string> = {
    country: 'Your country',
    phone: 'Phone number',
    sms: 'Verify phone',
    password: 'Create password',
    confirmPassword: 'Confirm password',
    passcode: 'Create passcode',
    confirmPasscode: 'Confirm passcode',
    complete: 'All done',
    profile: 'Your profile',
    address: 'Your address',
    bankDetails: 'Bank details',
  };

  const stepIndex = steps.indexOf(step);
  const progress = (stepIndex + 1) / steps.length;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: palette.paper }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View
        style={{
          paddingTop: topPad,
          paddingHorizontal: x(36),
          backgroundColor: palette.paper,
        }}
      >
        <View style={{ flexDirection: 'row', gap: s(4), marginTop: s(12) }}>
          {steps.slice(0, -1).map((_, i) => (
            <View
              key={i}
              style={{
                flex: 1,
                height: s(3),
                borderRadius: 999,
                backgroundColor: i <= stepIndex ? palette.greenDeep : palette.rail,
              }}
            />
          ))}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingBottom: bottomPad }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ paddingHorizontal: x(36), paddingTop: y(28) }}>
          <Text
            style={{
              color: palette.ink,
              fontSize: s(32),
              fontWeight: '900',
              letterSpacing: -s(1.2),
            }}
          >
            {stepTitles[step]}
          </Text>

          {step === 'country' && (
            <View style={{ marginTop: y(24) }}>
              <Text style={{ color: palette.muted, fontSize: s(15), marginBottom: s(8) }}>
                Select your country
              </Text>
              <ScrollView
                style={{
                  maxHeight: y(320),
                  borderRadius: s(14),
                  borderWidth: 1.5,
                  borderColor: palette.rail,
                }}
                nestedScrollEnabled
              >
                {countries.slice(0, 30).map((c) => (
                  <Pressable
                    key={c.code}
                    onPress={() => setCountry(c)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingVertical: s(14),
                      paddingHorizontal: x(16),
                      backgroundColor: c.code === country.code ? '#f1fce9' : 'transparent',
                      gap: s(12),
                    }}
                  >
                    <Text style={{ fontSize: s(24) }}>{c.flag}</Text>
                    <Text
                      style={{
                        flex: 1,
                        color: palette.ink,
                        fontSize: s(16),
                        fontWeight: c.code === country.code ? '700' : '400',
                      }}
                    >
                      {c.name}
                    </Text>
                    <Text style={{ color: palette.muted, fontSize: s(14) }}>{c.dialCode}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}

          {(step === 'password' || step === 'confirmPassword') && (
            <View style={{ marginTop: y(24) }}>
              <Text style={{ color: palette.muted, fontSize: s(15), marginBottom: s(8) }}>
                {step === 'password' ? 'At least 9 characters with a letter and number' : 'Re-enter your password'}
              </Text>
              <TextInput
                value={step === 'password' ? password : confirmPassword}
                onChangeText={step === 'password' ? setPassword : setConfirmPassword}
                secureTextEntry
                placeholder={step === 'password' ? 'Password' : 'Confirm password'}
                placeholderTextColor={palette.muted}
                style={{
                  borderColor: error ? '#bd2f20' : palette.rail,
                  borderRadius: s(12),
                  borderWidth: 1.5,
                  color: palette.ink,
                  fontSize: s(18),
                  height: y(60),
                  paddingHorizontal: x(18),
                }}
              />
            </View>
          )}

          {(step === 'passcode' || step === 'confirmPasscode') && (
            <View style={{ marginTop: y(24) }}>
              <Text style={{ color: palette.muted, fontSize: s(15), marginBottom: s(8) }}>
                {step === 'passcode' ? 'Enter a 4-digit passcode for quick access' : 'Re-enter your passcode'}
              </Text>
              <TextInput
                value={step === 'passcode' ? passcode : confirmPasscode}
                onChangeText={(v) => {
                  const digits = v.replace(/\D/g, '').slice(0, 4);
                  if (step === 'passcode') setPasscode(digits);
                  else setConfirmPasscode(digits);
                }}
                keyboardType="number-pad"
                placeholder="••••"
                placeholderTextColor={palette.muted}
                secureTextEntry
                style={{
                  borderColor: error ? '#bd2f20' : palette.rail,
                  borderRadius: s(12),
                  borderWidth: 1.5,
                  color: palette.ink,
                  fontSize: s(32),
                  height: y(72),
                  letterSpacing: s(12),
                  textAlign: 'center',
                }}
              />
            </View>
          )}

          {step === 'profile' && (
            <View style={{ marginTop: y(24), gap: s(14) }}>
              <TextInput
                value={firstName}
                onChangeText={setFirstName}
                placeholder="First name"
                placeholderTextColor={palette.muted}
                style={{
                  borderColor: palette.rail,
                  borderRadius: s(12),
                  borderWidth: 1.5,
                  color: palette.ink,
                  fontSize: s(18),
                  height: y(58),
                  paddingHorizontal: x(18),
                }}
              />
              <TextInput
                value={lastName}
                onChangeText={setLastName}
                placeholder="Last name"
                placeholderTextColor={palette.muted}
                style={{
                  borderColor: palette.rail,
                  borderRadius: s(12),
                  borderWidth: 1.5,
                  color: palette.ink,
                  fontSize: s(18),
                  height: y(58),
                  paddingHorizontal: x(18),
                }}
              />
              <TextInput
                value={dob}
                onChangeText={setDob}
                placeholder="Date of birth (YYYY-MM-DD)"
                placeholderTextColor={palette.muted}
                style={{
                  borderColor: palette.rail,
                  borderRadius: s(12),
                  borderWidth: 1.5,
                  color: palette.ink,
                  fontSize: s(18),
                  height: y(58),
                  paddingHorizontal: x(18),
                }}
              />
            </View>
          )}

          {step === 'address' && (
            <View style={{ marginTop: y(24), gap: s(14) }}>
              <TextInput
                value={homeAddress}
                onChangeText={setHomeAddress}
                placeholder="Street address"
                placeholderTextColor={palette.muted}
                style={{
                  borderColor: palette.rail,
                  borderRadius: s(12),
                  borderWidth: 1.5,
                  color: palette.ink,
                  fontSize: s(18),
                  height: y(58),
                  paddingHorizontal: x(18),
                }}
              />
              <TextInput
                value={city}
                onChangeText={setCity}
                placeholder="City"
                placeholderTextColor={palette.muted}
                style={{
                  borderColor: palette.rail,
                  borderRadius: s(12),
                  borderWidth: 1.5,
                  color: palette.ink,
                  fontSize: s(18),
                  height: y(58),
                  paddingHorizontal: x(18),
                }}
              />
              <TextInput
                value={postcode}
                onChangeText={setPostcode}
                placeholder="Postcode (optional)"
                placeholderTextColor={palette.muted}
                style={{
                  borderColor: palette.rail,
                  borderRadius: s(12),
                  borderWidth: 1.5,
                  color: palette.ink,
                  fontSize: s(18),
                  height: y(58),
                  paddingHorizontal: x(18),
                }}
              />
            </View>
          )}

          {step === 'bankDetails' && (
            <View style={{ marginTop: y(24), gap: s(14) }}>
              <Text style={{ color: palette.muted, fontSize: s(14) }}>
                Add your bank account to receive payouts.
              </Text>
              <TextInput
                value={accountNumber}
                onChangeText={(v) => setAccountNumber(v.replace(/\D/g, '').slice(0, 10))}
                placeholder="Account number"
                keyboardType="number-pad"
                placeholderTextColor={palette.muted}
                style={{
                  borderColor: palette.rail,
                  borderRadius: s(12),
                  borderWidth: 1.5,
                  color: palette.ink,
                  fontSize: s(18),
                  height: y(58),
                  paddingHorizontal: x(18),
                }}
              />
              <TextInput
                value={accountName}
                onChangeText={setAccountName}
                placeholder="Account name"
                placeholderTextColor={palette.muted}
                style={{
                  borderColor: palette.rail,
                  borderRadius: s(12),
                  borderWidth: 1.5,
                  color: palette.ink,
                  fontSize: s(18),
                  height: y(58),
                  paddingHorizontal: x(18),
                }}
              />
              <ScrollView
                style={{
                  maxHeight: y(200),
                  borderRadius: s(12),
                  borderWidth: 1.5,
                  borderColor: palette.rail,
                }}
                nestedScrollEnabled
              >
                {nigerianBanks.map((b) => (
                  <Pressable
                    key={b.code}
                    onPress={() => setBankName(b.name)}
                    style={{
                      padding: s(14),
                      backgroundColor: bankName === b.name ? '#f1fce9' : 'transparent',
                    }}
                  >
                    <Text
                      style={{
                        color: palette.ink,
                        fontSize: s(16),
                        fontWeight: bankName === b.name ? '700' : '400',
                      }}
                    >
                      {b.name}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}

          {!!error && (
            <Text style={{ color: '#bd2f20', fontSize: s(14), marginTop: s(12) }}>{error}</Text>
          )}

          <View style={{ flexDirection: 'row', gap: s(12), marginTop: y(32) }}>
            {stepIndex > 0 && (
              <Pressable
                onPress={goPrev}
                style={({ pressed }) => ({
                  flex: 1,
                  backgroundColor: palette.rail,
                  borderRadius: s(18),
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: y(72),
                  opacity: pressed ? 0.85 : 1,
                })}
              >
                <Text style={{ color: palette.ink, fontSize: s(18), fontWeight: '700' }}>Back</Text>
              </Pressable>
            )}
            <Pressable
              onPress={goNext}
              disabled={loading}
              style={({ pressed }) => ({
                flex: 3,
                backgroundColor: palette.green,
                borderRadius: s(18),
                alignItems: 'center',
                justifyContent: 'center',
                height: y(72),
                opacity: pressed || loading ? 0.85 : 1,
              })}
            >
              {loading ? (
                <ActivityIndicator color={palette.ink} />
              ) : (
                <Text style={{ color: palette.ink, fontSize: s(20), fontWeight: '800' }}>
                  Continue
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
