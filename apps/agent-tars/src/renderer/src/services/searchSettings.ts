import { SearchSettings } from '@agent-infra/shared';

const SEARCH_SETTINGS_KEY = 'omega-search-settings';

export function loadSearchSettings(): SearchSettings | null {
  try {
    const settingsJson = localStorage.getItem(SEARCH_SETTINGS_KEY);
    if (!settingsJson) return null;
    return JSON.parse(settingsJson) as SearchSettings;
  } catch (error) {
    console.error('Failed to load search settings:', error);
    return null;
  }
}

export function saveSearchSettings(settings: SearchSettings): void {
  try {
    localStorage.setItem(SEARCH_SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('Failed to save search settings:', error);
  }
}
