import { useState, useEffect, useRef, useCallback } from 'react';
import { Project } from '@/types';

const STORAGE_KEY = 'selectedProjectId';

export function usePersistedProject(projects: Project[]): [string, (id: string) => void] {
  const [selectedId, setSelectedId] = useState<string>('');
  const initialized = useRef(false);

  useEffect(() => {
    if (projects.length === 0 || initialized.current) return;
    initialized.current = true;
    const stored = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    const valid = stored !== null && projects.some((p) => p.id === stored);
    setSelectedId(valid ? stored : projects[0].id);
  }, [projects]);

  const persist = useCallback((id: string) => {
    setSelectedId(id);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, id);
    }
  }, []);

  return [selectedId, persist];
}
