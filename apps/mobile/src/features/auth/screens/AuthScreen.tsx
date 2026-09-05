import { useMemo, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, useColorScheme, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { requireSupabase } from '@/lib/supabase';
import { palette, spacing, ThemeColors, type, typography } from '@/theme/tokens';

import { useAuth } from '../AuthProvider';

type AuthMode = 'login' | 'register';

export function AuthScreen() {
  const colorScheme = useColorScheme();
  const colors = palette[colorScheme === 'dark' ? 'dark' : 'light'];
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { configurationError } = useAuth();
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const isRegistering = mode === 'register';

  async function submit() {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      setError('Escribe un correo válido.');
      return;
    }
    if (password.length < 6) {
      setError('Tu contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setError(null);
    setMessage(null);
    setIsSubmitting(true);

    try {
      const client = requireSupabase();
      if (isRegistering) {
        const { data, error: signUpError } = await client.auth.signUp({ email: normalizedEmail, password });
        if (signUpError) throw signUpError;
        if (!data.session) setMessage('Revisa tu correo para confirmar la cuenta y luego inicia sesión.');
      } else {
        const { error: signInError } = await client.auth.signInWithPassword({ email: normalizedEmail, password });
        if (signInError) throw signInError;
      }
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'No pudimos conectar con Supabase. Inténtalo otra vez.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.select({ ios: 'padding', android: undefined })} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.intro}>
            <Text style={styles.title}>{isRegistering ? 'Empecemos con calma' : 'Tu siguiente sesión empieza aquí'}</Text>
            <Text style={styles.description}>{isRegistering ? 'Crea una cuenta para guardar tus metas, entrenamientos y progreso.' : 'Inicia sesión para continuar con tu plan.'}</Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.label}>Correo electrónico</Text>
            <TextInput
              accessibilityLabel="Correo electrónico"
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              onChangeText={setEmail}
              placeholder="tu@correo.com"
              placeholderTextColor={colors.textMuted}
              textContentType="emailAddress"
              value={email}
              style={styles.input}
            />
            <Text style={styles.label}>Contraseña</Text>
            <TextInput
              accessibilityLabel="Contraseña"
              autoCapitalize="none"
              autoComplete={isRegistering ? 'new-password' : 'password'}
              onChangeText={setPassword}
              placeholder="Mínimo 6 caracteres"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
              textContentType={isRegistering ? 'newPassword' : 'password'}
              value={password}
              style={styles.input}
            />

            {configurationError ? <Text accessibilityLiveRegion="polite" style={styles.error}>{configurationError}</Text> : null}
            {error ? <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : null}
            {message ? <Text accessibilityLiveRegion="polite" style={styles.message}>{message}</Text> : null}

            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: isSubmitting || Boolean(configurationError) }}
              disabled={isSubmitting || Boolean(configurationError)}
              onPress={() => void submit()}
              style={({ pressed }) => [styles.primaryButton, (isSubmitting || configurationError) && styles.primaryButtonDisabled, pressed && styles.pressed]}
            >
              {isSubmitting ? <ActivityIndicator color={colors.surface} /> : <Text style={styles.primaryButtonText}>{isRegistering ? 'Crear cuenta' : 'Iniciar sesión'}</Text>}
            </Pressable>

            <Pressable accessibilityRole="button" disabled={isSubmitting} onPress={() => { setMode(isRegistering ? 'login' : 'register'); setError(null); setMessage(null); }} style={styles.switchButton}>
              <Text style={styles.switchText}>{isRegistering ? 'Ya tengo una cuenta' : 'Quiero crear una cuenta'}</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function AuthLoadingScreen() {
  const colorScheme = useColorScheme();
  const colors = palette[colorScheme === 'dark' ? 'dark' : 'light'];
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View accessibilityLabel="Comprobando sesión" style={styles.loadingScreen}>
      <ActivityIndicator color={colors.accent} />
      <Text style={styles.loadingText}>Preparando tu espacio</Text>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safeArea: { backgroundColor: colors.background, flex: 1 },
    flex: { flex: 1 },
    content: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.xxl },
    intro: { marginBottom: spacing.xxl },
    title: { ...type.screenTitle, color: colors.text, maxWidth: 390 },
    description: { color: colors.textMuted, fontFamily: typography.body, fontSize: 17, lineHeight: 25, marginTop: spacing.md, maxWidth: 390 },
    form: { gap: spacing.sm },
    label: { color: colors.text, fontFamily: typography.body, fontSize: 14, fontWeight: '700', marginTop: spacing.md },
    input: { borderBottomColor: colors.line, borderBottomWidth: 1.5, color: colors.text, fontFamily: typography.body, fontSize: 16, minHeight: 48, paddingVertical: spacing.sm },
    primaryButton: { alignItems: 'center', backgroundColor: colors.accent, borderRadius: 14, justifyContent: 'center', marginTop: spacing.xl, minHeight: 52 },
    primaryButtonDisabled: { opacity: 0.56 },
    primaryButtonText: { color: colors.surface, fontFamily: typography.body, fontSize: 16, fontWeight: '700' },
    switchButton: { alignSelf: 'center', justifyContent: 'center', minHeight: 44, marginTop: spacing.sm, paddingHorizontal: spacing.md },
    switchText: { color: colors.accent, fontFamily: typography.body, fontSize: 15, fontWeight: '700' },
    error: { color: colors.danger, fontFamily: typography.body, fontSize: 13, lineHeight: 19, marginTop: spacing.md },
    message: { color: colors.accent, fontFamily: typography.body, fontSize: 13, lineHeight: 19, marginTop: spacing.md },
    pressed: { opacity: 0.78 },
    loadingScreen: { alignItems: 'center', backgroundColor: colors.background, flex: 1, gap: spacing.md, justifyContent: 'center' },
    loadingText: { color: colors.textMuted, fontFamily: typography.body, fontSize: 15 }
  });
}
