import '../global.css';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <Stack screenOptions={{ headerShown: false, animation: 'none' }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="auth/callback" />
          <Stack.Screen name="join-team/index" />
          <Stack.Screen name="join-team/[token]" />
          <Stack.Screen name="+not-found" />
        </Stack>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
