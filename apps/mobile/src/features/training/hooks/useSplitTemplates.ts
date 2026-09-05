import { useCallback, useEffect, useRef, useState } from 'react';

import { describeSupabaseError } from '@/lib/supabaseErrors';

import { fetchMuscleGroups, fetchSplitTemplates, muscleGroupsAreDegraded } from '../services/splitTemplates';
import { MuscleGroupInfo, SplitTemplate } from '../types/split';

type SplitTemplatesState = {
  templates: SplitTemplate[];
  groups: MuscleGroupInfo[];
  isLoading: boolean;
  error: string | null;
  /** true si faltan columnas nuevas y se cargó sin prioridad estética. */
  isDegraded: boolean;
  reload: () => void;
};

/**
 * Plantillas de split y grupos musculares. Ambos son catálogo, así que van juntos:
 * la pantalla no puede hacer nada útil con uno solo de los dos.
 */
export function useSplitTemplates(): SplitTemplatesState {
  const [templates, setTemplates] = useState<SplitTemplate[]>([]);
  const [groups, setGroups] = useState<MuscleGroupInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDegraded, setIsDegraded] = useState(false);
  const isMountedRef = useRef(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [loadedTemplates, loadedGroups] = await Promise.all([fetchSplitTemplates(), fetchMuscleGroups()]);
      if (!isMountedRef.current) return;
      setTemplates(loadedTemplates);
      setGroups(loadedGroups);
      setIsDegraded(muscleGroupsAreDegraded());
    } catch (caught) {
      if (!isMountedRef.current) return;
      setError(describeSupabaseError(caught, 'No pudimos cargar las plantillas de rutina.'));
    } finally {
      if (isMountedRef.current) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    void load();
    return () => { isMountedRef.current = false; };
  }, [load]);

  return { templates, groups, isLoading, error, isDegraded, reload: () => void load() };
}
