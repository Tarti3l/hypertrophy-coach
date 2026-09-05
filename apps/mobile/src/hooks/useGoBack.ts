import { useCallback } from 'react';
import { useRouter } from 'expo-router';

import type { Href } from 'expo-router';

/**
 * Volver sin quedarse encallado.
 *
 * `router.back()` lanza "The action 'GO_BACK' was not handled by any navigator" cuando
 * no hay pantalla anterior en la pila. Pasa siempre que se entra directo a una URL
 * —algo normal en la versión web— o al recargar la página: el historial del navegador
 * tiene entradas, pero la pila del navegador de la app está vacía.
 *
 * El resultado era un botón "Volver" que no hacía nada y soltaba un error rojo.
 *
 * Cada pantalla declara a dónde tiene sentido caer si no hay historial.
 */
export function useGoBack(fallback: Href) {
  const router = useRouter();

  return useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    // replace y no push: si no había pila, tampoco tiene sentido crear una entrada
    // nueva que deje al usuario con un "Volver" que lo trae aquí otra vez.
    router.replace(fallback);
  }, [router, fallback]);
}
