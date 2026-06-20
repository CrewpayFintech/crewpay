import React from 'react';
import { View, StyleSheet } from 'react-native';

import { useAppContext } from '@/contexts/AppContext';
import { OnboardingScreen } from '@/screens/OnboardingScreen';
import { EmailScreen } from '@/screens/EmailScreen';
import { PasscodeLockScreen } from '@/screens/PasscodeLockScreen';
import { AccountIntroScreen } from '@/screens/AccountIntroScreen';
import { SetupScreen } from '@/screens/SetupScreen';
import { HomeScreen } from '@/screens/HomeScreen';

export default function Index() {
  const { currentScreen } = useAppContext();

  return (
    <View style={styles.container}>
      {currentScreen === 'onboarding' && <OnboardingScreen />}
      {currentScreen === 'email' && <EmailScreen />}
      {currentScreen === 'passcode-lock' && <PasscodeLockScreen />}
      {currentScreen === 'account-intro' && <AccountIntroScreen />}
      {currentScreen === 'setup' && <SetupScreen />}
      {currentScreen === 'home' && <HomeScreen />}
      {currentScreen === 'create-task' && <HomeScreen initialAction="create-task" />}
      {currentScreen === 'create-team' && <HomeScreen initialAction="create-team" />}
      {currentScreen === 'join-team' && <HomeScreen initialAction="join-team" />}
      {currentScreen === 'chat' && <HomeScreen initialAction="chat" />}
      {currentScreen === 'notifications' && <HomeScreen initialAction="notifications" />}
      {currentScreen === 'requests' && <HomeScreen initialAction="requests" />}
      {currentScreen === 'submissions' && <HomeScreen initialAction="submissions" />}
      {currentScreen === 'submit-proof' && <HomeScreen initialAction="submit-proof" />}
      {currentScreen === 'view-task' && <HomeScreen initialAction="view-task" />}
      {currentScreen === 'view-team' && <HomeScreen initialAction="view-team" />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fffef8',
  },
});
