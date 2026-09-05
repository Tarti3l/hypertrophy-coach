import { useCallback, useEffect, useRef, useState } from 'react';

import { requireSupabase, requireUserId } from '@/lib/supabase';
import { KnowledgeLevel } from '@/features/onboarding/types/onboarding';

/**
 * El nivel que el usuario declaró en el onboarding.
 *
 * Se guardaba en user_profiles.knowledge_level desde el primer día y nunca se leía de
 * vuelta: el constructor proponía los mismos ejercicios a alguien que no ha pisado un
 * gimnasio y a alguien con años de entrenamiento. Ahora decide qué se recomienda
 * primero y qué se marca como "para más adelante".
 *
 * Se cachea a nivel de módulo: cambia como mucho una vez en la vida del usuario y lo
 * consultan varias pantallas.
 */
let cached: KnowledgeLevel | null = null;
let inFlight: Promise<KnowledgeLevel | null> | null = null;

export function invalidateKnowledgeLevel(): void {
  cached = null;
  inFlight = null;
}

async function load(): Promise<KnowledgeLevel | null> {
  const client = requireSupabase();
  const userId = await requireUserId();

  const { data, error } = await client
    .from('user_profiles')
    .select('knowledge_level')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  return (data?.knowledge_level as KnowledgeLevel | undefined) ?? null;
}

export function fetchKnowledgeLevel(): Promise<KnowledgeLevel | null> {
  if (cached) return Promise.resolve(cached);
  if (!inFlight) {
    inFlight = load()
      .then((level) => { cached = level; return level; })
      .catch((error) => { inFlight = null; throw error; });
  }
  return inFlight;
}

export function useKnowledgeLevel(): { level: KnowledgeLevel | null; isLoading: boolean } {
  const [level, setLevel] = useState<KnowledgeLevel | null>(cached);
  const [isLoading, setIsLoading] = useState(!cached);
  const isMountedRef = useRef(true);

  const run = useCallback(() => {
    if (cached) { setLevel(cached); setIsLoading(false); return; }
    setIsLoading(true);
    void fetchKnowledgeLevel()
      .then((value) => { if (isMountedRef.current) setLevel(value); })
      // Si falla, tratamos al usuario como principiante: proponerle máquinas de más
      // no le cuesta nada (las máquinas dan la misma hipertrofia que el peso libre),
      // mientras que proponerle una sentadilla con barra sin saber su nivel sí.
      .catch(() => { if (isMountedRef.current) setLevel('none'); })
      .finally(() => { if (isMountedRef.current) setIsLoading(false); });
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    run();
    return () => { isMountedRef.current = false; };
  }, [run]);

  return { level, isLoading };
}

/**
 * ¿Este ejercicio es apropiado para el nivel declarado?
 *
 * Aviso que la app repite: no existe ninguna clasificación publicada de dificultad
 * técnica de ejercicios. Ni ACSM, ni NSCA, ni en revistas. Las etiquetas del catálogo
 * son criterio editorial basado en cuántas articulaciones intervienen, cuánto
 * equilibrio hace falta y si necesitas que alguien te asegure.
 */
export function suitsLevel(difficulty: 'beginner' | 'intermediate' | 'advanced', level: KnowledgeLevel | null): boolean {
  if (level === 'experienced') return true;
  if (level === 'basic') return difficulty !== 'advanced';
  return difficulty === 'beginner';
}
