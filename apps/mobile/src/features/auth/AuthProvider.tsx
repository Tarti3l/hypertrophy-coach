import { PropsWithChildren, createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';

import { isSupabaseConfigured, supabase, supabaseConfigurationError } from '@/lib/supabase';

const PROFILE_ERROR = 'No pudimos comprobar tu perfil. Revisa tu conexión e inténtalo de nuevo.';

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  /** Primera carga: restaurar sesión + leer perfil. Solo aquí mostramos pantalla de carga. */
  isBootstrapping: boolean;
  /** Refrescos posteriores del perfil. No debe desmontar la navegación. */
  isProfileLoading: boolean;
  onboardingCompleted: boolean | null;
  /** Falta configuración (.env). Bloquea el formulario de auth. */
  configurationError: string | null;
  /** Error transitorio de red/perfil. NO bloquea el login. */
  profileError: string | null;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  const configurationError = isSupabaseConfigured ? null : supabaseConfigurationError;

  const isMountedRef = useRef(true);
  useEffect(() => () => { isMountedRef.current = false; }, []);

  const loadProfile = useCallback(async (userId: string) => {
    if (!supabase) return;

    setIsProfileLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('onboarding_completed_at')
        .eq('id', userId)
        .maybeSingle();

      if (error) throw error;
      if (!isMountedRef.current) return;

      setOnboardingCompleted(Boolean(data?.onboarding_completed_at));
      setProfileError(null);
    } catch {
      if (!isMountedRef.current) return;
      // null = desconocido. El guardián deja pasar y mostramos un aviso con reintento,
      // en vez de dejar al usuario atrapado en un spinner.
      setOnboardingCompleted(null);
      setProfileError(PROFILE_ERROR);
    } finally {
      if (isMountedRef.current) setIsProfileLoading(false);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    const userId = session?.user?.id;
    if (!userId || !supabase) {
      setOnboardingCompleted(null);
      return;
    }
    await loadProfile(userId);
  }, [loadProfile, session?.user?.id]);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setOnboardingCompleted(null);
    setProfileError(null);
  }, []);

  useEffect(() => {
    if (!supabase) {
      setIsBootstrapping(false);
      return;
    }

    let active = true;

    void (async () => {
      const { data } = await supabase.auth.getSession();
      if (!active) return;

      setSession(data.session);
      if (data.session?.user) await loadProfile(data.session.user.id);
      if (active) setIsBootstrapping(false);
    })();

    const { data: listener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);

      if (!nextSession?.user) {
        setOnboardingCompleted(null);
        setProfileError(null);
        return;
      }

      // El refresh de token dispara este evento cada hora: no vale la pena
      // volver a consultar el perfil ni parpadear la UI.
      if (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') return;

      void loadProfile(nextSession.user.id);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const value = useMemo<AuthContextValue>(() => ({
    session,
    user: session?.user ?? null,
    isBootstrapping,
    isProfileLoading,
    onboardingCompleted,
    configurationError,
    profileError,
    refreshProfile,
    signOut
  }), [configurationError, isBootstrapping, isProfileLoading, onboardingCompleted, profileError, refreshProfile, session, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe utilizarse dentro de AuthProvider.');
  return context;
}
