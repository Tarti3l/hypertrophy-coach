import { AppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const isWeb = Platform.OS === 'web';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey);
export const supabaseConfigurationError =
  'Configura EXPO_PUBLIC_SUPABASE_URL y EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY en apps/mobile/.env para conectar tu cuenta.';

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabasePublishableKey!, {
      auth: {
        // En nativo persistimos en AsyncStorage; en web usamos localStorage (default).
        ...(isWeb ? {} : { storage: AsyncStorage }),
        autoRefreshToken: true,
        persistSession: true,
        // En la PWA sí debemos leer el hash/code de los links de confirmación y recuperación.
        detectSessionInUrl: isWeb,
        flowType: 'pkce'
      }
    })
  : null;

// Sin esto, el token se deja de refrescar cuando la app nativa vuelve del background.
if (supabase && !isWeb) {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}

export function requireSupabase(): SupabaseClient {
  if (!supabase) throw new Error(supabaseConfigurationError);
  return supabase;
}

/**
 * Id del usuario desde la sesión local, sin round trip de red (a diferencia de auth.getUser()).
 * Es seguro: quien valida de verdad es RLS en el servidor, así que un id local desactualizado
 * produce un error de permisos, nunca una escritura en la fila de otra persona.
 */
export async function requireUserId(): Promise<string> {
  const client = requireSupabase();
  const { data, error } = await client.auth.getSession();
  if (error) throw error;

  const userId = data.session?.user?.id;
  if (!userId) throw new Error('Tu sesión expiró. Inicia sesión nuevamente.');
  return userId;
}
