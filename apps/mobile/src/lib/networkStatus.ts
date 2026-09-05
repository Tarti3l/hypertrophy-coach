import { AppState, Platform } from 'react-native';

type Unsubscribe = () => void;

/**
 * Adaptador de conectividad sin dependencias nuevas.
 *
 * Deliberadamente NO usamos expo-network como única señal: en un gimnasio el problema
 * típico no es "wifi apagado" sino wifi conectado sin salida real (portal cautivo, señal
 * de 1 barra). expo-network reportaría `isConnected: true` y la cola no se vaciaría.
 * La única prueba fiable es que el RPC responda, así que aquí solo emitimos *disparadores*
 * de reintento y dejamos que el flush decida.
 *
 * Para añadir expo-network como disparador extra (después de `pnpm add expo-network`):
 *   import * as Network from 'expo-network';
 *   const sub = Network.addNetworkStateListener((state) => { if (state.isConnected) onRetry(); });
 *   subscriptions.push(() => sub.remove());
 */
export function subscribeToRetryTriggers(onRetry: () => void): Unsubscribe {
  const subscriptions: Unsubscribe[] = [];

  if (Platform.OS === 'web') {
    const handleOnline = () => onRetry();
    globalThis.addEventListener?.('online', handleOnline);
    subscriptions.push(() => globalThis.removeEventListener?.('online', handleOnline));
  }

  // Volver del background es el momento más probable de haber recuperado señal.
  const appStateSubscription = AppState.addEventListener('change', (state) => {
    if (state === 'active') onRetry();
  });
  subscriptions.push(() => appStateSubscription.remove());

  return () => subscriptions.forEach((unsubscribe) => unsubscribe());
}

/** Señal barata y optimista: en web evita intentos cuando el navegador ya sabe que no hay red. */
export function isProbablyOffline(): boolean {
  if (Platform.OS !== 'web') return false;
  const online = (globalThis.navigator as { onLine?: boolean } | undefined)?.onLine;
  return online === false;
}
