import { Stack, useRootNavigationState, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { WebLayoutWrapper } from '@/components/layout/WebLayoutWrapper';
import { AuthProvider, useAuth } from '@/features/auth/AuthProvider';
import { useOfflineSync } from '@/features/progress/hooks/useOfflineSync';
import { AuthLoadingScreen } from '@/features/auth/screens/AuthScreen';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider><RootNavigation /></AuthProvider>
    </SafeAreaProvider>
  );
}

function RootNavigation() {
  const router = useRouter();
  const segments = useSegments();
  const navigationState = useRootNavigationState();
  const { session, isBootstrapping, isProfileLoading, onboardingCompleted } = useAuth();

  // Sincroniza la cola offline en segundo plano durante toda la vida de la app.
  useOfflineSync();

  const inAuth = segments[0] === 'auth';
  const inOnboarding = segments[0] === 'onboarding';

  useEffect(() => {
    // Sin router montado o sin sesión resuelta todavía no hay nada que decidir.
    if (!navigationState?.key || isBootstrapping) return;

    if (!session) {
      if (!inAuth) router.replace('/auth');
      return;
    }

    // Sesión válida pero perfil aún desconocido: esperamos para no mandar
    // al usuario a /onboarding y sacarlo un instante después.
    if (onboardingCompleted === null && isProfileLoading) return;

    if (onboardingCompleted === false && !inOnboarding) {
      router.replace('/onboarding');
      return;
    }

    if (inAuth) router.replace('/');
  }, [inAuth, inOnboarding, isBootstrapping, isProfileLoading, navigationState?.key, onboardingCompleted, router, session]);

  // Solo en el arranque. Un refresco de perfil ya no desmonta el Stack.
  if (isBootstrapping) return <AuthLoadingScreen />;

  return (
    <WebLayoutWrapper>
      <StatusBar style="auto" />
      <Stack initialRouteName="(tabs)" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="auth" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </WebLayoutWrapper>
  );
}
