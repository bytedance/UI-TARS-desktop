'use client';

import { useAtom } from 'jotai';
import { useCallback } from 'react';
import { AgentSettings } from '@/lib/types';
import { settingsAtom } from '@/lib/store/atoms/settings';

export function useSettings() {
  const [settings, setSettings] = useAtom(settingsAtom);

  const updateSettings = useCallback(
    (updates: Partial<AgentSettings>) => {
      const updated = { ...settings, ...updates };
      setSettings(updated);
      
      // Persist to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('agent:settings', JSON.stringify(updated));
      }
    },
    [settings, setSettings]
  );

  return {
    settings,
    updateSettings,
  };
}
