import { atom } from 'jotai';

export interface GlobalRuntimeSettingsState {
  selectedValues: Record<string, any>;
  isActive: boolean;
}

export const globalRuntimeSettingsAtom = atom<GlobalRuntimeSettingsState>({
  selectedValues: {},
  isActive: false,
});

export const updateGlobalRuntimeSettingsAction = atom(
  null,
  (get, set, updates: Record<string, any>) => {
    set(globalRuntimeSettingsAtom, prev => ({
      ...prev,
      selectedValues: { ...prev.selectedValues, ...updates },
      isActive: true,
    }));
  }
);

export const resetGlobalRuntimeSettingsAction = atom(
  null,
  (get, set) => {
    set(globalRuntimeSettingsAtom, {
      selectedValues: {},
      isActive: false,
    });
  }
);